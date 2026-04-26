import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { createApp } from '../../src/app/create-app'
import { createArabicAudioTextHash } from '../../src/modules/proverb-audio/proverb-audio.service'
import type { AppBindings } from '../../src/shared/types/app-env'
import {
  createIsolatedDevPlatform,
  disposeIsolatedDevPlatform,
  resetIsolatedDevPlatform,
  type IsolatedDevPlatform
} from '../support/dev-platform'

let runtime!: IsolatedDevPlatform

function createEnv(overrides?: Partial<AppBindings>): AppBindings {
  return {
    ...runtime.platform.env,
    ELEVENLABS_API_KEYS: 'key-1,key-2',
    ELEVENLABS_KEY_COOLDOWN_SECONDS: '60',
    ...overrides
  }
}

function createAuthorizedHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  }
}

async function performJsonRequest(options: {
  path: string
  method: string
  env?: AppBindings
  headers?: Record<string, string>
  json?: unknown
}) {
  const app = createApp()
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.json)
  }

  const response = await app.fetch(
    new Request(`http://localhost${options.path}`, {
      method: options.method,
      headers,
      body
    }),
    options.env || createEnv(),
    runtime.platform.ctx
  )

  return {
    status: response.status,
    retryAfter: response.headers.get('Retry-After'),
    body: await response.json() as Record<string, unknown>
  }
}

async function performRequest(options: { id: string; env?: AppBindings }) {
  return await performJsonRequest({
    path: `/api/proverbs/${options.id}/arabic-audio`,
    method: 'POST',
    env: options.env
  })
}

async function loginAsAdmin(env?: AppBindings) {
  const response = await performJsonRequest({
    path: '/api/login',
    method: 'POST',
    env,
    json: {
      username: 'admin',
      password: 'password123'
    }
  })

  if (response.status !== 200 || typeof response.body !== 'object' || response.body === null || !('token' in response.body)) {
    throw new Error(`Expected admin login token but received ${JSON.stringify(response)}`)
  }

  return String(response.body.token)
}

async function loadAudioColumns(id: string) {
  return await runtime.platform.env.senor_shabi_db.prepare(
    `
      SELECT
        arabic_audio_url,
        arabic_audio_object_key,
        arabic_audio_text_hash,
        arabic_audio_status,
        arabic_audio_error,
        arabic_audio_model,
        arabic_audio_voice_id
      FROM proverbs
      WHERE id = ?1
    `
  ).bind(id).first<Record<string, string | null>>()
}

function installFetchMock(responses: Response[]) {
  const originalFetch = globalThis.fetch
  let callCount = 0

  globalThis.fetch = (async () => responses[callCount++]!) as typeof fetch

  return {
    get callCount() {
      return callCount
    },
    restore() {
      globalThis.fetch = originalFetch
    }
  }
}

describe('Arabic audio API', () => {
  beforeAll(async () => {
    runtime = await createIsolatedDevPlatform('arabic-audio')
  })

  beforeEach(async () => {
    await resetIsolatedDevPlatform(runtime)
  })

  afterAll(async () => {
    await disposeIsolatedDevPlatform(runtime)
  })

  test('generates and saves first-time Arabic audio', async () => {
    const fetchMock = installFetchMock([
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    ])

    try {
      const response = await performRequest({
        id: '1',
        env: createEnv({ ELEVENLABS_API_KEYS: 'fallback-exhausted,fallback-valid' })
      })
      const row = await loadAudioColumns('1')

      expect(response.status).toBe(201)
      expect(response.body.status).toBe('ready')
      expect(response.body.cached).toBe(false)
      expect(String(response.body.audioUrl)).toContain('/audio/arabic/1-')
      expect(fetchMock.callCount).toBe(1)
      expect(row?.arabic_audio_status).toBe('ready')
      expect(row?.arabic_audio_model).toBe('eleven_v3')
      expect(row?.arabic_audio_voice_id).toBe('cgSgspJ2msm6clMCkdW9')
    } finally {
      fetchMock.restore()
    }
  })

  test('returns unavailable for missing proverb and missing Arabic text', async () => {
    const missing = await performRequest({ id: 'missing' })
    expect(missing.status).toBe(404)
    expect(missing.body.status).toBe('unavailable')

    await runtime.platform.env.senor_shabi_db.prepare('UPDATE proverbs SET arabic = ?1 WHERE id = ?2').bind('', '1').run()
    const missingArabic = await performRequest({ id: '1' })
    expect(missingArabic.status).toBe(422)
    expect(missingArabic.body.status).toBe('unavailable')
  })

  test('reuses cached ready Arabic audio without provider call', async () => {
    const hash = await createArabicAudioTextHash('من جد وجد')
    await runtime.platform.env.senor_shabi_db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_url = ?1,
          arabic_audio_object_key = ?2,
          arabic_audio_text_hash = ?3,
          arabic_audio_status = 'ready',
          arabic_audio_model = 'eleven_v3',
          arabic_audio_voice_id = 'cgSgspJ2msm6clMCkdW9'
        WHERE id = '1'
      `
    ).bind('https://example.com/audio.mp3', 'audio/arabic/1.mp3', hash).run()
    const fetchMock = installFetchMock([])

    try {
      const response = await performRequest({
        id: '1',
        env: createEnv({ ELEVENLABS_API_KEYS: 'all-exhausted-a,all-exhausted-b' })
      })
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'ready',
        audioUrl: 'https://example.com/audio.mp3',
        cached: true
      })
      expect(fetchMock.callCount).toBe(0)
    } finally {
      fetchMock.restore()
    }
  })

  test('regenerates stale cached audio when Arabic text hash changes', async () => {
    await runtime.platform.env.senor_shabi_db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_url = ?1,
          arabic_audio_object_key = ?2,
          arabic_audio_text_hash = 'stale',
          arabic_audio_status = 'ready',
          arabic_audio_model = 'eleven_v3',
          arabic_audio_voice_id = 'cgSgspJ2msm6clMCkdW9'
        WHERE id = '1'
      `
    ).bind('https://example.com/old.mp3', 'audio/arabic/old.mp3').run()
    const fetchMock = installFetchMock([
      new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    ])

    try {
      const response = await performRequest({ id: '1' })
      expect(response.status).toBe(201)
      expect(response.body.cached).toBe(false)
      expect(fetchMock.callCount).toBe(1)
    } finally {
      fetchMock.restore()
    }
  })

  test('returns generating state instead of duplicate generation', async () => {
    const hash = await createArabicAudioTextHash('من جد وجد')
    await runtime.platform.env.senor_shabi_db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_text_hash = ?1,
          arabic_audio_status = 'generating',
          arabic_audio_model = 'eleven_v3',
          arabic_audio_voice_id = 'cgSgspJ2msm6clMCkdW9'
        WHERE id = '1'
      `
    ).bind(hash).run()
    const fetchMock = installFetchMock([])

    try {
      const response = await performRequest({ id: '1' })
      expect(response.status).toBe(202)
      expect(response.body.status).toBe('generating')
      expect(fetchMock.callCount).toBe(0)
    } finally {
      fetchMock.restore()
    }
  })

  test('falls back from an exhausted first key to a valid second key', async () => {
    const fetchMock = installFetchMock([
      new Response(JSON.stringify({ detail: { message: 'quota exceeded' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }),
      new Response(new Uint8Array([7, 8, 9]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    ])

    try {
      const response = await performRequest({ id: '1' })
      expect(response.status).toBe(201)
      expect(response.body.status).toBe('ready')
      expect(fetchMock.callCount).toBe(2)
    } finally {
      fetchMock.restore()
    }
  })

  test('returns limited when all configured keys are exhausted', async () => {
    const fetchMock = installFetchMock([
      new Response(JSON.stringify({ detail: { message: 'quota exceeded' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }),
      new Response(JSON.stringify({ detail: { message: 'quota exceeded' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    ])

    try {
      const response = await performRequest({ id: '1' })
      const row = await loadAudioColumns('1')

      expect(response.status).toBe(503)
      expect(response.retryAfter).toBe('60')
      expect(response.body.status).toBe('limited')
      expect(row?.arabic_audio_status).toBe('limited')
      expect(row?.arabic_audio_url).toBeNull()
    } finally {
      fetchMock.restore()
    }
  })

  test('admin upload saves browser-generated Arabic audio and then reuses cache', async () => {
    const adminToken = await loginAsAdmin()
    const uploadResponse = await performJsonRequest({
      path: '/api/proverbs/1/arabic-audio/upload',
      method: 'POST',
      headers: createAuthorizedHeaders(adminToken),
      json: {
        audio: 'data:audio/mpeg;base64,AQID'
      }
    })
    const fetchMock = installFetchMock([])

    try {
      const cachedResponse = await performRequest({ id: '1' })
      const row = await loadAudioColumns('1')

      expect(uploadResponse.status).toBe(201)
      expect(uploadResponse.body.status).toBe('ready')
      expect(String(uploadResponse.body.audioUrl)).toContain('/audio/arabic/1-')
      expect(cachedResponse.status).toBe(200)
      expect(cachedResponse.body.status).toBe('ready')
      expect(cachedResponse.body.cached).toBe(true)
      expect(fetchMock.callCount).toBe(0)
      expect(row?.arabic_audio_status).toBe('ready')
    } finally {
      fetchMock.restore()
    }
  })

  test('admin upload rejects invalid audio payloads', async () => {
    const adminToken = await loginAsAdmin()
    const response = await performJsonRequest({
      path: '/api/proverbs/1/arabic-audio/upload',
      method: 'POST',
      headers: createAuthorizedHeaders(adminToken),
      json: {
        audio: 'not-valid-audio'
      }
    })

    expect(response.status).toBe(422)
    expect(response.body.status).toBe('failed')
  })

  test('admin upload requires an authenticated admin session', async () => {
    const response = await performJsonRequest({
      path: '/api/proverbs/1/arabic-audio/upload',
      method: 'POST',
      json: {
        audio: 'data:audio/mpeg;base64,AQID'
      }
    })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized - No token' })
  })

  test('admin browser config returns ElevenLabs settings only for admins', async () => {
    const adminToken = await loginAsAdmin()
    const authorized = await performJsonRequest({
      path: '/api/admin/arabic-audio/browser-config',
      method: 'GET',
      headers: createAuthorizedHeaders(adminToken)
    })
    const unauthorized = await performJsonRequest({
      path: '/api/admin/arabic-audio/browser-config',
      method: 'GET'
    })

    expect(authorized.status).toBe(200)
    expect(authorized.body).toEqual({
      enabled: true,
      apiKeys: ['key-1', 'key-2'],
      modelId: 'eleven_v3',
      voiceId: 'cgSgspJ2msm6clMCkdW9',
      outputFormat: 'mp3_44100_128'
    })
    expect(unauthorized.status).toBe(401)
    expect(unauthorized.body).toEqual({ error: 'Unauthorized - No token' })
  })
})
