export type Proverb = {
  id: string
  spanish: string
  arabic: string
  english: string
  category: string
  note: string
  image: string
  curator: string
  date: string
  bookmarked: boolean
}

export type ProverbRow = {
  id: string
  spanish: string
  arabic: string
  english: string
  category: string
  note: string | null
  image: string | null
  curator: string
  date: string
  bookmarked: number | boolean
}

export type ProverbListFilters = {
  page: number
  limit: number
  search?: string
  letter?: string
}

export type CreateProverbInput = {
  spanish: string
  arabic: string
  english: string
  category?: string
  note?: string
  image?: string
  curator?: string
}

export type CreateProverbRecord = {
  id: string
  spanish: string
  arabic: string
  english: string
  category: string
  note: string
  image: string
  curator: string
  date: string
}

export type UpdateProverbInput = Partial<
  Pick<Proverb, 'spanish' | 'arabic' | 'english' | 'category' | 'note' | 'image' | 'curator' | 'bookmarked'>
>
