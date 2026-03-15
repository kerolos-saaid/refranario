import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

// Simple JWT implementation using HMAC-SHA256
const JWT_SECRET = 'senor-shabi-secret-key-2024'

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function hmacSign(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return base64UrlEncode(new Uint8Array(signature))
}

function base64UrlDecode(data: string): string {
  const pad = data.length % 4
  const padded = pad ? data + '='.repeat(4 - pad) : data
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

async function verifyJWT(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const header = parts[0]
    const payload = parts[1]
    const signature = parts[2]
    
    if (!header || !payload || !signature) return null
    
    const expectedSig = await hmacSign(`${header}.${payload}`, JWT_SECRET)
    
    if (signature !== expectedSig) return null
    
    const payloadJson = base64UrlDecode(payload)
    return JSON.parse(payloadJson)
  } catch {
    return null
  }
}

async function signJWT(payload: { username: string; role: string }): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = base64UrlEncode(new Uint8Array(new TextEncoder().encode(JSON.stringify(header))))
  const payloadB64 = base64UrlEncode(new Uint8Array(new TextEncoder().encode(JSON.stringify(payload))))
  const signature = await hmacSign(`${headerB64}.${payloadB64}`, JWT_SECRET)
  
  return `${headerB64}.${payloadB64}.${signature}`
}

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
  senor_shabi_images: R2Bucket
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', cors())

// Auth middleware - check if user is admin using JWT
async function requireAdmin(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: 'Unauthorized - No token' }, 401)
  }
  
  try {
    // Extract JWT token (Bearer <token>)
    const token = authHeader.replace('Bearer ', '')
    
    // Verify JWT
    const payload = await verifyJWT(token)
    if (!payload) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401)
    }
    
    if (payload.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin only' }, 403)
    }
    
    // Store user info in context
    c.set('user', payload)
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

// Get single proverb by ID
app.get('/api/proverbs/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.senor_shabi_db

  try {
    const result = await db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first()

    if (!result) {
      return c.json({ error: 'Proverb not found' }, 404)
    }

    return c.json({ proverb: rowToProverb(result) })
  } catch (e) {
    console.error('D1 Query Error:', e)
    return c.json({ error: 'Database error', details: String(e) }, 500)
  }
})

// Admin-only: Create proverb
app.post('/api/proverbs', requireAdmin, async (c) => {
  const body = await c.req.json()
  const db = c.env.senor_shabi_db
  
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

// Admin-only: Upload image to R2
app.post('/api/upload', requireAdmin, async (c) => {
  const body = await c.req.json()
  const { image, filename } = body
  const r2 = c.env.senor_shabi_images
  
  if (!image) {
    return c.json({ error: 'No image provided' }, 400)
  }
  
  // Validate it's a proper base64 image
  const matches = image.match(/^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i)
  
  if (!matches) {
    return c.json({ error: 'Invalid image format' }, 400)
  }
  
  // Extract base64 data and mime type
  const base64Data = image.replace(/^data:[^;]+;base64,/, '')
  const mimeType = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg'
  const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
  
  // Generate unique ID for the image
  const imageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  const extension = filename?.split('.').pop() || mimeType.split('/')[1] || 'jpg'
  const storedFilename = `${imageId}.${extension}`
  
  // Upload to R2
  await r2.put(storedFilename, imageBuffer, {
    httpMetadata: {
      contentType: mimeType
    }
  })
  
  // Return R2 public URL (using R2's direct URL format)
  const publicUrl = `https://pub-${'e932169c-2609-44f5-9478-547d7b95c946'}.r2.cloudflarestorage.com/${storedFilename}`
  
  return c.json({ 
    success: true, 
    url: publicUrl,
    filename: storedFilename
  })
})

// Admin-only: Delete image from R2
app.delete('/api/upload/:filename', requireAdmin, async (c) => {
  const filename = c.req.param('filename')
  const r2 = c.env.senor_shabi_images
  
  try {
    await r2.delete(filename)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed to delete image' }, 500)
  }
})

// Admin-only: Update proverb
app.put('/api/proverbs/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = c.env.senor_shabi_db
  const r2 = c.env.senor_shabi_images
  
  // Get current proverb to check for image change
  const currentProverb = await db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first() as { image: string } | undefined
  
  // If image is being updated and old image was an R2 image, delete old image
  if (body.image !== undefined && currentProverb?.image && body.image !== currentProverb.image) {
    const oldUrl = currentProverb.image
    // Extract filename from R2 URL
    const oldFilename = oldUrl.split('/').pop()
    if (oldFilename && oldUrl.includes('r2.cloudflarestorage.com')) {
      try {
        await r2.delete(oldFilename)
        console.log('[R2] Deleted old image:', oldFilename)
      } catch (e) {
        console.error('[R2] Failed to delete old image:', e)
      }
    }
  }
  
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
  
  const result = await db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').bind(username, password).first() as { username: string; role: string } | undefined
  
  if (result) {
    // Generate JWT token
    const token = await signJWT({ username: result.username, role: result.role })
    return c.json({ success: true, username: result.username, role: result.role, token })
  }
  return c.json({ error: 'Invalid credentials' }, 401)
})

// Serve static files from __STATIC_CONTENT in production
app.get('*', (c) => {
  return c.text('API Running - Deploy frontend to Pages')
})

export default app
