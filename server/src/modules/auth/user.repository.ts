import type { D1Database } from '@cloudflare/workers-types'

import type { AuthenticatedUser } from '../../shared/types/app-env'

export type UserRecord = AuthenticatedUser

export interface UserRepository {
  findByCredentials(username: string, password: string): Promise<UserRecord | null>
}

export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByCredentials(username: string, password: string): Promise<UserRecord | null> {
    return await this.db.prepare(
      'SELECT * FROM users WHERE username = ? AND password = ?'
    ).bind(username, password).first<UserRecord>()
  }
}
