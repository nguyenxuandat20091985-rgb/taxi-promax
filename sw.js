/**
 * TAXI PROMAX - SERVICE WORKER v4.1
 * Gộp ưu điểm: Network First + Cache CDN + Push + Background Sync
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 *
 * [2026-09-22] Bump CACHE_NAME — ép tải 17-unify PayOS fix
 */

const CACHE_NAME = 'taxi-promax-v9-20260922-payos';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './khachhang.html',
    './xeghep.html',
    './admin.html',
    '/khachhang',
    '/xeghep',
    '/admin',
    './manifest.json',
    './css/promax-v6-ui.css?v=20260826-2',
    './js/modules/promax-map-ui.js',
    './js/modules/promax-care-ai.js',
    './js/modules/trip-engine-v4.js',
    './js/init-trip.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

self.addEventListener('install', (event) => {
    console.log('[SW v4.1] Đang cài đặt...', CACHE_NAME);
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                ASSETS_TO_CACHE.map(url =>
                    cache.add(url).catch(err => {
                        console.warn('[SW v4.1] Bỏ qua:', url, err.message);
                    })
                )
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW v4.1] Đang kích hoạt...', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(
                keyList.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW v4.1] Xóa cache cũ:', key);
                    return caches.delete(key);
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // API / realtime / payment — luôn network, không cache
    if (
        url.includes('/api/') ||
        url.includes('firebasedatabase.app') ||
        url.includes('payos') ||
        url.includes('api.qrserver.com') ||
        url.includes('overpass-api.de') ||
        url.includes('open-meteo') ||
        url.includes('nominatim') ||
        url.includes('project-osrm')
    ) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).catch(() =>
                new Response(JSON.stringify({ error: 'offline' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // JS driver (PayOS fix) — network first
    if (url.includes('/js/driver/') || url.includes('17-unify')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => {});
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Default: network first, fallback cache
    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                }
                return networkResponse;
            })
            .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
});

self.addEventListener('push', (event) => {
    let data = { title: 'Taxi ProMax', body: 'Có thông báo mới' };
    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch (e) {}
    event.waitUntil(
        self.registration.showNotification(data.title || 'Taxi ProMax', {
            body: data.body || '',
            icon: './assets/logo.svg',
            badge: './assets/logo.svg',
            data: data.data || {}
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const c of clientList) {
                if ('focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});
