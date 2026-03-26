import type { MiddlewareHandler } from 'hono'

import type { D1ApiRateLimitService } from '../rate-limit/api-rate-limit.service'
import type { ApiRateLimitPolicy } from '../rate-limit/api-rate-limit.policy'
import type { AppEnv } from '../types/app-env'

type RateLimitServiceFactory = (env: AppEnv['Bindings']) => D1ApiRateLimitService

export function createRateLimit(
  getRateLimitService: RateLimitServiceFactory,
  policy: ApiRateLimitPolicy
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    try {
      const decision = await getRateLimitService(c.env).consume(c, policy)
      applyRateLimitHeaders(c, decision.limit, decision.remaining, decision.resetSeconds, decision.policyKey)

      if (!decision.allowed) {
        c.header('Retry-After', String(decision.retryAfterSeconds ?? decision.resetSeconds))
        return c.json({
          error: decision.errorMessage ?? 'Too many requests. Please try again later.',
          retryAfterSeconds: decision.retryAfterSeconds ?? decision.resetSeconds
        }, 429)
      }
    } catch (error) {
      console.error('[RateLimit] Failed to evaluate policy', policy.key, error)
    }

    await next()
  }
}

function applyRateLimitHeaders(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  limit: number,
  remaining: number,
  resetSeconds: number,
  policyKey: string
) {
  c.header('X-RateLimit-Limit', String(limit))
  c.header('X-RateLimit-Remaining', String(remaining))
  c.header('X-RateLimit-Reset', String(resetSeconds))
  c.header('X-RateLimit-Policy', policyKey)
}
