/* ALAGA · Service worker de las apps instaladas (v1.1).
   Guarda SOLO las páginas de la app (HTML, manifiesto e íconos) para poder abrirla aunque falle el Wi-Fi o la Mac.
   NUNCA guarda /api/ (datos de la caja fuerte): esas peticiones pasan directo a la red, sin copia.
   Primero la red (así cada actualización llega en cuanto hay conexión); si no responde en 4 s, la copia guardada. */
"use strict";
const CACHE = "alaga-app-v2";   // v2: la DEMO web vuelve a abrir sin código (se descarta la copia anterior)
const BASICOS = ["ALAGA-System-v0.4.html", "ALAGA-Finanzas-v0.4.html",  "alaga-system.webmanifest", "finanzas.webmanifest", "icono-192.png", "icono-512.png", "icono-maskable-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASICOS.map(f => c.add(new Request(f, { cache: "no-store" })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("alaga-app-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin || !u.href.startsWith(self.registration.scope) || u.pathname.includes("/api/") || u.pathname.endsWith(".js")) return;   // /api/ y todo lo demás: directo a la red
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const resp = await Promise.race([fetch(r, { cache: "no-store" }), new Promise((_, no) => setTimeout(() => no(new Error("lenta")), 4000))]);
      if (resp && resp.ok) c.put(u.pathname, resp.clone());
      return resp;
    } catch (err) {
      const copia = await c.match(u.pathname);
      if (copia) return copia;
      throw err;
    }
  })());
});
