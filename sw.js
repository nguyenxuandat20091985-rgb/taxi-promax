/**
 * TAXI PROMAX - SERVICE WORKER v4.1
 * Gộp ưu điểm: Network First + Cache CDN + Push + Background Sync
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 *
 * [2026-08-29] Bump CACHE_NAME để đẩy bản trip-engine có nút kết thúc chuyến
 */

// ★ Bump version — buộc xóa cache cũ, nạp JS mới (trip-engine-v4 fix endTripBtn)
const CACHE_NAME = 'taxi-promax-v8-20260829-endtrip';

// Danh sách tài nguyên cần cache
const ASSETS_TO_CACHE = [
    // ===== 4 APP CHÍNH =====
    './',
    './index.html',
    './khachhang.html',
    './xeghep.html',
    './admin.html',
    '/khachhang',
    '/xeghep',
    '/admin',
    './manifest.json',

    // ===== TAXI PROMAX UI v6 =====
    './css/promax-v6-ui.css?v=20260826-2',
    './js/modules/promax-map-ui.js',
    './js/modules/promax-care-ai.js',

    // ===== TRIP ENGINE (nút kết thúc chuyến) =====
    './js/modules/trip-engine-v4.js',
    './js/init-trip.js',

    // ===== FIREBASE SDK =====
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',

    // ===== LEAFLET MAP =====
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',

    // ===== FONT AWESOME =====
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// ============================================================
// 1. INSTALL
// ============================================================
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

// ============================================================
// 2. ACTIVATE — Xóa cache cũ
// ============================================================
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

// ============================================================
// 3. FETCH — Network First, Cache Fallback
// ============================================================
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    if (
        url.includes('/api/') ||
        url.includes('firebasedatabase.app') ||
        url.includes('payos.vn') ||
        url.includes('img.vietqr.io') ||
        url.includes('api.qrserver.com') ||
        url.includes('nominatim.openstreetmap') ||
        url.includes('overpass-api.de') ||
        url.includes('open-meteo.com') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) {
                        console.log('[SW v4.1] Offline → cache:', url);
                        return cached;
                    }
                    if (event.request.mode === 'navigate') {
                        const path = new URL(event.request.url).pathname;
                        const fallback =
                            path === '/khachhang' ? '/khachhang.html' :
                            path === '/xeghep' ? '/xeghep.html' :
                            path === '/admin' ? '/admin.html' :
                            './index.html';
                        return caches.match(fallback).then(page => page || caches.match('./index.html'));
                    }
                    return new Response('', { status: 503 });
                });
            })
    );
});

// ============================================================
// 4. BACKGROUND SYNC
// ============================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-pending-trips') {
        console.log('[SW v4.1] Background sync...');
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'SYNC_PENDING_TRIPS' });
            });
        });
    }
});

// ============================================================
// 5. PUSH NOTIFICATION
// ============================================================
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title || 'TAXI PROMAX', {
                body:    data.body || 'Có thông báo mới',
                icon:    data.icon || './manifest.json',
                badge:   './manifest.json',
                vibrate: [300, 100, 300],
                data:    { url: data.url || './' },
                actions: data.actions || []
            })
        );
    } catch (err) {
        console.error('[SW v4.1] Push error:', err);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || './';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            for (const client of clients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow ? self.clients.openWindow(targetUrl) : null;
        })
    );
});