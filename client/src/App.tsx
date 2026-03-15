import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Splash from './pages/Splash'
import Home from './pages/Home'
import Detail from './pages/Detail'
import AddEdit from './pages/AddEdit'
import Login from './pages/Login'
import OfflineBanner from './components/OfflineBanner'
import { PWAInstallBanner } from './hooks/usePWAInstall'

// Update Banner Component
function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    const handleUpdate = () => setShowUpdate(true)
    window.addEventListener('swUpdateAvailable', handleUpdate)
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate)
  }, [])

  if (!showUpdate) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-accent text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
      <span className="text-sm font-medium">New version available!</span>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-1 bg-white text-accent text-sm font-medium rounded-full hover:bg-white/90 transition-colors"
      >
        Update
      </button>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('fadeIn')

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut')
    }
  }, [location, displayLocation])

  const handleTransitionEnd = () => {
    if (transitionStage === 'fadeOut') {
      setTransitionStage('fadeIn')
      setDisplayLocation(location)
    }
  }

  return (
    <div 
      className={`page-transition-${transitionStage}`}
      onAnimationEnd={handleTransitionEnd}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/add" element={<AddEdit />} />
        <Route path="/edit/:id" element={<AddEdit />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UpdateBanner />
      <AnimatedRoutes />
      <OfflineBanner />
      <PWAInstallBanner />
    </BrowserRouter>
  )
}
