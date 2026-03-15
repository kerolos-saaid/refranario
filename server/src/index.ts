import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'

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

// Helper to convert D1 result to Proverb
function rowToProverb(row: any): Proverb {
  return {
    id: row.id,
    spanish: row.spanish,
    arabic: row.arabic,
    english: row.english,
    category: row.category,
    note: row.note || '',
    image: row.image || '',
    curator: row.curator,
    date: row.date,
    bookmarked: Boolean(row.bookmarked)
  }
}

// Proverb routes with pagination - using D1
app.get('/api/proverbs', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const search = c.req.query('search')?.toLowerCase()
  const letter = c.req.query('letter')?.toUpperCase()
  
  const db = c.env.DB
  
  // Build WHERE clause
  let whereClause = ''
  const params: any[] = []
  
  if (search) {
    whereClause = 'WHERE (spanish LIKE ?1 OR english LIKE ?2)'
    params.push(`%${search}%`, `%${search}%`)
  }
  
  if (letter) {
    whereClause = whereClause ? whereClause + ' AND spanish LIKE ?' : 'WHERE spanish LIKE ?'
    params.push(`${letter}%`)
  }
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM proverbs ${whereClause}`
  const countStmt = db.prepare(countQuery)
  const countResult = params.length > 0 ? await countStmt.bind(...params).first<{ total: number }>() : await countStmt.first<{ total: number }>()
  const total = countResult?.total || 0
  
  // Get paginated results
  const offset = (page - 1) * limit
  const orderBy = whereClause ? 'ORDER BY spanish ASC' : 'ORDER BY spanish ASC'
  const query = `SELECT * FROM proverbs ${whereClause ? whereClause + ' ' + orderBy : orderBy} LIMIT ? OFFSET ?`
  
  const stmt = db.prepare(query)
  const allParams = [...params, limit, offset]
  const result = allParams.length > params.length + 2 
    ? await stmt.bind(...allParams).all() 
    : await stmt.bind(limit, offset).all()
  
  const proverbs = (result.results || []).map(rowToProverb)
  const totalPages = Math.ceil(total / limit)
  
  return c.json({ 
    proverbs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  })
})

app.get('/api/proverbs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  
  const result = await db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first()
  
  if (!result) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  
  return c.json({ proverb: rowToProverb(result) })
})

app.post('/api/proverbs', async (c) => {
  const body = await c.req.json()
  const db = c.env.DB
  
  const id = Date.now().toString()
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  
  await db.prepare(`
    INSERT INTO proverbs (id, spanish, arabic, english, category, note, image, curator, date, bookmarked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(
    id,
    body.spanish,
    body.arabic,
    body.english,
    body.category || 'Wisdom',
    body.note || '',
    body.image || '',
    body.curator || 'Admin',
    date
  ).run()
  
  const result = await db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first()
  
  return c.json({ proverb: rowToProverb(result) }, 201)
})

// Image upload endpoint (base64)
app.post('/api/upload', async (c) => {
  const body = await c.req.json()
  const { image, filename } = body
  
  if (!image) {
    return c.json({ error: 'No image provided' }, 400)
  }
  
  // Validate it's a proper base64 image
  const matches = image.match(/^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i)
  
  if (!matches) {
    return c.json({ error: 'Invalid image format' }, 400)
  }
  
  // Generate unique ID for the image
  const imageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  const extension = filename?.split('.').pop() || 'jpg'
  const storedFilename = `${imageId}.${extension}`
  
  // Return the base64 as data URL
  return c.json({ 
    success: true, 
    url: image,
    filename: storedFilename
  })
})

app.put('/api/proverbs/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = c.env.DB
  
  // Build update query dynamically
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  if (body.spanish !== undefined) { fields.push(`spanish = ?${paramIndex++}`); values.push(body.spanish) }
  if (body.arabic !== undefined) { fields.push(`arabic = ?${paramIndex++}`); values.push(body.arabic) }
  if (body.english !== undefined) { fields.push(`english = ?${paramIndex++}`); values.push(body.english) }
  if (body.category !== undefined) { fields.push(`category = ?${paramIndex++}`); values.push(body.category) }
  if (body.note !== undefined) { fields.push(`note = ?${paramIndex++}`); values.push(body.note) }
  if (body.image !== undefined) { fields.push(`image = ?${paramIndex++}`); values.push(body.image) }
  if (body.curator !== undefined) { fields.push(`curator = ?${paramIndex++}`); values.push(body.curator) }
  if (body.bookmarked !== undefined) { fields.push(`bookmarked = ?${paramIndex++}`); values.push(body.bookmarked ? 1 : 0) }
  
  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400)
  }
  
  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)
  
  const query = `UPDATE proverbs SET ${fields.join(', ')} WHERE id = ?${paramIndex}`
  await db.prepare(query).bind(...values).run()
  
  // Get updated record
  const result = await db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first()
  
  if (!result) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  
  return c.json({ proverb: rowToProverb(result) })
})

app.delete('/api/proverbs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  
  // Check if exists
  const checkResult = await db.prepare('SELECT id FROM proverbs WHERE id = ?').bind(id).first()
  if (!checkResult) {
    return c.json({ error: 'Proverb not found' }, 404)
  }
  
  await db.prepare('DELETE FROM proverbs WHERE id = ?').bind(id).run()
  
  return c.json({ success: true })
})

// Auth routes - using D1
app.post('/api/login', async (c) => {
  const body = await c.req.json()
  const { username, password } = body
  const db = c.env.DB
  
  const result = await db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').bind(username, password).first()
  
  if (result) {
    return c.json({ success: true, username: result.username })
  }
  return c.json({ error: 'Invalid credentials' }, 401)
})

// Serve static files from __STATIC_CONTENT in production
app.get('*', (c) => {
  return c.text('API Running - Deploy frontend to Pages')
})

export default app
