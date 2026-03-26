import type { MiddlewareHandler } from 'hono'

import type { UserRepository } from '../../modules/auth/user.repository'
import type { TokenService } from '../security/jwt.service'
import type { AppEnv } from '../types/app-env'

export function createRequireAdmin(
  tokenService: TokenService,
  getUserRepository: (env: AppEnv['Bindings']) => UserRepository
): MiddlewareHandler<AppEnv> {
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

      if (typeof payload.tokenVersion !== 'number') {
        return c.json({ error: 'Unauthorized - Session expired' }, 401)
      }

      const user = await getUserRepository(c.env).findByUsername(payload.username)

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        return c.json({ error: 'Unauthorized - Session expired' }, 401)
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
