import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

import type { AppBindings, AppEnv } from '../../shared/types/app-env'
import type { ProverbImageJobService } from './proverb-image.service'

type ProverbImageJobServiceFactory = (bindings: AppBindings) => ProverbImageJobService

export function createProverbImageJobRouter(
  getProverbImageJobService: ProverbImageJobServiceFactory,
  requireAdmin: MiddlewareHandler<AppEnv>
) {
  const router = new Hono<AppEnv>()

  router.post('/proverb-image-jobs/backfill', requireAdmin, async (c) => {
    const body = await c.req.json<{ limit?: number }>().catch(() => ({}) as { limit?: number })
    const result = await getProverbImageJobService(c.env).backfill(body.limit)

    return c.json(result)
  })

  router.get('/proverb-image-jobs', requireAdmin, async (c) => {
    const limit = parseInt(c.req.query('limit') || '50')
    const jobs = await getProverbImageJobService(c.env).listActiveJobs(limit)

    return c.json({ jobs })
  })

  router.post('/proverbs/:id/regenerate-image', requireAdmin, async (c) => {
    const result = await getProverbImageJobService(c.env).regenerate(c.req.param('id'))

    if (result.kind === 'not-found') {
      return c.json({ error: 'Proverb not found' }, 404)
    }

    return c.json({
      success: true,
      skipped: result.kind === 'skipped-existing-image'
    })
  })

  return router
}
