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

async function performRequest(options: { id: string; env?: AppBindings }) {
  const app = createApp()
  const response = await app.fetch(
    new Request(`http://localhost/api/proverbs/${options.id}/arabic-audio`, {
      method: 'POST'
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
})
