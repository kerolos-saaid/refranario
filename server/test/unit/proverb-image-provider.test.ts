import { describe, expect, test } from 'bun:test'

import { GoogleAiStudioImageProvider, classifyAiStudioError } from '../../src/modules/proverb-images/proverb-image.provider'

describe('AI Studio image provider', () => {
  test('classifies common API errors', () => {
    expect(classifyAiStudioError(429, 'RESOURCE_EXHAUSTED', 'Quota exceeded').kind).toBe('quota')
    expect(classifyAiStudioError(503, 'UNAVAILABLE', 'Try later').kind).toBe('transient')
    expect(classifyAiStudioError(403, 'PERMISSION_DENIED', 'Invalid key').kind).toBe('invalid-key')
    expect(classifyAiStudioError(400, 'INVALID_ARGUMENT', 'Bad prompt').kind).toBe('failed')
  })

  test('falls through to the next key when the first key is rate limited', async () => {
    const responses = [
      new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }),
      new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'ZmFrZQ=='
                  }
                }
              ]
            }
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    ]

    let callCount = 0
    const provider = new GoogleAiStudioImageProvider((async () => responses[callCount++]!) as unknown as typeof fetch)
    const result = await provider.generate({
      prompt: 'test prompt',
      apiKeys: ['key-1', 'key-2'],
      model: 'gemini-2.5-flash-image',
      retryDelaySeconds: 60,
      quotaCooldownSeconds: 300
    })

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.image.mimeType).toBe('image/png')
      expect(result.image.base64Data).toBe('ZmFrZQ==')
    }
    expect(callCount).toBe(2)
  })

  test('returns a delayed retry when all keys are rate limited', async () => {
    const provider = new GoogleAiStudioImageProvider((async () => new Response(
      JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    )) as unknown as typeof fetch)
    const result = await provider.generate({
      prompt: 'test prompt',
      apiKeys: ['key-1', 'key-2'],
      model: 'gemini-2.5-flash-image',
      retryDelaySeconds: 60,
      quotaCooldownSeconds: 300
    })

    expect(result).toEqual({
      kind: 'retry',
      reason: 'All configured AI Studio keys are currently rate-limited.',
      retryAfterSeconds: 300
    })
  })
})
