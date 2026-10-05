const SHELL = ["/", "/styles.css", "/app.js", "/manifest.json", "/icon.svg"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("bright-v1").then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== "bright-v1").map((k) => caches.delete(k)))),
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // App shell: cache first (works offline). API (/v1): network only (fresh prices).
  if (url.pathname.startsWith("/v1")) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
