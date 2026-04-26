import { useEffect, useRef, useState } from 'react'

import {
  fetchArabicAudioBrowserConfig,
  generateArabicAudio,
  isAdmin,
  uploadArabicAudio
} from '../lib/api'
import {
  type BrowserElevenLabsConfig,
  encodeAudioDataUrl,
  generateArabicAudioInBrowser
} from '../lib/browser-elevenlabs'

type UseArabicAudioPlaybackOptions = {
  proverbId?: string
  sourceKey: string
  initialAudioUrl?: string | null
  enabled?: boolean
  disabledMessage?: string
  emptyTextMessage?: string
  text?: string
}

function normalizeText(text: string | undefined) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function pickArabicVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang.toLowerCase() === 'ar') ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('ar-')) ||
    voices.find((voice) => voice.name.toLowerCase().includes('arab')) ||
    null
  )
}

let cachedAdminBrowserConfig: BrowserElevenLabsConfig | null = null
let adminBrowserConfigRequest: Promise<BrowserElevenLabsConfig | null> | null = null

async function loadAdminBrowserConfig() {
  if (cachedAdminBrowserConfig) {
    return cachedAdminBrowserConfig
  }

  if (!adminBrowserConfigRequest) {
    adminBrowserConfigRequest = fetchArabicAudioBrowserConfig()
      .then((config) => {
        cachedAdminBrowserConfig = config
        return config
      })
      .catch(() => null)
      .finally(() => {
        adminBrowserConfigRequest = null
      })
  }

  return await adminBrowserConfigRequest
}

export function useArabicAudioPlayback({
  proverbId,
  sourceKey,
  initialAudioUrl,
  enabled = true,
  disabledMessage = 'Guarda el refran antes de preparar el audio arabe.',
  emptyTextMessage = 'No hay texto arabe para reproducir.',
  text
}: UseArabicAudioPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const generatedObjectUrlRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || '')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isPreparing, setIsPreparing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const canUseSpeechFallback =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const releaseGeneratedObjectUrl = () => {
    if (generatedObjectUrlRef.current) {
      URL.revokeObjectURL(generatedObjectUrlRef.current)
      generatedObjectUrlRef.current = null
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      audioRef.current?.pause()
      releaseGeneratedObjectUrl()
      if (canUseSpeechFallback) {
        window.speechSynthesis.cancel()
      }
    }
  }, [canUseSpeechFallback])

  useEffect(() => {
    if (!canUseSpeechFallback) {
      setVoices([])
      return
    }

    const synth = window.speechSynthesis
    const syncVoices = () => {
      if (!isMountedRef.current) return
      setVoices(synth.getVoices())
    }

    syncVoices()
    synth.addEventListener('voiceschanged', syncVoices)

    return () => {
      synth.removeEventListener('voiceschanged', syncVoices)
    }
  }, [canUseSpeechFallback])

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    utteranceRef.current = null
    releaseGeneratedObjectUrl()
    if (canUseSpeechFallback) {
      window.speechSynthesis.cancel()
    }
    setAudioUrl(initialAudioUrl || '')
    setIsPreparing(false)
    setIsPlaying(false)
    setError('')
  }, [canUseSpeechFallback, sourceKey, initialAudioUrl])

  const stopPlayback = () => {
    audioRef.current?.pause()
    audioRef.current = null
    utteranceRef.current = null
    if (canUseSpeechFallback) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
  }

  const playUrl = (url: string) => {
    stopPlayback()
    const audio = new Audio(url)
    audioRef.current = audio

    audio.onplaying = () => {
      if (!isMountedRef.current) return
      setIsPlaying(true)
      setError('')
    }

    audio.onended = () => {
      if (!isMountedRef.current) return
      setIsPlaying(false)
    }

    audio.onerror = () => {
      if (!isMountedRef.current) return
      setIsPlaying(false)
      setError('No se pudo reproducir el audio arabe guardado.')
    }

    void audio.play().catch(() => {
      if (!isMountedRef.current) return
      setIsPlaying(false)
      setError('No se pudo iniciar el audio arabe.')
    })
  }

  const playBrowserGeneratedAudio = async () => {
    if (!isAdmin()) {
      return false
    }

    const normalizedText = normalizeText(text)
    const browserConfig = await loadAdminBrowserConfig()

    if (!normalizedText || !browserConfig || !browserConfig.enabled || browserConfig.apiKeys.length === 0) {
      return false
    }

    const browserResult = await generateArabicAudioInBrowser(normalizedText, browserConfig)

    if (browserResult.kind !== 'success') {
      return false
    }

    const objectUrl = URL.createObjectURL(new Blob([browserResult.audio], { type: browserResult.contentType }))
    releaseGeneratedObjectUrl()
    generatedObjectUrlRef.current = objectUrl

    let persistedAudioUrl = ''

    if (proverbId && isAdmin()) {
      try {
        const uploadResult = await uploadArabicAudio(
          proverbId,
          encodeAudioDataUrl(browserResult.audio, browserResult.contentType)
        )

        if (uploadResult.status === 'ready' && uploadResult.audioUrl) {
          persistedAudioUrl = uploadResult.audioUrl
        }
      } catch (uploadError) {
        console.warn('Failed to save browser-generated Arabic audio:', uploadError)
      }
    }

    setAudioUrl(persistedAudioUrl || objectUrl)
    playUrl(objectUrl)
    return true
  }

  const playSpeechFallback = (message?: string) => {
    if (!canUseSpeechFallback) {
      setError(message || 'No se pudo preparar el audio arabe ahora.')
      return false
    }

    const normalizedText = normalizeText(text)
    if (!normalizedText) {
      setError(emptyTextMessage)
      return false
    }

    stopPlayback()

    const utterance = new SpeechSynthesisUtterance(normalizedText)
    utterance.lang = 'ar'
    utterance.rate = 0.9

    const matchedVoice = pickArabicVoice(voices)
    if (matchedVoice) {
      utterance.voice = matchedVoice
    }

    utterance.onstart = () => {
      if (!isMountedRef.current) return
      setIsPlaying(true)
      setError('')
    }

    utterance.onend = () => {
      if (!isMountedRef.current) return
      setIsPlaying(false)
    }

    utterance.onerror = (event) => {
      if (!isMountedRef.current) return
      setIsPlaying(false)

      if (event.error === 'canceled' || event.error === 'interrupted') {
        setError('')
        return
      }

      setError(message || 'No se pudo preparar el audio arabe ahora.')
    }

    utteranceRef.current = utterance
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    return true
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      stopPlayback()
      setError('')
      return
    }

    if (!enabled || !proverbId) {
      setError(disabledMessage)
      return
    }

    if (!normalizeText(text)) {
      setError(emptyTextMessage)
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false && !audioUrl) {
      if (playSpeechFallback('Conectate a internet para preparar el audio arabe por primera vez.')) {
        return
      }
      setError('Conectate a internet para preparar el audio arabe por primera vez.')
      return
    }

    if (audioUrl) {
      playUrl(audioUrl)
      return
    }

    setIsPreparing(true)
    setError('')

    try {
      const result = await generateArabicAudio(proverbId)

      if (result.status === 'ready' && result.audioUrl) {
        setAudioUrl(result.audioUrl)
        playUrl(result.audioUrl)
        return
      }

      if (result.status === 'generating') {
        setError(result.message || 'El audio arabe se esta preparando. Intentalo de nuevo en unos segundos.')
        return
      }

      if (result.status === 'limited') {
        if (await playBrowserGeneratedAudio()) {
          return
        }
        if (playSpeechFallback(result.message || 'El audio arabe esta temporalmente limitado. Intentalo pronto.')) {
          return
        }
        setError(result.message || 'El audio arabe esta temporalmente limitado. Intentalo pronto.')
        return
      }

      if (result.status === 'failed') {
        if (await playBrowserGeneratedAudio()) {
          return
        }
      }

      if (playSpeechFallback(result.message || 'No se pudo preparar el audio arabe ahora.')) {
        return
      }
      setError(result.message || 'No se pudo preparar el audio arabe ahora.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo preparar el audio arabe ahora.'
      if (await playBrowserGeneratedAudio()) {
        return
      }
      if (playSpeechFallback(message)) {
        return
      }
      setError(message)
    } finally {
      if (isMountedRef.current) {
        setIsPreparing(false)
      }
    }
  }

  return {
    isSupported: enabled && Boolean(proverbId),
    isPreparing,
    isPlaying,
    error,
    togglePlayback
  }
}
