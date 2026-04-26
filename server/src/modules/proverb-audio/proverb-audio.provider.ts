import type {
  ElevenLabsSpeechFailure,
  ElevenLabsSpeechResult,
  ElevenLabsSpeechRetry
} from './proverb-audio.types'
import type { ProverbAudioConfig } from './proverb-audio.config'

type ProviderErrorKind = 'quota' | 'rate-limit' | 'auth' | 'transient' | 'failed'

export type ClassifiedElevenLabsError = {
  kind: ProviderErrorKind
  reason: string
  retryAfterSeconds?: number
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const keyCooldownUntil = new Map<string, number>()

function keyFingerprint(apiKey: string) {
  return apiKey.slice(-8)
}

export function classifyElevenLabsError(status: number, message: string, retryAfterHeader?: string | null): ClassifiedElevenLabsError {
  const normalizedMessage = message.toLowerCase()
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined

  if (status === 401 || status === 403) {
    return { kind: 'auth', reason: 'Voice provider credential was rejected.' }
  }

  if (status === 429 || normalizedMessage.includes('quota') || normalizedMessage.includes('limit')) {
    return {
      kind: status === 429 ? 'rate-limit' : 'quota',
      reason: 'Voice provider limit reached.',
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) && retryAfterSeconds! > 0 ? retryAfterSeconds : undefined
    }
  }

  if (status >= 500 || status === 408) {
    return { kind: 'transient', reason: 'Voice provider is temporarily unavailable.' }
  }

  return { kind: 'failed', reason: 'Voice provider could not generate audio.' }
}

function shouldCooldown(error: ClassifiedElevenLabsError) {
  return error.kind === 'quota' || error.kind === 'rate-limit' || error.kind === 'auth' || error.kind === 'transient'
}

function toRetry(reason: string, retryAfterSeconds: number): ElevenLabsSpeechRetry {
  return { kind: 'retry', reason, retryAfterSeconds }
}

function toFailure(reason: string): ElevenLabsSpeechFailure {
  return { kind: 'failed', reason }
}

async function readProviderError(response: Response) {
  const raw = await response.text()

  try {
    const data = JSON.parse(raw) as { detail?: { message?: string }; message?: string; error?: unknown }
    if (data.detail?.message) return data.detail.message
    if (data.message) return data.message
    if (typeof data.error === 'string') return data.error
    return raw
  } catch {
    return raw
  }
}

export class ElevenLabsArabicSpeechProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async generate(text: string, config: ProverbAudioConfig): Promise<ElevenLabsSpeechResult> {
    if (config.apiKeys.length === 0) {
      return toFailure('Arabic audio is not configured.')
    }

    const now = Date.now()
    const availableKeys = config.apiKeys.filter((key) => (keyCooldownUntil.get(keyFingerprint(key)) || 0) <= now)

    if (availableKeys.length === 0) {
      return toRetry('All configured voice credentials are cooling down.', config.keyCooldownSeconds)
    }

    let lastFailure: ClassifiedElevenLabsError | null = null

    for (const apiKey of availableKeys) {
      try {
        const response = await this.fetcher(
          `${ELEVENLABS_BASE_URL}/${encodeURIComponent(config.voiceId)}?output_format=${encodeURIComponent(config.outputFormat)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey
            },
            body: JSON.stringify({
              text,
              model_id: config.modelId,
              language_code: 'ar'
            })
          }
        )

        if (response.ok) {
          const audio = new Uint8Array(await response.arrayBuffer())
          if (audio.byteLength === 0) {
            lastFailure = { kind: 'failed', reason: 'Voice provider returned empty audio.' }
            continue
          }

          return {
            kind: 'success',
            audio,
            contentType: response.headers.get('content-type') || 'audio/mpeg'
          }
        }

        const message = await readProviderError(response)
        const classified = classifyElevenLabsError(response.status, message, response.headers.get('Retry-After'))
        lastFailure = classified

        if (shouldCooldown(classified)) {
          const cooldownSeconds = classified.retryAfterSeconds || config.keyCooldownSeconds
          keyCooldownUntil.set(keyFingerprint(apiKey), Date.now() + (cooldownSeconds * 1000))
        }

        if (classified.kind === 'failed') {
          return toFailure(classified.reason)
        }
      } catch {
        lastFailure = { kind: 'transient', reason: 'Voice provider request failed.' }
        keyCooldownUntil.set(keyFingerprint(apiKey), Date.now() + (config.keyCooldownSeconds * 1000))
      }
    }

    if (lastFailure && shouldCooldown(lastFailure)) {
      return toRetry('All configured voice credentials are temporarily unavailable.', lastFailure.retryAfterSeconds || config.keyCooldownSeconds)
    }

    return toFailure(lastFailure?.reason || 'Voice provider could not generate audio.')
  }
}
