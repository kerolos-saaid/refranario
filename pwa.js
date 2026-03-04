// PWA Registration and Installation Handler
(function() {
  'use strict';

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }

  // Register service worker
  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });

      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] New Service Worker found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, show update notification
            showUpdateNotification();
          }
        });
      });

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  // Show update notification
  function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'fixed bottom-20 left-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg z-50 flex items-center justify-between';
    updateBanner.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">refresh</span>
        <span class="font-ui text-sm">New version available!</span>
      </div>
      <button id="update-btn" class="bg-white text-primary px-4 py-2 rounded font-ui text-sm font-medium hover:bg-gray-100 transition-colors">
        Update
      </button>
    `;
    document.body.appendChild(updateBanner);

    document.getElementById('update-btn').addEventListener('click', () => {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }

  // Handle install prompt
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Save the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    showInstallButton();
  });

  // Show install button
  function showInstallButton() {
    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.className = 'fixed bottom-24 right-6 bg-primary text-white p-4 rounded-full shadow-lg z-50 flex items-center gap-2 hover:bg-primary-light transition-all';
    installButton.innerHTML = `
      <span class="material-symbols-outlined">download</span>
      <span class="font-ui text-sm font-medium hidden sm:inline">Install App</span>
    `;
    
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);

      // Clear the deferred prompt
      deferredPrompt = null;

      // Hide the install button
      installButton.remove();
    });

    document.body.appendChild(installButton);
  }

  // Track installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    
    // Remove install button if it exists
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.remove();
    }

    // Show success message
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('App installed successfully!', 'success');
    }
  });

  // Handle online/offline status
  window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    updateOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    updateOnlineStatus(false);
  });

  // Update online status UI
  function updateOnlineStatus(isOnline) {
    const offlineBanner = document.getElementById('offline-banner');
    
    if (!isOnline) {
      if (!offlineBanner) {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50 font-ui text-sm';
        banner.innerHTML = `
          <span class="material-symbols-outlined text-sm align-middle">cloud_off</span>
          <span class="ml-2">You are offline. Some features may be limited.</span>
        `;
        document.body.appendChild(banner);
      }
    } else {
      if (offlineBanner) {
        offlineBanner.remove();
      }
    }
  }

  // Check initial online status
  if (!navigator.onLine) {
    updateOnlineStatus(false);
  }

  // Request notification permission (optional)
  if ('Notification' in window && Notification.permission === 'default') {
    // Don't request automatically, wait for user action
    console.log('[PWA] Notification permission not granted yet');
  }

})();
