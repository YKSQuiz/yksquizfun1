const CACHE_NAME = 'yksquiz-v8'; // Bumped to invalidate old caches
const STATIC_CACHE = 'static-v5';
const DYNAMIC_CACHE = 'dynamic-v5';
const API_CACHE = 'api-v2';

// Cache size limits (in MB)
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ENTRIES = 100;

const urlsToCache = [
  '/',
  '/yksquizfavicon.png',
  '/manifest.json',
  '/sounds/click.mp3',
  '/sounds/correct.mp3',
  '/sounds/incorrect.mp3',
  '/sounds/success.mp3'
];

// Cache size management
const getCacheSize = async (cacheName) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
};

const cleanupCache = async (cacheName, maxSize, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Remove oldest entries
    const entriesToRemove = keys.slice(0, keys.length - maxEntries);
    await Promise.all(entriesToRemove.map(key => cache.delete(key)));
  }
  
  // Check size limit
  const currentSize = await getCacheSize(cacheName);
  if (currentSize > maxSize) {
    // Remove oldest 25% of entries
    const keysToRemove = keys.slice(0, Math.floor(keys.length * 0.25));
    await Promise.all(keysToRemove.map(key => cache.delete(key)));
  }
};

// Mobile-optimized cache strategies
const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    // Sadece GET isteklerini cache'le
    if (request.method === 'GET' && response.ok) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, response.clone());
        await cleanupCache(DYNAMIC_CACHE, MAX_CACHE_SIZE, MAX_ENTRIES);
      } catch (cacheError) {
        console.warn('Cache put failed:', cacheError);
      }
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Network error', { status: 408 });
  }
};

const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const response = await fetch(request);
    // Sadece GET isteklerini cache'le
    if (request.method === 'GET' && response.ok) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
        await cleanupCache(STATIC_CACHE, MAX_CACHE_SIZE, MAX_ENTRIES);
      } catch (cacheError) {
        console.warn('Cache put failed:', cacheError);
      }
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 408 });
  }
};

// API cache strategy with background refresh
const apiCacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Background refresh for API calls
    fetch(request).then(response => {
      if (response.ok) {
        caches.open(API_CACHE).then(cache => {
          cache.put(request, response.clone());
        });
      }
    }).catch(() => {
      // Ignore background fetch errors
    });
    
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
      await cleanupCache(API_CACHE, MAX_CACHE_SIZE, MAX_ENTRIES);
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 408 });
  }
};

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - Mobile-optimized strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // POST, PUT, DELETE gibi istekleri hiç işleme - direkt geçir
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }
  
  // Firebase API calls use API cache strategy
  if (request.url.includes('firebase') || 
      request.url.includes('firestore') ||
      request.url.includes('googleapis.com')) {
    event.respondWith(apiCacheFirst(request));
    return;
  }
  
  // Static assets use cache-first strategy
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      request.destination === 'audio' ||
      request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // HTML pages use network-first with cache fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Default to network-first for other requests
  event.respondWith(networkFirst(request));
});

// Activate event - Eski cache'leri temizle
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Message event - Manuel cache temizleme
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    });
  }
  
  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    // Cache bilgilerini gönder
    caches.keys().then(cacheNames => {
      const cacheInfo = cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        const size = await getCacheSize(cacheName);
        return {
          name: cacheName,
          entries: keys.length,
          size: size
        };
      });
      
      Promise.all(cacheInfo).then(info => {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          data: info
        });
      });
    });
  }
}); 