import type { MiddlewareHandler } from 'hono'

import type { TokenService } from '../security/jwt.service'
import type { AppEnv } from '../types/app-env'

export function createRequireAdmin(tokenService: TokenService): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      return c.json({ error: 'Unauthorized - No token' }, 401)
    }

    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = await tokenService.verify(token)

      if (!payload) {
        return c.json({ error: 'Unauthorized - Invalid token' }, 401)
      }

      if (payload.role !== 'admin') {
        return c.json({ error: 'Forbidden - Admin only' }, 403)
      }

      c.set('user', payload)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401)
    }
  }
}
