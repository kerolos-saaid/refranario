import { OptimizedImage } from './OptimizedImage'

// Skeleton card for loading state
export function ProverbCardSkeleton() {
  return (
    <div className="bg-card bookplate-border p-4 shadow-sm animate-pulse">
      <div className="flex gap-3 items-start">
        {/* Thumbnail skeleton */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10" />
        
        {/* Text content skeleton */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
          <div className="h-4 bg-primary/10 rounded w-3/4" />
          <div className="h-4 bg-primary/10 rounded w-1/2" dir="rtl" />
          <div className="h-3 bg-primary/5 rounded w-2/3" />
        </div>
        
        {/* Chevron skeleton */}
        <div className="flex-shrink-0 w-5 h-5 bg-primary/5 rounded" />
      </div>
    </div>
  )
}

// Skeleton list for multiple cards
export function ProverbListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProverbCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Full page skeleton
export function HomePageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Search bar skeleton */}
      <div className="bg-white/10 h-12 rounded-lg" />
      
      {/* Alphabet filter skeleton */}
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-white/10 rounded" />
        ))}
      </div>
      
      {/* Cards skeleton */}
      <ProverbListSkeleton count={5} />
    </div>
  )
}
