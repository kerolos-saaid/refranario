import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MessageBatch } from '@cloudflare/workers-types'

import { createApp } from '../../src/app/create-app'
import { D1ProverbImageJobRepository } from '../../src/modules/proverb-images/proverb-image.repository'
import { ProverbImageJobService } from '../../src/modules/proverb-images/proverb-image.service'
import type { ProverbImageJobMessage, ImageGenerationResult } from '../../src/modules/proverb-images/proverb-image.types'
import { R2ImageStorage } from '../../src/shared/storage/r2-image-storage'
import { HmacJwtService } from '../../src/shared/security/jwt.service'
import type { AppBindings } from '../../src/shared/types/app-env'
import {
  createIsolatedDevPlatform,
  disposeIsolatedDevPlatform,
  resetIsolatedDevPlatform,
  type IsolatedDevPlatform
} from '../support/dev-platform'

class FakeQueue {
  public readonly sent: Array<{ body: ProverbImageJobMessage; options?: { delaySeconds?: number } }> = []

  async send(body: ProverbImageJobMessage, options?: { delaySeconds?: number }) {
    this.sent.push({ body, options })
  }
}

class FakeProvider {
  constructor(private readonly result: ImageGenerationResult) {}

  async generate() {
    return this.result
  }
}

type FakeMessage = {
  id: string
  timestamp: Date
  body: ProverbImageJobMessage
  attempts: number
  acked: boolean
  retriedWith?: { delaySeconds?: number }
  ack(): void
  retry(options?: { delaySeconds?: number }): void
}

let runtime!: IsolatedDevPlatform

function createFakeMessage(body: ProverbImageJobMessage, attempts = 1): FakeMessage {
  return {
    id: `${body.proverbId}-${attempts}`,
    timestamp: new Date('2026-03-25T00:00:00.000Z'),
    body,
    attempts,
    acked: false,
    ack() {
      this.acked = true
    },
    retry(options) {
      this.retriedWith = options
    }
  }
}

function createBatch(messages: FakeMessage[]): MessageBatch<ProverbImageJobMessage> {
  return {
    messages,
    queue: 'proverb-image-jobs',
    retryAll() {},
    ackAll() {}
  }
}

function createEnv(queue?: FakeQueue): AppBindings {
  return {
    ...runtime.platform.env,
    PROVERB_IMAGE_QUEUE: queue as AppBindings['PROVERB_IMAGE_QUEUE'],
    AISTUDIO_API_KEYS: 'key-1,key-2',
    PROVERB_IMAGE_MODEL: 'gemini-2.5-flash-image',
    PROVERB_IMAGE_SWEEP_LIMIT: '10',
    PROVERB_IMAGE_RETRY_DELAY_SECONDS: '60',
    PROVERB_IMAGE_QUOTA_COOLDOWN_SECONDS: '300',
    PROVERB_IMAGE_PROCESSING_LEASE_SECONDS: '300'
  }
}

async function adminHeaders() {
  const token = await new HmacJwtService().sign({ username: 'admin', role: 'admin' })

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

async function performRequest(env: AppBindings, options: { method: string; path: string; json?: unknown }) {
  const app = createApp()
  const response = await app.fetch(
    new Request(`http://localhost${options.path}`, {
      method: options.method,
      headers: await adminHeaders(),
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined
    }),
    env,
    runtime.platform.ctx
  )

  return {
    status: response.status,
    body: await response.json()
  }
}

async function loadRow(id: string) {
  return await runtime.platform.env.senor_shabi_db.prepare(
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
        image_prompt_hash
      FROM proverbs
      WHERE id = ?1
    `
  ).bind(id).first<{
    id: string
    spanish: string
    english: string
    image: string | null
    image_job_status: string | null
    image_job_attempts: number | null
    image_job_next_retry_at: string | null
    image_job_error: string | null
    image_prompt_hash: string | null
  }>()
}

function createService(provider: FakeProvider, queue?: FakeQueue) {
  return new ProverbImageJobService(
    new D1ProverbImageJobRepository(runtime.platform.env.senor_shabi_db),
    new R2ImageStorage(runtime.platform.env.senor_shabi_images),
    queue,
    provider,
    {
      apiKeys: ['key-1', 'key-2'],
      model: 'gemini-2.5-flash-image',
      sweepLimit: 10,
      retryDelaySeconds: 60,
      quotaCooldownSeconds: 300,
      processingLeaseSeconds: 300,
      statusLimit: 50
    },
    () => new Date('2026-03-25T00:00:00.000Z')
  )
}

async function createBlankProverb(queue?: FakeQueue) {
  const response = await performRequest(createEnv(queue), {
    method: 'POST',
    path: '/api/proverbs',
    json: {
      spanish: 'A rey muerto, rey puesto.',
      arabic: '??? ?????? ??? ?????.',
      english: 'The king is dead. Long live the king!',
      category: 'Power',
      note: 'Queue test proverb',
      image: '',
      curator: 'Admin'
    }
  })

  expect(response.status).toBe(201)
  return response.body.proverb.id as string
}

describe('proverb image jobs', () => {
  beforeAll(async () => {
    runtime = await createIsolatedDevPlatform('proverb-image-jobs')
  })

  beforeEach(async () => {
    await resetIsolatedDevPlatform(runtime)
  })

  afterAll(async () => {
    await disposeIsolatedDevPlatform(runtime)
  })

  test('creating a blank-image proverb marks it pending and enqueues a queue message', async () => {
    const queue = new FakeQueue()
    const proverbId = await createBlankProverb(queue)
    const row = await loadRow(proverbId)

    expect(queue.sent).toHaveLength(1)
    expect(queue.sent[0]?.body.proverbId).toBe(proverbId)
    expect(row?.image_job_status).toBe('pending')
    expect(row?.image_job_attempts).toBe(0)
    expect(row?.image_prompt_hash).toBeTruthy()
  })

  test('updating a blank-image proverb with a manual image clears auto-generation state', async () => {
    const queue = new FakeQueue()
    const proverbId = await createBlankProverb(queue)
    const response = await performRequest(createEnv(queue), {
      method: 'PUT',
      path: `/api/proverbs/${proverbId}`,
      json: {
        image: 'https://example.com/manual-image.png'
      }
    })
    const row = await loadRow(proverbId)

    expect(response.status).toBe(200)
    expect(row?.image).toBe('https://example.com/manual-image.png')
    expect(row?.image_job_status).toBe('complete')
    expect(row?.image_prompt_hash).toBeNull()
  })

  test('changing proverb text on a blank-image record regenerates the prompt hash and re-enqueues', async () => {
    const queue = new FakeQueue()
    const proverbId = await createBlankProverb(queue)
    const firstRow = await loadRow(proverbId)

    queue.sent.length = 0

    const response = await performRequest(createEnv(queue), {
      method: 'PUT',
      path: `/api/proverbs/${proverbId}`,
      json: {
        english: 'When one king dies, another immediately takes the crown.'
      }
    })
    const secondRow = await loadRow(proverbId)

    expect(response.status).toBe(200)
    expect(queue.sent).toHaveLength(1)
    expect(firstRow?.image_prompt_hash).not.toBe(secondRow?.image_prompt_hash)
  })

  test('successful queue processing uploads an image and completes the proverb row', async () => {
    const queue = new FakeQueue()
    const proverbId = await createBlankProverb(queue)
    const row = await loadRow(proverbId)
    const message = createFakeMessage({
      proverbId,
      promptHash: row!.image_prompt_hash!,
      requestedAt: '2026-03-25T00:00:00.000Z'
    })
    const service = createService(new FakeProvider({
      kind: 'success',
      image: {
        mimeType: 'image/png',
        base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sW0N1cAAAAASUVORK5CYII=',
        model: 'gemini-2.5-flash-image'
      }
    }))

    await service.processBatch(createBatch([message]))

    const updated = await loadRow(proverbId)

    expect(message.acked).toBe(true)
    expect(message.retriedWith).toBeUndefined()
    expect(updated?.image_job_status).toBe('complete')
    expect(updated?.image).toContain('r2.dev/')
    expect(updated?.image_prompt_hash).toBeNull()
  })

  test('retryable queue processing stores retry state and delays the message', async () => {
    const proverbId = await createBlankProverb()
    const row = await loadRow(proverbId)
    const message = createFakeMessage({
      proverbId,
      promptHash: row!.image_prompt_hash!,
      requestedAt: '2026-03-25T00:00:00.000Z'
    })
    const service = createService(new FakeProvider({
      kind: 'retry',
      reason: 'All configured AI Studio keys are currently rate-limited.',
      retryAfterSeconds: 300
    }))

    await service.processBatch(createBatch([message]))

    const updated = await loadRow(proverbId)

    expect(message.acked).toBe(false)
    expect(message.retriedWith).toEqual({ delaySeconds: 300 })
    expect(updated?.image_job_status).toBe('retry')
    expect(updated?.image_job_error).toContain('rate-limited')
    expect(updated?.image_job_next_retry_at).toBe('2026-03-25 00:05:00')
  })

  test('non-retryable queue processing marks the proverb row as failed', async () => {
    const proverbId = await createBlankProverb()
    const row = await loadRow(proverbId)
    const message = createFakeMessage({
      proverbId,
      promptHash: row!.image_prompt_hash!,
      requestedAt: '2026-03-25T00:00:00.000Z'
    })
    const service = createService(new FakeProvider({
      kind: 'failed',
      reason: 'Prompt blocked by upstream policy.'
    }))

    await service.processBatch(createBatch([message]))

    const updated = await loadRow(proverbId)

    expect(message.acked).toBe(true)
    expect(updated?.image_job_status).toBe('failed')
    expect(updated?.image_job_error).toContain('Prompt blocked')
  })

  test('backfill sweep re-enqueues missing-image proverbs without existing state', async () => {
    const db = runtime.platform.env.senor_shabi_db
    await db.prepare(
      `
        INSERT INTO proverbs (id, spanish, arabic, english, category, note, image, curator, date, bookmarked)
        VALUES ('sweep-test', 'No hay mal que por bien no venga.', '??? ???? ?????', 'Every cloud has a silver lining.', 'Wisdom', '', '', 'Admin', '25 Mar 2026', 0)
      `
    ).run()

    const queue = new FakeQueue()
    const service = createService(new FakeProvider({
      kind: 'failed',
      reason: 'not used'
    }), queue)

    const result = await service.backfill(10)
    const row = await loadRow('sweep-test')

    expect(result.enqueued).toBe(1)
    expect(queue.sent).toHaveLength(1)
    expect(queue.sent[0]?.body.proverbId).toBe('sweep-test')
    expect(row?.image_job_status).toBe('pending')
    expect(row?.image_prompt_hash).toBeTruthy()
  })
})
