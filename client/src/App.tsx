import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Splash from './pages/Splash'
import Home from './pages/Home'
import Detail from './pages/Detail'
import AddEdit from './pages/AddEdit'
import Login from './pages/Login'
import ImageJobs from './pages/ImageJobs'
import OfflineBanner from './components/OfflineBanner'
import { PWAInstallBanner } from './hooks/usePWAInstall'
import { AUTH_EXPIRED_EVENT } from './lib/api'

function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    const handleUpdate = () => setShowUpdate(true)
    window.addEventListener('swUpdateAvailable', handleUpdate)
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate)
  }, [])

  if (!showUpdate) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-accent text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-sm font-medium">Hay una nueva versión disponible.</span>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-1 bg-white text-accent text-sm font-medium rounded-full hover:bg-white/90 transition-colors"
      >
        Actualizar
      </button>
    </div>
  )
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/splash" replace />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/home" element={<Home />} />
      <Route path="/detail/:id" element={<Detail />} />
      <Route path="/add" element={<AddEdit />} />
      <Route path="/edit/:id" element={<AddEdit />} />
      <Route path="/admin/images" element={<ImageJobs />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

function AuthSessionRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleExpired = () => {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)

    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [location.pathname, navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthSessionRedirect />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-primary focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <UpdateBanner />
      <AnimatedRoutes />
      <OfflineBanner />
      <PWAInstallBanner />
    </BrowserRouter>
  )
}
