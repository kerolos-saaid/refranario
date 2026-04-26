import type { Proverb, ProverbRow } from './proverb.types'

export function rowToProverb(row: ProverbRow): Proverb {
  const proverb: Proverb = {
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

  if (row.arabic_audio_status || row.arabic_audio_url) {
    proverb.arabicAudio = {
      status: row.arabic_audio_status || null,
      url: row.arabic_audio_url || null
    }
  }

  return proverb
}
