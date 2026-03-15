import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchProverbs, type Proverb } from '../lib/api'
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  // Initial load and search/filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProverbs(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedLetter])

  const loadProverbs = async (reset = false) => {
    const currentPage = reset ? 1 : page
    const shouldReset = reset || page === 1
    
    if (shouldReset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setSearchLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api` 
        : '/api'
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })
      
      if (searchQuery) params.append('search', searchQuery)
      if (selectedLetter) params.append('letter', selectedLetter)
      
      const res = await fetch(`${API_BASE}/proverbs?${params}`)
      const data = await res.json()
      
      if (shouldReset) {
        setProverbs(data.proverbs)
      } else {
        setProverbs(prev => [...prev, ...data.proverbs])
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
      setPage(prev => prev + 1)
      loadProverbs(false)
    }
  }

  // Ripple effect handler
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

  const filteredProverbs = proverbs

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {/* Subtle warm background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(176,44,51,0.03) 0%, rgba(247,159,63,0.02) 50%, transparent 100%)' }} />
      
      {/* Sticky Header */}
      <header className="flex-none z-30 relative" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
        {/* Subtle pattern overlay on header */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
        
        <div className="relative px-4 md:px-8 pb-4 pt-5 flex flex-col gap-3 max-w-4xl mx-auto">
          {/* Branding */}
          <div className="flex items-center justify-center relative">
            {/* Menu Icon (Left) */}
            <button className="absolute left-0 text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </button>
            <div className="flex items-center gap-3">
              <img src="/new_logo_name_only.png" alt="Señor Shaعbi" className="h-8 md:h-10 object-contain brightness-0 invert" />
            </div>
            {/* Profile Icon (Right) */}
            <Link to="/login" className="absolute right-0 text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {searchLoading ? (
                <span className="material-symbols-outlined text-white/50 text-xl animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-white/50 text-xl">search</span>
              )}
            </div>
            <input
              id="search-input"
              className="w-full bg-white/15 border border-white/20 rounded-xl py-3 md:py-2.5 pl-12 pr-4 text-white placeholder-white/50 font-ui text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 focus:bg-white/20 transition-all"
              placeholder="Buscar por frase, palabra o significado..."
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          {/* Alphabet Filter Bar */}
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-1 justify-start min-w-max px-1">
              {ALPHABET.map((letter, i) => (
                <button
                  key={letter}
                  onClick={(e) => {
                    createRipple(e)
                    setSelectedLetter(selectedLetter === letter ? '' : letter)
                    setSearchQuery('')
                  }}
                  className={`btn-press px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-all duration-300 ${
                    selectedLetter === letter 
                      ? 'bg-accent text-white scale-110' 
                      : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                  }`}
                  style={{ 
                    animationDelay: `${i * 15}ms`
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
      </header>
      
      {/* Main Content: Scrollable List */}
      <main className="flex-1 overflow-y-auto bg-background relative scroll-smooth p-4 md:p-6 pb-32">
        <div className="relative z-10 flex flex-col gap-4 max-w-3xl mx-auto">
          {loading ? (
            <ProverbListSkeleton count={5} />
          ) : filteredProverbs.length === 0 ? (
            <div className="text-center py-12 md:py-20 animate-fade-in">
              <span className="material-symbols-outlined text-primary text-6xl md:text-7xl mb-4">search_off</span>
              <p className="text-muted font-ui text-base md:text-lg">No se encontraron refranes</p>
            </div>
          ) : (
            filteredProverbs.map((proverb, index) => (
              <Link
                key={proverb.id}
                to={`/detail/${proverb.id}`}
                className="bg-card bookplate-border p-4 md:p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group/card hover:-translate-y-1 md:hover:-translate-y-2"
                style={{ 
                  animation: `fade-slide-in 0.4s ease-out ${Math.min(index * 0.06, 0.4)}s both`
                }}
              >
                <div className="flex gap-3 md:gap-4 items-start">
                  {/* Optimized Thumbnail */}
                  <div className="flex-shrink-0 relative w-14 md:w-16 h-14 md:h-16 rounded-lg overflow-hidden border border-primary/10 group-hover/card:border-accent/30 transition-colors shadow-sm">
                    <OptimizedImage
                      src={proverb.image}
                      alt={proverb.spanish}
                      className="w-full h-full"
                      fallbackIcon="history_edu"
                    />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1 md:gap-2 overflow-hidden">
                    {/* Header: Spanish */}
                    <h2 className="font-display text-base md:text-lg text-primary leading-tight font-bold group-hover/card:text-primary-light transition-colors line-clamp-2">
                      {proverb.spanish}
                    </h2>
                    {/* Middle: Arabic (RTL) */}
                    <div className="text-right border-r-2 border-accent/30 pr-2 md:pr-3 mr-1">
                      <p className="font-arabic text-lg md:text-xl text-ink leading-relaxed line-clamp-1" dir="rtl">
                        {proverb.arabic}
                      </p>
                    </div>
                    {/* Footer: English */}
                    <p className="font-newsreader text-muted text-sm md:text-base line-clamp-1">
                      {proverb.english}
                    </p>
                  </div>
                  {/* Chevron with elegant animation */}
                  <div className="self-center text-primary-light/40 group-hover/card:text-accent flex-shrink-0 transition-all duration-300 group-hover/card:translate-x-2">
                    <span className="material-symbols-outlined text-xl md:text-2xl transform group-hover/card:scale-110 transition-transform duration-300">chevron_right</span>
                  </div>
                </div>
              </Link>
            ))
          )}
          
          {/* Load More */}
          {loadingMore && (
            <ProverbListSkeleton count={2} />
          )}
          
          {!loading && !loadingMore && hasMore && filteredProverbs.length > 0 && (
            <button
              onClick={(e) => {
                createRipple(e)
                loadMore()
              }}
              className="btn-press mx-auto mt-4 md:mt-6 px-8 py-3 rounded-full text-sm md:text-base font-medium transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
            >
              <span className="text-white relative z-10">Cargar más refranes</span>
            </button>
          )}
          
          {/* End of list */}
          {!hasMore && filteredProverbs.length > 0 && (
            <p className="text-center text-muted text-sm md:text-base py-6 animate-fade-in">
              Has llegado al final del archivo
            </p>
          )}
        </div>
        <div className="h-4 md:h-8" />
      </main>
      
      {/* Admin FAB - positioned above PWA install banner */}
      {isLoggedIn && (
        <div className="absolute bottom-32 md:bottom-8 right-6 md:right-8 z-40">
          <Link
            to="/add"
            className="btn-press flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_6px_24px_rgba(247,159,63,0.4)] hover:shadow-[0_8px_32px_rgba(247,159,63,0.5)] hover:scale-110 active:scale-95 transition-all duration-300 animate-bounce-once"
            style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
          >
            <span className="material-symbols-outlined text-white text-2xl md:text-3xl">edit_square</span>
          </Link>
        </div>
      )}
      
      <style>{`
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-bounce-once { animation: bounce-once 0.5s ease-out; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}
