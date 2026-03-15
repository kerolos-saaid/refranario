import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Splash from './pages/Splash'
import Home from './pages/Home'
import Detail from './pages/Detail'
import AddEdit from './pages/AddEdit'
import Login from './pages/Login'
import OfflineBanner from './components/OfflineBanner'
import { PWAInstallBanner } from './hooks/usePWAInstall'

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
      <AnimatedRoutes />
      <OfflineBanner />
      <PWAInstallBanner />
    </BrowserRouter>
  )
}
