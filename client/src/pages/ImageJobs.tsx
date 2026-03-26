import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import {
  backfillProverbImageJobs,
  fetchProverbImageJobs,
  isAdmin,
  regenerateProverbImage,
  type ProverbImageJob,
  type ProverbImageJobStatus,
} from '../lib/api'

type Notice = {
  tone: 'success' | 'error' | 'info'
  message: string
}

type StatusMeta = {
  label: string
  title: string
  description: string
  icon: string
  pillClassName: string
  cardClassName: string
}

const STATUS_ORDER: ProverbImageJobStatus[] = ['failed', 'retry', 'processing', 'pending']

const STATUS_META: Record<Exclude<ProverbImageJobStatus, null | 'complete'>, StatusMeta> = {
  failed: {
    label: 'Necesita ayuda',
    title: 'Necesitan revisión',
    description: 'No pudo terminar solo. Conviene revisarlo o relanzarlo.',
    icon: 'error',
    pillClassName: 'bg-red-50 text-red-700 border border-red-200',
    cardClassName: 'border-red-200 bg-red-50/40',
  },
  retry: {
    label: 'Se reintentará',
    title: 'Volverán a intentarse',
    description: 'El sistema esperará un poco y volverá a probar automáticamente.',
    icon: 'refresh',
    pillClassName: 'bg-amber-50 text-amber-800 border border-amber-200',
    cardClassName: 'border-amber-200 bg-amber-50/50',
  },
  processing: {
    label: 'En creación',
    title: 'Creándose ahora',
    description: 'La imagen se está generando en este momento.',
    icon: 'auto_awesome',
    pillClassName: 'bg-sky-50 text-sky-800 border border-sky-200',
    cardClassName: 'border-sky-200 bg-sky-50/50',
  },
  pending: {
    label: 'En espera',
    title: 'Esperando turno',
    description: 'Ya está anotado y pasará a creación cuando le toque.',
    icon: 'schedule',
    pillClassName: 'bg-stone-100 text-stone-700 border border-stone-200',
    cardClassName: 'border-stone-200 bg-white',
  },
}

function formatDateTime(value: string | null) {
  if (!value) return null

  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatJobError(error: string) {
  const normalized = error.toLowerCase()

  if (
    normalized.includes('daily free allocation')
    || normalized.includes('10,000 neurons')
    || normalized.includes('workers paid plan')
    || normalized.includes('used up your daily free allocation')
  ) {
    return 'Se alcanzó el cupo diario de imágenes por hoy. El sistema volverá a intentarlo cuando el límite se renueve.'
  }

  if (
    normalized.includes('rate limit')
    || normalized.includes('rate-limited')
    || normalized.includes('quota')
    || normalized.includes('resource_exhausted')
  ) {
    return 'La capacidad disponible se agotó por ahora. El sistema esperará un poco antes de volver a intentarlo.'
  }

  return error
}

function summarizeJobs(jobs: ProverbImageJob[]) {
  return jobs.reduce(
    (summary, job) => {
      if (job.status === 'pending') summary.pending += 1
      if (job.status === 'processing') summary.processing += 1
      if (job.status === 'retry') summary.retry += 1
      if (job.status === 'failed') summary.failed += 1
      return summary
    },
    {
      pending: 0,
      processing: 0,
      retry: 0,
      failed: 0,
    }
  )
}

function groupJobsByStatus(jobs: ProverbImageJob[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    jobs: jobs.filter((job) => job.status === status),
  })).filter((group) => group.jobs.length > 0)
}

export default function ImageJobs() {
  const [jobs, setJobs] = useState<ProverbImageJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const adminUser = isAdmin()

  const loadJobs = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const data = await fetchProverbImageJobs()
      setJobs(data)
      setLoadError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el estado de imágenes.'
      setLoadError(message)
      setNotice({
        tone: 'error',
        message,
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!adminUser) return

    void loadJobs('initial')

    const interval = window.setInterval(() => {
      void loadJobs('refresh')
    }, 30000)

    return () => window.clearInterval(interval)
  }, [adminUser, loadJobs])

  const summary = useMemo(() => summarizeJobs(jobs), [jobs])
  const groupedJobs = useMemo(() => groupJobsByStatus(jobs), [jobs])

  const handleBackfill = async () => {
    setBackfilling(true)
    setNotice(null)

    try {
      const result = await backfillProverbImageJobs()
      const message = result.enqueued > 0
        ? `Se mandaron ${result.enqueued} refranes a preparación de imagen.`
        : 'No encontramos refranes nuevos sin seguimiento de imagen.'

      setNotice({
        tone: 'success',
        message,
      })
      await loadJobs('refresh')
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'No se pudo revisar los faltantes.',
      })
    } finally {
      setBackfilling(false)
    }
  }

  const handleRegenerate = async (jobId: string) => {
    setRegeneratingId(jobId)
    setNotice(null)

    try {
      await regenerateProverbImage(jobId)
      setNotice({
        tone: 'success',
        message: 'Se volvió a poner este refrán en preparación.',
      })
      await loadJobs('refresh')
    } catch (error) {
      setNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'No se pudo relanzar este refrán.',
      })
    } finally {
      setRegeneratingId(null)
    }
  }

  if (!adminUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-ink">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(176,44,51,0.05) 0%, rgba(247,159,63,0.03) 42%, transparent 100%)' }}
      />

      <header
        className="sticky top-0 z-30 overflow-hidden border-b border-white/10 backdrop-blur-md"
        style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
        <div className="relative mx-auto max-w-5xl px-4 pb-3 pt-3 md:px-8 md:pb-4 md:pt-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link
              to="/home"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15 md:h-11 md:w-auto md:px-3"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
              <span className="hidden sm:inline">Archivo</span>
            </Link>

            <div className="min-w-0 text-center">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 md:text-xs">
                Centro de imágenes
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadJobs('refresh')}
              disabled={refreshing || loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 md:h-11 md:w-auto md:px-3"
            >
              <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true">sync</span>
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 flex-1 px-4 pb-28 pt-6 md:px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--fixed-bottom-stack-height, 0px) + 7rem)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <section className="bookplate-border overflow-hidden p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Panel de seguimiento</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Aquí ves si cada imagen está en fila, generándose o esperando un nuevo intento automático.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackfill}
                disabled={backfilling}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:py-2"
                style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
              >
                <span className={`material-symbols-outlined text-lg ${backfilling ? 'animate-spin' : ''}`} aria-hidden="true">playlist_add_check</span>
                <span>Buscar faltantes</span>
              </button>
            </div>

            {notice && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  notice.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : notice.tone === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-stone-200 bg-stone-50 text-stone-700'
                }`}
                role="status"
                aria-live="polite"
              >
                {notice.message}
              </div>
            )}
          </section>

          <section className={`grid grid-cols-2 gap-3 ${summary.failed > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <div className="bookplate-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Esperando</p>
              <p className="mt-3 text-3xl font-bold text-ink">{summary.pending}</p>
              <p className="mt-2 text-sm text-muted">Quedaron listos en la fila.</p>
            </div>
            <div className="bookplate-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">En creación</p>
              <p className="mt-3 text-3xl font-bold text-ink">{summary.processing}</p>
              <p className="mt-2 text-sm text-muted">Se están generando ahora.</p>
            </div>
            <div className="bookplate-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Reintento</p>
              <p className="mt-3 text-3xl font-bold text-ink">{summary.retry}</p>
              <p className="mt-2 text-sm text-muted">Se relanzarán solos.</p>
            </div>
            {summary.failed > 0 && (
              <div className="bookplate-border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Revisión</p>
                <p className="mt-3 text-3xl font-bold text-ink">{summary.failed}</p>
                <p className="mt-2 text-sm text-muted">Necesitan decisión manual.</p>
              </div>
            )}
          </section>

          {loading ? (
            <section className="bookplate-border p-8 text-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary/60" aria-hidden="true">progress_activity</span>
              <p className="mt-3 text-base text-muted">Cargando el estado de imágenes...</p>
            </section>
          ) : loadError && jobs.length === 0 ? (
            <section className="bookplate-border p-8 text-center md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700">
                <span className="material-symbols-outlined text-3xl" aria-hidden="true">cloud_off</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-primary">No pudimos leer el estado</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted md:text-base">
                Revisa la conexión o vuelve a actualizar para cargar la cola de imágenes.
              </p>
            </section>
          ) : jobs.length === 0 ? (
            <section className="bookplate-border p-8 text-center md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-3xl" aria-hidden="true">check_circle</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-primary">Todo al día</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted md:text-base">
                Ahora mismo no hay refranes esperando imagen ni casos que necesiten revisión.
              </p>
            </section>
          ) : (
            groupedJobs.map((group) => {
              const meta = STATUS_META[group.status as Exclude<ProverbImageJobStatus, null | 'complete'>]

              return (
                <section key={group.status} className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-primary md:text-xl">{meta.title}</h2>
                      <p className="text-sm text-muted">{meta.description}</p>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${meta.pillClassName}`}>
                      <span className="material-symbols-outlined text-base" aria-hidden="true">{meta.icon}</span>
                      <span>{group.jobs.length}</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {group.jobs.map((job) => (
                      <article
                        key={job.id}
                        className={`bookplate-border border p-4 md:p-5 ${meta.cardClassName}`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.pillClassName}`}>
                              <span className="material-symbols-outlined text-sm" aria-hidden="true">{meta.icon}</span>
                              <span>{meta.label}</span>
                            </div>

                            <h3 className="mt-3 text-lg font-bold text-ink md:text-xl" lang="es">
                              {job.spanish}
                            </h3>
                            <p className="mt-1 text-sm text-muted md:text-base" lang="en">
                              {job.english}
                            </p>

                            <div className="mt-4 grid gap-3 text-sm text-ink md:grid-cols-3">
                              <div>
                                <p className="font-semibold text-primary">Intentos</p>
                                <p className="text-muted">{job.attempts}</p>
                              </div>

                              <div>
                                <p className="font-semibold text-primary">
                                  {job.status === 'retry' ? 'Próximo intento' : 'Estado'}
                                </p>
                                <p className="text-muted">
                                  {job.status === 'retry'
                                    ? (formatDateTime(job.nextRetryAt) || 'Automático')
                                    : meta.description}
                                </p>
                              </div>

                              <div>
                                <p className="font-semibold text-primary">Acción</p>
                                <p className="text-muted">
                                  {job.status === 'failed'
                                    ? 'Conviene revisarlo y volver a lanzarlo.'
                                    : job.status === 'retry'
                                      ? 'Esperará un poco antes de probar otra vez.'
                                      : job.status === 'processing'
                                        ? 'Solo hay que dejarlo terminar.'
                                        : 'No requiere intervención.'}
                                </p>
                              </div>
                            </div>

                            {job.error && (
                              <details className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-muted">
                                <summary className="cursor-pointer font-medium text-primary">Ver detalle</summary>
                                <p className="mt-2 whitespace-pre-wrap break-words">{formatJobError(job.error)}</p>
                              </details>
                            )}
                          </div>

                          {(job.status === 'failed' || job.status === 'retry') && (
                            <button
                              type="button"
                              onClick={() => void handleRegenerate(job.id)}
                              disabled={regeneratingId === job.id}
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className={`material-symbols-outlined text-base ${regeneratingId === job.id ? 'animate-spin' : ''}`} aria-hidden="true">refresh</span>
                              <span>{regeneratingId === job.id ? 'Relanzando...' : 'Intentar ahora'}</span>
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
