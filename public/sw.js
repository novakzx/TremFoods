/* Service Worker — Trem Food
 * Estratégia: network-first para navegações e API, stale-while-revalidate
 * para imagens e fontes. Atualização automática via skipWaiting.
 */
const VERSION = 'trem-v2';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL = ['/', '/cardapio', '/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll rejeita tudo se um recurso falhar; o /offline é SSR e pode variar.
      await Promise.allSettled(SHELL.map((u) => cache.add(u)));
    })().catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Nunca armazenar em cache chamadas à API nem o service worker.
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  // Imagens e fontes: stale-while-revalidate
  const isAsset = url.pathname.startsWith('/img/') || url.pathname.startsWith('/fonts/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.woff2');

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Navegações: network-first com fallback offline para o shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match('/offline'))
            .then((r) => r || caches.match('/')),
        ),
    );
    return;
  }
});

// Web Push: mostra a notificação; o URL de destino vem no payload.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* payload não-JSON — notificação genérica */
  }
  const d = data as { title?: string; body?: string; url?: string; tag?: string };
  event.waitUntil(
    self.registration.showNotification(d.title || 'Trem Food', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag,
      data: { url: d.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client && !('navigate' in client)) {
          client.focus();
          return;
        }
        if ('navigate' in client) {
          client.navigate(url);
          client.focus();
          return;
        }
      }
      return clients.openWindow(url);
    }),
  );
});
