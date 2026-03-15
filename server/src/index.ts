import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

type Proverb = {
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

type User = {
  username: string
  password: string
}

type Env = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', cors())

// In-memory storage (for demo - will use D1 in production)
let proverbs: Proverb[] = [
  {
    id: '1',
    spanish: 'A quien madruga, Dios le ayuda.',
    arabic: 'من جد وجد',
    english: 'The early bird catches the worm.',
    category: 'Wisdom',
    note: 'Un refrán sobre la diligencia y la acción temprana que conduce al éxito.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    curator: 'A. Al-Fayed',
    date: '12th Oct, 2023',
    bookmarked: false
  },
  {
    id: '2',
    spanish: 'Más vale pájaro en mano que ciento volando.',
    arabic: 'عصفور في اليد خير من عشرة على الشجرة',
    english: 'A bird in the hand is worth two in the bush.',
    category: 'Prudence',
    note: 'Este refrán aconseja no arriesgar una ganancia segura por una potencialmente mayor, pero incierta.',
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400',
    curator: 'A. Al-Fayed',
    date: '12th Oct, 2023',
    bookmarked: false
  },
  {
    id: '3',
    spanish: 'El tiempo es oro.',
    arabic: 'الوقت من ذهب',
    english: 'Time is money.',
    category: 'Time',
    note: 'Un refrán universal que enfatiza el valor del tiempo.',
    image: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=400',
    curator: 'A. Al-Fayed',
    date: '12th Oct, 2023',
    bookmarked: false
  },
  {
    id: '4',
    spanish: 'Ojos que no ven, corazón que no siente.',
    arabic: 'بعيد عن العين بعيد عن القلب',
    english: 'Out of sight, out of mind.',
    category: 'Nature',
    note: 'Un refrán sobre la distancia emocional y la conciencia.',
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
    curator: 'A. Al-Fayed',
    date: '12th Oct, 2023',
    bookmarked: false
  }
]

const users: User[] = [
  { username: 'admin', password: 'password123' },
  { username: 'user', user: 'user123' }
]

// Proverb routes
app.get('/api/proverbs', (c) => {
  return c.json({ proverbs })
})

app.get('/api/proverbs/:id', (c) => {
  const id = c.req.param('id')
  const proverb = proverbs.find(p => p.id === id)
  if (!proverb) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  return c.json({ proverb })
})

app.post('/api/proverbs', async (c) => {
  const body = await c.req.json()
  const newProverb: Proverb = {
    ...body,
    id: Date.now().toString(),
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    bookmarked: false
  }
  proverbs.push(newProverb)
  return c.json({ proverb: newProverb }, 201)
})

app.put('/api/proverbs/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const index = proverbs.findIndex(p => p.id === id)
  if (index === -1) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  proverbs[index] = { ...proverbs[index], ...body }
  return c.json({ proverb: proverbs[index] })
})

app.delete('/api/proverbs/:id', (c) => {
  const id = c.req.param('id')
  const index = proverbs.findIndex(p => p.id === id)
  if (index === -1) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  proverbs.splice(index, 1)
  return c.json({ success: true })
})

// Auth routes
app.post('/api/login', async (c) => {
  const body = await c.req.json()
  const { username, password } = body
  const user = users.find(u => u.username === username && u.password === password)
  if (user) {
    return c.json({ success: true, username: user.username })
  }
  return c.json({ error: 'Invalid credentials' }, 401)
})

// Serve static files from __STATIC_CONTENT in production
app.get('*', (c) => {
  return c.text('API Running - Deploy frontend to Pages')
})

export default app
