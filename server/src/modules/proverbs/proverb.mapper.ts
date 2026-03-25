import type { Proverb, ProverbRow } from './proverb.types'

export function rowToProverb(row: ProverbRow): Proverb {
  return {
    id: row.id,
    spanish: row.spanish,
    arabic: row.arabic,
    english: row.english,
    category: row.category,
    note: row.note || '',
    image: row.image || '',
    curator: row.curator,
    date: row.date,
    bookmarked: Boolean(row.bookmarked)
  }
}
