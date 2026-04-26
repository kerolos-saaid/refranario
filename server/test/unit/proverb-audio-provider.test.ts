import { describe, expect, test } from 'bun:test'

import { getProverbAudioConfig } from '../../src/modules/proverb-audio/proverb-audio.config'
import { classifyElevenLabsError, ElevenLabsArabicSpeechProvider } from '../../src/modules/proverb-audio/proverb-audio.provider'

describe('ElevenLabs Arabic speech provider', () => {
  test('classifies common provider errors safely', () => {
    expect(classifyElevenLabsError(429, 'quota exceeded').kind).toBe('rate-limit')
    expect(classifyElevenLabsError(401, 'invalid key').kind).toBe('auth')
    expect(classifyElevenLabsError(503, 'try later').kind).toBe('transient')
    expect(classifyElevenLabsError(400, 'bad voice settings').kind).toBe('failed')
  })

  test('sends the selected voice, model, output format, and Arabic language code', async () => {
    let capturedUrl = ''
    let capturedHeaders: Headers | null = null
    let capturedBody: Record<string, unknown> | null = null
    const provider = new ElevenLabsArabicSpeechProvider((async (url, init) => {
      capturedUrl = String(url)
      capturedHeaders = new Headers(init?.headers)
      capturedBody = JSON.parse(String(init?.body))

      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    }) as typeof fetch)

    const result = await provider.generate('من جد وجد', getProverbAudioConfig({
      ELEVENLABS_API_KEYS: 'secret-key'
    } as Parameters<typeof getProverbAudioConfig>[0]))

    expect(result.kind).toBe('success')
    expect(capturedUrl).toContain('/cgSgspJ2msm6clMCkdW9?output_format=mp3_44100_128')
    expect(capturedHeaders?.get('xi-api-key')).toBe('secret-key')
    expect(capturedBody).toEqual({
      text: 'من جد وجد',
      model_id: 'eleven_v3',
      language_code: 'ar'
    })
  })

  test('falls through to the next key when the first key is limited', async () => {
    const responses = [
      new Response(JSON.stringify({ detail: { message: 'quota exceeded' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }),
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    ]
    let callCount = 0
    const provider = new ElevenLabsArabicSpeechProvider((async () => responses[callCount++]!) as typeof fetch)

    const result = await provider.generate('من جد وجد', getProverbAudioConfig({
      ELEVENLABS_API_KEYS: 'limited-key,valid-key',
      ELEVENLABS_KEY_COOLDOWN_SECONDS: '1'
    } as Parameters<typeof getProverbAudioConfig>[0]))

    expect(result.kind).toBe('success')
    expect(callCount).toBe(2)
  })

  test('returns a retry result when all keys are limited', async () => {
    const provider = new ElevenLabsArabicSpeechProvider((async () => new Response(
      JSON.stringify({ detail: { message: 'quota exceeded' } }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )) as typeof fetch)

    const result = await provider.generate('من جد وجد', getProverbAudioConfig({
      ELEVENLABS_API_KEYS: 'limited-a,limited-b',
      ELEVENLABS_KEY_COOLDOWN_SECONDS: '60'
    } as Parameters<typeof getProverbAudioConfig>[0]))

    expect(result).toEqual({
      kind: 'retry',
      reason: 'All configured voice credentials are temporarily unavailable.',
      retryAfterSeconds: 60
    })
  })
})
