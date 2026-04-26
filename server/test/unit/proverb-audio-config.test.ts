import { describe, expect, test } from 'bun:test'

import { getProverbAudioConfig, parseElevenLabsApiKeys } from '../../src/modules/proverb-audio/proverb-audio.config'

describe('Proverb audio config', () => {
  test('parses ordered keys and ignores empty entries', () => {
    expect(parseElevenLabsApiKeys(' key-1,\n\nkey-2, ,key-3 ')).toEqual(['key-1', 'key-2', 'key-3'])
  })

  test('uses selected defaults for model, voice, output, and cooldown', () => {
    const config = getProverbAudioConfig({
      ELEVENLABS_API_KEYS: 'key-1,key-2'
    } as Parameters<typeof getProverbAudioConfig>[0])

    expect(config).toEqual({
      apiKeys: ['key-1', 'key-2'],
      modelId: 'eleven_v3',
      voiceId: 'cgSgspJ2msm6clMCkdW9',
      outputFormat: 'mp3_44100_128',
      keyCooldownSeconds: 300
    })
  })
})
