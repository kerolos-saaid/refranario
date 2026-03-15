// Use relative path when deployed on same domain, or full URL for separate deployment
// Note: The URL should include /api suffix
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'https://senor-shabi-api.kerolos-saaid.workers.dev/api'

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
  const res = await fetch(`${API_BASE}/proverbs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proverb),
  })
  const data = await res.json()
  return data.proverb
}

export async function updateProverb(id: string, updates: Partial<Proverb>) {
  const res = await fetch(`${API_BASE}/proverbs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  return data.proverb
}

export async function deleteProverb(id: string) {
  const res = await fetch(`${API_BASE}/proverbs/${id}`, {
    method: 'DELETE',
  })
  return res.ok
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
  return data
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
