import { AuthService } from '../modules/auth/auth.service'
import { D1UserRepository } from '../modules/auth/user.repository'
import { D1ProverbRepository } from '../modules/proverbs/proverb.repository'
import { ProverbService } from '../modules/proverbs/proverb.service'
import { UploadService } from '../modules/uploads/upload.service'
import { HmacJwtService } from '../shared/security/jwt.service'
import { R2ImageStorage } from '../shared/storage/r2-image-storage'
import type { AppBindings } from '../shared/types/app-env'

const tokenService = new HmacJwtService()

export function getTokenService() {
  return tokenService
}

export function createAuthService(bindings: AppBindings) {
  return new AuthService(
    new D1UserRepository(bindings.senor_shabi_db),
    tokenService
  )
}

export function createProverbService(bindings: AppBindings) {
  const imageStorage = new R2ImageStorage(bindings.senor_shabi_images)

  return new ProverbService(
    new D1ProverbRepository(bindings.senor_shabi_db),
    imageStorage
  )
}

export function createUploadService(bindings: AppBindings) {
  return new UploadService(new R2ImageStorage(bindings.senor_shabi_images))
}
