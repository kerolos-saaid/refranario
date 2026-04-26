import { useEffect, useRef, useState } from 'react'

import { generateArabicAudio } from '../lib/api'

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
  const isMountedRef = useRef(true)
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || '')
  const [isPreparing, setIsPreparing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      audioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setAudioUrl(initialAudioUrl || '')
    setIsPreparing(false)
    setIsPlaying(false)
    setError('')
  }, [sourceKey, initialAudioUrl])

  const stopPlayback = () => {
    audioRef.current?.pause()
    audioRef.current = null
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
        setError(result.message || 'El audio arabe esta temporalmente limitado. Intentalo pronto.')
        return
      }

      setError(result.message || 'No se pudo preparar el audio arabe ahora.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el audio arabe ahora.')
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
