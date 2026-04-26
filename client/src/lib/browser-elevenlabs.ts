const ELEVENLABS_BROWSER_API_KEYS_STORAGE_KEY = 'senor_shabi_elevenlabs_browser_api_keys'
const ELEVENLABS_BROWSER_VOICE_ID = 'cgSgspJ2msm6clMCkdW9'
const ELEVENLABS_BROWSER_MODEL_ID = 'eleven_v3'
const ELEVENLABS_BROWSER_OUTPUT_FORMAT = 'mp3_44100_128'
const ELEVENLABS_BROWSER_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

type BrowserProviderErrorKind = 'quota' | 'auth' | 'blocked' | 'transient' | 'failed'

type BrowserProviderError = {
  kind: BrowserProviderErrorKind
  reason: string
}

export type BrowserElevenLabsAudioResult =
  | {
      kind: 'success'
      audio: Uint8Array
      contentType: string
    }
  | {
      kind: 'failed'
      reason: string
    }

function parseStoredKeys(rawValue: string | null) {
  if (!rawValue) {
    return []
  }

  const trimmed = rawValue.trim()

  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean)
      }
    } catch {
      // Fall through to plain-text parsing.
    }
  }

  return trimmed
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

async function readProviderError(response: Response) {
  const raw = await response.text()

  try {
    const data = JSON.parse(raw) as { detail?: { message?: string }; message?: string; error?: unknown }
    if (data.detail?.message) return data.detail.message
    if (data.message) return data.message
    if (typeof data.error === 'string') return data.error
  } catch {
    // Ignore invalid JSON payloads.
  }

  return raw || 'ElevenLabs request failed.'
}

function classifyProviderError(status: number, message: string): BrowserProviderError {
  const normalized = message.toLowerCase()

  if (
    status === 401
    && (
      normalized.includes('unusual activity detected')
      || normalized.includes('free tier usage disabled')
      || normalized.includes('purchase a paid plan')
      || normalized.includes('proxy/vpn')
      || normalized.includes('abuse detectors')
    )
  ) {
    return {
      kind: 'blocked',
      reason: 'ElevenLabs blocked browser generation for this key right now.'
    }
  }

  if (status === 401 || status === 403) {
    return {
      kind: 'auth',
      reason: 'One ElevenLabs key was rejected.'
    }
  }

  if (
    status === 429
    || normalized.includes('quota')
    || normalized.includes('rate limit')
    || normalized.includes('too many requests')
    || normalized.includes('limit reached')
    || normalized.includes('credit')
    || normalized.includes('capacity')
  ) {
    return {
      kind: 'quota',
      reason: 'One ElevenLabs key is temporarily limited.'
    }
  }

  if (status >= 500 || status === 408) {
    return {
      kind: 'transient',
      reason: 'ElevenLabs is temporarily unavailable.'
    }
  }

  return {
    kind: 'failed',
    reason: 'ElevenLabs could not generate Arabic audio in the browser.'
  }
}

function shouldTryNextKey(error: BrowserProviderError) {
  return (
    error.kind === 'quota'
    || error.kind === 'auth'
    || error.kind === 'blocked'
    || error.kind === 'transient'
  )
}

export function getBrowserElevenLabsApiKeys() {
  if (typeof window === 'undefined') {
    return []
  }

  return parseStoredKeys(window.localStorage.getItem(ELEVENLABS_BROWSER_API_KEYS_STORAGE_KEY))
}

export function saveBrowserElevenLabsApiKeys(rawValue: string) {
  if (typeof window === 'undefined') {
    return []
  }

  const parsed = parseStoredKeys(rawValue)

  if (parsed.length === 0) {
    window.localStorage.removeItem(ELEVENLABS_BROWSER_API_KEYS_STORAGE_KEY)
    return []
  }

  window.localStorage.setItem(ELEVENLABS_BROWSER_API_KEYS_STORAGE_KEY, parsed.join('\n'))
  return parsed
}

export function promptForBrowserElevenLabsApiKeys() {
  if (typeof window === 'undefined') {
    return []
  }

  const currentValue = window.localStorage.getItem(ELEVENLABS_BROWSER_API_KEYS_STORAGE_KEY) || ''
  const rawValue = window.prompt(
    'Paste one or more ElevenLabs API keys for browser-side Arabic audio. Separate multiple keys with commas or new lines. They stay only in this browser.',
    currentValue
  )

  if (rawValue === null) {
    return null
  }

  return saveBrowserElevenLabsApiKeys(rawValue)
}

export async function generateArabicAudioInBrowser(text: string, apiKeys = getBrowserElevenLabsApiKeys()): Promise<BrowserElevenLabsAudioResult> {
  if (apiKeys.length === 0) {
    return {
      kind: 'failed',
      reason: 'No browser ElevenLabs keys are configured.'
    }
  }

  let lastError: BrowserProviderError | null = null

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(
        `${ELEVENLABS_BROWSER_BASE_URL}/${encodeURIComponent(ELEVENLABS_BROWSER_VOICE_ID)}?output_format=${encodeURIComponent(ELEVENLABS_BROWSER_OUTPUT_FORMAT)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_BROWSER_MODEL_ID,
            language_code: 'ar'
          })
        }
      )

      if (response.ok) {
        const audio = new Uint8Array(await response.arrayBuffer())

        if (audio.byteLength === 0) {
          lastError = {
            kind: 'failed',
            reason: 'ElevenLabs returned empty browser audio.'
          }
          continue
        }

        return {
          kind: 'success',
          audio,
          contentType: response.headers.get('content-type') || 'audio/mpeg'
        }
      }

      const message = await readProviderError(response)
      const classified = classifyProviderError(response.status, message)
      lastError = classified

      if (!shouldTryNextKey(classified)) {
        return {
          kind: 'failed',
          reason: classified.reason
        }
      }
    } catch {
      lastError = {
        kind: 'transient',
        reason: 'Browser request to ElevenLabs failed.'
      }
    }
  }

  return {
    kind: 'failed',
    reason: lastError?.reason || 'Arabic audio could not be generated in the browser.'
  }
}

export function encodeAudioDataUrl(audio: Uint8Array, contentType = 'audio/mpeg') {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < audio.length; index += chunkSize) {
    binary += String.fromCharCode(...audio.subarray(index, index + chunkSize))
  }

  return `data:${contentType};base64,${btoa(binary)}`
}
