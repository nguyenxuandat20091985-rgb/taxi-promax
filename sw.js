/**
 * TAXI PROMAX - SERVICE WORKER v4.0 (FINAL)
 * Gộp ưu điểm: Network First + Cache CDN + Push + Background Sync
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

// [FIX] Nâng version — bắt browser reload SW mới
const CACHE_NAME = 'taxi-promax-v5';

// Danh sách tài nguyên cần cache
const ASSETS_TO_CACHE = [
    // ===== 4 APP CHÍNH =====
    './',
    './index.html',        // App Tài Xế (nguồn)
    './khachhang.html',    // App Khách Hàng (nguồn)
    './xeghep.html',       // App Xe Ghép (nguồn)
    './admin.html',        // Admin Dashboard (nguồn)
    '/khachhang',          // Clean URL khách hàng
    '/xeghep',             // Clean URL xe ghép
    '/admin',              // Clean URL admin
    './manifest.json',

    // ===== FIREBASE SDK (offline được) =====
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',

    // ===== LEAFLET MAP =====
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',

    // ===== FONT AWESOME (icon menu, nút bấm) =====
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',

    // ===== CARTODB TILES (bản đồ offline) =====
    'https://a.basemaps.cartocdn.com/light_all/13/4096/2720.png',
    'https://a.basemaps.cartocdn.com/light_all/13/4096/2721.png'
];

// ============================================================
// 1. INSTALL
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW v5] Đang cài đặt...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache riêng lẻ — 1 file lỗi không ảnh hưởng file khác
            return Promise.all(
                ASSETS_TO_CACHE.map(url =>
                    cache.add(url).catch(err => {
                        console.warn('[SW v5] Bỏ qua:', url, err.message);
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
    console.log('[SW v5] Đang kích hoạt...');
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(
                keyList.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW v5] Xóa cache cũ:', key);
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

    // ===== KHÔNG CACHE các request động =====
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
        return; // để browser xử lý
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
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
                        console.log('[SW v5] Offline → cache:', url);
                        return cached;
                    }
                    if (event.request.mode === 'navigate') {
                        const path = new URL(event.request.url).pathname;
                        const fallback = path === '/khachhang' ? '/khachhang.html' : path === '/xeghep' ? '/xeghep.html' : path === '/admin' ? '/admin.html' : './index.html';
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
        console.log('[SW v5] Background sync...');
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
                icon:    data.icon || './manifest.json',  // dùng manifest icon (không 404)
                badge:   './manifest.json',
                vibrate: [300, 100, 300],
                data:    { url: data.url || './' },
                actions: data.actions || []
            })
        );
    } catch (err) {
        console.error('[SW v5] Push error:', err);
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