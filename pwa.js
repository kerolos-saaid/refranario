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
      
      // Check install button after service worker is ready
      checkAndShowInstallButton();

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }
  
  // Check and show install button
  function checkAndShowInstallButton() {
    console.log('[PWA] Checking install status...');
    console.log('[PWA] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    console.log('[PWA] Navigator standalone:', window.navigator.standalone);
    
    // Check if app is not installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    console.log('[PWA] Is installed:', isInstalled);
    
    if (!isInstalled) {
      // Wait a bit for beforeinstallprompt to fire
      setTimeout(() => {
        console.log('[PWA] Checking if install button exists...');
        // If beforeinstallprompt didn't fire, show button anyway
        if (!document.getElementById('pwa-install-btn')) {
          console.log('[PWA] Showing install button (fallback)');
          showInstallButton();
        } else {
          console.log('[PWA] Install button already exists');
        }
      }, 1000);
    } else {
      console.log('[PWA] App already installed, not showing button');
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
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      console.log('[PWA] App is already installed');
      return;
    }

    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.className = 'fixed bottom-24 left-6 bg-primary text-white p-4 rounded-full shadow-lg z-50 flex items-center gap-2 hover:bg-primary-light transition-all hover:scale-105 active:scale-95';
    installButton.style.opacity = '0';
    installButton.style.transform = 'scale(0.8) translateY(20px)';
    installButton.innerHTML = `
      <span class="material-symbols-outlined">download</span>
      <span class="font-ui text-sm font-medium hidden sm:inline">Instalar App</span>
    `;
    
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        // If no prompt available, show instructions
        showInstallInstructions();
        return;
      }

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${outcome}`);

      // Clear the deferred prompt
      deferredPrompt = null;

      // Hide the install button with animation
      installButton.style.opacity = '0';
      installButton.style.transform = 'scale(0.8) translateY(20px)';
      setTimeout(() => installButton.remove(), 300);
    });

    document.body.appendChild(installButton);
    
    // Trigger animation after a brief delay
    setTimeout(() => {
      installButton.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
      installButton.style.opacity = '1';
      installButton.style.transform = 'scale(1) translateY(0)';
    }, 100);
  }

  // Show install instructions for browsers that don't support beforeinstallprompt
  function showInstallInstructions() {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome || isEdge) {
      instructions = 'Haz clic en el icono de instalación en la barra de direcciones (junto a la estrella de marcadores) para instalar la aplicación.';
    } else if (isSafari) {
      instructions = 'Toca el botón Compartir y luego "Agregar a la pantalla de inicio" para instalar la aplicación.';
    } else {
      instructions = 'Busca la opción "Instalar aplicación" o "Agregar a la pantalla de inicio" en el menú de tu navegador.';
    }
    
    if (typeof UI !== 'undefined' && UI.showToast) {
      // Create custom modal instead of toast
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
          <div class="flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-primary text-3xl">info</span>
            <h3 class="font-display text-primary text-lg font-bold">Instalar Aplicación</h3>
          </div>
          <p class="font-ui text-ink text-sm mb-6">${instructions}</p>
          <button class="w-full bg-primary text-white py-3 px-6 rounded-lg font-ui font-medium hover:bg-primary-light transition-colors">
            Entendido
          </button>
        </div>
      `;
      
      modal.querySelector('button').addEventListener('click', () => {
        modal.remove();
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
      
      document.body.appendChild(modal);
    } else {
      alert(instructions);
    }
  }

  // Show install button on page load if not installed
  window.addEventListener('load', () => {
    // Also check on load as backup
    setTimeout(() => {
      if (!document.getElementById('pwa-install-btn')) {
        checkAndShowInstallButton();
      }
    }, 3000);
  });

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
