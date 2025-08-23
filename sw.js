// Service Worker for Solar System PWA - מתוקן וכולל את כל הקבצים
const CACHE_NAME = 'solar-system-v2';
const urlsToCache = [
  '/solarsystem3/',
  '/solarsystem3/index.html',
  '/solarsystem3/solarsystem.html',
  '/solarsystem3/quiz.html',
  '/solarsystem3/pwa-icons-generator.html',
  '/solarsystem3/manifest.json',
  '/solarsystem3/icon-192.png',
  '/solarsystem3/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Opened cache');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Service Worker: Failed to cache some resources', err);
          // Cache what we can, continue anyway
          return Promise.allSettled(
            urlsToCache.map(url => cache.add(url).catch(err => {
              console.log(`Failed to cache: ${url}`, err);
            }))
          );
        });
      })
      .then(() => {
        console.log('Service Worker: All resources cached successfully');
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure service worker takes control immediately
  self.clients.claim();
  console.log('Service Worker: Activated');
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        console.log('Service Worker: Fetching from network:', event.request.url);
        
        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(error => {
          console.log('Service Worker: Fetch failed:', error);
          
          // Offline fallback for HTML pages
          if (event.request.destination === 'document') {
            return new Response(`
              <!DOCTYPE html>
              <html lang="he" dir="rtl">
              <head>
                  <meta charset="UTF-8">
                  <title>מצב לא מקוון - מערכת השמש</title>
                  <style>
                      body { font-family: Arial; text-align: center; padding: 50px; background: #0a0a2e; color: white; }
                      .offline-message { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; }
                  </style>
              </head>
              <body>
                  <div class="offline-message">
                      <h1>🌌 מצב לא מקוון</h1>
                      <p>אתה במצב לא מקוון. חלק מהתוכן עשוי להיות לא זמין.</p>
                      <p>נסה להתחבר לאינטרנט ורענן את הדף.</p>
                      <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 15px; border-radius: 5px; border: none; background: #667eea; color: white; cursor: pointer;">🔄 נסה שוב</button>
                  </div>
              </body>
              </html>
            `, {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/html; charset=utf-8'
              })
            });
          }
          
          // For other resources, return generic offline response
          return new Response('התוכן לא זמין במצב לא מקוון', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          });
        });
      })
  );
});

// Background sync for offline capability
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Push notifications support
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'התראה חדשה ממערכת השמש',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'חקור עכשיו',
        icon: 'icon-192.png'
      },
      {
        action: 'close',
        title: 'סגור',
        icon: 'icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('מערכת השמש 🌌', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/solarsystem3/solarsystem.html')
    );
  } else if (event.action === 'close') {
    // Just close, do nothing
  } else {
    // Default action - open main page
    event.waitUntil(
      clients.openWindow('/solarsystem3/')
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

// Helper functions
async function syncData() {
  console.log('Service Worker: Syncing data...');
  try {
    // Add your data sync logic here
    // For example, sync user progress, settings, etc.
    console.log('Service Worker: Data sync completed');
  } catch (error) {
    console.log('Service Worker: Data sync failed:', error);
  }
}

async function updateContent() {
  console.log('Service Worker: Updating content...');
  try {
    // Add your content update logic here
    // For example, check for app updates, refresh cache, etc.
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    // Re-fetch and update cached resources
    await Promise.allSettled(
      keys.map(request => 
        fetch(request.url).then(response => {
          if (response.ok) {
            return cache.put(request, response);
          }
        }).catch(err => {
          console.log('Failed to update:', request.url, err);
        })
      )
    );
    
    console.log('Service Worker: Content update completed');
  } catch (error) {
    console.log('Service Worker: Content update failed:', error);
  }
}

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
