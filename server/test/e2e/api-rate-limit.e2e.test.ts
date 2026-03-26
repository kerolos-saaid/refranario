import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../src/app/create-app'
import {
  createIsolatedDevPlatform,
  disposeIsolatedDevPlatform,
  resetIsolatedDevPlatform,
  type IsolatedDevPlatform
} from '../support/dev-platform'

type RequestOptions = {
  method: string
  path: string
  headers?: Record<string, string>
  json?: unknown
}

type TestResponse = {
  status: number
  body: unknown
  headers: Headers
}

let runtime!: IsolatedDevPlatform

async function request(options: RequestOptions): Promise<TestResponse> {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (options.json !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    body = JSON.stringify(options.json)
  }

  const response = await createApp().fetch(
    new Request(`http://localhost${options.path}`, {
      method: options.method,
      headers,
      body
    }),
    runtime.platform.env,
    runtime.platform.ctx
  )

  const contentType = response.headers.get('content-type') || ''
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  return {
    status: response.status,
    body: responseBody,
    headers: response.headers
  }
}

async function loginAsAdmin(ip = '198.51.100.10') {
  const response = await request({
    method: 'POST',
    path: '/api/login',
    headers: {
      'CF-Connecting-IP': ip
    },
    json: {
      username: 'admin',
      password: 'password123'
    }
  })

  if (response.status !== 200 || typeof response.body !== 'object' || response.body === null || !('token' in response.body)) {
    throw new Error(`Expected admin login to succeed, received ${JSON.stringify(response.body)}`)
  }

  return String(response.body.token)
}

describe('api rate limiting', () => {
  beforeAll(async () => {
    runtime = await createIsolatedDevPlatform('api-rate-limit')
  })

  beforeEach(async () => {
    await resetIsolatedDevPlatform(runtime)
  })

  afterAll(async () => {
    await disposeIsolatedDevPlatform(runtime)
  })

  test.serial('allows normal public proverb browsing and exposes rate limit headers', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/proverbs',
      headers: {
        'CF-Connecting-IP': '203.0.113.1'
      }
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('X-RateLimit-Policy')).toBe('public_proverbs_list')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('120')
  })

  test.serial('limits repeated login attempts by ip and username, then resets after the window', async () => {
    const originalNow = Date.now
    let now = 1_700_000_000_000
    Date.now = () => now

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await request({
          method: 'POST',
          path: '/api/login',
          headers: {
            'CF-Connecting-IP': '198.51.100.5'
          },
          json: {
            username: 'admin',
            password: 'wrong-password'
          }
        })

        expect(response.status).toBe(401)
      }

      const blocked = await request({
        method: 'POST',
        path: '/api/login',
        headers: {
          'CF-Connecting-IP': '198.51.100.5'
        },
        json: {
          username: 'admin',
          password: 'wrong-password'
        }
      })

      expect(blocked.status).toBe(429)
      expect(blocked.body).toEqual(expect.objectContaining({
        error: 'Too many login attempts. Please wait a few minutes before trying again.'
      }))
      expect(blocked.headers.get('Retry-After')).not.toBeNull()

      now += (10 * 60_000) + 1_000

      const afterReset = await request({
        method: 'POST',
        path: '/api/login',
        headers: {
          'CF-Connecting-IP': '198.51.100.5'
        },
        json: {
          username: 'admin',
          password: 'wrong-password'
        }
      })

      expect(afterReset.status).toBe(401)
    } finally {
      Date.now = originalNow
    }
  })

  test.serial('applies a tighter limit to image backfill requests', async () => {
    const token = await loginAsAdmin('198.51.100.9')

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request({
        method: 'POST',
        path: '/api/proverb-image-jobs/backfill',
        headers: {
          Authorization: `Bearer ${token}`,
          'CF-Connecting-IP': '198.51.100.9'
        },
        json: {}
      })

      expect(response.status).toBe(200)
    }

    const blocked = await request({
      method: 'POST',
      path: '/api/proverb-image-jobs/backfill',
      headers: {
        Authorization: `Bearer ${token}`,
        'CF-Connecting-IP': '198.51.100.9'
      },
      json: {}
    })

    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual(expect.objectContaining({
      error: 'Image backfill was requested too often. Please wait a few minutes and try again.'
    }))
    expect(blocked.headers.get('X-RateLimit-Policy')).toBe('image_job_backfill')
  })
})
