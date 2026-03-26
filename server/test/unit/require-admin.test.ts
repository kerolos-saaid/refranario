import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'

import { createRequireAdmin } from '../../src/shared/middleware/require-admin'
import type { TokenService } from '../../src/shared/security/jwt.service'
import type { UserRepository } from '../../src/modules/auth/user.repository'
import type { AppEnv, AuthenticatedUser } from '../../src/shared/types/app-env'

class FakeTokenService implements TokenService {
  constructor(private readonly payloads: Record<string, AuthenticatedUser | null>) {}

  async sign(payload: AuthenticatedUser) {
    return JSON.stringify(payload)
  }

  async verify(token: string) {
    return this.payloads[token] ?? null
  }
}

class FakeUserRepository implements UserRepository {
  constructor(private readonly users: Record<string, { username: string; role: string; tokenVersion: number } | null>) {}

  async findByCredentials() {
    return null
  }

  async findByUsername(username: string) {
    return this.users[username] ?? null
  }
}

function createTestApp(payloads: Record<string, AuthenticatedUser | null>, users: Record<string, { username: string; role: string; tokenVersion: number } | null>) {
  const app = new Hono<AppEnv>()
  const middleware = createRequireAdmin(
    new FakeTokenService(payloads),
    () => new FakeUserRepository(users)
  )

  app.get('/guarded', middleware, (c) => c.json({ ok: true, user: c.get('user') }))

  return app
}

describe('createRequireAdmin', () => {
  test('rejects non-bearer authorization headers', async () => {
    const app = createTestApp({}, {})
    const response = await app.request('http://localhost/guarded', {
      headers: {
        Authorization: 'Basic abc123'
      }
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized - Invalid token' })
  })

  test('rejects tokens whose role no longer matches the database', async () => {
    const app = createTestApp(
      {
        valid: {
          username: 'admin',
          role: 'admin',
          tokenVersion: 1
        }
      },
      {
        admin: {
          username: 'admin',
          role: 'user',
          tokenVersion: 1
        }
      }
    )

    const response = await app.request('http://localhost/guarded', {
      headers: {
        Authorization: 'Bearer valid'
      }
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized - Session expired' })
  })

  test('allows a current admin token and forwards the fresh user record', async () => {
    const app = createTestApp(
      {
        valid: {
          username: 'admin',
          role: 'admin',
          tokenVersion: 2
        }
      },
      {
        admin: {
          username: 'admin',
          role: 'admin',
          tokenVersion: 2
        }
      }
    )

    const response = await app.request('http://localhost/guarded', {
      headers: {
        Authorization: 'Bearer valid'
      }
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      user: {
        username: 'admin',
        role: 'admin',
        tokenVersion: 2
      }
    })
  })
})
