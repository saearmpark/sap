/* SAP PWA shell: cache core pages and assets, fall back to offline.html. */
const CACHE = "sap-shell-labels-37";
const CORE = [
  "./",
  "index.html",
  "offline.html",
  "search.html",
  "notifications.html",
  "news.html",
  "stocks.html",
  "english.html",
  "learn.html",
  "calendar.html",
  "login.html",
  "manifest.webmanifest",
  "assets/style.css?v=labels-37",
  "assets/common.js?v=labels-37",
  "assets/auth.js?v=labels-37",
  "assets/theme.js?v=labels-37",
  "assets/english.js?v=labels-37",
  "assets/feed.js?v=labels-37",
  "assets/notifications.js?v=labels-37",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("sap-shell-") && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request))
      || (await caches.match(new URL("offline.html", self.registration.scope).href))
      || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (/\.(?:css|js|png|jpe?g|svg|webp|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
