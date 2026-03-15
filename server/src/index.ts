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
  senor_shabi_db: D1Database
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', cors())

// Auth middleware - check if user is admin
async function requireAdmin(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: 'Unauthorized - No token' }, 401)
  }
  
  try {
    // Decode base64 credentials
    const credentials = atob(authHeader.replace('Basic ', ''))
    const [username, password] = credentials.split(':')
    
    // Verify credentials and get role
    const db = c.env.senor_shabi_db
    const user = await db.prepare(
      'SELECT username, role FROM users WHERE username = ? AND password = ?'
    ).bind(username, password).first()
    
    if (!user) {
      return c.json({ error: 'Unauthorized - Invalid credentials' }, 401)
    }
    
    if (user.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }
    
    // Store user info in context
    c.set('user', user)
    await next()
  } catch (e) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401)
  }
}

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
  
  const db = c.env.senor_shabi_db
  
  let proverbs: any[] = []
  let total = 0
  
  try {
    // Simple queries without complex param building
    if (search && letter) {
      const countResult = await db.prepare(
        `SELECT COUNT(*) as total FROM proverbs WHERE (spanish LIKE ?1 OR english LIKE ?2) AND spanish LIKE ?3`
      ).bind(`%${search}%`, `%${search}%`, `${letter}%`).first<{ total: number }>()
      total = countResult?.total || 0
      
      const offset = (page - 1) * limit
      const result = await db.prepare(
        `SELECT * FROM proverbs WHERE (spanish LIKE ?1 OR english LIKE ?2) AND spanish LIKE ?3 ORDER BY spanish ASC LIMIT ?4 OFFSET ?5`
      ).bind(`%${search}%`, `%${search}%`, `${letter}%`, limit, offset).all()
      proverbs = result.results || []
    } else if (search) {
      const countResult = await db.prepare(
        `SELECT COUNT(*) as total FROM proverbs WHERE spanish LIKE ?1 OR english LIKE ?2`
      ).bind(`%${search}%`, `%${search}%`).first<{ total: number }>()
      total = countResult?.total || 0
      
      const offset = (page - 1) * limit
      const result = await db.prepare(
        `SELECT * FROM proverbs WHERE spanish LIKE ?1 OR english LIKE ?2 ORDER BY spanish ASC LIMIT ?3 OFFSET ?4`
      ).bind(`%${search}%`, `%${search}%`, limit, offset).all()
      proverbs = result.results || []
    } else if (letter) {
      const countResult = await db.prepare(
        `SELECT COUNT(*) as total FROM proverbs WHERE spanish LIKE ?1`
      ).bind(`${letter}%`).first<{ total: number }>()
      total = countResult?.total || 0
      
      const offset = (page - 1) * limit
      const result = await db.prepare(
        `SELECT * FROM proverbs WHERE spanish LIKE ?1 ORDER BY spanish ASC LIMIT ?2 OFFSET ?3`
      ).bind(`${letter}%`, limit, offset).all()
      proverbs = result.results || []
    } else {
      const countResult = await db.prepare(`SELECT COUNT(*) as total FROM proverbs`).first<{ total: number }>()
      total = countResult?.total || 0
      
      const offset = (page - 1) * limit
      const result = await db.prepare(`SELECT * FROM proverbs ORDER BY spanish ASC LIMIT ?1 OFFSET ?2`).bind(limit, offset).all()
      proverbs = result.results || []
    }
  } catch (e) {
    console.error('D1 Query Error:', e)
    return c.json({ error: 'Database error', details: String(e) }, 500)
  }
  
  const proverbObjects = proverbs.map(rowToProverb)
  const totalPages = Math.ceil(total / limit)
  
  return c.json({ 
    proverbs: proverbObjects,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  })
})

// Admin-only: Upload image
app.post('/api/upload', requireAdmin, async (c) => {
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

// Admin-only: Update proverb
app.put('/api/proverbs/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = c.env.senor_shabi_db
  
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

// Admin-only: Delete proverb
app.delete('/api/proverbs/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const db = c.env.senor_shabi_db
  
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
  const db = c.env.senor_shabi_db
  
  const result = await db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').bind(username, password).first()
  
  if (result) {
    return c.json({ success: true, username: result.username, role: result.role })
  }
  return c.json({ error: 'Invalid credentials' }, 401)
})

// Serve static files from __STATIC_CONTENT in production
app.get('*', (c) => {
  return c.text('API Running - Deploy frontend to Pages')
})

export default app
