// Service Worker for Señor Shaعbi PWA
const CACHE_VERSION = '2.0.0'; // Increment this with each deployment
const CACHE_NAME = `senor-shabi-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `senor-shabi-runtime-v${CACHE_VERSION}`;

// Files to cache on install
const STATIC_CACHE_URLS = [
  './',
  './1-splash.html',
  './2-home.html',
  './3-detail_view.html',
  './4-add_edit.html',
  './5-login.html',
  './6-offline_banner.html',
  './app.js',
  './pwa.js',
  './manifest.json',
  './new_logo.png',
  './new_logo_name_only.png',
  './new_logo_no_text.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network First strategy for better cache invalidation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network First for ALL resources when online (better cache invalidation)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone and cache the fresh response
        const responseClone = response.clone();
        const cacheName = request.headers.get('accept')?.includes('text/html') 
          ? CACHE_NAME 
          : RUNTIME_CACHE;
        
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Fallback to cache only when network fails (offline)
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If HTML page not found, return home page
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./2-home.html');
          }
          
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Force cache refresh
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
      })
    );
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-proverbs') {
    event.waitUntil(syncProverbs());
  }
});

async function syncProverbs() {
  // Sync any pending changes when back online
  console.log('[SW] Syncing proverbs...');
  // This would sync with a backend if we had one
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New proverb added!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'senor-shabi-notification',
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Señor Shaعbi', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/2-home.html')
    );
  }
});
