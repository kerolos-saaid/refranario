import { describe, expect, test } from 'bun:test'

import { apiRateLimitPolicies } from '../../src/shared/rate-limit/api-rate-limit.policy'
import { D1ApiRateLimitService } from '../../src/shared/rate-limit/api-rate-limit.service'
import type { AppEnv } from '../../src/shared/types/app-env'

type StoredEntry = {
  windowStartedAt: number
  windowEndsAt: number
  requestCount: number
}

class FakeD1Database {
  private readonly rows = new Map<string, StoredEntry>()

  prepare() {
    const database = this

    return {
      bind(
        rateKey: string,
        _policyKey: string,
        _ruleKey: string,
        _subject: string,
        bucketStart: number,
        bucketEnd: number
      ) {
        return {
          async first<T>() {
            const existing = database.rows.get(rateKey)

            if (!existing || bucketStart > existing.windowStartedAt) {
              const next = {
                windowStartedAt: bucketStart,
                windowEndsAt: bucketEnd,
                requestCount: 1
              }
              database.rows.set(rateKey, next)

              return {
                requestCount: next.requestCount,
                windowEndsAt: next.windowEndsAt
              } as T
            }

            existing.requestCount += 1

            return {
              requestCount: existing.requestCount,
              windowEndsAt: existing.windowEndsAt
            } as T
          }
        }
      }
    }
  }
}

function createContext(options?: {
  ip?: string
  username?: string
  authUser?: string
}) {
  const username = options?.username

  return {
    req: {
      header(name: string) {
        if (name === 'CF-Connecting-IP') {
          return options?.ip || '198.51.100.1'
        }

        return undefined
      },
      raw: {
        clone() {
          return {
            async json() {
              return username ? { username } : {}
            }
          }
        }
      }
    },
    get(name: string) {
      if (name === 'user' && options?.authUser) {
        return {
          username: options.authUser,
          role: 'admin',
          tokenVersion: 1
        }
      }

      return undefined
    }
  } as unknown as Parameters<D1ApiRateLimitService['consume']>[0]
}

describe('D1ApiRateLimitService', () => {
  test('enforces the per-ip-and-username login policy', async () => {
    const service = new D1ApiRateLimitService(new FakeD1Database() as unknown as AppEnv['Bindings']['senor_shabi_db'])
    const policy = apiRateLimitPolicies.login
    let lastDecision = null as Awaited<ReturnType<D1ApiRateLimitService['consume']>> | null

    const originalNow = Date.now
    Date.now = () => 1_700_000_000_000

    try {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        lastDecision = await service.consume(
          createContext({
            ip: '203.0.113.8',
            username: 'admin'
          }),
          policy
        )
      }
    } finally {
      Date.now = originalNow
    }

    expect(lastDecision).not.toBeNull()
    expect(lastDecision?.allowed).toBe(false)
    expect(lastDecision?.retryAfterSeconds).toBeGreaterThan(0)
    expect(lastDecision?.errorMessage).toBe(policy.errorMessage)
  })

  test('resets a fixed window after enough time passes', async () => {
    const service = new D1ApiRateLimitService(new FakeD1Database() as unknown as AppEnv['Bindings']['senor_shabi_db'])
    const policy = apiRateLimitPolicies.imageJobBackfill
    const originalNow = Date.now
    let now = 1_700_000_000_000
    Date.now = () => now

    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await service.consume(
          createContext({
            ip: '198.51.100.9',
            authUser: 'admin'
          }),
          policy
        )
      }

      const blocked = await service.consume(
        createContext({
          ip: '198.51.100.9',
          authUser: 'admin'
        }),
        policy
      )

      expect(blocked.allowed).toBe(false)

      now += (10 * 60_000) + 1_000

      const afterReset = await service.consume(
        createContext({
          ip: '198.51.100.9',
          authUser: 'admin'
        }),
        policy
      )

      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe((policy.rules[0]?.limit ?? 0) - 1)
    } finally {
      Date.now = originalNow
    }
  })
})

