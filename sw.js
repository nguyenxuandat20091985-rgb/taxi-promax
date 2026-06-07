/**
 * TAXI PROMAX - SERVICE WORKER v3.0
 * FIX: Đúng đường dẫn file, đủ 3 app, cache Firebase SDK
 * Chiến lược: Network First → Cache Fallback
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

// [FIX] Nâng version v3 — bắt buộc sau khi deploy thay đổi lớn
const CACHE_NAME = 'taxi-promax-v3';

// [FIX] Đúng đường dẫn thực tế trong repo
const ASSETS_TO_CACHE = [
    // ===== 3 APP CHÍNH =====
    './',
    './index.html',        // App Tài Xế
    './khachhang.html',    // App Khách Hàng
    './admin.html',        // Admin Dashboard

    // ===== CONFIG =====
    './manifest.json',

    // ===== CSS & ASSETS =====
    './styles.css',

    // ===== FIREBASE SDK (cache để dùng offline) =====
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',

    // ===== LEAFLET MAP (cache bản đồ offline) =====
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',

    // ===== FONT =====
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800;900&display=swap'
];

// ============================================================
// 1. INSTALL — Lưu tài nguyên vào cache
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW v3] Đang cài đặt...');

    // Ép SW mới hoạt động ngay, không chờ tab cũ đóng
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW v3] Đang cache tài nguyên...');

            // Cache từng file riêng lẻ — tránh 1 file lỗi làm hỏng toàn bộ
            const cachePromises = ASSETS_TO_CACHE.map(url =>
                cache.add(url).catch(err => {
                    console.warn(`[SW v3] Bỏ qua cache lỗi: ${url}`, err.message);
                })
            );
            return Promise.all(cachePromises);
        })
    );
});

// ============================================================
// 2. ACTIVATE — Xóa cache cũ
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[SW v3] Đang kích hoạt...');

    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW v3] Xóa cache cũ:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            console.log('[SW v3] ✅ Đã kích hoạt hoàn toàn');
            // Kiểm soát tất cả tab ngay lập tức
            return self.clients.claim();
        })
    );
});

// ============================================================
// 3. FETCH — Chiến lược Network First → Cache Fallback
// ============================================================
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // ===== KHÔNG CACHE: API calls, Firebase REST, PayOS =====
    // Các request này cần dữ liệu mới nhất, không được dùng cache
    if (
        url.includes('/api/')                    || // Vercel API functions
        url.includes('firebasedatabase.app')     || // Firebase REST API
        url.includes('payos.vn')                 || // PayOS payment
        url.includes('img.vietqr.io')            || // QR code images
        url.includes('nominatim.openstreetmap')  || // Geocoding API
        event.request.method !== 'GET'              // POST, PATCH, DELETE
    ) {
        return; // Để browser xử lý bình thường
    }

    event.respondWith(
        // Thử mạng trước
        fetch(event.request)
            .then((networkResponse) => {
                // Mạng OK → lưu bản sao vào cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Mất mạng → lấy từ cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('[SW v3] Offline mode — dùng cache:', url);
                        return cachedResponse;
                    }

                    // Không có cache → trả về trang chính
                    if (event.request.mode === 'navigate') {
                        console.warn('[SW v3] Không có cache, fallback index.html');
                        return caches.match('./index.html');
                    }

                    // Không có gì → trả về response rỗng tránh crash
                    return new Response('', {
                        status: 503,
                        statusText: 'Service Unavailable — Offline'
                    });
                });
            })
    );
});

// ============================================================
// 4. BACKGROUND SYNC — Tự động sync khi có mạng lại
// ============================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-pending-trips') {
        console.log('[SW v3] Background sync: đang sync chuyến pending...');
        // Thông báo tất cả tab sync lại
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'SYNC_PENDING_TRIPS' });
            });
        });
    }
});

// ============================================================
// 5. PUSH NOTIFICATION (FCM fallback)
// ============================================================
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const title   = data.title   || 'TAXI PROMAX';
        const options = {
            body:    data.body    || 'Có thông báo mới',
            icon:    data.icon    || './assets/logo.png',
            badge:   './assets/logo.png',
            vibrate: [300, 100, 300],
            data:    { url: data.url || './' },
            actions: data.actions || []
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (err) {
        console.error('[SW v3] Push notification error:', err);
    }
});

// Xử lý click notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url)
        ? event.notification.data.url : './';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            // Nếu đã có tab mở → focus vào đó
            for (const client of clients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Chưa có tab → mở tab mới
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
