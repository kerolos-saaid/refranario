const CACHE_NAME = 'senor-shabi-v22';
const STATIC_CACHE = 'senor-shabi-static-v3';
const DATA_CACHE = 'senor-shabi-data-v3';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/new_logo_no_text.png',
  '/new_logo_name_only.png',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/proverbs',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v3...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately instead of waiting for all tabs to close
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DATA_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests - Network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets - Cache first, then network
  event.respondWith(handleStaticRequest(event.request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone and cache successful responses
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] API network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline error for API
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static requests with network-first strategy for HTML, cache-first for assets
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Network-first for navigation (HTML) requests - fixes SPA routing
  if (request.mode === 'navigate') {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const responseClone = response.clone();
        cache.put(request, responseClone);
      }
      return response;
    } catch (error) {
      // Fallback to cache on network failure
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return cache.match('/index.html') || new Response('Offline', { status: 503 });
    }
  }
  
  // Cache-first for other static assets (JS, CSS, images)
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    updateCacheInBackground(request, cache);
    return cachedResponse;
  }
  
  // Cache miss - fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Update cache in background without blocking
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

// Handle background sync when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-proverbs') {
    event.waitUntil(syncProverbs());
  }
});

// Sync pending data when back online
async function syncProverbs() {
  // Get pending operations from IndexedDB
  // This is a placeholder - implement based on your needs
  console.log('[SW] Syncing pending proverbs...');
}

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification:', data);
    
    self.registration.showNotification(data.title || 'Señor Shaعbi', {
      body: data.body || 'New content available',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'default',
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
