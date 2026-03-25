import type { ImageStorage } from '../../shared/storage/r2-image-storage'

const BASE64_IMAGE_REGEX =
  /^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i

export class UploadService {
  constructor(private readonly imageStorage: ImageStorage) {}

  async upload(image: string | undefined, filename?: string) {
    if (!image) {
      return { kind: 'missing-image' } as const
    }

    if (!BASE64_IMAGE_REGEX.test(image)) {
      return { kind: 'invalid-format' } as const
    }

    return {
      kind: 'uploaded',
      payload: await this.imageStorage.uploadBase64Image(image, filename)
    } as const
  }

  async delete(filename: string): Promise<void> {
    await this.imageStorage.delete(filename)
  }
}
