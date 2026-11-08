// Fairway service worker: lets the app open offline (e.g. on a course with no signal).
// Bump CACHE on every release so phones drop the old files.
const CACHE = "fairway-v0.11.1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./assets/fairway-header-mark.png",
  "./js/app.js",
  "./js/courses.js",
  "./js/handicap.js",
  "./js/player.js",
  "./js/rounds.js",
  "./js/storage.js",
  "./js/utils.js",
  "./assets/course-icons/ball.webp",
  "./assets/course-icons/bunker.webp",
  "./assets/course-icons/clock.webp",
  "./assets/course-icons/clubhouse.webp",
  "./assets/course-icons/fairway.webp",
  "./assets/course-icons/green.webp",
  "./assets/course-icons/lake.webp",
  "./assets/course-icons/tee-box.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Serve from cache straight away, refresh the cache in the background.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin)
    return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
