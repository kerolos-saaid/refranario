import { AuthService } from '../modules/auth/auth.service'
import { getProverbAudioConfig } from '../modules/proverb-audio/proverb-audio.config'
import { ElevenLabsArabicSpeechProvider } from '../modules/proverb-audio/proverb-audio.provider'
import { D1ProverbAudioRepository } from '../modules/proverb-audio/proverb-audio.repository'
import { ProverbAudioService } from '../modules/proverb-audio/proverb-audio.service'
import { getProverbImageJobConfig } from '../modules/proverb-images/proverb-image.config'
import {
  CloudflareWorkersAiImageProvider,
  GoogleAiStudioImageProvider,
  type ProverbImageProvider
} from '../modules/proverb-images/proverb-image.provider'
import { GoogleAiStudioPromptProvider, type ProverbPromptProvider } from '../modules/proverb-images/proverb-prompt.provider'
import { D1ProverbImageJobRepository } from '../modules/proverb-images/proverb-image.repository'
import { ProverbImageJobService } from '../modules/proverb-images/proverb-image.service'
import { D1UserRepository } from '../modules/auth/user.repository'
import { D1ProverbRepository } from '../modules/proverbs/proverb.repository'
import { ProverbService } from '../modules/proverbs/proverb.service'
import { UploadService } from '../modules/uploads/upload.service'
import { D1ApiRateLimitService } from '../shared/rate-limit/api-rate-limit.service'
import { HmacJwtService } from '../shared/security/jwt.service'
import { R2ImageStorage } from '../shared/storage/r2-image-storage'
import { R2AudioStorage } from '../shared/storage/r2-audio-storage'
import type { AppBindings } from '../shared/types/app-env'

const tokenService = new HmacJwtService()

export function getTokenService() {
  return tokenService
}

export function createAuthService(bindings: AppBindings) {
  return new AuthService(
    createUserRepository(bindings),
    tokenService
  )
}

export function createUserRepository(bindings: AppBindings) {
  return new D1UserRepository(bindings.senor_shabi_db)
}

export function createApiRateLimitService(bindings: AppBindings) {
  return new D1ApiRateLimitService(bindings.senor_shabi_db)
}

export function createProverbService(bindings: AppBindings) {
  const imageStorage = new R2ImageStorage(bindings.senor_shabi_images)
  const proverbImageJobService = createProverbImageJobService(bindings)

  return new ProverbService(
    new D1ProverbRepository(bindings.senor_shabi_db),
    imageStorage,
    proverbImageJobService
  )
}

export function createUploadService(bindings: AppBindings) {
  return new UploadService(new R2ImageStorage(bindings.senor_shabi_images))
}

export function createProverbAudioService(bindings: AppBindings) {
  return new ProverbAudioService(
    new D1ProverbAudioRepository(bindings.senor_shabi_db),
    new R2AudioStorage(bindings.senor_shabi_images),
    new ElevenLabsArabicSpeechProvider(),
    getProverbAudioConfig(bindings)
  )
}

function createProverbImageProvider(bindings: AppBindings, model: string): ProverbImageProvider {
  if (model.startsWith('@cf/')) {
    if (bindings.AI) {
      return new CloudflareWorkersAiImageProvider(bindings.AI)
    }

    return {
      async generate() {
        return {
          kind: 'failed',
          reason: 'Workers AI binding is missing. Add the AI binding in wrangler.toml before using Cloudflare image models.'
        }
      }
    }
  }

  return new GoogleAiStudioImageProvider()
}

function createProverbPromptProvider(bindings: AppBindings): ProverbPromptProvider | undefined {
  if (!bindings.AISTUDIO_API_KEYS) {
    return undefined
  }

  return new GoogleAiStudioPromptProvider()
}

export function createProverbImageJobService(bindings: AppBindings) {
  const imageStorage = new R2ImageStorage(bindings.senor_shabi_images)
  const config = getProverbImageJobConfig(bindings)

  return new ProverbImageJobService(
    new D1ProverbImageJobRepository(bindings.senor_shabi_db),
    imageStorage,
    bindings.PROVERB_IMAGE_QUEUE,
    createProverbImageProvider(bindings, config.model),
    config,
    createProverbPromptProvider(bindings)
  )
}
