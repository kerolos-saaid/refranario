import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { createAuthRouter } from '../modules/auth/auth.routes'
import { createProverbRouter } from '../modules/proverbs/proverb.routes'
import { createUploadRouter } from '../modules/uploads/upload.routes'
import { createRequireAdmin } from '../shared/middleware/require-admin'
import type { AppEnv } from '../shared/types/app-env'
import { createAuthService, createProverbService, createUploadService, getTokenService } from './create-services'

export function createApp() {
  const app = new Hono<AppEnv>()
  const requireAdmin = createRequireAdmin(getTokenService())

  app.use('*', logger())
  app.use('*', cors())

  app.route('/api', createProverbRouter(createProverbService, requireAdmin))
  app.route('/api', createUploadRouter(createUploadService, requireAdmin))
  app.route('/api', createAuthRouter(createAuthService))

  app.get('*', (c) => {
    return c.text('API Running - Deploy frontend to Pages')
  })

  return app
}
