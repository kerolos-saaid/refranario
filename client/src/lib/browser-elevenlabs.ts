const ELEVENLABS_BROWSER_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

type BrowserProviderErrorKind = 'quota' | 'auth' | 'blocked' | 'transient' | 'failed'

type BrowserProviderError = {
  kind: BrowserProviderErrorKind
  reason: string
}

export type BrowserElevenLabsConfig = {
  enabled: boolean
  apiKeys: string[]
  modelId: string
  voiceId: string
  outputFormat: string
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

export async function generateArabicAudioInBrowser(
  text: string,
  config: BrowserElevenLabsConfig
): Promise<BrowserElevenLabsAudioResult> {
  if (!config.enabled || config.apiKeys.length === 0) {
    return {
      kind: 'failed',
      reason: 'No browser ElevenLabs keys are configured for the admin session.'
    }
  }

  let lastError: BrowserProviderError | null = null

  for (const apiKey of config.apiKeys) {
    try {
      const response = await fetch(
        `${ELEVENLABS_BROWSER_BASE_URL}/${encodeURIComponent(config.voiceId)}?output_format=${encodeURIComponent(config.outputFormat)}`,
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
