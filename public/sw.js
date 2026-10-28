/* Service Worker — Trem Food
 * Estratégia: network-first para navegações públicas, stale-while-revalidate
 * para imagens e fontes. Atualização automática via skipWaiting.
 * Atenção: JavaScript puro (o browser carrega este ficheiro tal como está).
 */
const VERSION = 'trem-v3';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL = ['/', '/cardapio', '/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// Só páginas públicas vão para a cache: conta, pedidos, checkout e painel têm
// dados pessoais e não podem ficar guardados no dispositivo.
const PUBLIC_PAGES = [/^\/$/, /^\/cardapio(\/[^/]+)?$/, /^\/rastreamento$/, /^\/offline$/, /^\/(privacidade|termos|cookies)$/];
const isPublicPage = (pathname) => PUBLIC_PAGES.some((re) => re.test(pathname));

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
  if (url.origin !== self.location.origin) return;

  // Nunca armazenar em cache chamadas à API nem o service worker.
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  // Imagens e fontes: stale-while-revalidate
  const isAsset = url.pathname.startsWith('/img/') || url.pathname.startsWith('/fonts/') || /\.(png|jpe?g|webp|woff2)$/.test(url.pathname);

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
    const cacheable = isPublicPage(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          (cacheable ? caches.match(req) : Promise.resolve(undefined))
            .then((r) => r || caches.match('/offline'))
            .then((r) => r || caches.match('/')),
        ),
    );
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
  event.waitUntil(
    self.registration.showNotification(data.title || 'Trem Food', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Só caminhos do próprio site (nunca um URL externo vindo do payload).
  const raw = (event.notification.data && event.notification.data.url) || '/';
  const url = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('navigate' in client) {
          return client.navigate(url).then((c) => (c || client).focus());
        }
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
