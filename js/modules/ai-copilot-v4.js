/**
 * ai-copilot-v4.js - Trợ lý AI thông minh cho Taxi Promax
 * Phiên bản: 4.2
 * - Tắt toast hướng dẫn chuyến (CUSTOMER_ONBOARD / FARE_CALCULATING / …) — tránh che map & nút kết thúc
 * - Giữ cảnh báo an toàn: GPS yếu, phanh/tăng tốc gấp, harsh safety
 * - Alert UI đẩy lên trên (không chồng panel dưới)
 */
;(function(window, document, undefined) {
    'use strict';
    const aiRegistry = window.PromaxAIRegistry;
    if (aiRegistry && !aiRegistry.claim('copilot', { role: 'driver-safety', version: '4.2' })) return;

    // ======================== CẤU HÌNH ========================
    const CONFIG = {
        GPS_ACCURACY_WARN: 50,
        GPS_ACCURACY_CRITICAL: 100,
        ROUTE_DEVIATION_WARN: 150,
        ROUTE_DEVIATION_CRITICAL: 300,
        HARSH_ACCEL_THRESHOLD: 3.0,
        HARSH_BRAKE_THRESHOLD: -3.5,
        MIN_SPEED_FOR_ACCEL: 2.0, // m/s (\~7.2 km/h)
        DEBOUNCE_MS: 5000,
        FIREBASE_ALERTS_PATH: '/ai/alerts',
        // false = không hiện toast hướng dẫn chuyến (đề xuất vận hành)
        SHOW_TRIP_GUIDE_TOASTS: false
    };

    // ======================== BIẾN NỘI BỘ ========================
    let _enabled = true;
    let _mode = null;
    let _lastAlertTime = 0;
    let _gpsUnsubscribe = null;
    let _listeners = [];
    let _lastGps = null;
    let _lastGpsAlertAt = 0;
    let _lastGpsAlertKind = '';

    // ======================== PHÁT HIỆN MÔI TRƯỜNG ========================
    function detectMode() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.endsWith('/') || path.includes('taxi')) return 'driving';
        if (path.includes('admin.html')) return 'monitoring';
        if (document.querySelector('.driver-panel, #trip-controls')) return 'driving';
        if (document.querySelector('.admin-panel, #admin-dashboard')) return 'monitoring';
        return null;
    }

    // ======================== LOGGING ========================
    function log(msg, type = 'info') {
        const prefix = '[AI-Copilot v4.2]';
        if (type === 'warn') console.warn(prefix, msg);
        else if (type === 'error') console.error(prefix, msg);
        else console.log(prefix, msg);
    }

    // ======================== GIAO TIẾP MODULE ========================
    function getCockpit() { return window.cockpit || null; }
    function getSafety() { return window.safety || null; }

    function getFirebase() {
        if (window.db && typeof window.db.ref === 'function') {
            return window.db;
        }
        if (window.firebase && typeof window.firebase.database === 'function') {
            return window.firebase.database();
        }
        return null;
    }

    // ======================== CẢNH BÁO UI ========================
    function showAlert(message, type = 'warning', duration = 8000) {
        let container = document.querySelector('.ai-copilot-alerts');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-copilot-alerts';
            // Đặt phía trên (dưới GPS pill) — không che panel / nút kết thúc
            container.style.cssText = `
                position: fixed;
                top: calc(env(safe-area-inset-top, 0px) + 56px);
                left: 50%;
                transform: translateX(-50%);
                z-index: 3000;
                max-width: 92%;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(container);
        }
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type}`;
        const bg = type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#0d9488';
        const fg = type === 'warning' ? '#212529' : '#fff';
        alertEl.style.cssText = `
            pointer-events: auto;
            background: ${bg};
            color: ${fg};
            padding: 10px 18px;
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.28);
            font-weight: 600;
            transition: opacity 0.3s ease;
            opacity: 1;
            font-size: 13px;
            line-height: 1.45;
            max-width: 420px;
            text-align: center;
        `;
        alertEl.textContent = message;
        container.appendChild(alertEl);
        setTimeout(() => {
            alertEl.style.opacity = '0';
            setTimeout(() => { if (alertEl.parentNode) alertEl.remove(); }, 300);
        }, duration);
        alertEl.addEventListener('click', () => {
            alertEl.style.opacity = '0';
            setTimeout(() => { if (alertEl.parentNode) alertEl.remove(); }, 300);
        });
    }

    // ======================== DRIVING MODE ========================
    function startDrivingMode() {
        log('Khởi động chế độ Lái xe (Driving Mode)');
        _mode = 'driving';

        if (window.PromaxGPSCore && typeof window.PromaxGPSCore.onFix === 'function') {
            if (_gpsUnsubscribe) _gpsUnsubscribe();
            _gpsUnsubscribe = window.PromaxGPSCore.onFix((fix) => {
                if (!fix || fix.error) return;
                handleGpsUpdate({
                    coords: {
                        latitude: fix.lat,
                        longitude: fix.lng,
                        speed: fix.speed || 0,
                        accuracy: fix.accuracy || 999,
                        heading: fix.heading || 0
                    },
                    timestamp: fix.timestamp || Date.now()
                });
            });
            log('GPS: Đã kết nối ProMaxGPSCore (single owner)');
        } else {
            log('GPS core chưa sẵn sàng; AI Copilot chờ dữ liệu, không mở watcher phụ', 'warn');
        }

        document.addEventListener('safety:alert', (e) => {
            if (!_enabled) return;
            const { type, message } = e.detail || {};
            if (type === 'harsh_event') {
                showAlert('⚠️ ' + message, 'danger', 10000);
            }
        });

        // Hướng dẫn chuyến: tắt mặc định (SHOW_TRIP_GUIDE_TOASTS = false)
        // Chỉ giữ COMPLETED nếu bật guide; safety vẫn luôn hoạt động ở trên.
        document.addEventListener('trip:status', (e) => {
            if (!_enabled) return;
            if (!CONFIG.SHOW_TRIP_GUIDE_TOASTS) return;
            const status = String(e.detail?.status || '').toUpperCase();
            if (status === 'ARRIVED_PICKUP') {
                showAlert('📍 Anh đã đến điểm đón, bấm "Đã đến điểm đón" để xác nhận.', 'info', 6000);
            } else if (status === 'CUSTOMER_ONBOARD') {
                showAlert('🚗 Khách đã lên xe. Chọn điểm đến hoặc bắt đầu tính cước theo hướng dẫn.', 'info', 6000);
            } else if (status === 'WAITING_DESTINATION') {
                showAlert('🏁 Hãy nhập và xác nhận điểm đến của khách trước khi tính cước.', 'warning', 7000);
            } else if (status === 'FARE_CALCULATING') {
                showAlert('💰 Đã bắt đầu tính cước. Chỉ kết thúc chuyến khi đã đến nơi.', 'info', 5000);
            } else if (status === 'COMPLETED') {
                showAlert('✅ Chuyến đi hoàn tất! Cảm ơn anh.', 'info', 4000);
            }
        });
    }

    function handleGpsUpdate(position) {
        if (!_enabled) return;
        const coords = position.coords;
        const accuracy = coords.accuracy;
        const speed = coords.speed || 0;

        const gpsAlertKind = accuracy > CONFIG.GPS_ACCURACY_CRITICAL
            ? 'critical'
            : accuracy > CONFIG.GPS_ACCURACY_WARN
                ? 'weak'
                : '';
        const now = Date.now();
        if (gpsAlertKind && (gpsAlertKind !== _lastGpsAlertKind || now - _lastGpsAlertAt >= 30000)) {
            _lastGpsAlertAt = now;
            _lastGpsAlertKind = gpsAlertKind;
            if (gpsAlertKind === 'critical') {
                showAlert('📡 GPS rất kém (độ chính xác >100m), hãy ra nơi thoáng đãng.', 'danger', 5000);
            } else {
                showAlert('📡 GPS đang yếu (độ chính xác >50m), có thể ảnh hưởng đến định vị.', 'warning', 5000);
            }
        } else if (!gpsAlertKind) {
            _lastGpsAlertKind = '';
        }

        if (_lastGps && speed > CONFIG.MIN_SPEED_FOR_ACCEL) {
            const dt = (position.timestamp - _lastGps.timestamp) / 1000;
            if (dt > 0 && dt < 5) {
                const dv = speed - _lastGps.speed;
                const accel = dv / dt;
                if (accel > CONFIG.HARSH_ACCEL_THRESHOLD) {
                    showAlert('🚀 Tăng tốc gấp! Hãy lái xe an toàn.', 'warning', 4000);
                } else if (accel < CONFIG.HARSH_BRAKE_THRESHOLD) {
                    showAlert('🛑 Phanh gấp! Giữ khoảng cách an toàn.', 'warning', 4000);
                }
            }
        }

        _lastGps = {
            timestamp: position.timestamp,
            speed: speed,
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: accuracy
        };
    }

    // ======================== MONITORING MODE ========================
    function startMonitoringMode() {
        log('Khởi động chế độ Giám sát (Monitoring Mode)');
        _mode = 'monitoring';

        const db = getFirebase();
        if (db) {
            const alertsRef = db.ref(CONFIG.FIREBASE_ALERTS_PATH);
            alertsRef.on('child_added', (snapshot) => {
                if (!_enabled) return;
                const alertData = snapshot.val();
                if (alertData) displayAdminAlert(alertData);
            });
        } else {
            log('Không tìm thấy Firebase, chuyển sang chế độ mô phỏng', 'warn');
            const mockInterval = setInterval(() => {
                if (!_enabled) { clearInterval(mockInterval); return; }
                displayAdminAlert(generateMockAlert());
            }, 15000);
            _listeners.push({ type: 'interval', ref: mockInterval });
        }

        document.addEventListener('admin:refresh', () => {
            log('Admin yêu cầu làm mới dữ liệu', 'info');
        });
    }

    function displayAdminAlert(alertData) {
        let container = document.querySelector('.admin-alerts .alert-list');
        if (!container) {
            const adminPanel = document.querySelector('.admin-panel, #admin-dashboard');
            if (adminPanel) {
                const wrapper = document.createElement('div');
                wrapper.className = 'admin-alerts';
                wrapper.innerHTML = `<h5>🚨 Cảnh báo AI</h5><ul class="alert-list" style="list-style:none; padding:0;"></ul>`;
                adminPanel.prepend(wrapper);
                container = wrapper.querySelector('.alert-list');
            } else {
                log('Không tìm thấy container cho admin alerts', 'warn');
                return;
            }
        }
        const item = document.createElement('li');
        item.style.cssText = `
            background: ${alertData.severity === 'critical' ? '#f8d7da' : '#fff3cd'};
            border-left: 4px solid ${alertData.severity === 'critical' ? '#dc3545' : '#ffc107'};
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: 4px;
            font-size: 0.9rem;
        `;
        const time = new Date(alertData.timestamp || Date.now()).toLocaleTimeString();
        item.innerHTML = `<strong>${time}</strong> - ${alertData.message}`;
        container.prepend(item);
        while (container.children.length > 20) {
            container.removeChild(container.lastChild);
        }
        const badge = document.querySelector('.admin-alerts .badge-count');
        if (badge) badge.textContent = container.children.length;
    }

    function generateMockAlert() {
        const messages = [
            '🚨 Chuyến #12345 có dấu hiệu ảo hóa km (tốc độ trung bình 5km/h, quãng đường 10km)',
            '⚠️ Tài xế Nguyễn Văn A hủy 3 chuyến liên tiếp trong 1 giờ',
            '📊 Khu vực Quận 1 đang thiếu 3 xe – gợi ý kích hoạt surge pricing',
            '🔔 Tài xế Trần Thị B có 2 khiếu nại về thái độ trong ngày',
            '📈 Doanh thu hôm nay thấp hơn 20% so với cùng kỳ tuần trước'
        ];
        const severities = ['warning', 'critical', 'info', 'warning', 'critical'];
        const idx = Math.floor(Math.random() * messages.length);
        return {
            message: messages[idx],
            severity: severities[idx] || 'warning',
            timestamp: Date.now()
        };
    }

    // ======================== PUBLIC API ========================
    const publicAPI = {
        init: function() {
            log('Khởi tạo AI Copilot v4.2...');
            const mode = detectMode();
            if (!mode) {
                log('Không xác định được chế độ, thoát.', 'warn');
                return;
            }
            if (mode === 'driving') startDrivingMode();
            else if (mode === 'monitoring') startMonitoringMode();
        },
        enable: function() { _enabled = true; log('Đã bật'); },
        disable: function() { _enabled = false; log('Đã tắt'); },
        /** Bật lại toast hướng dẫn chuyến nếu cần */
        setTripGuideToasts: function(on) {
            CONFIG.SHOW_TRIP_GUIDE_TOASTS = !!on;
            log('SHOW_TRIP_GUIDE_TOASTS = ' + CONFIG.SHOW_TRIP_GUIDE_TOASTS);
        },
        getMode: function() { return _mode; },
        destroy: function() {
            log('Hủy AI Copilot');
            if (_gpsUnsubscribe) {
                _gpsUnsubscribe();
                _gpsUnsubscribe = null;
            }
            const db = getFirebase();
            if (db) {
                try { db.ref(CONFIG.FIREBASE_ALERTS_PATH).off(); } catch (_) {}
            }
            _listeners.forEach(l => {
                if (l.type === 'interval') clearInterval(l.ref);
            });
            _listeners = [];
            _mode = null;
            _enabled = false;
            const container = document.querySelector('.ai-copilot-alerts');
            if (container) container.remove();
        }
    };

    window.aiCopilotV4 = publicAPI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.aiCopilotV4.init());
    } else {
        window.aiCopilotV4.init();
    }

})(window, document);