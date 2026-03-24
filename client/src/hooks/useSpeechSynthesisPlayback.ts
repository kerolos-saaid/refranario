import { useEffect, useRef, useState } from 'react'

type UseSpeechSynthesisPlaybackOptions = {
  sourceKey: string
  text: string
  lang: string
  emptyTextMessage: string
  unsupportedMessage?: string
}

function normalizeSpeechText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const normalizedLang = lang.toLowerCase()
  const primaryLang = normalizedLang.split('-')[0]

  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalizedLang) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${primaryLang}-`)) ||
    voices.find((voice) => voice.lang.toLowerCase() === primaryLang) ||
    (primaryLang === 'ar'
      ? voices.find((voice) => voice.name.toLowerCase().includes('arab'))
      : undefined) ||
    null
  )
}

export function useSpeechSynthesisPlayback({
  sourceKey,
  text,
  lang,
  emptyTextMessage,
  unsupportedMessage = 'Este navegador no admite la pronunciacion por voz.',
}: UseSpeechSynthesisPlaybackOptions) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isMountedRef = useRef(true)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')

  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  useEffect(() => {
    isMountedRef.current = true

    if (!isSupported) {
      return () => {
        isMountedRef.current = false
      }
    }

    const synth = window.speechSynthesis

    const syncVoices = () => {
      if (!isMountedRef.current) return
      setVoices(synth.getVoices())
    }

    syncVoices()
    synth.addEventListener('voiceschanged', syncVoices)

    return () => {
      isMountedRef.current = false
      synth.cancel()
      synth.removeEventListener('voiceschanged', syncVoices)
    }
  }, [isSupported])

  useEffect(() => {
    if (!isSupported) {
      setIsPlaying(false)
      setError('')
      return
    }

    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setIsPlaying(false)
    setError('')
  }, [isSupported, sourceKey])

  const togglePlayback = () => {
    if (!isSupported) {
      setError(unsupportedMessage)
      return
    }

    const synth = window.speechSynthesis

    if (isPlaying) {
      synth.cancel()
      setIsPlaying(false)
      setError('')
      return
    }

    const normalizedText = normalizeSpeechText(text)

    if (!normalizedText) {
      setError(emptyTextMessage)
      return
    }

    setError('')

    const utterance = new SpeechSynthesisUtterance(normalizedText)
    utterance.lang = lang
    utterance.rate = 0.9

    const matchedVoice = pickVoice(voices, lang)
    if (matchedVoice) {
      utterance.voice = matchedVoice
    }

    utterance.onstart = () => {
      if (!isMountedRef.current) return
      setIsPlaying(true)
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

      setError('No se pudo reproducir la pronunciacion en este navegador.')
    }

    utteranceRef.current = utterance
    synth.cancel()
    synth.speak(utterance)
  }

  return {
    isSupported,
    isPlaying,
    error,
    togglePlayback,
  }
}
