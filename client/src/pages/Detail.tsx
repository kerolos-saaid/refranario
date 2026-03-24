import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  fetchProverb,
  deleteProverb,
  type Proverb,
} from '../lib/api'
import { useSpeechSynthesisPlayback } from '../hooks/useSpeechSynthesisPlayback'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proverb, setProverb] = useState<Proverb | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (id) {
      loadProverb()
    }
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
  }, [id])

  const loadProverb = async () => {
    try {
      const data = await fetchProverb(id!)
      setProverb(data)
    } catch (error) {
      console.error('Failed to load proverb:', error)
      navigate('/home')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este refrán?')) {
      await deleteProverb(id!)
      navigate('/home')
    }
  }

  const {
    isSupported: isSpanishAudioSupported,
    isPlaying: isSpanishAudioPlaying,
    error: spanishAudioError,
    togglePlayback: toggleSpanishAudioPlayback,
  } = useSpeechSynthesisPlayback({
    sourceKey: proverb ? `${proverb.id}:spanish:${proverb.spanish}` : 'detail-spanish-empty',
    text: proverb?.spanish || '',
    lang: 'es-ES',
    emptyTextMessage: 'No hay texto en español para reproducir.',
  })

  const {
    isSupported: isArabicAudioSupported,
    isPlaying: isArabicAudioPlaying,
    error: arabicAudioError,
    togglePlayback: toggleArabicAudioPlayback,
  } = useSpeechSynthesisPlayback({
    sourceKey: proverb ? `${proverb.id}:${proverb.arabic}` : 'detail-empty',
    text: proverb?.arabic || '',
    lang: 'ar',
    emptyTextMessage: 'No hay texto árabe para reproducir.',
  })

  const {
    isSupported: isEnglishAudioSupported,
    isPlaying: isEnglishAudioPlaying,
    error: englishAudioError,
    togglePlayback: toggleEnglishAudioPlayback,
  } = useSpeechSynthesisPlayback({
    sourceKey: proverb ? `${proverb.id}:english:${proverb.english}` : 'detail-english-empty',
    text: proverb?.english || '',
    lang: 'en-US',
    emptyTextMessage: 'No hay texto en inglés para reproducir.',
  })

  const speakerButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent shadow-sm transition-all hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

  if (loading) {
    return (
      <div className="bg-background min-h-screen font-serif text-ink flex flex-col">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderTopColor: '#B02C33' }} />
        </div>
      </div>
    )
  }

  if (!proverb) return null

  return (
    <div className="bg-background min-h-screen font-serif text-ink flex flex-col">
      <nav className="sticky top-0 z-50 shadow-lg relative" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between p-4 max-w-7xl mx-auto w-full">
          <Link
            to="/home"
            aria-label="Volver al archivo"
            className="flex items-center text-white/80 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">arrow_back</span>
            <span className="ml-2 font-ui text-sm font-medium hidden sm:block">Volver al Archivo</span>
          </Link>
          <img
            src="/new_logo_name_only.png"
            alt="Señor Shaعbi"
            className="absolute left-1/2 h-7 -translate-x-1/2 object-contain brightness-0 invert"
          />
          <div className="w-10 sm:w-36" aria-hidden="true" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-grow w-full bg-background"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--fixed-bottom-stack-height, 0px) + 2rem)' }}
      >
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img id="proverb-image" src={proverb.image} alt={proverb.spanish} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, #FFFAF8 0%, transparent 100%)' }} />
        </div>

        <div className="max-w-4xl mx-auto -mt-8 relative z-10">
          <div className="bg-card border-bookplate shadow-lg mx-4 p-6 md:p-10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #B02C33 0%, #DF3D4C 40%, #F79F3F 100%)' }} />

            <section className="pt-4" lang="es" style={{ animation: 'fade-in 0.4s ease-out' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-accent text-sm" aria-hidden="true">history_edu</span>
                <h2 className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Origen (Español)</h2>
                <button
                  type="button"
                  onClick={toggleSpanishAudioPlayback}
                  disabled={!isSpanishAudioSupported}
                  aria-pressed={isSpanishAudioPlaying}
                  aria-label={
                    isSpanishAudioPlaying
                      ? 'Detener pronunciación en español'
                      : 'Escuchar pronunciación en español'
                  }
                  title="Escuchar español"
                  className={speakerButtonClass}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {isSpanishAudioPlaying ? 'stop_circle' : 'volume_up'}
                  </span>
                </button>
              </div>
              <h1 className="text-primary font-display text-2xl md:text-3xl leading-snug font-bold">
                {proverb.spanish}
              </h1>
              <span className="sr-only" role="status" aria-live="polite">
                {isSpanishAudioPlaying ? 'Audio en español reproduciéndose.' : ''}
              </span>
              {spanishAudioError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {spanishAudioError}
                </p>
              )}
            </section>

            <div className="my-6 h-px" style={{ background: 'linear-gradient(90deg, #B02C33, #DF3D4C, #F79F3F, transparent)', animation: 'fade-in 0.5s ease-out' }} />

            <section className="text-right" dir="rtl" lang="ar" style={{ animation: 'fade-in 0.6s ease-out' }}>
              <div className="flex items-center gap-2 mb-3 justify-end">
                <button
                  type="button"
                  onClick={toggleArabicAudioPlayback}
                  disabled={!isArabicAudioSupported}
                  aria-pressed={isArabicAudioPlaying}
                  aria-label={
                    isArabicAudioPlaying
                      ? 'Detener pronunciación árabe'
                      : 'Escuchar pronunciación árabe'
                  }
                  title="Escuchar árabe"
                  className={speakerButtonClass}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {isArabicAudioPlaying ? 'stop_circle' : 'volume_up'}
                  </span>
                </button>
                <h2 className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Equivalente (Árabe)</h2>
                <span className="material-symbols-outlined text-accent text-sm" aria-hidden="true">translate</span>
              </div>
              <p className="font-arabic text-2xl md:text-3xl leading-relaxed text-ink">
                {proverb.arabic}
              </p>
              <span className="sr-only" role="status" aria-live="polite">
                {isArabicAudioPlaying ? 'Audio árabe reproduciéndose.' : ''}
              </span>
              {arabicAudioError && (
                <p className="mt-3 text-sm text-red-600" dir="ltr" role="alert">
                  {arabicAudioError}
                </p>
              )}
            </section>

            <section lang="en" style={{ animation: 'fade-in 0.7s ease-out' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-accent text-sm" aria-hidden="true">language</span>
                <h2 className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Traducción (Inglés)</h2>
                <button
                  type="button"
                  onClick={toggleEnglishAudioPlayback}
                  disabled={!isEnglishAudioSupported}
                  aria-pressed={isEnglishAudioPlaying}
                  aria-label={
                    isEnglishAudioPlaying
                      ? 'Detener pronunciación en inglés'
                      : 'Escuchar pronunciación en inglés'
                  }
                  title="Escuchar inglés"
                  className={speakerButtonClass}
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {isEnglishAudioPlaying ? 'stop_circle' : 'volume_up'}
                  </span>
                </button>
              </div>
              <p className="font-newsreader text-lg md:text-xl text-muted">
                "{proverb.english}"
              </p>
              <span className="sr-only" role="status" aria-live="polite">
                {isEnglishAudioPlaying ? 'Audio en inglés reproduciéndose.' : ''}
              </span>
              {englishAudioError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {englishAudioError}
                </p>
              )}
            </section>

            <div className="space-y-4" lang="es" style={{ animation: 'fade-in 0.8s ease-out' }}>
              <div>
                <h2 className="text-ink font-ui text-sm font-bold mb-2">Definición</h2>
                <p className="font-serif text-muted text-sm leading-relaxed text-right">
                  {proverb.note}
                </p>
              </div>

              <div className="pt-4 border-t border-primary/10">
                <h2 className="text-ink font-ui text-sm font-bold mb-2">Ejemplo de Uso</h2>
                <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(247,159,63,0.08), rgba(223,61,76,0.04))', borderLeft: '3px solid #F79F3F' }}>
                  <p className="font-serif text-ink text-sm leading-relaxed">
                    <span className="text-accent font-ui text-xs uppercase block mb-1 font-bold">Uso</span>
                    No hagas cosas sin sentido, recuerda que el que come pan con leche se duerme.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isLoggedIn && (
        <div
          className="sticky w-full border-t border-primary/10 p-4 shadow-lg z-40 fixed-bottom-stack-offset"
          style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button type="button" onClick={handleDelete} className="text-white/70 hover:text-white font-ui text-sm font-medium flex items-center gap-2 px-4 py-2 transition-colors">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
              Eliminar
            </button>
            <Link to={`/edit/${proverb.id}`} className="bg-accent text-white hover:bg-accent/90 transition-all rounded-lg px-6 py-2.5 font-ui text-sm font-medium flex items-center gap-2 shadow-md">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">edit_note</span>
              Editar
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .border-bookplate {
          border: 1px solid rgba(176,44,51,0.1);
          border-radius: 0.75rem;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
