import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  fallbackIcon?: string
}

export function OptimizedImage({ src, alt, className = '', fallbackIcon = 'history_edu' }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // If no src or error, show fallback icon
  if (!src || hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-primary/10 ${className}`}
        style={{ background: 'linear-gradient(135deg, rgba(176,44,51,0.08) 0%, rgba(247,159,63,0.05) 100%)' }}
      >
        <span className="material-symbols-outlined text-3xl text-primary/40">
          {fallbackIcon}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder shown while loading */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-primary/5 animate-pulse"
        >
          <span className="material-symbols-outlined text-2xl text-primary/30">
            {fallbackIcon}
          </span>
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  )
}
