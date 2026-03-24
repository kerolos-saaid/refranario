import { useState, useEffect } from 'react'
import { useCssHeightVar } from './useCssHeightVar'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }

      // @ts-ignore - navigator.standalone is iOS specific
      if (window.navigator.standalone === true) {
        setIsInstalled(true)
        setIsInstallable(false)
        return
      }

      setIsInstallable(true)
    }

    checkInstalled()

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    setDeferredPrompt(null)
    return outcome === 'accepted'
  }

  const dismiss = () => {
    setDeferredPrompt(null)
    setIsInstallable(false)
    localStorage.setItem('pwa_install_dismissed', Date.now().toString())
  }

  const wasRecentlyDismissed = () => {
    const dismissed = localStorage.getItem('pwa_install_dismissed')
    if (!dismissed) return false

    const dismissedTime = parseInt(dismissed, 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return Date.now() - dismissedTime < sevenDays
  }

  return {
    isInstallable: isInstallable && !isInstalled && !wasRecentlyDismissed(),
    isInstalled,
    install,
    dismiss,
  }
}

export function PWAInstallBanner() {
  const { isInstallable, install, dismiss } = usePWAInstall()
  const bannerRef = useCssHeightVar<HTMLDivElement>('--pwa-banner-height', isInstallable)

  if (!isInstallable) return null

  return (
    <div
      ref={bannerRef}
      className="fixed left-0 right-0 z-50 p-4"
      style={{
        background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--offline-banner-height, 0px))',
      }}
      role="region"
      aria-label="Instalación de la aplicación"
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/new_logo_no_text.png"
            alt="Señor Shaعbi"
            className="w-10 h-10 rounded-lg bg-white p-1"
          />
          <div className="text-white">
            <p className="font-medium text-sm">Instalar Señor Shaعbi</p>
            <p className="text-xs text-white/70">Añádelo a la pantalla de inicio para acceso offline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={install}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: '#F79F3F' }}
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar aviso de instalación"
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
