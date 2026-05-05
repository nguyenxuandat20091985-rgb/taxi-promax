/**
 * TAXI PROMAX - SERVICE WORKER (OFFLINE MODE)
 * Giúp app hoạt động ổn định khi tài xế mất sóng 4G.
 */

const CACHE_NAME = 'taxi-promax-v2'; // Nâng cấp version để xóa cache cũ
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './js/payment.js',
    './manifest.json',
    // Thư viện bản đồ (để load offline nếu đã từng load)
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 1. CÀI ĐẶT: Lưu trữ tài nguyên quan trọng
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Ép buộc SW mới hoạt động ngay lập tức
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Hệ thống đang nạp dữ liệu ngoại tuyến...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. KÍCH HOẠT: Dọn dẹp rác và cache cũ của phiên bản trước
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Đang xóa bộ nhớ đệm cũ:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Kiểm soát trang ngay lập tức
});

// 3. XỬ LÝ YÊU CẦU: Chiến lược "Ưu tiên mạng, dự phòng Cache"
self.addEventListener('fetch', (event) => {
    // Không cache các yêu cầu API ngân hàng hoặc ảnh QR (vì cần dữ liệu mới nhất)
    if (event.request.url.includes('img.vietqr.io') || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Nếu lấy được dữ liệu từ mạng, lưu một bản sao vào cache luôn
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Nếu mất mạng, lấy dữ liệu từ cache đã lưu
                return caches.match(event.request).then((res) => {
                    if (res) return res;
                    // Nếu là trang web, trả về index.html mặc định
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
