import { Hono } from 'hono'

import type { AppBindings, AppEnv } from '../../shared/types/app-env'
import type { AuthService } from './auth.service'

type AuthServiceFactory = (bindings: AppBindings) => AuthService

export function createAuthRouter(getAuthService: AuthServiceFactory) {
  const router = new Hono<AppEnv>()

  router.post('/login', async (c) => {
    const body = await c.req.json<{ username: string; password: string }>()
    const result = await getAuthService(c.env).login(body.username, body.password)

    if (result) {
      return c.json(result)
    }

    return c.json({ error: 'Invalid credentials' }, 401)
  })

  return router
}
