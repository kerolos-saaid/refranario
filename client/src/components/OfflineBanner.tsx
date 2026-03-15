import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 py-3 px-4 text-center text-white text-sm z-50"
      style={{ backgroundColor: '#8C6F64' }}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-lg">wifi_off</span>
        <span>Estás offline. Algunos datos pueden no estar disponibles.</span>
      </div>
    </div>
  )
}
