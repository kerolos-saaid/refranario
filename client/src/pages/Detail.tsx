import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchProverb, deleteProverb, type Proverb } from '../lib/api'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [proverb, setProverb] = useState<Proverb | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
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

  const handleBookmark = () => {
    setProverb(prev => prev ? { ...prev, bookmarked: !prev.bookmarked } : null)
  }

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
      {/* Top App Bar */}
      <nav className="sticky top-0 z-50 shadow-lg relative" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between p-4 max-w-7xl mx-auto w-full">
          <Link to="/home" className="flex items-center text-white/80 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
            <span className="ml-2 font-ui text-sm font-medium hidden sm:block">Volver al Archivo</span>
          </Link>
          <img src="/new_logo_name_only.png" alt="Señor Shaعbi" className="h-7 object-contain brightness-0 invert" />
          <button onClick={handleBookmark} className="flex items-center text-white/80 hover:text-accent transition-colors">
            <span className="material-symbols-outlined text-2xl">
              {proverb.bookmarked ? 'bookmark' : 'bookmark'}
            </span>
          </button>
        </div>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
      </nav>
      
      {/* Main Content Area */}
      <main className="flex-grow w-full bg-background">
        {/* Hero Image */}
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img id="proverb-image" src={proverb.image} alt={proverb.spanish} className="w-full h-full object-cover" />
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to top, #FFFAF8 0%, transparent 100%)' }} />
        </div>
        
        {/* Content Card */}
        <div className="max-w-4xl mx-auto -mt-8 relative z-10">
          <div className="bg-card border-bookplate shadow-lg mx-4 p-6 md:p-10 space-y-8 relative overflow-hidden">
            {/* Top accent bar on content card */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #B02C33 0%, #DF3D4C 40%, #F79F3F 100%)' }} />
            
            {/* Spanish Section */}
            <section className="pt-4" style={{ animation: 'fade-in 0.4s ease-out' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-accent text-sm">history_edu</span>
                <span className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Origen (Español)</span>
              </div>
              <p className="text-primary font-display text-2xl md:text-3xl leading-snug font-bold">
                {proverb.spanish}
              </p>
            </section>
            
            {/* Divider */}
            <div className="my-6 h-px" style={{ background: 'linear-gradient(90deg, #B02C33, #DF3D4C, #F79F3F, transparent)', animation: 'fade-in 0.5s ease-out' }} />
            
            {/* Arabic Section */}
            <section className="text-right" dir="rtl" style={{ animation: 'fade-in 0.6s ease-out' }}>
              <div className="flex items-center gap-2 mb-3 justify-end">
                <span className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Equivalente (Árabe)</span>
                <span className="material-symbols-outlined text-accent text-sm">translate</span>
              </div>
              <p className="font-arabic text-2xl md:text-3xl leading-relaxed text-ink">
                {proverb.arabic}
              </p>
            </section>
            
            {/* English Translation */}
            <section style={{ animation: 'fade-in 0.7s ease-out' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-accent text-sm">language</span>
                <span className="text-accent font-ui text-xs font-bold uppercase tracking-wide">Traducción (Inglés)</span>
              </div>
              <p className="font-newsreader text-lg md:text-xl text-muted">
                "{proverb.english}"
              </p>
            </section>
            
            {/* Usage Note */}
            <div className="space-y-4" style={{ animation: 'fade-in 0.8s ease-out' }}>
              <div>
                <h4 className="text-ink font-ui text-sm font-bold mb-2">Definición</h4>
                <p className="font-serif text-muted text-sm leading-relaxed text-right">
                  {proverb.note}
                </p>
              </div>
              
              <div className="pt-4 border-t border-primary/10">
                <h4 className="text-ink font-ui text-sm font-bold mb-2">Ejemplo de Uso</h4>
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
      
      {/* Admin Action Bar */}
      {isLoggedIn && (
        <div className="sticky bottom-0 w-full border-t border-primary/10 p-4 shadow-lg z-40" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button onClick={handleDelete} className="text-white/70 hover:text-white font-ui text-sm font-medium flex items-center gap-2 px-4 py-2 transition-colors">
              <span className="material-symbols-outlined text-lg">delete</span>
              Eliminar
            </button>
            <Link to={`/edit/${proverb.id}`} className="bg-accent text-white hover:bg-accent/90 transition-all rounded-lg px-6 py-2.5 font-ui text-sm font-medium flex items-center gap-2 shadow-md">
              <span className="material-symbols-outlined text-lg">edit_note</span>
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
