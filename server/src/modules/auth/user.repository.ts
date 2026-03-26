import type { D1Database } from '@cloudflare/workers-types'

import type { AuthenticatedUser } from '../../shared/types/app-env'

export type UserRecord = {
  username: string
  role: string
  tokenVersion: number
}

export interface UserRepository {
  findByCredentials(username: string, password: string): Promise<UserRecord | null>
  findByUsername(username: string): Promise<UserRecord | null>
}

export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByCredentials(username: string, password: string): Promise<UserRecord | null> {
    return await this.db.prepare(
      `
        SELECT
          username,
          role,
          token_version AS tokenVersion
        FROM users
        WHERE username = ?1 AND password = ?2
      `
    ).bind(username, password).first<UserRecord>()
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    return await this.db.prepare(
      `
        SELECT
          username,
          role,
          token_version AS tokenVersion
        FROM users
        WHERE username = ?1
      `
    ).bind(username).first<UserRecord>()
  }
}
