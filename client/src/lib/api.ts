// Use relative path when deployed on same domain, or full URL for separate deployment
// Note: The URL should include /api suffix
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'https://senor-shabi-api.kerolos-saaid.workers.dev/api'

// Get auth header for protected requests
function getAuthHeader(): Record<string, string> {
  const username = localStorage.getItem('username')
  const password = localStorage.getItem('password')
  if (username && password) {
    const credentials = btoa(`${username}:${password}`)
    return { 'Authorization': `Basic ${credentials}` }
  }
  return {}
}

export async function fetchProverbs() {
  const res = await fetch(`${API_BASE}/proverbs`)
  const data = await res.json()
  return data.proverbs
}

export async function fetchProverb(id: string) {
  const res = await fetch(`${API_BASE}/proverbs/${id}`)
  if (!res.ok) throw new Error('Proverb not found')
  const data = await res.json()
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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create')
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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to update')
  return data.proverb
}

export async function deleteProverb(id: string) {
  const headers = getAuthHeader()
  
  const res = await fetch(`${API_BASE}/proverbs/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete')
  }
  return true
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Login failed')
  }
  const data = await res.json()
  
  // Store credentials and role for protected requests
  localStorage.setItem('username', username)
  localStorage.setItem('password', password)
  localStorage.setItem('role', data.role || 'user')
  localStorage.setItem('isLoggedIn', 'true')
  
  return data
}

export function logout() {
  localStorage.removeItem('username')
  localStorage.removeItem('password')
  localStorage.removeItem('role')
  localStorage.removeItem('isLoggedIn')
}

export function isAdmin() {
  return localStorage.getItem('role') === 'admin'
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
}
