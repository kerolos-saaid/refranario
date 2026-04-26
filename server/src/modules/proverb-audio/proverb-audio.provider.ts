import type {
  ElevenLabsSpeechFailure,
  ElevenLabsSpeechResult,
  ElevenLabsSpeechRetry
} from './proverb-audio.types'
import type { ProverbAudioConfig } from './proverb-audio.config'

type ProviderErrorKind = 'quota' | 'rate-limit' | 'auth' | 'blocked' | 'transient' | 'failed'

export type ClassifiedElevenLabsError = {
  kind: ProviderErrorKind
  reason: string
  retryAfterSeconds?: number
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
type KeyCooldownMode = 'soft' | 'hard'

type KeyCooldown = {
  until: number
  mode: KeyCooldownMode
}

const keyCooldowns = new Map<string, KeyCooldown>()
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function keyFingerprint(apiKey: string) {
  return apiKey.slice(-8)
}

function hasRateLimitSignal(message: string) {
  return (
    message.includes('rate limit')
    || message.includes('rate-limit')
    || message.includes('too many requests')
    || message.includes('quota')
    || message.includes('credit')
    || message.includes('capacity')
  )
}

function isFreeTierServerBlock(status: number, message: string) {
  return (
    (status === 401 || status === 403) && (
      message.includes('unusual activity detected')
      || message.includes('free tier usage disabled')
      || message.includes('purchase a paid plan')
      || message.includes('proxy/vpn')
      || message.includes('abuse detectors')
    )
  )
}

export function classifyElevenLabsError(status: number, message: string, retryAfterHeader?: string | null): ClassifiedElevenLabsError {
  const normalizedMessage = message.toLowerCase()
  const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined

  if (isFreeTierServerBlock(status, normalizedMessage)) {
    return {
      kind: 'blocked',
      reason: 'Voice provider blocked free-tier server-side generation from this environment.'
    }
  }

  if (status === 401 || status === 403) {
    return { kind: 'auth', reason: 'Voice provider credential was rejected.' }
  }

  if (status === 429 || hasRateLimitSignal(normalizedMessage)) {
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

function toCooldownMode(error: ClassifiedElevenLabsError): KeyCooldownMode {
  if (error.kind === 'auth') {
    return 'hard'
  }

  return error.retryAfterSeconds ? 'hard' : 'soft'
}

function setKeyCooldown(apiKey: string, error: ClassifiedElevenLabsError, fallbackSeconds: number) {
  const cooldownSeconds = error.retryAfterSeconds || fallbackSeconds
  keyCooldowns.set(keyFingerprint(apiKey), {
    until: Date.now() + (cooldownSeconds * 1000),
    mode: toCooldownMode(error)
  })
}

function clearKeyCooldown(apiKey: string) {
  keyCooldowns.delete(keyFingerprint(apiKey))
}

function getRetryAfterSeconds(until: number, now: number) {
  return Math.max(1, Math.ceil((until - now) / 1000))
}

export function resetElevenLabsKeyCooldowns() {
  keyCooldowns.clear()
}

function toLogMessage(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180)
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
  private readonly fetcher: FetchLike

  constructor(fetcher?: FetchLike) {
    // Cloudflare Workers can throw "Illegal invocation" when the global fetch
    // reference is detached and invoked later without the original receiver.
    this.fetcher = fetcher || ((input, init) => fetch(input, init))
  }

  async generate(text: string, config: ProverbAudioConfig): Promise<ElevenLabsSpeechResult> {
    if (config.apiKeys.length === 0) {
      return toFailure('Arabic audio is not configured.')
    }

    const now = Date.now()
    const keyStates = config.apiKeys.map((apiKey) => ({
      apiKey,
      cooldown: keyCooldowns.get(keyFingerprint(apiKey)) || null
    }))
    const immediatelyAvailable = keyStates.filter(({ cooldown }) => !cooldown || cooldown.until <= now)
    const softCooldownKeys = keyStates
      .filter(({ cooldown }) => cooldown && cooldown.until > now && cooldown.mode === 'soft')
      .sort((left, right) => left.cooldown!.until - right.cooldown!.until)
    const hardCooldownKeys = keyStates.filter(({ cooldown }) => cooldown && cooldown.until > now && cooldown.mode === 'hard')
    const availableKeys = [...immediatelyAvailable, ...softCooldownKeys].map(({ apiKey }) => apiKey)

    if (availableKeys.length === 0) {
      const nextRetryAt = Math.min(...hardCooldownKeys.map(({ cooldown }) => cooldown!.until))
      return toRetry('All configured voice credentials are cooling down.', getRetryAfterSeconds(nextRetryAt, now))
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
          clearKeyCooldown(apiKey)
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

        if (classified.kind === 'blocked') {
          console.warn('[ArabicAudio] ElevenLabs blocked server-side free-tier request', {
            status: response.status,
            message: toLogMessage(message)
          })
        }

        if (shouldCooldown(classified)) {
          setKeyCooldown(apiKey, classified, config.keyCooldownSeconds)
        }

        if (classified.kind === 'failed') {
          return toFailure(classified.reason)
        }
      } catch (error) {
        console.error('[ArabicAudio] ElevenLabs request threw', {
          message: error instanceof Error ? toLogMessage(error.message) : toLogMessage(String(error))
        })
        lastFailure = { kind: 'transient', reason: 'Voice provider request failed.' }
        setKeyCooldown(apiKey, lastFailure, config.keyCooldownSeconds)
      }
    }

    if (lastFailure && shouldCooldown(lastFailure)) {
      return toRetry('All configured voice credentials are temporarily unavailable.', lastFailure.retryAfterSeconds || config.keyCooldownSeconds)
    }

    return toFailure(lastFailure?.reason || 'Voice provider could not generate audio.')
  }
}
