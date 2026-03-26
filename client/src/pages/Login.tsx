import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { consumeAuthNotice, login } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => consumeAuthNotice() || '')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(username, password)
      if (result.role === 'admin') {
        navigate('/home')
      } else {
        setError('Acceso denegado: solo administradores')
        setShake(true)
        setTimeout(() => setShake(false), 820)
      }
    } catch (err) {
      setError('Usuario o contraseña incorrectos')
      setShake(true)
      setTimeout(() => setShake(false), 820)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-ink font-serif antialiased min-h-screen flex flex-col relative" style={{ background: 'linear-gradient(145deg, #B02C33 0%, #8A1F25 40%, #5C1118 100%)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 30%, rgba(247,159,63,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(223,61,76,0.12) 0%, transparent 50%)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div className="absolute top-0 left-0 w-full h-1 z-20" style={{ background: 'linear-gradient(90deg, transparent 0%, #F79F3F 30%, #DF3D4C 70%, transparent 100%)' }} />

      <main id="main-content" tabIndex={-1} className="relative z-10 flex-grow flex items-center justify-center p-4 sm:p-6 w-full">
        <div className={`w-full max-w-md bg-white border-bookplate shadow-[0px_20px_60px_rgba(0,0,0,0.3)] p-8 sm:p-12 relative overflow-hidden rounded-xl ${shake ? 'animate-shake' : ''}`}>
          <div className="absolute top-3 left-3 text-accent/30 select-none pointer-events-none">
            <span className="material-symbols-outlined text-3xl">
              history_edu
            </span>
          </div>
          <div className="absolute bottom-3 right-3 text-accent/30 select-none pointer-events-none rotate-180">
            <span className="material-symbols-outlined text-3xl">
              history_edu
            </span>
          </div>

          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-primary flex items-center justify-center p-2">
                <img src="/new_logo_no_text.png" alt="Señor Shaعbi Logo" className="w-24 h-24 object-contain" />
              </div>
              <div>
                <h1 className="font-display text-3xl text-primary font-bold tracking-wide uppercase leading-tight">
                  Acceso de Curador
                </h1>
                <p className="font-sans text-xs tracking-widest text-muted uppercase mt-2">
                  El Archivo del Académico
                </p>
              </div>
              <div className="w-16 h-px mt-2" style={{ background: 'linear-gradient(90deg, #B02C33, #F79F3F)' }} />
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-8 mt-4 text-left" aria-busy={loading}>
              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg" role="alert">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="login-username" style={{ color: '#B02C33' }}>
                    Usuario
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    className="w-full bg-transparent border-b-2 py-2 text-ink focus:outline-none"
                    style={{ borderColor: 'rgba(176,44,51,0.2)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" htmlFor="login-password" style={{ color: '#B02C33' }}>
                    Contraseña
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-transparent border-b-2 py-2 text-ink focus:outline-none"
                    style={{ borderColor: 'rgba(176,44,51,0.2)' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
              >
                {loading ? 'Verificando...' : 'ENTRAR AL ARCHIVO'}
              </button>
            </form>

            <Link to="/home" className="text-muted text-sm hover:text-primary transition-colors">
              ← Volver al Archivo
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .border-bookplate {
          border: 1px solid rgba(176,44,51,0.1);
          border-radius: 0.5rem;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .animate-shake {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  )
}
