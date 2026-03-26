import type { Message, MessageBatch, Queue } from '@cloudflare/workers-types'

import type { ImageStorage } from '../../shared/storage/r2-image-storage'

import {
  buildProverbImagePrompt,
  createProverbPromptHash
} from './proverb-image.prompt'
import type { ProverbImageJobConfig } from './proverb-image.config'
import { DEFAULT_PROVERB_PROMPT_BATCH_SIZE, DEFAULT_PROVERB_PROMPT_MODEL } from '../../shared/config/app.constants'
import type { ProverbImageProvider } from './proverb-image.provider'
import type { ProverbPromptProvider } from './proverb-prompt.provider'
import { D1ProverbImageJobRepository } from './proverb-image.repository'
import type {
  ProverbImageGenerationRecord,
  ProverbImageJobMessage,
  ProverbImageJobStatusItem
} from './proverb-image.types'

type QueueSendLike = Pick<Queue<ProverbImageJobMessage>, 'send'>

type ProcessMessageResult =
  | { kind: 'ack' }
  | { kind: 'retry'; delaySeconds: number }

type PreparedJob = {
  message: Message<ProverbImageJobMessage>
  proverb: ProverbImageGenerationRecord
  promptHash: string
  generationPrompt: string | null
}

type MessageAction = {
  message: Message<ProverbImageJobMessage>
  result: ProcessMessageResult
}

function hasImageValue(image: string | null | undefined) {
  return Boolean(image && image.trim())
}

function truncateError(error: string) {
  return error.length > 500 ? `${error.slice(0, 497)}...` : error
}

function formatSqlTimestamp(date: Date) {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000)
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function computeAutomaticRetryDelay(attempts: number | null | undefined, baseDelaySeconds: number, maxDelaySeconds: number) {
  const normalizedAttempts = Math.max(1, attempts || 1)
  const multiplier = 2 ** Math.min(normalizedAttempts - 1, 8)

  return Math.min(maxDelaySeconds, baseDelaySeconds * multiplier)
}

export class ProverbImageJobService {
  private readonly promptProvider: ProverbPromptProvider | undefined
  private readonly now: () => Date

  constructor(
    private readonly repository: D1ProverbImageJobRepository,
    private readonly imageStorage: Pick<ImageStorage, 'uploadBase64Image'>,
    private readonly queue: QueueSendLike | undefined,
    private readonly imageProvider: ProverbImageProvider,
    private readonly config: ProverbImageJobConfig,
    promptProviderOrNow?: ProverbPromptProvider | (() => Date),
    now?: () => Date
  ) {
    if (typeof promptProviderOrNow === 'function') {
      this.promptProvider = undefined
      this.now = promptProviderOrNow
      return
    }

    this.promptProvider = promptProviderOrNow
    this.now = now || (() => new Date())
  }

  async syncForProverb(
    proverb: Pick<ProverbImageGenerationRecord, 'id' | 'spanish' | 'english' | 'image'> & {
      image_job_status?: ProverbImageGenerationRecord['image_job_status']
      image_prompt_hash?: string | null
    },
    options?: { forceEnqueue?: boolean }
  ) {
    if (hasImageValue(proverb.image)) {
      await this.repository.markManualImageComplete(proverb.id)
      return { queued: false, promptHash: null as string | null }
    }

    const promptHash = await createProverbPromptHash(proverb.spanish, proverb.english)
    const shouldEnqueue =
      options?.forceEnqueue
      || proverb.image_prompt_hash !== promptHash
      || proverb.image_job_status === null
      || proverb.image_job_status === 'complete'

    if (!shouldEnqueue) {
      return { queued: false, promptHash }
    }

    await this.repository.markPending(proverb.id, promptHash, true)
    await this.enqueueMessage({
      proverbId: proverb.id,
      promptHash,
      requestedAt: this.now().toISOString()
    })

    console.log('[ProverbImageJob] Enqueued proverb for generation', {
      proverbId: proverb.id,
      promptHash
    })

    return { queued: true, promptHash }
  }

  async backfill(limit = this.config.sweepLimit) {
    const candidates = await this.repository.listSweepCandidates(formatSqlTimestamp(this.now()), limit)
    let enqueued = 0

    for (const candidate of candidates) {
      const promptHash = candidate.image_prompt_hash || await createProverbPromptHash(candidate.spanish, candidate.english)

      if (
        !candidate.image_prompt_hash
        || candidate.image_job_status === null
        || candidate.image_job_status === 'failed'
      ) {
        await this.repository.markPending(
          candidate.id,
          promptHash,
          !candidate.image_prompt_hash || candidate.image_job_status === null
        )
      }

      await this.enqueueMessage({
        proverbId: candidate.id,
        promptHash,
        requestedAt: this.now().toISOString()
      })
      enqueued += 1
    }

    console.log('[ProverbImageJob] Backfill sweep completed', {
      enqueued,
      scanned: candidates.length
    })

    return { enqueued, scanned: candidates.length }
  }

  async listActiveJobs(limit = this.config.statusLimit): Promise<ProverbImageJobStatusItem[]> {
    return await this.repository.listActiveJobs(limit)
  }

  async regenerate(proverbId: string) {
    const proverb = await this.repository.findById(proverbId)

    if (!proverb) {
      return { kind: 'not-found' } as const
    }

    if (hasImageValue(proverb.image)) {
      return { kind: 'skipped-existing-image' } as const
    }

    const promptHash = await createProverbPromptHash(proverb.spanish, proverb.english)
    await this.repository.clearImageAndMarkPending(proverbId, promptHash)
    await this.enqueueMessage({
      proverbId,
      promptHash,
      requestedAt: this.now().toISOString()
    })

    console.log('[ProverbImageJob] Manual regenerate requested', {
      proverbId,
      promptHash
    })

    return { kind: 'queued' } as const
  }

  async processBatch(batch: MessageBatch<ProverbImageJobMessage>) {
    const preparedJobs: PreparedJob[] = []
    const actions: MessageAction[] = []

    for (const message of batch.messages) {
      try {
        const prepared = await this.prepareMessage(message)

        if ('kind' in prepared) {
          actions.push({
            message,
            result: prepared
          })
        } else {
          preparedJobs.push(prepared)
        }
      } catch (error) {
        console.error('[ProverbImageJob] Unexpected processing failure during preparation', {
          messageId: message.id,
          proverbId: message.body.proverbId,
          error: error instanceof Error ? error.message : String(error)
        })

        actions.push({
          message,
          result: { kind: 'retry', delaySeconds: this.config.retryDelaySeconds }
        })
      }
    }

    const promptResolution = await this.resolvePrompts(preparedJobs)
    actions.push(...promptResolution.actions)

    for (const job of promptResolution.readyJobs) {
      try {
        const result = await this.renderImage(job)
        actions.push({
          message: job.message,
          result
        })
      } catch (error) {
        console.error('[ProverbImageJob] Unexpected processing failure during render', {
          messageId: job.message.id,
          proverbId: job.proverb.id,
          error: error instanceof Error ? error.message : String(error)
        })

        actions.push({
          message: job.message,
          result: { kind: 'retry', delaySeconds: this.config.retryDelaySeconds }
        })
      }
    }

    for (const action of actions) {
      if (action.result.kind === 'retry') {
        action.message.retry({ delaySeconds: action.result.delaySeconds })
        continue
      }

      action.message.ack()
    }
  }

  private async prepareMessage(message: Message<ProverbImageJobMessage>): Promise<PreparedJob | ProcessMessageResult> {
    const proverb = await this.repository.findById(message.body.proverbId)

    if (!proverb) {
      console.warn('[ProverbImageJob] Skipping missing proverb', {
        proverbId: message.body.proverbId
      })
      return { kind: 'ack' } as const
    }

    if (hasImageValue(proverb.image)) {
      await this.repository.markManualImageComplete(proverb.id)
      return { kind: 'ack' } as const
    }

    const currentPromptHash = proverb.image_prompt_hash || await createProverbPromptHash(proverb.spanish, proverb.english)

    if (currentPromptHash !== message.body.promptHash) {
      console.log('[ProverbImageJob] Ignoring stale queue message', {
        proverbId: proverb.id,
        messagePromptHash: message.body.promptHash,
        currentPromptHash
      })
      return { kind: 'ack' } as const
    }

    const now = this.now()
    const nowSql = formatSqlTimestamp(now)
    const leaseUntil = formatSqlTimestamp(addSeconds(now, this.config.processingLeaseSeconds))
    const claimed = await this.repository.markProcessing(proverb.id, currentPromptHash, nowSql, leaseUntil)

    if (!claimed) {
      return { kind: 'ack' } as const
    }

    console.log('[ProverbImageJob] Claimed proverb image job', {
      proverbId: proverb.id,
      attempt: message.attempts
    })

    return {
      message,
      proverb,
      promptHash: currentPromptHash,
      generationPrompt: proverb.image_generation_prompt
    } satisfies PreparedJob
  }

  private async resolvePrompts(jobs: PreparedJob[]) {
    const readyJobs: Array<PreparedJob & { generationPrompt: string }> = []
    const actions: MessageAction[] = []
    const needsPrompt = jobs.filter((job) => !job.generationPrompt)

    for (const job of jobs) {
      if (job.generationPrompt) {
        readyJobs.push({
          ...job,
          generationPrompt: job.generationPrompt
        })
      }
    }

    if (needsPrompt.length === 0) {
      return { readyJobs, actions }
    }

    if (!this.promptProvider || this.config.apiKeys.length === 0) {
      for (const job of needsPrompt) {
        const generationPrompt = buildProverbImagePrompt(job.proverb.spanish, job.proverb.english)
        await this.repository.markPromptGenerated(job.proverb.id, job.promptHash, generationPrompt)
        readyJobs.push({
          ...job,
          generationPrompt
        })
      }

      return { readyJobs, actions }
    }

    const promptBatchSize = Math.max(1, this.config.promptBatchSize || DEFAULT_PROVERB_PROMPT_BATCH_SIZE)
    const chunks = chunkArray(needsPrompt, promptBatchSize)
    const promptModel = this.config.promptModel || DEFAULT_PROVERB_PROMPT_MODEL

    for (const chunk of chunks) {
      const batchResult = await this.promptProvider.generateBatch({
        items: chunk.map((job) => ({
          proverbId: job.proverb.id,
          spanish: job.proverb.spanish,
          english: job.proverb.english
        })),
        apiKeys: this.config.apiKeys,
        model: promptModel,
        retryDelaySeconds: this.config.retryDelaySeconds,
        quotaCooldownSeconds: this.config.quotaCooldownSeconds
      })

      if (batchResult.kind === 'retry') {
        for (const job of chunk) {
          const nextRetryAt = formatSqlTimestamp(addSeconds(this.now(), batchResult.retryAfterSeconds))
          await this.repository.markRetry(job.proverb.id, job.promptHash, truncateError(batchResult.reason), nextRetryAt)
          actions.push({
            message: job.message,
            result: {
              kind: 'retry',
              delaySeconds: batchResult.retryAfterSeconds
            }
          })
        }

        console.warn('[ProverbImageJob] Scheduling retry after Gemini prompt batch failure', {
          size: chunk.length,
          reason: batchResult.reason,
          retryAfterSeconds: batchResult.retryAfterSeconds
        })

        continue
      }

      if (batchResult.kind === 'failed') {
        const retryDelays: number[] = []

        for (const job of chunk) {
          const retryAfterSeconds = this.getAutomaticRetryDelay(job.proverb.image_job_attempts ?? job.message.attempts)
          const nextRetryAt = formatSqlTimestamp(addSeconds(this.now(), retryAfterSeconds))
          await this.repository.markRetry(job.proverb.id, job.promptHash, truncateError(batchResult.reason), nextRetryAt)
          actions.push({
            message: job.message,
            result: {
              kind: 'retry',
              delaySeconds: retryAfterSeconds
            }
          })
          retryDelays.push(retryAfterSeconds)
        }

        console.warn('[ProverbImageJob] Converting prompt batch failure into automatic retry', {
          size: chunk.length,
          reason: batchResult.reason,
          retryAfterSeconds: Math.max(...retryDelays, this.config.retryDelaySeconds)
        })

        continue
      }

      const promptMap = new Map(batchResult.prompts.map((item) => [item.proverbId, item.prompt]))

      for (const job of chunk) {
        const generatedPrompt = promptMap.get(job.proverb.id)

        if (!generatedPrompt) {
          const reason = 'Gemini prompt generation omitted this proverb from the batch response.'
          const nextRetryAt = formatSqlTimestamp(addSeconds(this.now(), this.config.retryDelaySeconds))
          await this.repository.markRetry(job.proverb.id, job.promptHash, truncateError(reason), nextRetryAt)
          actions.push({
            message: job.message,
            result: {
              kind: 'retry',
              delaySeconds: this.config.retryDelaySeconds
            }
          })
          continue
        }

        await this.repository.markPromptGenerated(job.proverb.id, job.promptHash, generatedPrompt)
        readyJobs.push({
          ...job,
          generationPrompt: generatedPrompt
        })
      }
    }

    return { readyJobs, actions }
  }

  private async renderImage(job: PreparedJob & { generationPrompt: string }): Promise<ProcessMessageResult> {
    const now = this.now()
    const result = await this.imageProvider.generate({
      prompt: job.generationPrompt,
      apiKeys: this.config.apiKeys,
      model: this.config.model,
      retryDelaySeconds: this.config.retryDelaySeconds,
      quotaCooldownSeconds: this.config.quotaCooldownSeconds
    })

    if (result.kind === 'retry') {
      const nextRetryAt = formatSqlTimestamp(addSeconds(now, result.retryAfterSeconds))
      await this.repository.markRetry(job.proverb.id, job.promptHash, truncateError(result.reason), nextRetryAt)

      console.warn('[ProverbImageJob] Scheduling retry', {
        proverbId: job.proverb.id,
        reason: result.reason,
        retryAfterSeconds: result.retryAfterSeconds
      })

      return {
        kind: 'retry',
        delaySeconds: result.retryAfterSeconds
      }
    }

    if (result.kind === 'failed') {
      const retryAfterSeconds = this.getAutomaticRetryDelay(job.proverb.image_job_attempts)
      const nextRetryAt = formatSqlTimestamp(addSeconds(now, retryAfterSeconds))
      await this.repository.markRetry(job.proverb.id, job.promptHash, truncateError(result.reason), nextRetryAt)
      console.warn('[ProverbImageJob] Converting image generation failure into automatic retry', {
        proverbId: job.proverb.id,
        reason: result.reason,
        retryAfterSeconds
      })
      return {
        kind: 'retry',
        delaySeconds: retryAfterSeconds
      }
    }

    const refreshed = await this.repository.findById(job.proverb.id)

    if (!refreshed || hasImageValue(refreshed.image) || refreshed.image_prompt_hash !== job.promptHash) {
      console.log('[ProverbImageJob] Proverb changed before save, skipping upload', {
        proverbId: job.proverb.id
      })
      return { kind: 'ack' }
    }

    const uploaded = await this.imageStorage.uploadBase64Image(
      `data:${result.image.mimeType};base64,${result.image.base64Data}`,
      `${job.proverb.id}.png`
    )
    await this.repository.markComplete(job.proverb.id, uploaded.url)

    console.log('[ProverbImageJob] Completed proverb image job', {
      proverbId: job.proverb.id,
      imageUrl: uploaded.url,
      model: result.image.model
    })

    return { kind: 'ack' }
  }

  private async enqueueMessage(message: ProverbImageJobMessage, delaySeconds?: number) {
    if (!this.queue) {
      console.warn('[ProverbImageJob] Queue binding missing; skipping enqueue', {
        proverbId: message.proverbId
      })
      return
    }

    await this.queue.send(message, delaySeconds ? { delaySeconds } : undefined)
  }

  private getAutomaticRetryDelay(attempts: number | null | undefined) {
    return computeAutomaticRetryDelay(
      attempts,
      this.config.retryDelaySeconds,
      Math.max(this.config.quotaCooldownSeconds, this.config.retryDelaySeconds)
    )
  }
}
