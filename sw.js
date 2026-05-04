const CACHE_NAME = 'taxi-promax-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './js/payment.js',
    './app-logic.js',
    './manifest.json'
];

// Cài đặt và lưu trữ các file quan trọng vào bộ nhớ đệm
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Đang lưu trữ bộ nhớ đệm...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Xử lý khi ứng dụng yêu cầu dữ liệu (Ưu tiên mạng, lỗi mới dùng cache)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Kích hoạt và dọn dẹp các bản cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});
