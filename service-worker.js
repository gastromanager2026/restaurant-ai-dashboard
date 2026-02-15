// ========== SERVICE WORKER PWA ==========
// Gestion des notifications push + cache offline

const CACHE_NAME = 'gastromanager-v1';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache pour l'offline
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo.png',
  '/logo3.png'
];

// ========== INSTALLATION ==========
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Service Worker: Mise en cache des fichiers');
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('⚠️ Certains fichiers n\'ont pas pu être mis en cache:', err);
      });
    })
  );
  
  // Force l'activation immédiate
  self.skipWaiting();
});

// ========== ACTIVATION ==========
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activation');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prend le contrôle immédiatement
  return self.clients.claim();
});

// ========== FETCH (cache-first strategy) ==========
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes vers des APIs externes
  if (
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('api.') ||
    event.request.url.includes('render.com')
  ) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Ne pas mettre en cache les erreurs
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Cloner la réponse
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Si offline et page HTML, retourner page offline
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ========== PUSH NOTIFICATIONS ==========
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Notification push reçue');
  
  let data = {
    title: 'GastroManager',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    requireInteraction: false
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ========== CLIC SUR NOTIFICATION ==========
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Clic sur notification');
  
  event.notification.close();
  
  // URL à ouvrir (par défaut la racine)
  let urlToOpen = '/';
  
  // Si la notification contient une URL spécifique
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  // Ouvrir ou focus sur la fenêtre existante
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(client => {
              if (urlToOpen !== '/' && 'navigate' in client) {
                return client.navigate(urlToOpen);
              }
              return client;
            });
          }
        }
        
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========== MESSAGE DU CLIENT ==========
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Répondre au client
  if (event.ports[0]) {
    event.ports[0].postMessage({
      type: 'ACK',
      message: 'Message reçu par le service worker'
    });
  }
});

console.log('🚀 Service Worker: Chargé et prêt');
