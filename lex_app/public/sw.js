const CACHE = "lex-shell-v1"
const SHELL = ["/", "/manifest.json", "/icon.svg", "/apple-icon.png", "/lex-orb.png"]

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", e => {
  const { request } = e
  const url = new URL(request.url)

  /* Always network-first for API routes */
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          status: 503, headers: { "Content-Type": "application/json" }
        })
      )
    )
    return
  }

  /* Cache-first for everything else */
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        if (res.ok && request.method === "GET") {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      }).catch(() => caches.match("/") ?? new Response("Offline", { status: 503 }))
    })
  )
})
