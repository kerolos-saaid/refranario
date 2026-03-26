import { useState, useEffect, useCallback } from 'react'
import { getApiBase } from '../lib/api-base'

// Storage key for offline queue
const OFFLINE_QUEUE_KEY = 'senor_shabi_offline_queue'

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming back online
      syncPendingActions()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending actions from storage
    loadPendingActions()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load pending actions from localStorage
  const loadPendingActions = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (stored) {
        setPendingActions(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }, [])

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflineAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions))
      setPendingActions(actions)
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }, [])

  // Add action to offline queue
  const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    
    const updated = [...pendingActions, newAction]
    savePendingActions(updated)
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      syncPendingActions()
    }
  }, [pendingActions, savePendingActions])

  // Sync all pending actions
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || pendingActions.length === 0 || isSyncing) {
      return
    }

    setIsSyncing(true)
    
    const API_BASE = getApiBase()

    const remainingActions: OfflineAction[] = []

    for (const action of pendingActions) {
      try {
        let url = `${API_BASE}/proverbs`
        let method = 'POST'
        
        if (action.type === 'update') {
          url = `${API_BASE}/proverbs/${action.data.id}`
          method = 'PUT'
        } else if (action.type === 'delete') {
          url = `${API_BASE}/proverbs/${action.data.id}`
          method = 'DELETE'
        }

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: action.type !== 'delete' ? JSON.stringify(action.data) : undefined,
        })

        if (!response.ok) {
          // Keep failed actions for retry
          remainingActions.push(action)
          console.error('Failed to sync action:', action, response.status)
        }
      } catch (error) {
        // Network error - keep for retry
        remainingActions.push(action)
        console.error('Failed to sync action (network):', action, error)
      }
    }

    savePendingActions(remainingActions)
    setIsSyncing(false)
  }, [pendingActions, isSyncing, savePendingActions])

  // Clear all pending actions
  const clearPendingActions = useCallback(() => {
    savePendingActions([])
  }, [savePendingActions])

  return {
    isOnline,
    pendingActions: pendingActions.length,
    isSyncing,
    queueAction,
    syncPendingActions,
    clearPendingActions,
  }
}

// Hook for checking online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
