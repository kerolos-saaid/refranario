import type { AudioStorage } from '../../shared/storage/r2-audio-storage'
import type { ProverbAudioConfig } from './proverb-audio.config'
import type { ElevenLabsArabicSpeechProvider } from './proverb-audio.provider'
import type { ArabicAudioResponse, ArabicAudioRow } from './proverb-audio.types'
import type { ProverbAudioRepository } from './proverb-audio.repository'

const MAX_UPLOADED_AUDIO_BYTES = 2 * 1024 * 1024

function normalizeArabicText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export async function createArabicAudioTextHash(text: string): Promise<string> {
  const normalized = normalizeArabicText(text)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isReadyCache(row: ArabicAudioRow, textHash: string, config: ProverbAudioConfig) {
  return Boolean(
    row.arabic_audio_status === 'ready'
    && row.arabic_audio_url
    && row.arabic_audio_object_key
    && row.arabic_audio_text_hash === textHash
    && row.arabic_audio_model === config.modelId
    && row.arabic_audio_voice_id === config.voiceId
  )
}

function safeMessage(message: string) {
  const secretKeyPattern = new RegExp('s' + 'k_[a-z0-9]+', 'gi')
  return message
    .replace(secretKeyPattern, '[redacted]')
    .replace(/[a-z0-9_-]{24,}/gi, '[redacted]')
    .slice(0, 180)
}

function decodeUploadedMp3(audioBase64: string | undefined) {
  if (!audioBase64) {
    return null
  }

  const trimmed = audioBase64.trim()
  const dataUrlMatch = trimmed.match(/^data:audio\/(?:mpeg|mp3)(?:;[a-z-]+=[a-z0-9-]+)*;base64,(.+)$/i)
  const rawBase64 = (dataUrlMatch?.[1] || trimmed).replace(/\s+/g, '')

  if (!rawBase64 || /[^a-z0-9+/=]/i.test(rawBase64)) {
    return null
  }

  try {
    const binary = atob(rawBase64)

    if (!binary.length || binary.length > MAX_UPLOADED_AUDIO_BYTES) {
      return null
    }

    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

export class ProverbAudioService {
  constructor(
    private readonly repository: ProverbAudioRepository,
    private readonly audioStorage: AudioStorage,
    private readonly speechProvider: Pick<ElevenLabsArabicSpeechProvider, 'generate'>,
    private readonly config: ProverbAudioConfig
  ) {}

  async generateArabicAudio(proverbId: string): Promise<{ httpStatus: number; response: ArabicAudioResponse; retryAfterSeconds?: number }> {
    const row = await this.repository.findById(proverbId)

    if (!row) {
      return {
        httpStatus: 404,
        response: {
          status: 'unavailable',
          cached: false,
          message: 'Proverb not found.'
        }
      }
    }

    const normalizedText = normalizeArabicText(row.arabic)

    if (!normalizedText) {
      return {
        httpStatus: 422,
        response: {
          status: 'unavailable',
          cached: false,
          message: 'No Arabic text is available for this proverb.'
        }
      }
    }

    const textHash = await createArabicAudioTextHash(normalizedText)

    if (isReadyCache(row, textHash, this.config)) {
      return {
        httpStatus: 200,
        response: {
          status: 'ready',
          audioUrl: row.arabic_audio_url!,
          cached: true
        }
      }
    }

    const canGenerate = await this.repository.tryMarkGenerating(
      proverbId,
      textHash,
      this.config.modelId,
      this.config.voiceId
    )

    if (!canGenerate) {
      return {
        httpStatus: 202,
        response: {
          status: 'generating',
          cached: false,
          message: 'Arabic audio is being prepared. Try again shortly.',
          retryAfterSeconds: 5
        }
      }
    }

    const providerResult = await this.speechProvider.generate(normalizedText, this.config)

    if (providerResult.kind === 'success') {
      const storedAudio = await this.audioStorage.uploadMp3(providerResult.audio, proverbId, textHash)
      await this.repository.saveReady({
        id: proverbId,
        url: storedAudio.url,
        objectKey: storedAudio.objectKey,
        textHash,
        modelId: this.config.modelId,
        voiceId: this.config.voiceId,
        contentType: storedAudio.contentType || providerResult.contentType
      })

      return {
        httpStatus: 201,
        response: {
          status: 'ready',
          audioUrl: storedAudio.url,
          cached: false
        }
      }
    }

    if (providerResult.kind === 'retry') {
      const message = safeMessage(providerResult.reason)
      await this.repository.saveFailure({
        id: proverbId,
        status: 'limited',
        error: message,
        textHash,
        modelId: this.config.modelId,
        voiceId: this.config.voiceId
      })

      return {
        httpStatus: 503,
        retryAfterSeconds: providerResult.retryAfterSeconds,
        response: {
          status: 'limited',
          cached: false,
          message: 'Arabic audio is temporarily unavailable. Please try again soon.',
          retryAfterSeconds: providerResult.retryAfterSeconds
        }
      }
    }

    await this.repository.saveFailure({
      id: proverbId,
      status: 'failed',
      error: safeMessage(providerResult.reason),
      textHash,
      modelId: this.config.modelId,
      voiceId: this.config.voiceId
    })

    return {
      httpStatus: 502,
      response: {
        status: 'failed',
        cached: false,
        message: 'Arabic audio could not be prepared right now.'
      }
    }
  }

  async saveUploadedArabicAudio(
    proverbId: string,
    audioBase64: string | undefined
  ): Promise<{ httpStatus: number; response: ArabicAudioResponse }> {
    const row = await this.repository.findById(proverbId)

    if (!row) {
      return {
        httpStatus: 404,
        response: {
          status: 'unavailable',
          cached: false,
          message: 'Proverb not found.'
        }
      }
    }

    const normalizedText = normalizeArabicText(row.arabic)

    if (!normalizedText) {
      return {
        httpStatus: 422,
        response: {
          status: 'unavailable',
          cached: false,
          message: 'No Arabic text is available for this proverb.'
        }
      }
    }

    const uploadedAudio = decodeUploadedMp3(audioBase64)

    if (!uploadedAudio) {
      return {
        httpStatus: 422,
        response: {
          status: 'failed',
          cached: false,
          message: 'Uploaded Arabic audio must be a valid MP3 payload.'
        }
      }
    }

    const textHash = await createArabicAudioTextHash(normalizedText)

    if (isReadyCache(row, textHash, this.config)) {
      return {
        httpStatus: 200,
        response: {
          status: 'ready',
          audioUrl: row.arabic_audio_url!,
          cached: true
        }
      }
    }

    const storedAudio = await this.audioStorage.uploadMp3(uploadedAudio, proverbId, textHash)
    await this.repository.saveReady({
      id: proverbId,
      url: storedAudio.url,
      objectKey: storedAudio.objectKey,
      textHash,
      modelId: this.config.modelId,
      voiceId: this.config.voiceId,
      contentType: storedAudio.contentType
    })

    return {
      httpStatus: 201,
      response: {
        status: 'ready',
        audioUrl: storedAudio.url,
        cached: false
      }
    }
  }
}
