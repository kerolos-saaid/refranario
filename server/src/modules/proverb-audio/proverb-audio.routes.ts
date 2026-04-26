import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'

import type { AppBindings, AppEnv } from '../../shared/types/app-env'
import type { ProverbAudioService } from './proverb-audio.service'

type ProverbAudioServiceFactory = (bindings: AppBindings) => ProverbAudioService

export function createProverbAudioRouter(
  getProverbAudioService: ProverbAudioServiceFactory,
  arabicAudioRateLimit: MiddlewareHandler<AppEnv>,
  requireAdmin: MiddlewareHandler<AppEnv>,
  arabicAudioUploadRateLimit: MiddlewareHandler<AppEnv>
) {
  const router = new Hono<AppEnv>()

  router.post('/proverbs/:id/arabic-audio', arabicAudioRateLimit, async (c) => {
    const result = await getProverbAudioService(c.env).generateArabicAudio(c.req.param('id'))

    if (result.retryAfterSeconds) {
      c.header('Retry-After', String(result.retryAfterSeconds))
    }

    return c.json(result.response, result.httpStatus as 200)
  })

  router.get('/admin/arabic-audio/browser-config', requireAdmin, arabicAudioUploadRateLimit, async (c) => {
    return c.json(getProverbAudioService(c.env).getBrowserGenerationConfig())
  })

  router.post('/proverbs/:id/arabic-audio/upload', requireAdmin, arabicAudioUploadRateLimit, async (c) => {
    const body = await c.req.json().catch(() => ({})) as { audio?: string }
    const result = await getProverbAudioService(c.env).saveUploadedArabicAudio(c.req.param('id'), body.audio)
    return c.json(result.response, result.httpStatus as 200)
  })

  return router
}
