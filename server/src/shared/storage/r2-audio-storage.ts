import type { R2Bucket } from '@cloudflare/workers-types'

import { R2_PUBLIC_BASE_URL } from '../config/app.constants'

export type StoredAudio = {
  url: string
  objectKey: string
  contentType: string
}

export interface AudioStorage {
  uploadMp3(audio: Uint8Array, proverbId: string, textHash: string): Promise<StoredAudio>
}

export class R2AudioStorage implements AudioStorage {
  constructor(
    private readonly bucket: R2Bucket,
    private readonly publicBaseUrl: string = R2_PUBLIC_BASE_URL
  ) {}

  async uploadMp3(audio: Uint8Array, proverbId: string, textHash: string): Promise<StoredAudio> {
    const safeId = proverbId.replace(/[^a-z0-9_-]/gi, '-')
    const objectKey = `audio/arabic/${safeId}-${textHash.slice(0, 16)}.mp3`
    const contentType = 'audio/mpeg'

    await this.bucket.put(objectKey, audio, {
      httpMetadata: {
        contentType
      }
    })

    return {
      url: `${this.publicBaseUrl}/${objectKey}`,
      objectKey,
      contentType
    }
  }
}
