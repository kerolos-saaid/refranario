import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { isAdmin, logout, type Proverb } from '../lib/api'
import { getApiBase } from '../lib/api-base'
import { OptimizedImage } from '../components/OptimizedImage'
import { ProverbCardSkeleton, ProverbListSkeleton } from '../components/Skeleton'

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')
const ITEMS_PER_PAGE = 10

export default function Home() {
  const [proverbs, setProverbs] = useState<Proverb[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLetter, setSelectedLetter] = useState('')
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setIsAdminUser(isAdmin())
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProverbs(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedLetter])

  const loadProverbs = async (reset = false, targetPage?: number) => {
    const currentPage = targetPage ?? (reset ? 1 : page)
    const shouldReset = reset || (targetPage === undefined && page === 1)

    if (shouldReset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setSearchLoading(true)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedLetter) params.append('letter', selectedLetter)

      const res = await fetch(`${getApiBase()}/proverbs?${params}`)
      const data = await res.json()

      if (shouldReset) {
        setProverbs(data.proverbs)
        setNewItemIds(new Set())
      } else {
        const newIds = data.proverbs.map((p: Proverb) => p.id)
        setProverbs((prev) => [...prev, ...data.proverbs])
        setNewItemIds(new Set(newIds))
      }
      setHasMore(data.pagination?.hasMore ?? false)
      setPage(currentPage)
    } catch (error) {
      console.error('Failed to load proverbs:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setSearchLoading(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadProverbs(false, nextPage)
    }
  }

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const circle = document.createElement('span')
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`
    circle.classList.add('ripple')

    const ripple = button.getElementsByClassName('ripple')[0]
    if (ripple) {
      ripple.remove()
    }

    button.appendChild(circle)
  }

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    setSelectedLetter('')
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setIsAdminUser(false)
  }, [])

  const filteredProverbs = proverbs
  const resultsSummary = loading
    ? 'Cargando refranes.'
    : filteredProverbs.length === 0
      ? 'No se encontraron refranes.'
      : `Mostrando ${filteredProverbs.length} refranes${selectedLetter ? ` para la letra ${selectedLetter}` : ''}${searchQuery ? ` para la búsqueda ${searchQuery}` : ''}.`

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-background">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(176,44,51,0.03) 0%, rgba(247,159,63,0.02) 50%, transparent 100%)' }} />

      <header className="flex-none z-30 sticky top-0 backdrop-blur-md bg-primary/98" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />

        <div className="relative px-4 md:px-8 pb-4 pt-5 flex flex-col gap-3 max-w-4xl mx-auto">
          <div className="flex items-center justify-center relative">
            {isAdminUser && (
              <Link
                to="/admin/images"
                aria-label="Ver el estado de creación de imágenes"
                className="absolute left-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">photo_library</span>
                <span className="hidden md:inline text-sm font-medium">Imágenes</span>
              </Link>
            )}
            <div className="flex items-center gap-3">
              <img src="/new_logo_name_only.png" alt="Señor Shaعbi" className="h-8 md:h-10 object-contain brightness-0 invert" />
            </div>
            {isAdminUser ? (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión de curador"
                className="absolute right-0 text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">logout</span>
              </button>
            ) : (
              <Link
                to="/login"
                aria-label="Abrir acceso de curador"
                className="absolute right-0 text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-2xl" aria-hidden="true">account_circle</span>
              </Link>
            )}
          </div>

          <div className="relative w-full max-w-xl mx-auto">
            <label className="sr-only" htmlFor="search-input">
              Buscar refranes
            </label>
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {searchLoading ? (
                <span className="material-symbols-outlined text-white/50 text-xl animate-spin" aria-hidden="true">sync</span>
              ) : (
                <span className="material-symbols-outlined text-white/50 text-xl" aria-hidden="true">search</span>
              )}
            </div>
            <input
              id="search-input"
              aria-controls="proverb-results"
              className="w-full bg-white/15 border border-white/20 rounded-xl py-3 md:py-2.5 pl-12 pr-4 text-white placeholder-white/50 font-ui text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 focus:bg-white/20 transition-all"
              placeholder="Buscar en español, العربية, or English..."
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div
            className="w-full overflow-x-auto md:overflow-visible no-scrollbar py-1"
            role="toolbar"
            aria-label="Filtrar refranes por letra inicial"
          >
            <div className="flex gap-1 justify-start min-w-max md:min-w-0 md:flex-wrap md:justify-center px-1 py-1">
              {ALPHABET.map((letter, i) => (
                <button
                  type="button"
                  key={letter}
                  aria-controls="proverb-results"
                  aria-pressed={selectedLetter === letter}
                  aria-label={
                    selectedLetter === letter
                      ? `Quitar filtro de la letra ${letter}`
                      : `Filtrar por la letra ${letter}`
                  }
                  onClick={(e) => {
                    createRipple(e)
                    setSelectedLetter(selectedLetter === letter ? '' : letter)
                    setSearchQuery('')
                  }}
                  className={`btn-press px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-all duration-300 ${
                    selectedLetter === letter
                      ? 'bg-accent text-white shadow-[0_4px_12px_rgba(247,159,63,0.25)] ring-1 ring-white/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  style={{
                    animationDelay: `${i * 15}ms`,
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        aria-busy={loading || loadingMore || searchLoading}
        className="flex-1 overflow-y-auto bg-background relative scroll-smooth p-4 md:p-6 pb-32"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--fixed-bottom-stack-height, 0px) + 8rem)' }}
      >
        <div className="relative z-10 flex flex-col gap-4 max-w-3xl mx-auto" id="proverb-results">
          <h1 className="sr-only">Archivo de refranes</h1>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {resultsSummary}
          </div>
          {loading ? (
            <ProverbListSkeleton count={5} />
          ) : filteredProverbs.length === 0 ? (
            <div className="text-center py-12 md:py-20 animate-fade-in">
              <span className="material-symbols-outlined text-primary text-6xl md:text-7xl mb-4" aria-hidden="true">search_off</span>
              <p className="text-muted font-ui text-base md:text-lg">No se encontraron refranes</p>
            </div>
          ) : (
            filteredProverbs.map((proverb, index) => {
              const isNew = newItemIds.has(proverb.id)
              return (
                <Link
                  key={proverb.id}
                  to={`/detail/${proverb.id}`}
                  className={`bg-card bookplate-border p-4 md:p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group/card hover:-translate-y-1 md:hover:-translate-y-2 ${isNew ? 'animate-slide-up' : ''}`}
                  style={{
                    animationDelay: isNew ? `${Math.min(index * 0.08, 0.5)}s` : '0s',
                  }}
                >
                  <div className="flex gap-3 md:gap-4 items-start">
                    <div className="flex-shrink-0 relative w-14 md:w-16 h-14 md:h-16 rounded-lg overflow-hidden border border-primary/10 group-hover/card:border-accent/30 transition-colors shadow-sm">
                      <OptimizedImage
                        src={proverb.image}
                        alt={proverb.spanish}
                        className="w-full h-full"
                        fallbackIcon="history_edu"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-2 overflow-hidden">
                      <h2 className="font-display text-base md:text-lg text-primary leading-tight font-bold group-hover/card:text-primary-light transition-colors line-clamp-2" lang="es">
                        {proverb.spanish}
                      </h2>
                      <div className="text-right border-r-2 border-accent/30 pr-2 md:pr-3 mr-1">
                        <p className="font-arabic text-lg md:text-xl text-ink leading-relaxed line-clamp-1" dir="rtl" lang="ar">
                          {proverb.arabic}
                        </p>
                      </div>
                      <p className="font-newsreader text-muted text-sm md:text-base line-clamp-1" lang="en">
                        {proverb.english}
                      </p>
                    </div>
                    <div className="self-center text-primary-light/40 group-hover/card:text-accent flex-shrink-0 transition-all duration-300 group-hover/card:translate-x-2">
                      <span className="material-symbols-outlined text-xl md:text-2xl transform group-hover/card:scale-110 transition-transform duration-300" aria-hidden="true">chevron_right</span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}

          {loadingMore && (
            <ProverbListSkeleton count={2} />
          )}

          {!loading && !loadingMore && hasMore && filteredProverbs.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                loadMore()
              }}
              className="btn-press mx-auto mt-4 md:mt-6 px-8 py-3 rounded-full text-sm md:text-base font-medium transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
            >
              <span className="material-symbols-outlined text-white text-lg animate-bounce-vertical" aria-hidden="true">expand_more</span>
              <span className="text-white relative z-10">Cargar más refranes</span>
            </button>
          )}

          {!hasMore && filteredProverbs.length > 0 && (
            <p className="text-center text-muted text-sm md:text-base py-6 animate-fade-in">
              Has llegado al final del archivo
            </p>
          )}
        </div>
        <div className="h-4 md:h-8" />
      </main>

      {isAdminUser && createPortal(
        <div
          className="fixed right-6 md:right-8 z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--fixed-bottom-stack-height, 0px) + 1.5rem)' }}
        >
          <Link
            to="/add"
            aria-label="Agregar un nuevo refrán"
            className="btn-press flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_6px_24px_rgba(247,159,63,0.4)] hover:shadow-[0_8px_32px_rgba(247,159,63,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce-once"
            style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
          >
            <span className="material-symbols-outlined text-white text-2xl md:text-3xl" aria-hidden="true">edit_square</span>
          </Link>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes bounce-vertical {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .animate-bounce-once { animation: bounce-once 0.5s ease-out; }
        .animate-bounce-vertical { animation: bounce-vertical 1s ease-in-out infinite; }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}
