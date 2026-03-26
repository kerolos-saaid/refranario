export type ProverbImageJobStatus = 'pending' | 'processing' | 'retry' | 'failed' | 'complete'

export type ProverbImageJobMessage = {
  proverbId: string
  promptHash: string
  requestedAt: string
}

export type ProverbImageGenerationRecord = {
  id: string
  spanish: string
  english: string
  image: string | null
  image_job_status: ProverbImageJobStatus | null
  image_job_attempts: number | null
  image_job_next_retry_at: string | null
  image_job_error: string | null
  image_prompt_hash: string | null
  image_generation_prompt: string | null
}

export type ProverbImageJobStatusItem = {
  id: string
  spanish: string
  english: string
  status: ProverbImageJobStatus | null
  attempts: number
  nextRetryAt: string | null
  error: string | null
  promptHash: string | null
}

export type GeneratedImagePayload = {
  mimeType: string
  base64Data: string
  model: string
}

export type PromptGenerationBatchItem = {
  proverbId: string
  spanish: string
  english: string
}

export type GeneratedPromptPayload = {
  proverbId: string
  prompt: string
  model: string
}

export type PromptGenerationSuccess = {
  kind: 'success'
  prompts: GeneratedPromptPayload[]
}

export type PromptGenerationRetry = {
  kind: 'retry'
  reason: string
  retryAfterSeconds: number
}

export type PromptGenerationFailure = {
  kind: 'failed'
  reason: string
}

export type PromptGenerationResult =
  | PromptGenerationSuccess
  | PromptGenerationRetry
  | PromptGenerationFailure

export type ImageGenerationSuccess = {
  kind: 'success'
  image: GeneratedImagePayload
}

export type ImageGenerationRetry = {
  kind: 'retry'
  reason: string
  retryAfterSeconds: number
}

export type ImageGenerationFailure = {
  kind: 'failed'
  reason: string
}

export type ImageGenerationResult =
  | ImageGenerationSuccess
  | ImageGenerationRetry
  | ImageGenerationFailure
