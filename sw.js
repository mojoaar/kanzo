// Kanzo Service Worker — offline support and caching
var CACHE_VERSION = 'kanzo-v1';
var STATIC_CACHE = CACHE_VERSION + '-static';
var DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

var STATIC_ASSETS = [
  '/',
  'index.html',
  'css/themes.css',
  'css/components.css',
  'js/config.js',
  'js/icons.js',
  'js/configStore.js',
  'js/utils/dom.js',
  'js/utils/github.js',
  'js/storage.js',
  'js/themes.js',
  'js/boardStore.js',
  'js/sync.js',
  'js/ui/toast.js',
  'js/ui/modals.js',
  'js/ui/sidebar.js',
  'js/ui/board.js',
  'js/app.js',
  'favicon.svg',
  'favicon-32.png',
  'favicon-192.png',
  'favicon-512.png',
  'manifest.json'
];

// Install: pre-cache static assets
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key.indexOf(CACHE_VERSION) !== 0;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for static, network-first for API, network-only for GitHub
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // GitHub API requests: network-only (don't cache tokens)
  if (url.hostname === 'api.github.com') return;

  // Static assets: cache-first
  if (url.pathname.match(/\.(css|js|svg|png|ico|json)$/) || url.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request).then(function (response) {
          return caches.open(DYNAMIC_CACHE).then(function (cache) {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(event.request).then(function (response) {
      return caches.open(DYNAMIC_CACHE).then(function (cache) {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
