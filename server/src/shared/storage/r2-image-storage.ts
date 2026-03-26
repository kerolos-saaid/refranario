import type { R2Bucket } from '@cloudflare/workers-types'

import { MANAGED_R2_DELETE_HOST_MATCH, R2_PUBLIC_BASE_URL } from '../config/app.constants'

export type UploadedImage = {
  success: true
  url: string
  filename: string
}

export interface ImageStorage {
  uploadBase64Image(image: string, filename?: string): Promise<UploadedImage>
  delete(filename: string): Promise<void>
  deleteFromManagedUrl(url: string): Promise<void>
}

export class R2ImageStorage implements ImageStorage {
  private readonly managedPublicHost: string

  constructor(
    private readonly bucket: R2Bucket,
    private readonly publicBaseUrl: string = R2_PUBLIC_BASE_URL,
    private readonly managedDeleteHostMatch: string = MANAGED_R2_DELETE_HOST_MATCH
  ) {
    this.managedPublicHost = new URL(this.publicBaseUrl).hostname
  }

  async uploadBase64Image(image: string, filename?: string): Promise<UploadedImage> {
    const base64Data = image.replace(/^data:[^;]+;base64,/, '')
    const mimeType = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg'
    const imageBuffer = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0))

    const imageId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const extension = filename?.split('.').pop() || mimeType.split('/')[1] || 'jpg'
    const storedFilename = `${imageId}.${extension}`

    await this.bucket.put(storedFilename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType
      }
    })

    return {
      success: true,
      url: `${this.publicBaseUrl}/${storedFilename}`,
      filename: storedFilename
    }
  }

  async delete(filename: string): Promise<void> {
    await this.bucket.delete(filename)
  }

  async deleteFromManagedUrl(url: string): Promise<void> {
    const filename = url.split('/').pop()

    if (filename && (url.includes(this.managedDeleteHostMatch) || url.includes(this.managedPublicHost))) {
      try {
        await this.delete(filename)
        console.log('[R2] Deleted old image:', filename)
      } catch (error) {
        console.error('[R2] Failed to delete old image:', error)
      }
    }
  }
}
