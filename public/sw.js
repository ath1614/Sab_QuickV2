/**
 * SabQuick Production Service Worker (PWA Core)
 * Strategy:
 * - CacheFirst: Static Next.js chunks, fonts, images, icons.
 * - NetworkFirst: Page navigations with automatic /offline fallback.
 * - NetworkOnly: API requests (/api/*) to guarantee fresh inventory, pricing & auth.
 */

const CACHE_NAME = "sabquick-cache-v1";

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.svg",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

// 1. Install Event - Precache App Shell & Offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Purge outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Intelligent Caching Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and http/https schemes
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // A. Bypass caching for real-time API routes & NextAuth callbacks
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // B. CacheFirst Strategy for immutable Next.js static assets, fonts & icons
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2|woff|ttf)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and image request fails, return cached fallback if any
          return cachedResponse || new Response("", { status: 408 });
        }
      })
    );
    return;
  }

  // C. NetworkFirst Strategy for HTML page navigations with /offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page navigations for offline viewing
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed: attempt to retrieve cached page
          const cache = await caches.open(CACHE_NAME);
          const cachedPage = await cache.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          // Return dedicated branded offline fallback screen
          const offlineFallback = await cache.match("/offline");
          if (offlineFallback) {
            return offlineFallback;
          }

          return new Response(
            "<!DOCTYPE html><html><body><h1>Offline</h1><p>Please reconnect to the internet.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }
});
