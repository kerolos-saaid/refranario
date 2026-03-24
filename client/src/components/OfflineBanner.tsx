import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useCssHeightVar } from '../hooks/useCssHeightVar'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const bannerRef = useCssHeightVar<HTMLDivElement>('--offline-banner-height', !isOnline)

  if (isOnline) return null

  return (
    <div
      ref={bannerRef}
      className="fixed left-0 right-0 py-3 px-4 text-center text-white text-sm z-50"
      style={{
        backgroundColor: '#8C6F64',
        bottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-lg" aria-hidden="true">wifi_off</span>
        <span>Estás offline. Algunos datos pueden no estar disponibles.</span>
      </div>
    </div>
  )
}
