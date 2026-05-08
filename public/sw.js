/**
 * Service Worker — makes the app work offline after the first visit.
 * Uses a "cache first, then network" strategy for app files.
 */

const CACHE_NAME = "budget-manager-v1";

// Files to pre-cache on install (the app shell)
const PRECACHE_URLS = [
  "/",
  "/transactions",
  "/budgets",
  "/savings",
  "/emergency-fund",
  "/debts",
  "/recurring",
  "/reminders",
  "/reports",
  "/settings",
  "/manifest.json",
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache what we can; ignore individual failures
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Some URLs may not exist yet — that's fine
          })
        )
      );
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open pages immediately
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // For navigation requests (page loads): network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the page
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached version
          return caches.match(request).then(
            (cached) => cached || caches.match("/")
          );
        })
    );
    return;
  }

  // For static assets (_next/static): cache first, then network
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});
