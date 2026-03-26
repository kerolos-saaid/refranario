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

    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401)
    }

    try {
      const token = authHeader.slice('Bearer '.length)
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

      if (user.role !== payload.role) {
        return c.json({ error: 'Unauthorized - Session expired' }, 401)
      }

      if (user.role !== 'admin') {
        return c.json({ error: 'Forbidden - Admin only' }, 403)
      }

      c.set('user', {
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion
      })
      await next()
    } catch {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401)
    }
  }
}
