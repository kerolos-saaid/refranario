import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'

import { createApp } from '../../src/app/create-app'
import { createLegacyApp } from '../../src/test-support/create-legacy-app'
import {
  createIsolatedDevPlatform,
  disposeIsolatedDevPlatform,
  resetIsolatedDevPlatform,
  type IsolatedDevPlatform
} from '../support/dev-platform'

type AppInstance = Hono<any, any, any>

type RequestOptions = {
  method: string
  path: string
  headers?: Record<string, string>
  json?: unknown
}

type NormalizedResponse = {
  status: number
  contentType: string | null
  corsOrigin: string | null
  body: unknown
}

type TestClient = {
  request(options: RequestOptions): Promise<NormalizedResponse>
  login(username: string, password: string): Promise<string>
}

type Scenario = {
  name: string
  run(client: TestClient): Promise<NormalizedResponse[]>
}

let legacyRuntime!: IsolatedDevPlatform
let refactoredRuntime!: IsolatedDevPlatform

function createClient(app: AppInstance, runtime: IsolatedDevPlatform): TestClient {
  return {
    request: (options) => performRequest(app, runtime, options),
    login: async (username, password) => {
      const response = await performRequest(app, runtime, {
        method: 'POST',
        path: '/api/login',
        json: { username, password }
      })

      if (response.status !== 200 || typeof response.body !== 'object' || response.body === null || !('token' in response.body)) {
        throw new Error(`Expected login token but received ${JSON.stringify(response)}`)
      }

      return String(response.body.token)
    }
  }
}

async function performRequest(
  app: AppInstance,
  runtime: IsolatedDevPlatform,
  options: RequestOptions
): Promise<NormalizedResponse> {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (options.json !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    body = JSON.stringify(options.json)
  }

  const response = await app.fetch(
    new Request(`http://localhost${options.path}`, {
      method: options.method,
      headers,
      body
    }),
    runtime.platform.env,
    runtime.platform.ctx
  )

  const contentType = response.headers.get('content-type')
  const bodyContent = contentType?.includes('application/json')
    ? await response.json()
    : await response.text()

  return {
    status: response.status,
    contentType,
    corsOrigin: response.headers.get('access-control-allow-origin'),
    body: bodyContent
  }
}

function withDeterministicRuntime<T>(run: () => Promise<T>) {
  const originalNow = Date.now
  const originalRandom = Math.random
  let now = 1_700_000_000_000

  Date.now = () => now++
  Math.random = () => 0.123456789

  return run().finally(() => {
    Date.now = originalNow
    Math.random = originalRandom
  })
}

function createAuthorizedHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  }
}

const validImageData =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sW0N1cAAAAASUVORK5CYII='

const scenarios: Scenario[] = [
  {
    name: 'lists proverbs with default pagination',
    run: async (client) => [
      await client.request({ method: 'GET', path: '/api/proverbs' })
    ]
  },
  {
    name: 'lists proverbs with search and letter filters',
    run: async (client) => [
      await client.request({ method: 'GET', path: '/api/proverbs?page=2&limit=3&search=bird&letter=M' })
    ]
  },
  {
    name: 'gets a single proverb by id',
    run: async (client) => [
      await client.request({ method: 'GET', path: '/api/proverbs/1' })
    ]
  },
  {
    name: 'returns proverb not found for an unknown id',
    run: async (client) => [
      await client.request({ method: 'GET', path: '/api/proverbs/999999' })
    ]
  },
  {
    name: 'logs in as admin',
    run: async (client) => [
      await client.request({
        method: 'POST',
        path: '/api/login',
        json: { username: 'admin', password: 'password123' }
      })
    ]
  },
  {
    name: 'rejects invalid login credentials',
    run: async (client) => [
      await client.request({
        method: 'POST',
        path: '/api/login',
        json: { username: 'admin', password: 'wrong-password' }
      })
    ]
  },
  {
    name: 'rejects protected proverb creation without a token',
    run: async (client) => [
      await client.request({
        method: 'POST',
        path: '/api/proverbs',
        json: { spanish: 'Nuevo', arabic: '????', english: 'New' }
      })
    ]
  },
  {
    name: 'rejects protected proverb creation for non admin users',
    run: async (client) => {
      const userToken = await client.login('user', 'user123')
      return [
        await client.request({
          method: 'POST',
          path: '/api/proverbs',
          headers: createAuthorizedHeaders(userToken),
          json: { spanish: 'Nuevo', arabic: '????', english: 'New' }
        })
      ]
    }
  },
  {
    name: 'creates a proverb as admin',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'POST',
          path: '/api/proverbs',
          headers: createAuthorizedHeaders(adminToken),
          json: {
            spanish: 'Quien persevera, vence.',
            arabic: '?? ????? ?????',
            english: 'Who perseveres prevails.',
            category: 'Persistence',
            note: 'Parity test proverb',
            image: '',
            curator: 'Admin'
          }
        })
      ]
    }
  },
  {
    name: 'updates a proverb as admin and preserves subsequent reads',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'PUT',
          path: '/api/proverbs/1',
          headers: createAuthorizedHeaders(adminToken),
          json: {
            note: 'Updated from e2e parity test',
            bookmarked: true
          }
        }),
        await client.request({ method: 'GET', path: '/api/proverbs/1' })
      ]
    }
  },
  {
    name: 'rejects empty proverb updates',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'PUT',
          path: '/api/proverbs/1',
          headers: createAuthorizedHeaders(adminToken),
          json: {}
        })
      ]
    }
  },
  {
    name: 'deletes a proverb as admin and makes it unavailable afterwards',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'DELETE',
          path: '/api/proverbs/2',
          headers: createAuthorizedHeaders(adminToken)
        }),
        await client.request({ method: 'GET', path: '/api/proverbs/2' })
      ]
    }
  },
  {
    name: 'uploads a valid image as admin',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'POST',
          path: '/api/upload',
          headers: createAuthorizedHeaders(adminToken),
          json: {
            image: validImageData,
            filename: 'tiny.png'
          }
        })
      ]
    }
  },
  {
    name: 'rejects invalid upload payloads',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'POST',
          path: '/api/upload',
          headers: createAuthorizedHeaders(adminToken),
          json: {
            image: 'not-base64',
            filename: 'broken.txt'
          }
        })
      ]
    }
  },
  {
    name: 'deletes an uploaded file as admin',
    run: async (client) => {
      const adminToken = await client.login('admin', 'password123')
      return [
        await client.request({
          method: 'DELETE',
          path: '/api/upload/test-file.png',
          headers: createAuthorizedHeaders(adminToken)
        })
      ]
    }
  },
  {
    name: 'serves the fallback text response for non api routes',
    run: async (client) => [
      await client.request({ method: 'GET', path: '/' })
    ]
  }
]

describe('backend parity with legacy implementation', () => {
  beforeAll(async () => {
    legacyRuntime = await createIsolatedDevPlatform('legacy-suite')
    refactoredRuntime = await createIsolatedDevPlatform('refactored-suite')
  })

  beforeEach(async () => {
    await resetIsolatedDevPlatform(legacyRuntime)
    await resetIsolatedDevPlatform(refactoredRuntime)
  })

  afterAll(async () => {
    await disposeIsolatedDevPlatform(legacyRuntime)
    await disposeIsolatedDevPlatform(refactoredRuntime)
  })

  for (const scenario of scenarios) {
    test.serial(scenario.name, async () => {
      const legacyClient = createClient(createLegacyApp(), legacyRuntime)
      const refactoredClient = createClient(createApp(), refactoredRuntime)

      const legacyResponses = await withDeterministicRuntime(() => scenario.run(legacyClient))
      const refactoredResponses = await withDeterministicRuntime(() => scenario.run(refactoredClient))

      expect(refactoredResponses).toEqual(legacyResponses)
    }, { timeout: 20000 })
  }
})
