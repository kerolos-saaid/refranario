import type { D1Database } from '@cloudflare/workers-types'

import type { ProverbImageGenerationRecord, ProverbImageJobStatusItem } from './proverb-image.types'

function asRecord(row: ProverbImageGenerationRecord): ProverbImageJobStatusItem {
  return {
    id: row.id,
    spanish: row.spanish,
    english: row.english,
    status: row.image_job_status,
    attempts: row.image_job_attempts || 0,
    nextRetryAt: row.image_job_next_retry_at,
    error: row.image_job_error,
    promptHash: row.image_prompt_hash
  }
}

export class D1ProverbImageJobRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<ProverbImageGenerationRecord | null> {
    return await this.db.prepare(
      `
        SELECT
          id,
          spanish,
          english,
          image,
          image_job_status,
          image_job_attempts,
          image_job_next_retry_at,
          image_job_error,
          image_prompt_hash,
          image_generation_prompt
        FROM proverbs
        WHERE id = ?1
      `
    ).bind(id).first<ProverbImageGenerationRecord>()
  }

  async markPending(id: string, promptHash: string, resetAttempts: boolean): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_job_status = 'pending',
          image_job_attempts = CASE WHEN ?3 = 1 THEN 0 ELSE COALESCE(image_job_attempts, 0) END,
          image_job_next_retry_at = NULL,
          image_job_error = NULL,
          image_prompt_hash = ?2,
          image_generation_prompt = CASE
            WHEN image_prompt_hash = ?2 THEN image_generation_prompt
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(id, promptHash, resetAttempts ? 1 : 0).run()
  }

  async markProcessing(id: string, promptHash: string, dueAt: string, leaseUntil: string): Promise<boolean> {
    const result = await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_job_status = 'processing',
          image_job_attempts = COALESCE(image_job_attempts, 0) + 1,
          image_job_next_retry_at = ?4,
          image_job_error = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND (image IS NULL OR TRIM(image) = '')
          AND image_prompt_hash = ?2
          AND (image_job_status IS NULL OR image_job_status IN ('pending', 'retry', 'processing'))
          AND (image_job_next_retry_at IS NULL OR image_job_next_retry_at <= ?3)
      `
    ).bind(id, promptHash, dueAt, leaseUntil).run()

    return (result.meta.changes || 0) > 0
  }

  async markRetry(id: string, promptHash: string, error: string, nextRetryAt: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_job_status = 'retry',
          image_job_next_retry_at = ?4,
          image_job_error = ?3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND image_prompt_hash = ?2
      `
    ).bind(id, promptHash, error, nextRetryAt).run()
  }

  async markFailed(id: string, promptHash: string, error: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_job_status = 'failed',
          image_job_next_retry_at = NULL,
          image_job_error = ?3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND image_prompt_hash = ?2
      `
    ).bind(id, promptHash, error).run()
  }

  async markComplete(id: string, imageUrl: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image = ?2,
          image_job_status = 'complete',
          image_job_next_retry_at = NULL,
          image_job_error = NULL,
          image_prompt_hash = NULL,
          image_generation_prompt = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(id, imageUrl).run()
  }

  async markManualImageComplete(id: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_job_status = 'complete',
          image_job_next_retry_at = NULL,
          image_job_error = NULL,
          image_prompt_hash = NULL,
          image_generation_prompt = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(id).run()
  }

  async clearImageAndMarkPending(id: string, promptHash: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image = '',
          image_job_status = 'pending',
          image_job_attempts = 0,
          image_job_next_retry_at = NULL,
          image_job_error = NULL,
          image_prompt_hash = ?2,
          image_generation_prompt = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(id, promptHash).run()
  }

  async markPromptGenerated(id: string, promptHash: string, generatedPrompt: string): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          image_generation_prompt = ?3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND image_prompt_hash = ?2
      `
    ).bind(id, promptHash, generatedPrompt).run()
  }

  async listSweepCandidates(now: string, limit: number): Promise<ProverbImageGenerationRecord[]> {
    const result = await this.db.prepare(
      `
        SELECT
          id,
          spanish,
          english,
          image,
          image_job_status,
          image_job_attempts,
          image_job_next_retry_at,
          image_job_error,
          image_prompt_hash,
          image_generation_prompt
        FROM proverbs
        WHERE (image IS NULL OR TRIM(image) = '')
          AND (
            image_job_status IS NULL
            OR image_job_status = 'pending'
            OR (image_job_status IN ('retry', 'processing', 'failed') AND (image_job_next_retry_at IS NULL OR image_job_next_retry_at <= ?1))
          )
        ORDER BY
          CASE
            WHEN image_job_status = 'retry' THEN 0
            WHEN image_job_status = 'processing' THEN 1
            WHEN image_job_status = 'failed' THEN 2
            WHEN image_job_status = 'pending' THEN 3
            ELSE 4
          END ASC,
          COALESCE(image_job_next_retry_at, updated_at, created_at) ASC
        LIMIT ?2
      `
    ).bind(now, limit).all<ProverbImageGenerationRecord>()

    return result.results || []
  }

  async listActiveJobs(limit: number): Promise<ProverbImageJobStatusItem[]> {
    const result = await this.db.prepare(
      `
        SELECT
          id,
          spanish,
          english,
          image,
          image_job_status,
          image_job_attempts,
          image_job_next_retry_at,
          image_job_error,
          image_prompt_hash,
          image_generation_prompt
        FROM proverbs
        WHERE image_job_status IN ('pending', 'retry', 'processing', 'failed')
          AND (image IS NULL OR TRIM(image) = '')
        ORDER BY updated_at DESC
        LIMIT ?1
      `
    ).bind(limit).all<ProverbImageGenerationRecord>()

    return (result.results || []).map(asRecord)
  }
}
