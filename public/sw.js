const CACHE_NAME = "fuelastats-v11";
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/offline.html", "/logo.png"];

function isDynamicRequest(request, url) {
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (url.searchParams.has("_rsc")) return true;
  if (url.pathname.startsWith("/_next/data/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  // App pages with live data — always network
  if (
    url.pathname === "/partidos" ||
    url.pathname.startsWith("/partidos/") ||
    url.pathname === "/liga" ||
    url.pathname === "/noticias" ||
    url.pathname.startsWith("/noticias/") ||
    url.pathname === "/entrenador" ||
    url.pathname.startsWith("/entrenador/") ||
    url.pathname === "/jugadores" ||
    url.pathname.startsWith("/jugadores/") ||
    url.pathname === "/equipos" ||
    url.pathname.startsWith("/equipos/") ||
    url.pathname === "/perfil" ||
    url.pathname.startsWith("/admin")
  ) {
    return true;
  }
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never serve stale app/RSC data from cache
  if (isDynamicRequest(request, url) || request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          if (request.mode === "navigate") {
            return (await caches.match(OFFLINE_URL)) || (await caches.match(request));
          }
          const cached = await caches.match(request);
          return cached || Response.error();
        })
    );
    return;
  }

  // Static assets only: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "FuenlaStats", body: "Hay una actualización del partido." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.url || "/partidos",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/partidos";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => client.url.includes(self.location.origin));
      if (open) return open.focus();
      return self.clients.openWindow(url);
    })
  );
});
