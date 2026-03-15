import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home')
    }, 3500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div 
      className="h-screen w-full overflow-hidden flex items-center justify-center relative"
      style={{ background: 'linear-gradient(145deg, #B02C33 0%, #8A1F25 40%, #5C1118 100%)' }}
    >
      {/* Decorative radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          background: 'radial-gradient(ellipse at 30% 40%, rgba(247,159,63,0.18) 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, rgba(223,61,76,0.15) 0%, transparent 50%)' 
        }}
      />
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04]" 
        style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" 
        }}
      />
      {/* Geometric accent lines */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, transparent 0%, #F79F3F 30%, #DF3D4C 70%, transparent 100%)' }} />
      <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, transparent 0%, #DF3D4C 30%, #F79F3F 70%, transparent 100%)' }} />
      
      {/* Splash Container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-6 animate-immersive-fade" style={{ animation: 'immersiveFade 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}>
        {/* Logo Image */}
        <div className="mb-6 relative">
          {/* Outer soft glow */}
          <div className="absolute -inset-14 rounded-full blur-[60px] opacity-60" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(247,159,63,0.3) 40%, transparent 100%)' }} />
          {/* Solid white circle backdrop */}
          <div className="absolute inset-2 rounded-full bg-white/90 shadow-[0_0_60px_rgba(255,255,255,0.4)]" />
          <img src="/new_logo_no_text.png" alt="Señor Shaعbi Logo" className="relative z-10 w-52 h-52 object-contain" />
        </div>
        {/* Subtitle */}
        <p className="mt-2 font-sans text-white/60 text-xs uppercase tracking-[0.35em] text-center font-medium">
          El Archivo Trilingüe
        </p>
        {/* Decorative divider */}
        <div className="mt-4 w-16 h-px" style={{ background: 'linear-gradient(90deg, transparent, #F79F3F, transparent)' }} />
      </div>
      
      <style>{`
        @keyframes immersiveFade {
          0% { opacity: 0; transform: scale(0.95); }
          40% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
