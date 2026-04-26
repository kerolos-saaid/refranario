import type { D1Database } from '@cloudflare/workers-types'

import type { ArabicAudioRow } from './proverb-audio.types'

export type SaveReadyAudioInput = {
  id: string
  url: string
  objectKey: string
  textHash: string
  modelId: string
  voiceId: string
  contentType: string
}

export type SaveAudioFailureInput = {
  id: string
  status: 'failed' | 'limited'
  error: string
  textHash: string
  modelId: string
  voiceId: string
}

export interface ProverbAudioRepository {
  findById(id: string): Promise<ArabicAudioRow | null>
  tryMarkGenerating(id: string, textHash: string, modelId: string, voiceId: string): Promise<boolean>
  saveReady(input: SaveReadyAudioInput): Promise<void>
  saveFailure(input: SaveAudioFailureInput): Promise<void>
}

export class D1ProverbAudioRepository implements ProverbAudioRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<ArabicAudioRow | null> {
    return await this.db.prepare(
      `
        SELECT
          id,
          arabic,
          arabic_audio_url,
          arabic_audio_object_key,
          arabic_audio_text_hash,
          arabic_audio_status,
          arabic_audio_error,
          arabic_audio_model,
          arabic_audio_voice_id,
          arabic_audio_content_type
        FROM proverbs
        WHERE id = ?1
      `
    ).bind(id).first<ArabicAudioRow>()
  }

  async tryMarkGenerating(id: string, textHash: string, modelId: string, voiceId: string): Promise<boolean> {
    const result = await this.db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_status = 'generating',
          arabic_audio_error = NULL,
          arabic_audio_text_hash = ?2,
          arabic_audio_model = ?3,
          arabic_audio_voice_id = ?4,
          arabic_audio_updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
          AND (
            arabic_audio_status IS NULL
            OR arabic_audio_status <> 'generating'
            OR arabic_audio_text_hash IS NULL
            OR arabic_audio_text_hash <> ?2
            OR arabic_audio_model IS NULL
            OR arabic_audio_model <> ?3
            OR arabic_audio_voice_id IS NULL
            OR arabic_audio_voice_id <> ?4
          )
      `
    ).bind(id, textHash, modelId, voiceId).run()

    return Boolean(result.meta.changes)
  }

  async saveReady(input: SaveReadyAudioInput): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_url = ?2,
          arabic_audio_object_key = ?3,
          arabic_audio_text_hash = ?4,
          arabic_audio_status = 'ready',
          arabic_audio_error = NULL,
          arabic_audio_model = ?5,
          arabic_audio_voice_id = ?6,
          arabic_audio_content_type = ?7,
          arabic_audio_created_at = COALESCE(arabic_audio_created_at, CURRENT_TIMESTAMP),
          arabic_audio_updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(
      input.id,
      input.url,
      input.objectKey,
      input.textHash,
      input.modelId,
      input.voiceId,
      input.contentType
    ).run()
  }

  async saveFailure(input: SaveAudioFailureInput): Promise<void> {
    await this.db.prepare(
      `
        UPDATE proverbs
        SET
          arabic_audio_status = ?2,
          arabic_audio_error = ?3,
          arabic_audio_text_hash = ?4,
          arabic_audio_model = ?5,
          arabic_audio_voice_id = ?6,
          arabic_audio_updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
      `
    ).bind(
      input.id,
      input.status,
      input.error,
      input.textHash,
      input.modelId,
      input.voiceId
    ).run()
  }
}
