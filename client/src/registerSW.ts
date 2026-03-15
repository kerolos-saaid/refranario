if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered: ', registration)
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('New SW version available')
                // Show update notification
                window.dispatchEvent(new CustomEvent('swUpdateAvailable'))
              }
            })
          }
        })
      },
      (error) => {
        console.log('SW registration failed: ', error)
      }
    )
  })
  
  // Listen for update events from SW
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('SW controller changed, reloading...')
      window.location.reload()
    })
  }
}
