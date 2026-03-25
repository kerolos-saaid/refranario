import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export type AuthenticatedUser = {
  username: string
  role: string
}

export type AppBindings = {
  senor_shabi_db: D1Database
  senor_shabi_images: R2Bucket
}

export type AppVariables = {
  user?: AuthenticatedUser
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: AppVariables
}
