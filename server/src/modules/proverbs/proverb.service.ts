import type { ImageStorage } from '../../shared/storage/r2-image-storage'

import type { ProverbImageJobService } from '../proverb-images/proverb-image.service'
import { rowToProverb } from './proverb.mapper'
import type { CreateProverbInput, ProverbListFilters, UpdateProverbInput } from './proverb.types'
import type { ProverbRepository } from './proverb.repository'

export class ProverbService {
  constructor(
    private readonly proverbRepository: ProverbRepository,
    private readonly imageStorage: Pick<ImageStorage, 'deleteFromManagedUrl'>,
    private readonly proverbImageJobService: Pick<ProverbImageJobService, 'syncForProverb'>
  ) {}

  async list(filters: ProverbListFilters) {
    const { rows, total } = await this.proverbRepository.list(filters)
    const proverbs = rows.map(rowToProverb)
    const totalPages = Math.ceil(total / filters.limit)

    return {
      proverbs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasMore: filters.page < totalPages
      }
    }
  }

  async getById(id: string) {
    const proverb = await this.proverbRepository.findById(id)
    return proverb ? rowToProverb(proverb) : null
  }

  async create(input: CreateProverbInput) {
    const record = await this.proverbRepository.create({
      id: Date.now().toString(),
      spanish: input.spanish,
      arabic: input.arabic,
      english: input.english,
      category: input.category || 'Wisdom',
      note: input.note || '',
      image: input.image || '',
      curator: input.curator || 'Admin',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    })
    await this.proverbImageJobService.syncForProverb(record, {
      forceEnqueue: !(record.image || '').trim()
    })

    return rowToProverb(record)
  }

  async update(id: string, updates: UpdateProverbInput) {
    const currentProverb = await this.proverbRepository.findById(id)
    const englishChanged = updates.english !== undefined && updates.english !== currentProverb?.english
    const spanishChanged = updates.spanish !== undefined && updates.spanish !== currentProverb?.spanish

    const statement = this.proverbRepository.buildUpdateStatement(updates)

    if (!statement) {
      return { kind: 'no-fields' } as const
    }

    const updatedProverb = await this.proverbRepository.update(id, statement)

    if (!updatedProverb) {
      return { kind: 'not-found' } as const
    }

    await this.proverbImageJobService.syncForProverb(updatedProverb, {
      forceEnqueue: Boolean(
        !(updatedProverb.image || '').trim()
        && (
          updates.image !== undefined
          || englishChanged
          || spanishChanged
        )
      )
    })

    return {
      kind: 'updated',
      proverb: rowToProverb(updatedProverb)
    } as const
  }

  async delete(id: string) {
    const exists = await this.proverbRepository.exists(id)

    if (!exists) {
      return { kind: 'not-found' } as const
    }

    await this.proverbRepository.delete(id)

    return { kind: 'deleted' } as const
  }
}
