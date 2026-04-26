import type { AppBindings } from '../../shared/types/app-env'

export type ProverbAudioConfig = {
  apiKeys: string[]
  modelId: string
  voiceId: string
  outputFormat: string
  keyCooldownSeconds: number
}

export const DEFAULT_ELEVENLABS_MODEL_ID = 'eleven_v3'
export const DEFAULT_ELEVENLABS_VOICE_ID = 'cgSgspJ2msm6clMCkdW9'
export const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128'
export const DEFAULT_ELEVENLABS_KEY_COOLDOWN_SECONDS = 300

export function parseElevenLabsApiKeys(rawKeys: string | undefined): string[] {
  if (!rawKeys) {
    return []
  }

  return rawKeys
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean)
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getProverbAudioConfig(bindings: AppBindings): ProverbAudioConfig {
  return {
    apiKeys: parseElevenLabsApiKeys(bindings.ELEVENLABS_API_KEYS),
    modelId: bindings.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL_ID,
    voiceId: bindings.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID,
    outputFormat: bindings.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_ELEVENLABS_OUTPUT_FORMAT,
    keyCooldownSeconds: parsePositiveInteger(
      bindings.ELEVENLABS_KEY_COOLDOWN_SECONDS,
      DEFAULT_ELEVENLABS_KEY_COOLDOWN_SECONDS
    )
  }
}
