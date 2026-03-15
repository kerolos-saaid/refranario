import { useState, useEffect } from 'react'

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
    // Check if already installed
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

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    // Listen for app installed
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

  // Function to trigger install prompt
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

  // Dismiss the prompt (store for later)
  const dismiss = () => {
    setDeferredPrompt(null)
    setIsInstallable(false)
    // Store dismissed state in localStorage to not show again for a while
    localStorage.setItem('pwa_install_dismissed', Date.now().toString())
  }

  // Check if recently dismissed (don't show for 7 days)
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

// PWA Install Banner Component
export function PWAInstallBanner() {
  const { isInstallable, install, dismiss } = usePWAInstall()

  if (!isInstallable) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{
        background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)',
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/new_logo_no_text.png"
            alt="Señor Shaعbi"
            className="w-10 h-10 rounded-lg bg-white p-1"
          />
          <div className="text-white">
            <p className="font-medium text-sm">Install Señor Shaعbi</p>
            <p className="text-xs text-white/70">Add to home screen for offline access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button
            type="button"
            onClick={install}
            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: '#F79F3F' }}
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
