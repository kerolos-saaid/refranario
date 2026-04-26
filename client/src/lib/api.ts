import { getApiBase } from './api-base'

const API_BASE = getApiBase()
export const AUTH_EXPIRED_EVENT = 'senor-shabi-auth-expired'
const AUTH_NOTICE_KEY = 'senor_shabi_auth_notice'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function handleExpiredSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('username')
  localStorage.removeItem('isLoggedIn')
  sessionStorage.setItem(AUTH_NOTICE_KEY, 'Tu sesión expiró después de un cambio de seguridad. Inicia sesión de nuevo.')
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

async function readApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const rawBody = await res.text()
  const contentType = res.headers.get('content-type') || ''
  let data: unknown = null

  if (rawBody) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawBody)
      } catch {
        throw new Error(`API returned invalid JSON: ${rawBody.slice(0, 120)}`)
      }
    } else {
      try {
        data = JSON.parse(rawBody)
      } catch {
        data = null
      }
    }
  }

  if (!res.ok) {
    const isUnauthorized = res.status === 401
    const isLoginRequest = res.url.endsWith('/login')

    if (isUnauthorized && !isLoginRequest && getToken()) {
      handleExpiredSession()
    }

    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error(String((data as { error?: unknown }).error || fallbackMessage))
    }

    throw new Error(rawBody || fallbackMessage)
  }

  if (data === null) {
    throw new Error(`API returned a non-JSON response: ${rawBody.slice(0, 120) || 'empty body'}`)
  }

  return data as T
}

// Get auth header for protected requests using JWT
function getAuthHeader(): Record<string, string> {
  const token = getToken()
  if (token) {
    return { 'Authorization': `Bearer ${token}` }
  }
  return {}
}

export async function fetchProverbs() {
  const res = await fetch(`${API_BASE}/proverbs`)
  const data = await readApiResponse<{ proverbs: Proverb[] }>(res, 'Failed to load proverbs')
  return data.proverbs
}

export async function fetchProverb(id: string) {
  const res = await fetch(`${API_BASE}/proverbs/${id}`)
  const data = await readApiResponse<{ proverb: Proverb }>(res, 'Proverb not found')
  return data.proverb
}

export async function createProverb(proverb: Omit<Proverb, 'id' | 'date' | 'bookmarked'>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = getAuthHeader()
  Object.assign(headers, authHeader)
  
  const res = await fetch(`${API_BASE}/proverbs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(proverb),
  })
  const data = await readApiResponse<{ proverb: Proverb }>(res, 'Failed to create')
  return data.proverb
}

export async function updateProverb(id: string, updates: Partial<Proverb>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = getAuthHeader()
  Object.assign(headers, authHeader)
  
  const res = await fetch(`${API_BASE}/proverbs/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  })
  const data = await readApiResponse<{ proverb: Proverb }>(res, 'Failed to update')
  return data.proverb
}

export async function deleteProverb(id: string) {
  const headers = getAuthHeader()
  
  const res = await fetch(`${API_BASE}/proverbs/${id}`, {
    method: 'DELETE',
    headers,
  })
  await readApiResponse<{ success: boolean }>(res, 'Failed to delete')
  return true
}

export async function uploadImage(imageData: string, filename: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = getAuthHeader()
  Object.assign(headers, authHeader)
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: imageData, filename }),
  })
  const data = await readApiResponse<{ success: boolean; url: string; filename: string }>(res, 'Failed to upload')
  return data
}

export async function fetchProverbImageJobs(limit = 50) {
  const headers = getAuthHeader()
  const res = await fetch(`${API_BASE}/proverb-image-jobs?limit=${limit}`, {
    headers,
  })
  const data = await readApiResponse<{ jobs: ProverbImageJob[] }>(res, 'Failed to load image jobs')
  return data.jobs as ProverbImageJob[]
}

export async function backfillProverbImageJobs(limit?: number) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = getAuthHeader()
  Object.assign(headers, authHeader)

  const res = await fetch(`${API_BASE}/proverb-image-jobs/backfill`, {
    method: 'POST',
    headers,
    body: JSON.stringify(limit ? { limit } : {}),
  })
  return await readApiResponse<{
    enqueued: number
    scanned: number
    deferred?: number
    throttled?: boolean
    queueError?: string | null
    nextRetryAt?: string | null
  }>(res, 'Failed to scan missing images')
}

export async function regenerateProverbImage(id: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = getAuthHeader()
  Object.assign(headers, authHeader)

  const res = await fetch(`${API_BASE}/proverbs/${id}/regenerate-image`, {
    method: 'POST',
    headers,
  })
  return await readApiResponse<{
    success: boolean
    skipped?: boolean
    deferred?: boolean
    nextRetryAt?: string | null
  }>(res, 'Failed to regenerate image')
}

export async function generateArabicAudio(id: string) {
  const res = await fetch(`${API_BASE}/proverbs/${id}/arabic-audio`, {
    method: 'POST',
  })

  const rawBody = await res.text()
  let data: unknown = null

  if (rawBody) {
    try {
      data = JSON.parse(rawBody)
    } catch {
      throw new Error(rawBody || 'Failed to prepare Arabic audio')
    }
  }

  if (data && typeof data === 'object' && 'status' in data) {
    return data as ArabicAudioResponse
  }

  if (!res.ok) {
    throw new Error('Failed to prepare Arabic audio')
  }

  throw new Error('API returned invalid Arabic audio response')
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await readApiResponse<{ token: string; role?: string; username: string }>(res, 'Login failed')

  if (data.role !== 'admin') {
    logout()
    throw new Error('Forbidden - Admin only')
  }

  localStorage.setItem('token', data.token)
  localStorage.setItem('role', data.role || 'user')
  localStorage.setItem('username', data.username)
  localStorage.setItem('isLoggedIn', 'true')
  
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('username')
  localStorage.removeItem('isLoggedIn')
  sessionStorage.removeItem(AUTH_NOTICE_KEY)
}

export function isAdmin() {
  return Boolean(localStorage.getItem('token')) && localStorage.getItem('role') === 'admin'
}

export function consumeAuthNotice() {
  const value = sessionStorage.getItem(AUTH_NOTICE_KEY)
  if (value) {
    sessionStorage.removeItem(AUTH_NOTICE_KEY)
  }

  return value
}

export interface Proverb {
  id: string
  spanish: string
  arabic: string
  english: string
  category: string
  note: string
  image: string
  curator: string
  date: string
  bookmarked: boolean
  arabicAudio?: {
    status: ArabicAudioStatus
    url: string | null
  }
}

export type ArabicAudioStatus = 'ready' | 'generating' | 'failed' | 'limited' | 'unavailable' | null

export interface ArabicAudioResponse {
  status: Exclude<ArabicAudioStatus, null>
  audioUrl?: string
  cached: boolean
  message?: string
  retryAfterSeconds?: number
}

export type ProverbImageJobStatus = 'pending' | 'processing' | 'retry' | 'failed' | 'complete' | null

export interface ProverbImageJob {
  id: string
  spanish: string
  english: string
  status: ProverbImageJobStatus
  attempts: number
  nextRetryAt: string | null
  error: string | null
  promptHash: string | null
}
