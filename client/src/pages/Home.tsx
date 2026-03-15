import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchProverbs, type Proverb } from '../lib/api'

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')

export default function Home() {
  const [proverbs, setProverbs] = useState<Proverb[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLetter, setSelectedLetter] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    loadProverbs()
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  const loadProverbs = async () => {
    try {
      const data = await fetchProverbs()
      setProverbs(data)
    } catch (error) {
      console.error('Failed to load proverbs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProverbs = proverbs.filter(p => {
    const matchesSearch = 
      p.spanish.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.arabic.includes(searchQuery) ||
      p.english.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLetter = !selectedLetter || p.spanish.toUpperCase().startsWith(selectedLetter)
    return matchesSearch && matchesLetter
  })

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {/* Subtle warm background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(176,44,51,0.03) 0%, rgba(247,159,63,0.02) 50%, transparent 100%)' }} />
      
      {/* Sticky Header */}
      <header className="flex-none z-30 relative" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
        {/* Subtle pattern overlay on header */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
        
        <div className="relative px-4 pb-4 pt-5 flex flex-col gap-3">
          {/* Branding */}
          <div className="flex items-center justify-center relative">
            {/* Menu Icon (Left) */}
            <button className="absolute left-0 text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </button>
            <div className="flex items-center gap-2">
              <img src="/new_logo_name_only.png" alt="Señor Shaعbi" className="h-8 object-contain brightness-0 invert" />
            </div>
            {/* Profile Icon (Right) */}
            <Link to="/login" className="absolute right-0 text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-white/50 text-xl">search</span>
            </div>
            <input
              id="search-input"
              className="w-full bg-white/15 border border-white/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/50 font-ui text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 focus:bg-white/20 transition-all"
              placeholder="Buscar por frase, palabra o significado..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Alphabet Filter Bar */}
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-1 justify-start min-w-max px-1">
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(selectedLetter === letter ? '' : letter)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedLetter === letter 
                      ? 'bg-accent text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
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
      <main className="flex-1 overflow-y-auto bg-background relative scroll-smooth p-4 pb-24">
        <div className="relative z-10 flex flex-col gap-4 max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderTopColor: '#B02C33' }} />
            </div>
          ) : filteredProverbs.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-primary text-6xl mb-4">search_off</span>
              <p className="text-muted font-ui text-base">No se encontraron refranes</p>
            </div>
          ) : (
            filteredProverbs.map((proverb, index) => (
              <Link
                key={proverb.id}
                to={`/detail/${proverb.id}`}
                className="bg-card bookplate-border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group/card"
                style={{ animation: `fade-in 0.3s ease-out ${index * 0.05}s both` }}
              >
                <div className="flex gap-3 items-start">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 relative w-12 h-12 rounded-lg overflow-hidden border border-primary/10 group-hover/card:border-accent/30 transition-colors">
                    <img 
                      alt={proverb.spanish}
                      className="w-full h-full object-cover" 
                      src={proverb.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuC627i2fYdXyeGop_xctmHHRNJpxuLlxlDShW0IEl8YkA9oQGqKwyybs37iJ64EbcR3OfNPHBswfltpSAcmrEa1uE25BUyEMShzvc5Xz_H9LPrHzEVFcvfWAX8U7nqs4Q3pg9cvBHvLgSnjKhO_VhtHToJ2scGToSbb7eEgck6v0wmrQX_8-ZD1UqY4-sZk87zOtAMDwoTLDqiDm23wlo6Jjz-0TNW1IXFrJTKF5biBm_S18xmYQaVcszO2gQp-zgLmaB4ceSN6q_I'} 
                    />
                  </div>
                  {/* Text Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
                    {/* Header: Spanish */}
                    <h2 className="font-display text-base text-primary leading-tight font-bold group-hover/card:text-primary-light transition-colors">
                      {proverb.spanish}
                    </h2>
                    {/* Middle: Arabic (RTL) */}
                    <div className="text-right border-r-2 border-accent/30 pr-2 mr-2">
                      <p className="font-arabic text-lg text-ink leading-relaxed" dir="rtl">
                        {proverb.arabic}
                      </p>
                    </div>
                    {/* Footer: English */}
                    <p className="font-newsreader text-muted text-sm">
                      {proverb.english}
                    </p>
                  </div>
                  {/* Chevron */}
                  <div className="self-center text-primary-light/40 group-hover/card:text-accent flex-shrink-0 transition-colors">
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        {/* End of list spacer */}
        <div className="h-8" />
      </main>
      
      {/* Admin FAB - positioned above PWA install banner */}
      {isLoggedIn && (
        <div className="absolute bottom-24 right-6 z-40">
          <Link
            to="/add"
            className="flex items-center justify-center w-14 h-14 rounded-full shadow-[0_6px_24px_rgba(247,159,63,0.4)] hover:shadow-[0_8px_32px_rgba(247,159,63,0.5)] hover:scale-105 active:scale-95 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
          >
            <span className="material-symbols-outlined text-white text-2xl">edit_square</span>
          </Link>
        </div>
      )}
    </div>
  )
}
