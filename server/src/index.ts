import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { D1Database } from '@cloudflare/workers-types'

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
    note: 'Este refrán advises not to risk a sure gain for a potentially greater but uncertain one.',
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
    note: 'A universal proverb emphasizing the value of time.',
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
    note: 'A proverb about emotional distance and awareness.',
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
    curator: 'A. Al-Fayed',
    date: '12th Oct, 2023',
    bookmarked: false
  },
  {
    id: '5',
    spanish: 'No hay mal que por bien no venga.',
    arabic: 'لكل شيء حل',
    english: 'Every cloud has a silver lining.',
    category: 'Optimism',
    note: 'Every difficult situation has some benefit or positive aspect.',
    image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400',
    curator: 'A. Al-Fayed',
    date: '13th Oct, 2023',
    bookmarked: false
  },
  {
    id: '6',
    spanish: 'Agua que no has de beber, déjala correr.',
    arabic: 'دع ما لا يعنيك',
    english: 'Let sleeping dogs lie.',
    category: 'Wisdom',
    note: 'Advice to avoid stirring up trouble unnecessarily.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    curator: 'A. Al-Fayed',
    date: '13th Oct, 2023',
    bookmarked: false
  },
  {
    id: '7',
    spanish: 'Aprende a caminar antes de correr.',
    arabic: 'تعلم المشي قبل الركض',
    english: 'Learn to walk before you run.',
    category: 'Patience',
    note: 'One must master basics before attempting advanced skills.',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400',
    curator: 'A. Al-Fayed',
    date: '14th Oct, 2023',
    bookmarked: false
  },
  {
    id: '8',
    spanish: 'Barriga empty, corazón triste.',
    arabic: 'الجوع يفعل العجائب',
    english: 'A hungry man is an angry man.',
    category: 'Life',
    note: 'Hunger affects mood and behavior.',
    image: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400',
    curator: 'A. Al-Fayed',
    date: '14th Oct, 2023',
    bookmarked: false
  },
  {
    id: '9',
    spanish: 'Cada quien es hijo de sus obras.',
    arabic: 'الإنسان صنع يديه',
    english: 'You are the architect of your own destiny.',
    category: 'Responsibility',
    note: 'Your actions shape your future.',
    image: 'https://images.unsplash.com/photo-1503424886307-b090341d25d1?w=400',
    curator: 'A. Al-Fayed',
    date: '15th Oct, 2023',
    bookmarked: false
  },
  {
    id: '10',
    spanish: 'De tal palo, tal astilla.',
    arabic: 'مثل الأب مثل الابن',
    english: 'Like father, like son.',
    category: 'Family',
    note: 'Children often resemble their parents.',
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400',
    curator: 'A. Al-Fayed',
    date: '15th Oct, 2023',
    bookmarked: false
  },
  {
    id: '11',
    spanish: 'El que busca, encuentra.',
    arabic: 'من يبحث يجد',
    english: 'Seek and you shall find.',
    category: 'Persistence',
    note: 'Those who search will eventually find what they are looking for.',
    image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400',
    curator: 'A. Al-Fayed',
    date: '16th Oct, 2023',
    bookmarked: false
  },
  {
    id: '12',
    spanish: 'En el país de los ciegos, el tuerto es el rey.',
    arabic: 'في بلد العمى حِمارُكَ مَلَك',
    english: 'In the land of the blind, the one-eyed man is king.',
    category: 'Comparison',
    note: 'Inferior quality seems excellent when compared to even worse.',
    image: 'https://images.unsplash.com/photo-1456421385069-d3f46f5f73d4?w=400',
    curator: 'A. Al-Fayed',
    date: '16th Oct, 2023',
    bookmarked: false
  },
  {
    id: '13',
    spanish: 'Gato escaldado del agua fría huye.',
    arabic: 'مَنْ أُوذِيَ مِنْ كَلْبٍ ظَلَّ يَخافُ مِنْ شِباهِهِ',
    english: 'Once bitten, twice shy.',
    category: 'Experience',
    note: 'A bad experience makes you more cautious.',
    image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
    curator: 'A. Al-Fayed',
    date: '17th Oct, 2023',
    bookmarked: false
  },
  {
    id: '14',
    spanish: 'Haz bien y no mires a quien.',
    arabic: 'افعل الخير ولا تنتظر الشكر',
    english: 'Do good without expecting anything in return.',
    category: 'Generosity',
    note: 'Help others without expecting gratitude.',
    image: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400',
    curator: 'A. Al-Fayed',
    date: '17th Oct, 2023',
    bookmarked: false
  },
  {
    id: '15',
    spanish: 'La curiosidad es mala.',
    arabic: 'الفضول شر',
    english: 'Curiosity killed the cat.',
    category: 'Caution',
    note: 'Being too inquisitive can get you into trouble.',
    image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
    curator: 'A. Al-Fayed',
    date: '18th Oct, 2023',
    bookmarked: false
  },
  {
    id: '16',
    spanish: 'Llover sobre mojado.',
    arabic: 'المصائب لا تأتي فرادى',
    english: 'When it rains, it pours.',
    category: 'Misfortune',
    note: 'Problems often come all at once.',
    image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400',
    curator: 'A. Al-Fayed',
    date: '18th Oct, 2023',
    bookmarked: false
  },
  {
    id: '17',
    spanish: 'Más deprisa, menos prisa.',
    arabic: 'العجلة من الشيطان',
    english: 'More haste, less speed.',
    category: 'Patience',
    note: 'Rushing often leads to mistakes and delays.',
    image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400',
    curator: 'A. Al-Fayed',
    date: '19th Oct, 2023',
    bookmarked: false
  },
  {
    id: '18',
    spanish: 'Nadie es profeta en su tierra.',
    arabic: 'النبي في بلده',
    english: 'A prophet is not honored in his own country.',
    category: 'Recognition',
    note: 'People often fail to appreciate those close to them.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400',
    curator: 'A. Al-Fayed',
    date: '19th Oct, 2023',
    bookmarked: false
  },
  {
    id: '19',
    spanish: 'Nunca es tarde para aprender.',
    arabic: 'ما لا يُدرك كله لا يُترك جله',
    english: 'You are never too old to learn.',
    category: 'Education',
    note: 'Learning has no age limits.',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
    curator: 'A. Al-Fayed',
    date: '20th Oct, 2023',
    bookmarked: false
  },
  {
    id: '20',
    spanish: 'Obras son amores, que no buenas razones.',
    arabic: 'الأفعال أبلغ من الأقوال',
    english: 'Actions speak louder than words.',
    category: 'Truth',
    note: 'What you do matters more than what you say.',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
    curator: 'A. Al-Fayed',
    date: '20th Oct, 2023',
    bookmarked: false
  },
  {
    id: '21',
    spanish: 'Perro que ladra no muerde.',
    arabic: 'الكلب الذي ينبح لا يعض',
    english: 'Barking dogs seldom bite.',
    category: 'Wisdom',
    note: 'Those who threaten often do not act.',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
    curator: 'A. Al-Fayed',
    date: '21st Oct, 2023',
    bookmarked: false
  },
  {
    id: '22',
    spanish: 'Quiencalles a tu puerta, ábrela.',
    arabic: 'افتح الباب لمن يطرق',
    english: 'When opportunity knocks, open the door.',
    category: 'Opportunity',
    note: 'Take advantage of opportunities when they arise.',
    image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400',
    curator: 'A. Al-Fayed',
    date: '21st Oct, 2023',
    bookmarked: false
  },
  {
    id: '23',
    spanish: 'Ser como el perro del hortelano.',
    arabic: 'كلب البستان',
    english: 'Like the gardener\'s dog - neither eats nor lets others eat.',
    category: 'Behavior',
    note: 'Someone who neither enjoys something nor lets others enjoy it.',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
    curator: 'A. Al-Fayed',
    date: '22nd Oct, 2023',
    bookmarked: false
  },
  {
    id: '24',
    spanish: 'Tan cierto como que dos y dos son cuatro.',
    arabic: 'أثبت من ذلك',
    english: 'As sure as eggs is eggs.',
    category: 'Certainty',
    note: 'Something absolutely undeniable.',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
    curator: 'A. Al-Fayed',
    date: '22nd Oct, 2023',
    bookmarked: false
  },
  {
    id: '25',
    spanish: 'Todos los caminos lead a Roma.',
    arabic: 'كل الطرق تؤدي إلى روما',
    english: 'All roads lead to Rome.',
    category: 'Outcome',
    note: 'There are many ways to achieve the same goal.',
    image: 'https://images.unsplash.com/photo-1529260830199-42c42dda5f30?w=400',
    curator: 'A. Al-Fayed',
    date: '23rd Oct, 2023',
    bookmarked: false
  },
  {
    id: '26',
    spanish: 'Un clavo shoes a otro clavo.',
    arabic: 'مسمار يسحب مسمار',
    english: 'A nail drives out a nail.',
    category: 'Solution',
    note: 'One problem can be solved by introducing another.',
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
    curator: 'A. Al-Fayed',
    date: '23rd Oct, 2023',
    bookmarked: false
  },
  {
    id: '27',
    spanish: 'Vivir para ver.',
    arabic: 'عش ترى',
    english: 'You live and learn.',
    category: 'Experience',
    note: 'Life teaches us new things every day.',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400',
    curator: 'A. Al-Fayed',
    date: '24th Oct, 2023',
    bookmarked: false
  },
  {
    id: '28',
    spanish: 'Zapatero, a tus zapatos.',
    arabic: 'حذّار أحذيته',
    english: 'Stick to your last.',
    category: 'Expertise',
    note: 'Focus on what you know best.',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    curator: 'A. Al-Fayed',
    date: '24th Oct, 2023',
    bookmarked: false
  },
  {
    id: '29',
    spanish: 'Al mal tiempo, buena cara.',
    arabic: 'وجهاً طلقا不利于',
    english: 'Keep a stiff upper lip.',
    category: 'Attitude',
    note: 'Stay positive despite difficulties.',
    image: 'https://images.unsplash.com/photo-1529129082029-7603431b5225?w=400',
    curator: 'A. Al-Fayed',
    date: '25th Oct, 2023',
    bookmarked: false
  },
  {
    id: '30',
    spanish: 'Antes de actuar, piensa.',
    arabic: 'فكر قبل أن تتصرف',
    english: 'Think before you act.',
    category: 'Wisdom',
    note: 'Consider consequences before taking action.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    curator: 'A. Al-Fayed',
    date: '25th Oct, 2023',
    bookmarked: false
  }
]

const users: User[] = [
  { username: 'admin', password: 'password123' },
  { username: 'user', password: 'user123' }
]

// Proverb routes with pagination
app.get('/api/proverbs', (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const search = c.req.query('search')?.toLowerCase()
  const letter = c.req.query('letter')?.toUpperCase()
  
  let filtered = [...proverbs]
  
  // Filter by search
  if (search) {
    filtered = filtered.filter(p => 
      p.spanish.toLowerCase().includes(search) ||
      p.arabic.includes(search) ||
      p.english.toLowerCase().includes(search)
    )
  }
  
  // Filter by letter
  if (letter) {
    filtered = filtered.filter(p => p.spanish.toUpperCase().startsWith(letter))
  }
  
  // Paginate
  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const paginated = filtered.slice(start, start + limit)
  
  return c.json({ 
    proverbs: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  })
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

// Image upload endpoint (base64)
app.post('/api/upload', async (c) => {
  const body = await c.req.json()
  const { image, filename } = body
  
  if (!image) {
    return c.json({ error: 'No image provided' }, 400)
  }
  
  // Validate it's a proper base64 image
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const matches = image.match(/^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i)
  
  if (!matches) {
    return c.json({ error: 'Invalid image format' }, 400)
  }
  
  // Generate unique ID for the image
  const imageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  const extension = filename?.split('.').pop() || 'jpg'
  const storedFilename = `${imageId}.${extension}`
  
  // Store in-memory (in production, use R2 or KV)
  // For now, return the base64 as data URL
  return c.json({ 
    success: true, 
    url: image,
    filename: storedFilename
  })
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
