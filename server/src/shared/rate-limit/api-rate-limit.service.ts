import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

import type { AppEnv } from '../types/app-env'
import type { ApiRateLimitPolicy, ApiRateLimitRule, ApiRateLimitScope } from './api-rate-limit.policy'

type ApiRateLimitRow = {
  requestCount: number
  windowEndsAt: number
}

type ApiRateLimitRuleResult = {
  rule: ApiRateLimitRule
  requestCount: number
  remaining: number
  resetSeconds: number
  exceeded: boolean
}

export type ApiRateLimitDecision = {
  allowed: boolean
  policyKey: string
  limit: number
  remaining: number
  resetSeconds: number
  retryAfterSeconds?: number
  errorMessage?: string
}

export class D1ApiRateLimitService {
  constructor(private readonly db: D1Database) {}

  async consume(c: Context<AppEnv>, policy: ApiRateLimitPolicy): Promise<ApiRateLimitDecision> {
    const now = Date.now()
    const results: ApiRateLimitRuleResult[] = []

    for (const rule of policy.rules) {
      const bucketStart = Math.floor(now / rule.windowMs) * rule.windowMs
      const bucketEnd = bucketStart + rule.windowMs
      const subject = await this.resolveSubject(c, rule.scope)
      const rateKey = `${policy.key}:${rule.key}:${subject}`

      const row = await this.db.prepare(
        `
          INSERT INTO api_rate_limits (
            rate_key,
            policy_key,
            rule_key,
            subject,
            window_started_at,
            window_ends_at,
            request_count
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
          ON CONFLICT(rate_key) DO UPDATE SET
            request_count = CASE
              WHEN excluded.window_started_at > api_rate_limits.window_started_at THEN 1
              ELSE api_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN excluded.window_started_at > api_rate_limits.window_started_at THEN excluded.window_started_at
              ELSE api_rate_limits.window_started_at
            END,
            window_ends_at = CASE
              WHEN excluded.window_started_at > api_rate_limits.window_started_at THEN excluded.window_ends_at
              ELSE api_rate_limits.window_ends_at
            END,
            updated_at = CURRENT_TIMESTAMP
          RETURNING
            request_count AS requestCount,
            window_ends_at AS windowEndsAt
        `
      ).bind(
        rateKey,
        policy.key,
        rule.key,
        subject,
        bucketStart,
        bucketEnd
      ).first<ApiRateLimitRow>()

      if (!row) {
        throw new Error(`Rate limit upsert returned no row for policy ${policy.key}`)
      }

      results.push({
        rule,
        requestCount: row.requestCount,
        remaining: Math.max(0, rule.limit - row.requestCount),
        resetSeconds: Math.max(1, Math.ceil((row.windowEndsAt - now) / 1000)),
        exceeded: row.requestCount > rule.limit
      })
    }

    const blockingRule = results.find((result) => result.exceeded)
    const primaryRule = blockingRule ?? selectPrimaryRule(results)

    if (!primaryRule) {
      throw new Error(`Rate limit policy ${policy.key} has no rules`)
    }

    return {
      allowed: !blockingRule,
      policyKey: policy.key,
      limit: primaryRule.rule.limit,
      remaining: primaryRule.remaining,
      resetSeconds: primaryRule.resetSeconds,
      retryAfterSeconds: blockingRule?.resetSeconds,
      errorMessage: blockingRule ? policy.errorMessage : undefined
    }
  }

  private async resolveSubject(c: Context<AppEnv>, scope: ApiRateLimitScope): Promise<string> {
    const ip = normalizeSubjectPart(getClientIp(c))

    if (scope === 'ip') {
      return ip
    }

    if (scope === 'auth-user-ip') {
      const user = c.get('user')
      const username = normalizeSubjectPart(user?.username ?? 'anonymous')
      return `${username}:${ip}`
    }

    const username = normalizeSubjectPart(await getBodyUsername(c))
    return `${ip}:${username}`
  }
}

function selectPrimaryRule(results: ApiRateLimitRuleResult[]) {
  return results.reduce<ApiRateLimitRuleResult | null>((current, result) => {
    if (!current) {
      return result
    }

    const currentPressure = current.requestCount / current.rule.limit
    const nextPressure = result.requestCount / result.rule.limit

    if (nextPressure > currentPressure) {
      return result
    }

    if (nextPressure === currentPressure && result.resetSeconds > current.resetSeconds) {
      return result
    }

    return current
  }, null)
}

function getClientIp(c: Context<AppEnv>) {
  const cfIp = c.req.header('CF-Connecting-IP')
  if (cfIp) {
    return cfIp
  }

  const forwarded = c.req.header('X-Forwarded-For')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  return 'unknown'
}

async function getBodyUsername(c: Context<AppEnv>) {
  try {
    const body = await c.req.raw.clone().json() as { username?: unknown }
    if (typeof body.username === 'string' && body.username.trim()) {
      return body.username
    }
  } catch {}

  return 'anonymous'
}

function normalizeSubjectPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, '_')
    .slice(0, 120) || 'unknown'
}
