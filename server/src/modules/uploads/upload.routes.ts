import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

import type { AppBindings, AppEnv } from '../../shared/types/app-env'
import type { UploadService } from './upload.service'

type UploadServiceFactory = (bindings: AppBindings) => UploadService

export function createUploadRouter(
  getUploadService: UploadServiceFactory,
  requireAdmin: MiddlewareHandler<AppEnv>
) {
  const router = new Hono<AppEnv>()

  router.post('/upload', requireAdmin, async (c) => {
    const body = await c.req.json<{ image?: string; filename?: string }>()
    const result = await getUploadService(c.env).upload(body.image, body.filename)

    if (result.kind === 'missing-image') {
      return c.json({ error: 'No image provided' }, 400)
    }

    if (result.kind === 'invalid-format') {
      return c.json({ error: 'Invalid image format' }, 400)
    }

    return c.json(result.payload)
  })

  router.delete('/upload/:filename', requireAdmin, async (c) => {
    try {
      await getUploadService(c.env).delete(c.req.param('filename'))
      return c.json({ success: true })
    } catch {
      return c.json({ error: 'Failed to delete image' }, 500)
    }
  })

  return router
}
