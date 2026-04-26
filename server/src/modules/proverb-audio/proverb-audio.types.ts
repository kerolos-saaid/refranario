export type ArabicAudioStatus = 'ready' | 'generating' | 'failed' | 'limited' | 'unavailable' | null

export type ArabicAudioPublicState = {
  status: ArabicAudioStatus
  url: string | null
}

export type ArabicAudioResponse = {
  status: Exclude<ArabicAudioStatus, null>
  audioUrl?: string
  cached: boolean
  message?: string
  retryAfterSeconds?: number
}

export type ArabicAudioRow = {
  id: string
  arabic: string
  arabic_audio_url: string | null
  arabic_audio_object_key: string | null
  arabic_audio_text_hash: string | null
  arabic_audio_status: ArabicAudioStatus
  arabic_audio_error: string | null
  arabic_audio_model: string | null
  arabic_audio_voice_id: string | null
  arabic_audio_content_type: string | null
}

export type ElevenLabsSpeechSuccess = {
  kind: 'success'
  audio: Uint8Array
  contentType: string
}

export type ElevenLabsSpeechRetry = {
  kind: 'retry'
  reason: string
  retryAfterSeconds: number
}

export type ElevenLabsSpeechFailure = {
  kind: 'failed'
  reason: string
}

export type ElevenLabsSpeechResult = ElevenLabsSpeechSuccess | ElevenLabsSpeechRetry | ElevenLabsSpeechFailure
