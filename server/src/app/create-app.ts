import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { createAuthRouter } from '../modules/auth/auth.routes'
import { createProverbAudioRouter } from '../modules/proverb-audio/proverb-audio.routes'
import { createProverbImageJobRouter } from '../modules/proverb-images/proverb-image.routes'
import { createProverbRouter } from '../modules/proverbs/proverb.routes'
import { createUploadRouter } from '../modules/uploads/upload.routes'
import { createRequireAdmin } from '../shared/middleware/require-admin'
import { createRateLimit } from '../shared/middleware/rate-limit'
import { apiRateLimitPolicies } from '../shared/rate-limit/api-rate-limit.policy'
import type { AppEnv } from '../shared/types/app-env'
import {
  createApiRateLimitService,
  createAuthService,
  createProverbAudioService,
  createProverbImageJobService,
  createProverbService,
  createUserRepository,
  createUploadService,
  getTokenService
} from './create-services'

export function createApp() {
  const app = new Hono<AppEnv>()
  const requireAdmin = createRequireAdmin(getTokenService(), createUserRepository)
  const publicProverbsListRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.publicProverbsList)
  const publicProverbDetailRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.publicProverbDetail)
  const loginRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.login)
  const adminProverbMutationsRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.adminProverbMutations)
  const adminUploadsRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.adminUploads)
  const adminUploadDeletesRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.adminUploadDeletes)
  const imageJobStatusRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.imageJobStatus)
  const imageJobBackfillRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.imageJobBackfill)
  const imageJobRegenerateRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.imageJobRegenerate)
  const arabicAudioGenerateRateLimit = createRateLimit(createApiRateLimitService, apiRateLimitPolicies.arabicAudioGenerate)

  app.use('*', logger())
  app.use('*', cors())

  app.route('/api', createProverbRouter(
    createProverbService,
    requireAdmin,
    publicProverbsListRateLimit,
    publicProverbDetailRateLimit,
    adminProverbMutationsRateLimit
  ))
  app.route('/api', createProverbImageJobRouter(
    createProverbImageJobService,
    requireAdmin,
    imageJobBackfillRateLimit,
    imageJobStatusRateLimit,
    imageJobRegenerateRateLimit
  ))
  app.route('/api', createProverbAudioRouter(
    createProverbAudioService,
    arabicAudioGenerateRateLimit
  ))
  app.route('/api', createUploadRouter(
    createUploadService,
    requireAdmin,
    adminUploadsRateLimit,
    adminUploadDeletesRateLimit
  ))
  app.route('/api', createAuthRouter(createAuthService, loginRateLimit))

  app.get('*', (c) => {
    return c.text('API Running - Deploy frontend to Pages')
  })

  return app
}
