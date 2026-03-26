import type { D1Database, Queue, R2Bucket } from '@cloudflare/workers-types'

import type { ProverbImageJobMessage } from '../../modules/proverb-images/proverb-image.types'

export type AuthenticatedUser = {
  username: string
  role: string
}

export type WorkersAiBinding = {
  run(model: string, payload: unknown): Promise<unknown>
}

export type AppBindings = {
  senor_shabi_db: D1Database
  senor_shabi_images: R2Bucket
  AI?: WorkersAiBinding
  PROVERB_IMAGE_QUEUE?: Queue<ProverbImageJobMessage>
  AISTUDIO_API_KEYS?: string
  PROVERB_IMAGE_MODEL?: string
  PROVERB_PROMPT_MODEL?: string
  PROVERB_PROMPT_BATCH_SIZE?: string
  PROVERB_IMAGE_SWEEP_LIMIT?: string
  PROVERB_IMAGE_RETRY_DELAY_SECONDS?: string
  PROVERB_IMAGE_QUOTA_COOLDOWN_SECONDS?: string
  PROVERB_IMAGE_PROCESSING_LEASE_SECONDS?: string
}

export type AppVariables = {
  user?: AuthenticatedUser
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}
