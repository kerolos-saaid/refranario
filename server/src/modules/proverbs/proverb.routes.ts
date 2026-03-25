import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

import type { AppBindings, AppEnv } from '../../shared/types/app-env'
import type { CreateProverbInput, UpdateProverbInput } from './proverb.types'
import type { ProverbService } from './proverb.service'

type ProverbServiceFactory = (bindings: AppBindings) => ProverbService

export function createProverbRouter(
  getProverbService: ProverbServiceFactory,
  requireAdmin: MiddlewareHandler<AppEnv>
) {
  const router = new Hono<AppEnv>()

  router.get('/proverbs', async (c) => {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const search = c.req.query('search')?.toLowerCase()
    const letter = c.req.query('letter')?.toUpperCase()

    try {
      const result = await getProverbService(c.env).list({ page, limit, search, letter })
      return c.json(result)
    } catch (error) {
      console.error('D1 Query Error:', error)
      return c.json({ error: 'Database error', details: String(error) }, 500)
    }
  })

  router.get('/proverbs/:id', async (c) => {
    try {
      const proverb = await getProverbService(c.env).getById(c.req.param('id'))

      if (!proverb) {
        return c.json({ error: 'Proverb not found' }, 404)
      }

      return c.json({ proverb })
    } catch (error) {
      console.error('D1 Query Error:', error)
      return c.json({ error: 'Database error', details: String(error) }, 500)
    }
  })

  router.post('/proverbs', requireAdmin, async (c) => {
    const body = await c.req.json<CreateProverbInput>()
    const proverb = await getProverbService(c.env).create(body)

    return c.json({ proverb }, 201)
  })

  router.put('/proverbs/:id', requireAdmin, async (c) => {
    const body = await c.req.json<UpdateProverbInput>()
    const result = await getProverbService(c.env).update(c.req.param('id'), body)

    if (result.kind === 'no-fields') {
      return c.json({ error: 'No fields to update' }, 400)
    }

    if (result.kind === 'not-found') {
      return c.json({ error: 'Proverb not found' }, 404)
    }

    return c.json({ proverb: result.proverb })
  })

  router.delete('/proverbs/:id', requireAdmin, async (c) => {
    const result = await getProverbService(c.env).delete(c.req.param('id'))

    if (result.kind === 'not-found') {
      return c.json({ error: 'Proverb not found' }, 404)
    }

    return c.json({ success: true })
  })

  return router
}
