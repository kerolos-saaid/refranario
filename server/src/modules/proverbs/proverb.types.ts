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
  image_job_status?: 'pending' | 'processing' | 'retry' | 'failed' | 'complete' | null
  image_job_attempts?: number | null
  image_job_next_retry_at?: string | null
  image_job_error?: string | null
  image_prompt_hash?: string | null
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
