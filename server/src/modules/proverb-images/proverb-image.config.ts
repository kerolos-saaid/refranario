import {
  DEFAULT_PROVERB_IMAGE_MODEL,
  DEFAULT_PROVERB_PROMPT_BATCH_SIZE,
  DEFAULT_PROVERB_PROMPT_MODEL,
  DEFAULT_PROVERB_IMAGE_PROCESSING_LEASE_SECONDS,
  DEFAULT_PROVERB_IMAGE_QUOTA_COOLDOWN_SECONDS,
  DEFAULT_PROVERB_IMAGE_RETRY_DELAY_SECONDS,
  DEFAULT_PROVERB_IMAGE_STATUS_LIMIT,
  DEFAULT_PROVERB_IMAGE_SWEEP_LIMIT
} from '../../shared/config/app.constants'
import type { AppBindings } from '../../shared/types/app-env'

export type ProverbImageJobConfig = {
  apiKeys: string[]
  model: string
  promptModel?: string
  promptBatchSize?: number
  sweepLimit: number
  retryDelaySeconds: number
  quotaCooldownSeconds: number
  processingLeaseSeconds: number
  statusLimit: number
}

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseApiKeys(value: string | undefined) {
  return (value ?? '')
    .split(/[,\r\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getProverbImageJobConfig(bindings: AppBindings): ProverbImageJobConfig {
  return {
    apiKeys: parseApiKeys(bindings.AISTUDIO_API_KEYS),
    model: bindings.PROVERB_IMAGE_MODEL || DEFAULT_PROVERB_IMAGE_MODEL,
    promptModel: bindings.PROVERB_PROMPT_MODEL || DEFAULT_PROVERB_PROMPT_MODEL,
    promptBatchSize: parseInteger(bindings.PROVERB_PROMPT_BATCH_SIZE, DEFAULT_PROVERB_PROMPT_BATCH_SIZE),
    sweepLimit: parseInteger(bindings.PROVERB_IMAGE_SWEEP_LIMIT, DEFAULT_PROVERB_IMAGE_SWEEP_LIMIT),
    retryDelaySeconds: parseInteger(bindings.PROVERB_IMAGE_RETRY_DELAY_SECONDS, DEFAULT_PROVERB_IMAGE_RETRY_DELAY_SECONDS),
    quotaCooldownSeconds: parseInteger(
      bindings.PROVERB_IMAGE_QUOTA_COOLDOWN_SECONDS,
      DEFAULT_PROVERB_IMAGE_QUOTA_COOLDOWN_SECONDS
    ),
    processingLeaseSeconds: parseInteger(
      bindings.PROVERB_IMAGE_PROCESSING_LEASE_SECONDS,
      DEFAULT_PROVERB_IMAGE_PROCESSING_LEASE_SECONDS
    ),
    statusLimit: DEFAULT_PROVERB_IMAGE_STATUS_LIMIT
  }
}
