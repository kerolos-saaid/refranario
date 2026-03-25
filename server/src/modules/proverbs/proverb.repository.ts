import type { D1Database } from '@cloudflare/workers-types'

import type { CreateProverbRecord, ProverbListFilters, ProverbRow, UpdateProverbInput } from './proverb.types'

export type ProverbListResult = {
  rows: ProverbRow[]
  total: number
}

export type UpdateStatement = {
  query: string
  values: unknown[]
}

export interface ProverbRepository {
  list(filters: ProverbListFilters): Promise<ProverbListResult>
  findById(id: string): Promise<ProverbRow | null>
  create(record: CreateProverbRecord): Promise<ProverbRow>
  buildUpdateStatement(updates: UpdateProverbInput): UpdateStatement | null
  update(id: string, statement: UpdateStatement): Promise<ProverbRow | null>
  exists(id: string): Promise<boolean>
  delete(id: string): Promise<void>
}

export class D1ProverbRepository implements ProverbRepository {
  constructor(private readonly db: D1Database) {}

  async list(filters: ProverbListFilters): Promise<ProverbListResult> {
    const { page, limit, search, letter } = filters
    let rows: ProverbRow[] = []
    let total = 0

    if (search && letter) {
      const countResult = await this.db.prepare(
        'SELECT COUNT(*) as total FROM proverbs WHERE (spanish LIKE ?1 OR english LIKE ?2) AND spanish LIKE ?3'
      ).bind(`%${search}%`, `%${search}%`, `${letter}%`).first<{ total: number }>()
      total = countResult?.total || 0

      const offset = (page - 1) * limit
      const result = await this.db.prepare(
        'SELECT * FROM proverbs WHERE (spanish LIKE ?1 OR english LIKE ?2) AND spanish LIKE ?3 ORDER BY spanish ASC LIMIT ?4 OFFSET ?5'
      ).bind(`%${search}%`, `%${search}%`, `${letter}%`, limit, offset).all<ProverbRow>()
      rows = result.results || []
    } else if (search) {
      const countResult = await this.db.prepare(
        'SELECT COUNT(*) as total FROM proverbs WHERE spanish LIKE ?1 OR english LIKE ?2'
      ).bind(`%${search}%`, `%${search}%`).first<{ total: number }>()
      total = countResult?.total || 0

      const offset = (page - 1) * limit
      const result = await this.db.prepare(
        'SELECT * FROM proverbs WHERE spanish LIKE ?1 OR english LIKE ?2 ORDER BY spanish ASC LIMIT ?3 OFFSET ?4'
      ).bind(`%${search}%`, `%${search}%`, limit, offset).all<ProverbRow>()
      rows = result.results || []
    } else if (letter) {
      const countResult = await this.db.prepare(
        'SELECT COUNT(*) as total FROM proverbs WHERE spanish LIKE ?1'
      ).bind(`${letter}%`).first<{ total: number }>()
      total = countResult?.total || 0

      const offset = (page - 1) * limit
      const result = await this.db.prepare(
        'SELECT * FROM proverbs WHERE spanish LIKE ?1 ORDER BY spanish ASC LIMIT ?2 OFFSET ?3'
      ).bind(`${letter}%`, limit, offset).all<ProverbRow>()
      rows = result.results || []
    } else {
      const countResult = await this.db.prepare('SELECT COUNT(*) as total FROM proverbs').first<{ total: number }>()
      total = countResult?.total || 0

      const offset = (page - 1) * limit
      const result = await this.db.prepare(
        'SELECT * FROM proverbs ORDER BY spanish ASC LIMIT ?1 OFFSET ?2'
      ).bind(limit, offset).all<ProverbRow>()
      rows = result.results || []
    }

    return { rows, total }
  }

  async findById(id: string): Promise<ProverbRow | null> {
    return await this.db.prepare('SELECT * FROM proverbs WHERE id = ?').bind(id).first<ProverbRow>()
  }

  async create(record: CreateProverbRecord): Promise<ProverbRow> {
    await this.db.prepare(
      `
        INSERT INTO proverbs (id, spanish, arabic, english, category, note, image, curator, date, bookmarked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `
    ).bind(
      record.id,
      record.spanish,
      record.arabic,
      record.english,
      record.category,
      record.note,
      record.image,
      record.curator,
      record.date
    ).run()

    return (await this.findById(record.id)) as ProverbRow
  }

  buildUpdateStatement(updates: UpdateProverbInput): UpdateStatement | null {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (updates.spanish !== undefined) {
      fields.push(`spanish = ?${paramIndex++}`)
      values.push(updates.spanish)
    }
    if (updates.arabic !== undefined) {
      fields.push(`arabic = ?${paramIndex++}`)
      values.push(updates.arabic)
    }
    if (updates.english !== undefined) {
      fields.push(`english = ?${paramIndex++}`)
      values.push(updates.english)
    }
    if (updates.category !== undefined) {
      fields.push(`category = ?${paramIndex++}`)
      values.push(updates.category)
    }
    if (updates.note !== undefined) {
      fields.push(`note = ?${paramIndex++}`)
      values.push(updates.note)
    }
    if (updates.image !== undefined) {
      fields.push(`image = ?${paramIndex++}`)
      values.push(updates.image)
    }
    if (updates.curator !== undefined) {
      fields.push(`curator = ?${paramIndex++}`)
      values.push(updates.curator)
    }
    if (updates.bookmarked !== undefined) {
      fields.push(`bookmarked = ?${paramIndex++}`)
      values.push(updates.bookmarked ? 1 : 0)
    }

    if (fields.length === 0) {
      return null
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')

    return {
      query: `UPDATE proverbs SET ${fields.join(', ')} WHERE id = ?${paramIndex}`,
      values
    }
  }

  async update(id: string, statement: UpdateStatement): Promise<ProverbRow | null> {
    await this.db.prepare(statement.query).bind(...statement.values, id).run()
    return await this.findById(id)
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.prepare('SELECT id FROM proverbs WHERE id = ?').bind(id).first()
    return Boolean(result)
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM proverbs WHERE id = ?').bind(id).run()
  }
}
