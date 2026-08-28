// Extracted from index.html; load order is intentionally preserved.
    // ============================================================
    // TAXI PROMAX - FULL VERSION v6.0
    // ============================================================

    const FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";
    if (!firebase.apps.length) firebase.initializeApp({ 
        databaseURL: FIREBASE_URL,
        storageBucket: "taxipromax-new.appspot.com"
    });
    const db = firebase.database();
    const storage = firebase.storage();
    let messaging = null;
    let fcmToken = null;

// ==================== BIẾN TOÀN CỤC ====================
let map, driverMarker, customerMarker, routeLayer;
let currentLat = null, currentLng = null;
let currentHeading = 0;
let isRunning = false;
let hasPickedUp = false;
let totalKm = 0;
let lastValidPos = null;
let lastValidTime = 0;
let currentRate = 15000;
let currentOrderId = null;
let currentCustomerData = null;
let orderListener = null;
let chatListener = null;
let cancelListener = null;
let wakeLock = null;
let countdownInterval = null;
let _isModalOpening = false;
let _processedOrders = new Set();
let isStreetHail = false;
let lastDisplayedFare = 0;
let isGapMode = false;
let streetHailTimerInterval = null;
let backgroundGeolocation = null;
let isBackgroundTracking = false;
let locationHistory = [];
let isDriverOnline = true;
let locationPushInterval = null;
let aiDispatchInterval = null;
let soundEnabled = true;
let ratingListener = null;
let _cancelListener = null;

let lastSpeeds = [];
let fraudAlertShown = false;
let isLocked = false;
let isDarkMode = localStorage.getItem('promax_dark') === 'true';

let driverInfo = {
    uid: null, name: '', phone: '', plate: '', carModel: '', fuelType: 'xang', carClass: '4_seats'
};

// ==================== DANH SÁCH 63 TỈNH THÀNH VIỆT NAM ====================
const VIETNAM_PROVINCES = [
    // Thành phố trực thuộc Trung ương
    { id: 'hanoi', name: 'Hà Nội', lat: 21.0285, lng: 105.8542, region: 'Đồng bằng sông Hồng' },
    { id: 'hochiminh', name: 'TP. Hồ Chí Minh', lat: 10.8231, lng: 106.6297, region: 'Đông Nam Bộ' },
    { id: 'danang', name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'haiphong', name: 'Hải Phòng', lat: 20.8449, lng: 106.6881, region: 'Đồng bằng sông Hồng' },
    { id: 'cantho', name: 'Cần Thơ', lat: 10.0452, lng: 105.7469, region: 'Đồng bằng sông Cửu Long' },
    { id: 'hue', name: 'Huế', lat: 16.4637, lng: 107.5909, region: 'Bắc Trung Bộ' },
    
    // Đồng bằng sông Hồng
    { id: 'vinhphuc', name: 'Vĩnh Phúc', lat: 21.3609, lng: 105.5474, region: 'Đồng bằng sông Hồng' },
    { id: 'bacninh', name: 'Bắc Ninh', lat: 21.1861, lng: 106.0763, region: 'Đồng bằng sông Hồng' },
    { id: 'quangninh', name: 'Quảng Ninh', lat: 20.9500, lng: 107.0833, region: 'Đồng bằng sông Hồng' },
    { id: 'hungyen', name: 'Hưng Yên', lat: 20.6464, lng: 106.0511, region: 'Đồng bằng sông Hồng' },
    { id: 'haiduong', name: 'Hải Dương', lat: 20.9410, lng: 106.3248, region: 'Đồng bằng sông Hồng' },
    { id: 'thaibinh', name: 'Thái Bình', lat: 20.4461, lng: 106.3369, region: 'Đồng bằng sông Hồng' },
    { id: 'namdinh', name: 'Nam Định', lat: 20.4388, lng: 106.1621, region: 'Đồng bằng sông Hồng' },
    { id: 'hanam', name: 'Hà Nam', lat: 20.5833, lng: 105.9167, region: 'Đồng bằng sông Hồng' },
    { id: 'ninhbinh', name: 'Ninh Bình', lat: 20.2500, lng: 105.9667, region: 'Đồng bằng sông Hồng' },
    
    // Trung du và miền núi phía Bắc
    { id: 'haugiang', name: 'Hà Giang', lat: 22.7667, lng: 104.9833, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'caobang', name: 'Cao Bằng', lat: 22.6667, lng: 106.2500, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'laocai', name: 'Lào Cai', lat: 22.4833, lng: 103.9667, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'baccan', name: 'Bắc Kạn', lat: 22.1333, lng: 105.8333, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'langson', name: 'Lạng Sơn', lat: 21.8333, lng: 106.7333, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'tuyenquang', name: 'Tuyên Quang', lat: 21.8167, lng: 105.2167, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'yenbai', name: 'Yên Bái', lat: 21.7000, lng: 104.8667, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'thainguyen', name: 'Thái Nguyên', lat: 21.5667, lng: 105.8167, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'phutho', name: 'Phú Thọ', lat: 21.4167, lng: 105.2000, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'bacquang', name: 'Bắc Giang', lat: 21.2667, lng: 106.2000, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'sonla', name: 'Sơn La', lat: 21.3167, lng: 103.9000, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'dienbien', name: 'Điện Biên', lat: 21.3833, lng: 103.0167, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'hoabinh', name: 'Hòa Bình', lat: 20.8333, lng: 105.3333, region: 'Trung du miền núi Bắc Bộ' },
    { id: 'laichau', name: 'Lai Châu', lat: 22.0667, lng: 103.1500, region: 'Trung du miền núi Bắc Bộ' },
    
    // Bắc Trung Bộ
    { id: 'thanhhoa', name: 'Thanh Hóa', lat: 19.8000, lng: 105.7667, region: 'Bắc Trung Bộ' },
    { id: 'nghean', name: 'Nghệ An', lat: 18.6667, lng: 105.6667, region: 'Bắc Trung Bộ' },
    { id: 'hatinh', name: 'Hà Tĩnh', lat: 18.3333, lng: 105.9000, region: 'Bắc Trung Bộ' },
    { id: 'quangbinh', name: 'Quảng Bình', lat: 17.4667, lng: 106.6000, region: 'Bắc Trung Bộ' },
    { id: 'quangtri', name: 'Quảng Trị', lat: 16.7500, lng: 107.1833, region: 'Bắc Trung Bộ' },
    { id: 'thuathienhue', name: 'Thừa Thiên Huế', lat: 16.4637, lng: 107.5909, region: 'Bắc Trung Bộ' },
    
    // Duyên hải Nam Trung Bộ
    { id: 'quangnam', name: 'Quảng Nam', lat: 15.5667, lng: 108.5000, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'quangngai', name: 'Quảng Ngãi', lat: 15.1167, lng: 108.8000, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'binhdinh', name: 'Bình Định', lat: 13.7667, lng: 109.2333, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'phuyen', name: 'Phú Yên', lat: 13.0833, lng: 109.3000, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'khanhhoa', name: 'Khánh Hòa', lat: 12.2500, lng: 109.1833, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'ninhthuan', name: 'Ninh Thuận', lat: 11.5667, lng: 108.9833, region: 'Duyên hải Nam Trung Bộ' },
    { id: 'binhthuan', name: 'Bình Thuận', lat: 11.0833, lng: 108.0833, region: 'Duyên hải Nam Trung Bộ' },
    
    // Tây Nguyên
    { id: 'kontum', name: 'Kon Tum', lat: 14.3500, lng: 108.0000, region: 'Tây Nguyên' },
    { id: 'gialai', name: 'Gia Lai', lat: 13.7500, lng: 108.2500, region: 'Tây Nguyên' },
    { id: 'daklak', name: 'Đắk Lắk', lat: 12.6667, lng: 108.0500, region: 'Tây Nguyên' },
    { id: 'daknong', name: 'Đắk Nông', lat: 12.0000, lng: 107.6667, region: 'Tây Nguyên' },
    { id: 'lamdong', name: 'Lâm Đồng', lat: 11.5500, lng: 108.1500, region: 'Tây Nguyên' },
    
    // Đông Nam Bộ
    { id: 'binhphuoc', name: 'Bình Phước', lat: 11.7500, lng: 106.9167, region: 'Đông Nam Bộ' },
    { id: 'tayninh', name: 'Tây Ninh', lat: 11.3000, lng: 106.1000, region: 'Đông Nam Bộ' },
    { id: 'binhduong', name: 'Bình Dương', lat: 11.0000, lng: 106.6667, region: 'Đông Nam Bộ' },
    { id: 'dongnai', name: 'Đồng Nai', lat: 11.0000, lng: 107.1667, region: 'Đông Nam Bộ' },
    { id: 'baria', name: 'Bà Rịa - Vũng Tàu', lat: 10.5000, lng: 107.1667, region: 'Đông Nam Bộ' },
    
    // Đồng bằng sông Cửu Long
    { id: 'longan', name: 'Long An', lat: 10.5333, lng: 106.4167, region: 'Đồng bằng sông Cửu Long' },
    { id: 'tiengiang', name: 'Tiền Giang', lat: 10.3667, lng: 106.3500, region: 'Đồng bằng sông Cửu Long' },
    { id: 'bentre', name: 'Bến Tre', lat: 10.2333, lng: 106.3833, region: 'Đồng bằng sông Cửu Long' },
    { id: 'vinhlong', name: 'Vĩnh Long', lat: 10.2500, lng: 105.9667, region: 'Đồng bằng sông Cửu Long' },
    { id: 'travinh', name: 'Trà Vinh', lat: 9.9333, lng: 106.3333, region: 'Đồng bằng sông Cửu Long' },
    { id: 'haujiang', name: 'Hậu Giang', lat: 9.7833, lng: 105.4667, region: 'Đồng bằng sông Cửu Long' },
    { id: 'soctrang', name: 'Sóc Trăng', lat: 9.6000, lng: 105.9667, region: 'Đồng bằng sông Cửu Long' },
    { id: 'baclieu', name: 'Bạc Liêu', lat: 9.2833, lng: 105.7333, region: 'Đồng bằng sông Cửu Long' },
    { id: 'camau', name: 'Cà Mau', lat: 9.1833, lng: 105.1500, region: 'Đồng bằng sông Cửu Long' },
    { id: 'dongthap', name: 'Đồng Tháp', lat: 10.4667, lng: 105.6333, region: 'Đồng bằng sông Cửu Long' },
    { id: 'angiang', name: 'An Giang', lat: 10.3833, lng: 105.4167, region: 'Đồng bằng sông Cửu Long' },
    { id: 'kiengiang', name: 'Kiên Giang', lat: 10.0167, lng: 105.0833, region: 'Đồng bằng sông Cửu Long' }
];

// ==================== THỜI TIẾT REAL-TIME ====================
let currentWeather = null;
let currentProvince = null;
let weatherUpdateInterval = null;

// Hàm tìm tỉnh gần nhất dựa trên tọa độ
function findNearestProvince(lat, lng) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const province of VIETNAM_PROVINCES) {
        const dist = haversineDistance(lat, lng, province.lat, province.lng);
        if (dist < minDist) {
            minDist = dist;
            nearest = province;
        }
    }
    
    return nearest;
}

// Hàm lấy thời tiết từ OpenWeather
async function fetchWeather(lat, lng) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=b1b15e88fa797225412429c1c50c122a&units=metric&lang=vi`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod === 200) {
            currentWeather = {
                temp: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                wind_speed: data.wind.speed,
                city: data.name,
                updatedAt: Date.now()
            };
            
            // Cập nhật UI
            updateWeatherUI();
            return currentWeather;
        }
    } catch (error) {
        console.warn('[Weather] Lỗi lấy thời tiết:', error);
        return null;
    }
}

// Cập nhật UI hiển thị thời tiết
function updateWeatherUI() {
    if (!currentWeather) return;
    
    // Tìm hoặc tạo element hiển thị thời tiết
    let weatherEl = document.getElementById('weatherDisplay');
    if (!weatherEl) {
        weatherEl = document.createElement('div');
        weatherEl.id = 'weatherDisplay';
        weatherEl.style.cssText = 'position:fixed;top:55px;right:10px;z-index:1002;background:rgba(255,255,255,0.95);border-radius:12px;padding:6px 12px;font-size:10px;font-weight:800;box-shadow:0 2px 10px rgba(0,0,0,0.1);display:flex;align-items:center;gap:6px;backdrop-filter:blur(4px);';
        document.body.appendChild(weatherEl);
    }
    
    const iconMap = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '⛅',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌦️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
    };
    
    const icon = iconMap[currentWeather.icon] || '🌡️';
    const temp = currentWeather.temp;
    const desc = currentWeather.description;
    const province = currentProvince ? currentProvince.name : 'Đang xác định';
    
    weatherEl.innerHTML = `
        <span>📍 ${province}</span>
        <span>${icon} ${temp}°C</span>
        <span style="font-weight:400;color:#64748b;">${desc}</span>
    `;
}

// Hàm cập nhật vị trí và thời tiết tự động
async function updateLocationAndWeather(lat, lng) {
    if (!lat || !lng) return;
    
    // Tìm tỉnh hiện tại
    const province = findNearestProvince(lat, lng);
    if (province) {
        currentProvince = province;
        
        // Cập nhật biến toàn cục
        if (typeof driverInfo !== 'undefined') {
            driverInfo.currentProvince = province.name;
            driverInfo.currentRegion = province.region;
        }
        
        // Log
        console.log(`📍 [Location] Bạn đang ở: ${province.name} (${province.region})`);
        
        // Lấy thời tiết
        await fetchWeather(lat, lng);
        
        // Thông báo nếu thay đổi tỉnh
        const lastProvince = localStorage.getItem('last_province');
        if (lastProvince && lastProvince !== province.name) {
            showToast(`📍 Bạn đã vào ${province.name} - ${province.region}`);
            speak(`Bạn đã vào địa phận ${province.name}`);
        }
        localStorage.setItem('last_province', province.name);
    }
}

// Khởi tạo theo dõi vị trí và thời tiết
function initWeatherTracking() {
    // Lấy vị trí hiện tại
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                await updateLocationAndWeather(lat, lng);
            },
            (err) => {
                console.warn('[Weather] Không lấy được vị trí:', err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
    
    // Cập nhật thời tiết mỗi 10 phút
    if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
    weatherUpdateInterval = setInterval(async () => {
        if (currentLat && currentLng) {
            await updateLocationAndWeather(currentLat, currentLng);
        }
    }, 600000); // 10 phút
    
    // Cập nhật khi GPS thay đổi
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (currentLat !== lat || currentLng !== lng) {
                    currentLat = lat;
                    currentLng = lng;
                    await updateLocationAndWeather(lat, lng);
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }
}

// Thêm hàm getWeather để các module khác gọi
function getWeather() {
    return currentWeather;
}

function getCurrentProvince() {
    return currentProvince;
}

// ==================== CÁC HẰNG SỐ KHÁC ====================
const HOTSPOTS = [
    { name: "Sân bay Quốc tế Vân Đồn", lat: 21.1179, lng: 107.4143, intensity: 0.9, timeSlots: [5,6,7,8,17,18,19,20] },
    { name: "Bến xe Bãi Cháy", lat: 20.9675, lng: 107.0500, intensity: 0.8, timeSlots: [7,8,9,16,17,18] },
    { name: "Khu du lịch Tuần Châu", lat: 20.9300, lng: 107.0667, intensity: 0.7, timeSlots: [9,10,11,14,15,16,17] },
    { name: "Chợ Đêm Cái Rồng", lat: 20.9800, lng: 107.0900, intensity: 0.85, timeSlots: [18,19,20,21,22] },
    { name: "Trung tâm TP Hạ Long", lat: 20.9511, lng: 107.0800, intensity: 0.95, timeSlots: [8,9,10,11,17,18,19,20] }
];

const GAP_THRESHOLD = 15000;
const ACCURACY_STRICT = 80;
const ACCURACY_NORMAL = 150;
const ACCURACY_MAX = 300;
const MIN_DISTANCE_DELTA = 0.008;
const MAX_HISTORY_SIZE = 500;
let gpsWatchId = null;
let gpsFirstFixTime = null;
let gpsRetryCount = 0;
let lastAccuracy = 999;
let hasCenteredMap = false;

    // ==================== HÀM HASH MẬT KHẨU ====================
    function hashPassword(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return 'h' + Math.abs(h).toString(36) + '_' + str.length;
    }

    // ==================== HÀM TIỆN ÍCH ====================
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function encryptData(data, key) {
        try {
            return CryptoJS.AES.encrypt(JSON.stringify(data), key || driverInfo.uid || 'default_key').toString();
        } catch(e) { return data; }
    }

    function decryptData(encrypted, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, key || driverInfo.uid || 'default_key');
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch(e) { return null; }
    }

    // ==================== DARK MODE ====================
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('promax_dark', isDarkMode ? 'true' : 'false');
        document.body.classList.toggle('dark-mode', isDarkMode);
        const btn = document.querySelector('.dark-toggle-btn');
        if (btn) btn.textContent = isDarkMode ? '☀️' : '🌙';
        showToast(isDarkMode ? '🌙 Đã chuyển sang chế độ tối' : '☀️ Đã chuyển sang chế độ sáng');
    }

    // ==================== GPS ====================
    async function requestRoadDistance(p1, p2) {
        const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                return data.routes[0].distance / 1000;
            }
        } catch (error) {
            console.warn('[OSRM] Lỗi, fallback Haversine:', error);
        }
        return haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    }

    function saveLocationToHistory(lat, lng, accuracy, timestamp) {
        try {
            locationHistory.push({ lat, lng, accuracy, timestamp });
            if (locationHistory.length > MAX_HISTORY_SIZE) locationHistory.shift();
            localStorage.setItem('location_history', JSON.stringify(locationHistory));
        } catch(e) { console.warn('Save location error:', e); }
    }
    
    function loadLocationHistory() {
        try {
            const saved = localStorage.getItem('location_history');
            if (saved) locationHistory = JSON.parse(saved);
        } catch(e) {}
    }

    async function enableKeepAwake() {
        try {
            if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
                const { KeepAwake } = Capacitor.Plugins;
                if (KeepAwake) {
                    await KeepAwake.keepAwake();
                }
            }
        } catch(e) { console.warn('KeepAwake error:', e); }
    }
    
    async function disableKeepAwake() {
        try {
            if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
                const { KeepAwake } = Capacitor.Plugins;
                if (KeepAwake) {
                    await KeepAwake.allowSleep();
                }
            }
        } catch(e) {}
    }

    function startLocationPushing() {
        if (locationPushInterval) clearInterval(locationPushInterval);
        locationPushInterval = setInterval(() => {
            if (isDriverOnline && currentLat && currentLng && driverInfo.uid) {
                try {
                    db.ref(`driver_locations/${driverInfo.uid}`).set({
                        lat: currentLat,
                        lng: currentLng,
                        heading: currentHeading,
                        timestamp: Date.now(),
                        status: isRunning ? 'busy' : 'ready'
                    }).catch(() => {});
                } catch(e) {}
            }
        }, 5000);
    }
    
    function stopLocationPushing() {
        if (locationPushInterval) {
            clearInterval(locationPushInterval);
            locationPushInterval = null;
        }
    }

    // ==================== AI DISPATCH ====================
    async function checkNearbyOrders() {
        if (!isDriverOnline || isRunning || isLocked || _isModalOpening) return;
        if (!currentLat || !currentLng) return;
        
        try {
            const snapshot = await db.ref('datxe').orderByChild('status').equalTo('waiting').limitToFirst(20).once('value');
            const orders = snapshot.val();
            if (!orders) return;
            
            let nearestOrder = null;
            let nearestDistance = 3;
            
            for (const [orderId, order] of Object.entries(orders)) {
                if (!order.pickupLat || !order.pickupLng) continue;
                if (_processedOrders.has(orderId)) continue;
                if (order.carType !== driverInfo.carClass && order.carType !== 'both') continue;
                
                const distance = haversineDistance(currentLat, currentLng, order.pickupLat, order.pickupLng);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestOrder = { id: orderId, ...order, distance };
                }
            }
            
            if (nearestOrder && nearestDistance < 3) {
                showToast(`🎯 AI gợi ý: Có đơn cách ${nearestDistance.toFixed(1)}km, hãy bật Online để nhận!`);
                if (soundEnabled) speak(`Có đơn gần bạn, chỉ ${nearestDistance.toFixed(1)} kilômét`);
            }
        } catch(e) {
            console.warn('[AI DISPATCH] Lỗi:', e);
        }
    }
    
    function startAIDispatch() {
        if (aiDispatchInterval) clearInterval(aiDispatchInterval);
        aiDispatchInterval = setInterval(() => {
            checkNearbyOrders();
        }, 30000);
    }
    
    function stopAIDispatch() {
        if (aiDispatchInterval) {
            clearInterval(aiDispatchInterval);
            aiDispatchInterval = null;
        }
    }

    function toggleOnlineStatus() {
        isDriverOnline = !isDriverOnline;
        const toggle = document.getElementById('onlineToggleSwitch');
        const text = document.getElementById('onlineTextStatus');
        
        if (isDriverOnline) {
            toggle.classList.add('active');
            text.innerText = 'Online';
            startOrderListener();
            startLocationPushing();
            startAIDispatch();
            showToast('✅ Đã chuyển sang trạng thái Online - Sẵn sàng nhận đơn');
            if (soundEnabled) speak("Bạn đã online, sẵn sàng nhận đơn");
        } else {
            toggle.classList.remove('active');
            text.innerText = 'Offline';
            if (orderListener) { orderListener.off(); orderListener = null; }
            stopLocationPushing();
            stopAIDispatch();
            showToast('⏸ Đã chuyển sang trạng thái Offline');
            if (soundEnabled) speak("Bạn đã offline, tạm dừng nhận đơn");
        }
        
        if (driverInfo.uid) {
            db.ref(`tai_xe_online/${driverInfo.uid}/online`).set(isDriverOnline).catch(()=>{});
        }
    }

    // ==================== UPLOAD GIẤY TỜ ====================
    async function openVerificationUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            const container = document.getElementById('uploadProgressContainer');
            const bar = document.getElementById('uploadProgressBar');
            const docContainer = document.getElementById('uploadedDocuments');
            
            container.style.display = 'block';
            bar.style.width = '0%';
            
            let uploaded = 0;
            const docList = [];
            
            for (const file of files) {
                try {
                    const path = `verification/${driverInfo.uid}/${Date.now()}_${file.name}`;
                    const uploadTask = storage.ref().child(path).put(file);
                    
                    await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                bar.style.width = Math.min(100, progress + (uploaded / files.length * 100)) + '%';
                            },
                            reject,
                            resolve
                        );
                    });
                    
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    await db.ref(`drivers/${driverInfo.uid}/documents`).push({
                        url: downloadURL,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        uploadedAt: Date.now()
                    });
                    
                    uploaded++;
                    docList.push(`📄 ${file.name}`);
                    bar.style.width = (uploaded / files.length * 100) + '%';
                    
                } catch(error) {
                    console.error('Upload error:', error);
                    showToast('⚠️ Lỗi upload: ' + error.message);
                }
            }
            
            container.style.display = 'none';
            
            if (uploaded > 0) {
                docContainer.innerHTML = docList.map(d => `<div style="padding: 2px 0;">✅ ${d}</div>`).join('');
                showToast(`✅ Đã upload ${uploaded} tài liệu thành công!`);
                updateVerificationStatus();
                speak('Đã tải lên giấy tờ thành công');
            }
        };
        input.click();
    }

    async function updateVerificationStatus() {
        try {
            const snap = await db.ref(`drivers/${driverInfo.uid}/documents`).once('value');
            const docs = snap.val();
            const badge = document.getElementById('verifyBadge');
            if (docs && Object.keys(docs).length > 0) {
                badge.innerHTML = '<i class="fas fa-check-circle" style="color: #2e7d32;"></i> Đã xác thực';
                badge.style.background = '#e8f5e9';
                badge.style.color = '#2e7d32';
            }
        } catch(e) {}
    }

    // ==================== PUSH NOTIFICATION ====================
    async function initPushNotifications() {
        try {
            if (!firebase.messaging) {
                console.warn('Firebase Messaging không khả dụng');
                return;
            }
            
            messaging = firebase.messaging();
            
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Push notification bị từ chối');
                return;
            }
            
            try {
                fcmToken = await messaging.getToken({
                    vapidKey: 'BAA3S8g0HhHj2rCq8j4KpQ1lX6yM5nV7wP9rT2uE3fG4hJ5kL6mN7oP8qR9sT0uV'
                });
                
                if (fcmToken && driverInfo.uid) {
                    await db.ref(`drivers/${driverInfo.uid}/fcmTokens`).push(fcmToken);
                    console.log('FCM token đã đăng ký');
                }
            } catch(e) {
                console.warn('Không lấy được FCM token:', e);
            }
            
            messaging.onMessage((payload) => {
                const title = payload.notification?.title || '📨 Thông báo';
                const body = payload.notification?.body || '';
                showToast(`📨 ${title}: ${body}`);
                
                if (payload.data?.type === 'new_order') {
                    setTimeout(checkNearbyOrders, 1000);
                }
                
                if (payload.data?.type === 'trip_cancelled') {
                    showCancelBanner();
                }
            });
            
        } catch(e) {
            console.warn('Push notification không khởi tạo được:', e);
        }
    }

    // ==================== GPS FUNCTIONS ====================
    function updateGpsStatusUI(accuracy, isError, errorMsg) {
        const dot = document.getElementById('gpsDot');
        const text = document.getElementById('gpsStatusText');
        if (!dot || !text) return;

        if (isError) {
            dot.className = 'gps-dot bad';
            text.innerText = errorMsg || 'GPS: Lỗi';
            return;
        }

        lastAccuracy = accuracy;
        const acc = Math.round(accuracy);
        if (accuracy <= 20) {
            dot.className = 'gps-dot good' + (isBackgroundTracking ? ' bg' : '');
            text.innerText = `GPS: Tốt (±${acc}m)`;
        } else if (accuracy <= 50) {
            dot.className = 'gps-dot weak' + (isBackgroundTracking ? ' bg' : '');
            text.innerText = `GPS: TB (±${acc}m)`;
        } else if (accuracy <= ACCURACY_MAX) {
            dot.className = 'gps-dot weak';
            text.innerText = `GPS: Yếu (±${acc}m)`;
        } else {
            // Vẫn hiển thị vị trí gần đúng trên map, nhưng không dùng để tính cước.
            dot.className = 'gps-dot bad';
            text.innerText = `GPS: Gần đúng (±${acc}m) — bật Vị trí chính xác`;
        }

        const profileAcc = document.getElementById('profileAccuracy');
        if (profileAcc) profileAcc.innerText = `±${acc}m`;
    }

    function processBackgroundLocation(location) {
        const latitude = location.latitude ?? location.coords?.latitude;
        const longitude = location.longitude ?? location.coords?.longitude;
        let accuracy = location.accuracy ?? location.coords?.accuracy ?? 999;
        const heading = location.heading ?? location.coords?.heading;
        const speed = location.speed ?? location.coords?.speed;
        const currentTime = location.timestamp || Date.now();

        if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;

        const threshold = getAccuracyThreshold();
        const isGoodEnoughForFare = accuracy <= threshold || accuracy <= ACCURACY_NORMAL;

        if (!gpsFirstFixTime) gpsFirstFixTime = Date.now();
        gpsRetryCount = 0;

        currentLat = latitude;
        currentLng = longitude;
        if (heading != null && !isNaN(heading) && heading >= 0) {
            currentHeading = Math.round(heading);
        }

        saveLocationToHistory(latitude, longitude, accuracy, currentTime);
        updateGpsStatusUI(accuracy, false);
        updateDriverMarker(latitude, longitude, true);

        // Fix trên 300m chỉ dùng để đặt marker/đồng bộ vị trí gần đúng.
        // Không tạo mốc kilomet từ một điểm GPS quá rộng.
        if (accuracy > ACCURACY_MAX) {
            syncDriverLocation();
            return;
        }

        const fareActive = !window.tripEngine || typeof window.tripEngine.isFareActive !== 'function' || window.tripEngine.isFareActive();
        if (isRunning && fareActive && isGoodEnoughForFare && lastValidPos) {
            const timeDiff = currentTime - lastValidTime;

            if (timeDiff > GAP_THRESHOLD) {
                showGapNotice();
                isGapMode = true;
                requestRoadDistance(lastValidPos, { lat: latitude, lng: longitude }).then(roadKm => {
                    if (roadKm > 0 && roadKm < 5) {
                        totalKm += roadKm;
                        updateAllDisplays(totalKm, Math.round(totalKm * currentRate));
                    }
                });
                setTimeout(() => { isGapMode = false; }, 5000);
            } else {
                const dist = haversineDistance(lastValidPos.lat, lastValidPos.lng, latitude, longitude);
                if (dist > MIN_DISTANCE_DELTA && dist < 0.5) {
                    totalKm += dist;
                    updateAllDisplays(totalKm, Math.round(totalKm * currentRate));
                }
            }
        }

        if (isGoodEnoughForFare || !lastValidPos) {
            lastValidPos = { lat: latitude, lng: longitude };
            lastValidTime = currentTime;
        }
        syncDriverLocation();
    }

    function getAccuracyThreshold() {
        if (!gpsFirstFixTime) return ACCURACY_STRICT;
        const elapsed = Date.now() - gpsFirstFixTime;
        if (elapsed < 15000) return ACCURACY_STRICT;
        return ACCURACY_NORMAL;
    }

    function updateDriverMarker(lat, lng, forceCenter) {
        if (!map) return;
        if (!driverMarker) {
            const icon = L.divIcon({
                html: `<div class="sm-marker-container"><div class="sm-pulse-ring"></div><div id="compass" class="sm-direction-wrapper" style="transform:rotate(${currentHeading}deg)"><div class="sm-marker-arrow"></div><div class="sm-marker-circle"></div></div></div>`,
                className: '', iconSize: [48,48], iconAnchor: [24,24]
            });
            driverMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
            map.setView([lat, lng], 17);
            hasCenteredMap = true;
            window.__lastMapFollowAt = Date.now();
        } else {
            driverMarker.setLatLng([lat, lng]);
            const compass = document.getElementById('compass');
            if (compass) compass.style.transform = `rotate(${currentHeading}deg)`;
            // Luôn theo xe (idle + đang chạy), throttle 800ms để mượt
            const now = Date.now();
            const last = window.__lastMapFollowAt || 0;
            const shouldFollow = forceCenter || !hasCenteredMap || isRunning || (now - last > 800);
            if (shouldFollow) {
                try {
                    map.panTo([lat, lng], { animate: true, duration: 0.6 });
                    window.__lastMapFollowAt = now;
                    hasCenteredMap = true;
                } catch (e) {}
            }
        }
    }

    function updateAllDisplays(km, fare) {
        const kmEl = document.getElementById('km');
        const costEl = document.getElementById('cost');
        if (kmEl) kmEl.innerText = km.toFixed(2);
        if (costEl) costEl.innerText = fare.toLocaleString();
        
        const tripKmLive = document.getElementById('tripKmLive');
        const tripPrice = document.getElementById('tripPrice');
        if (tripKmLive) tripKmLive.innerText = km.toFixed(2) + ' KM';
        if (tripPrice) tripPrice.innerHTML = fare.toLocaleString() + 'đ';
        
        const meterFare = document.getElementById('meterFare');
        const meterDistance = document.getElementById('meterDistance');
        if (meterFare && document.getElementById('streetHailMeter').classList.contains('show')) {
            meterFare.innerText = fare.toLocaleString() + 'đ';
            if (meterDistance) meterDistance.innerText = km.toFixed(2) + ' km';
        }
        
        if (fare !== lastDisplayedFare) {
            lastDisplayedFare = fare;
            if (costEl) costEl.classList.add('scale');
            if (tripPrice) tripPrice.classList.add('scale');
            setTimeout(() => {
                if (costEl) costEl.classList.remove('scale');
                if (tripPrice) tripPrice.classList.remove('scale');
            }, 200);
            playTickSound();
        }
    }

    function playTickSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.08;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch(e) {}
    }

    function showGapNotice() {
        const notice = document.getElementById('gapNotice');
        if (notice) {
            notice.classList.add('show');
            setTimeout(() => notice.classList.remove('show'), 3000);
        }
    }

    function startGPS() {
        window.__promaxCoreGpsOwner = true;
        if (!('geolocation' in navigator)) {
            updateGpsStatusUI(0, true, 'GPS: Không hỗ trợ');
            showToast('⚠️ Thiết bị không hỗ trợ GPS');
            return;
        }

        if (gpsWatchId != null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }

        updateGpsStatusUI(0, true, 'GPS: Đang xin quyền...');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                processBackgroundLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );

        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                processBackgroundLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                });
            },
            (err) => {
                console.error('[GPS] error:', err.code, err.message);
                gpsRetryCount++;
                let msg = 'GPS: Lỗi';
                if (err.code === 1) {
                    msg = 'GPS: Bị từ chối quyền';
                    showToast('⚠️ Hãy bật Quyền Vị trí trong Cài đặt điện thoại');
                    updateGpsStatusUI(0, true, msg);
                    return;
                } else if (err.code === 2) {
                    msg = 'GPS: Không có tín hiệu';
                } else if (err.code === 3) {
                    msg = 'GPS: Timeout – đang thử lại';
                }
                updateGpsStatusUI(0, true, msg);

                if (gpsRetryCount <= 5) {
                    setTimeout(() => {
                        if (!lastValidPos) startGPS();
                    }, 4000);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    }

    function stopGPS() {
        if (gpsWatchId != null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
    }

    function forceRefreshGPS() {
        showToast('📡 Đang làm mới GPS...');
        gpsFirstFixTime = null;
        hasCenteredMap = false;
        gpsRetryCount = 0;
        startGPS();
        if (currentLat && currentLng && map) {
            map.flyTo([currentLat, currentLng], 17, { duration: 1 });
            hasCenteredMap = true;
        }
    }

    // ==================== SIDEBAR ====================
    function openSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar) {
            overlay.style.display = 'block';
            sidebar.classList.add('open');
        }
    }
    
    function closeSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar) {
            overlay.style.display = 'none';
            sidebar.classList.remove('open');
        }
    }

    function showConfirmDialog(message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) return;
        document.getElementById('confirmMessage').innerText = message;
        const confirmBtn = document.getElementById('confirmOkBtn');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.onclick = () => { dialog.style.display = 'none'; onConfirm(); };
        document.querySelector('.btn-cancel').onclick = () => { dialog.style.display = 'none'; };
        dialog.style.display = 'flex';
    }
    
    function closeConfirmDialog() { 
        const dialog = document.getElementById('confirmDialog');
        if (dialog) dialog.style.display = 'none'; 
    }
    
    function showConfirmComplete() {
        showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', () => completeTrip());
    }

    // === Ẩn/hiện bottom nav khi đang vận hành chuyến ===
    function setNavVisible(visible) {
        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = visible ? 'flex' : 'none';
        // Brand luôn hiện khi idle; chỉ ẩn khi đang chạy chuyến
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.setProperty('display', visible ? 'block' : 'none', 'important');
    }
    function hideTabsDuringTrip() {
        setNavVisible(false);
    }
    function showTabsAfterTrip() {
        setNavVisible(true);
    }

    // ==================== AUTH ====================
    function persistDriverSession(session) {
        const safe = { ...(session || {}) };
        delete safe.passwordHash;
        delete safe.documents;
        delete safe.wallet;
        localStorage.setItem('driverInfo', JSON.stringify(safe));
    }

    async function doRegister() {
        const fullname = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const cccd = document.getElementById('regCccd').value.trim();
        const plate = document.getElementById('regPlate').value.trim();
        const carModel = document.getElementById('regCarModel').value.trim();
        const fuelType = document.querySelector('input[name="fuelType"]:checked')?.value || 'xang';
        const carClass = document.querySelector('input[name="carClass"]:checked')?.value || '4_seats';
        const btn = document.getElementById('btnRegister');
        const btnText = document.getElementById('btnRegText');
        const errorEl = document.getElementById('regError');

        errorEl.style.display = 'none';
        if (!fullname || fullname.length < 2) { errorEl.textContent = '⚠️ Vui lòng nhập họ tên'; errorEl.style.display = 'block'; return; }
        if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
        if (!password || password.length < 6) { errorEl.textContent = '⚠️ Mật khẩu phải có ít nhất 6 ký tự'; errorEl.style.display = 'block'; return; }
        if (!/^[0-9]{9,12}$/.test(cccd)) { errorEl.textContent = '⚠️ CCCD/CMND phải 9-12 số'; errorEl.style.display = 'block'; return; }
        if (!plate) { errorEl.textContent = '⚠️ Vui lòng nhập biển số xe'; errorEl.style.display = 'block'; return; }
        if (!carModel) { errorEl.textContent = '⚠️ Vui lòng nhập dòng xe'; errorEl.style.display = 'block'; return; }

        btn.disabled = true; btnText.textContent = 'Đang xử lý...';
        try {
            const snapshot = await db.ref('drivers').once('value');
            const allDrivers = snapshot.val() || {};
            if (Object.values(allDrivers).some(d => d.phone === phone)) {
                errorEl.textContent = '⚠️ Số điện thoại đã đăng ký!'; errorEl.style.display = 'block'; return;
            }
            const uid = 'DRV_' + Date.now().toString(36).toUpperCase();
            const passwordHash = hashPassword(password + phone);
            const newDriver = { 
                uid, name: fullname, phone, passwordHash, cccd, plate, carModel, fuelType, carClass, 
                status: 'offline', createdAt: Date.now(), totalRides: 0, rating: 5.0 
            };
            await db.ref('drivers/' + uid).set(newDriver);
            driverInfo = { uid, name: fullname, phone, plate, carModel, fuelType, carClass };
            persistDriverSession(driverInfo);
            document.getElementById('authScreen').style.display = 'none';
            showToast('✅ Đăng ký thành công! Chào ' + fullname);
            setTimeout(initApp, 300);
        } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
        finally { btn.disabled = false; btnText.textContent = 'ĐĂNG KÝ TÀI XẾ'; }
    }

    async function doLogin() {
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const btn = document.getElementById('btnLogin');
        const btnText = document.getElementById('btnLoginText');
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'none';
        if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
        if (!password) { errorEl.textContent = '⚠️ Vui lòng nhập mật khẩu'; errorEl.style.display = 'block'; return; }
        btn.disabled = true; btnText.textContent = 'Đang xử lý...';
        try {
            const snapshot = await db.ref('drivers').once('value');
            const allDrivers = snapshot.val() || {};
            let driver = null;
            let uid = null;
            for (const [key, val] of Object.entries(allDrivers)) {
                if (val.phone === phone) { driver = val; uid = key; break; }
            }
            if (!driver) { errorEl.textContent = '⚠️ Số điện thoại chưa đăng ký!'; errorEl.style.display = 'block'; return; }
            
            const expectedHash = hashPassword(password + phone);
            if (driver.passwordHash && driver.passwordHash !== expectedHash) {
                errorEl.textContent = '⚠️ Sai mật khẩu!'; errorEl.style.display = 'block'; return;
            }
            
            if (!driver.passwordHash) {
                await db.ref('drivers/' + uid).update({ passwordHash: expectedHash });
            }
            
            driverInfo = { 
                uid: driver.uid, name: driver.name, phone: driver.phone, 
                plate: driver.plate, carModel: driver.carModel, 
                fuelType: driver.fuelType, carClass: driver.carClass 
            };
            persistDriverSession(driverInfo);
            document.getElementById('authScreen').style.display = 'none';
            showToast('✅ Đăng nhập thành công! Chào ' + driver.name);
            setTimeout(initApp, 300);
        } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
        finally { btn.disabled = false; btnText.textContent = 'ĐĂNG NHẬP'; }
    }

    function toggleAuth() {
        const reg = document.getElementById('stepRegister'), log = document.getElementById('stepLogin'), toggle = document.getElementById('btnToggle');
        if (reg.style.display !== 'none') { 
            reg.style.display = 'none'; 
            log.style.display = 'block'; 
            toggle.textContent = 'Chưa có tài khoản? Đăng ký';
            setTimeout(() => {
                const tel = document.getElementById('loginPhone');
                if (tel) tel.focus();
            }, 100);
        } else { 
            reg.style.display = 'block'; 
            log.style.display = 'none'; 
            toggle.textContent = 'Đã có tài khoản? Đăng nhập';
            setTimeout(() => {
                const name = document.getElementById('regName');
                if (name) name.focus();
            }, 100);
        }
    }

    // ==================== FORGOT PASSWORD ====================
    async function doForgotPassword() {
        const phone = prompt('🔑 NHẬP SỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ:');
        if (!phone) return;
        const phoneTrim = phone.trim();

        try {
            let uid = null, user = null;
            const snap = await db.ref('drivers').once('value');
            if (snap.exists()) {
                snap.forEach(c => {
                    const v = c.val();
                    if (v && (String(v.phone) === phoneTrim || c.key === phoneTrim)) {
                        uid = c.key;
                        user = v;
                    }
                });
            }

            if (!user) {
                alert('❌ Không tìm thấy tài xế với SĐT: ' + phoneTrim + '\nVui lòng kiểm tra lại hoặc ĐĂNG KÝ tài khoản mới.');
                return;
            }

            let verified = false;
            if (user.cccd) {
                const cccd = prompt('🪪 NHẬP SỐ CCCD/CMND CỦA BẠN\n(để xác minh danh tính):');
                if (cccd && cccd.trim() === String(user.cccd).trim()) verified = true;
            }
            if (!verified && user.plate) {
                const plate = prompt('🚗 NHẬP BIỂN SỐ XE CỦA BẠN\n(ví dụ: 14H 06321):');
                if (plate && plate.trim().toLowerCase() === String(user.plate).trim().toLowerCase()) verified = true;
            }
            if (!verified && !user.cccd && !user.plate) {
                verified = true;
            }

            if (!verified) {
                alert('❌ Xác minh thất bại!\nThông tin CCCD/biển số không khớp.\nVui lòng liên hệ admin để được hỗ trợ.');
                return;
            }

            const newPass = prompt('🔒 NHẬP MẬT KHẨU MỚI (tối thiểu 6 ký tự):');
            if (!newPass || newPass.length < 6) {
                alert('❌ Mật khẩu phải có ít nhất 6 ký tự.');
                return;
            }
            const confirmPass = prompt('🔒 NHẬP LẠI MẬT KHẨU MỚI:');
            if (newPass !== confirmPass) {
                alert('❌ Mật khẩu nhập lại không khớp!');
                return;
            }

            await db.ref('drivers/' + uid).update({
                passwordHash: hashPassword(newPass + phoneTrim),
                passwordResetAt: Date.now()
            });

            alert('✅ ĐẶT LẠI MẬT KHẨU THÀNH CÔNG!\n\nBây giờ hãy đăng nhập bằng:\nSĐT: ' + phoneTrim + '\nMật khẩu mới của bạn.');
        } catch (e) {
            alert('❌ Lỗi: ' + e.message);
        }
    }

// ==================== INIT APP ====================
async function initApp() {
    try {
        const saved = localStorage.getItem('driverInfo');
        if (saved) driverInfo = JSON.parse(saved);
        
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            const btn = document.querySelector('.dark-toggle-btn');
            if (btn) btn.textContent = '☀️';
        }
        
        document.getElementById('sidebarName').innerText = driverInfo.name || 'Tài xế';
        document.getElementById('sidebarPhone').innerText = driverInfo.phone || '...';
        document.getElementById('sidebarId').innerHTML = '🆔 ' + (driverInfo.uid?.slice(-8) || '...');
        document.getElementById('sidebarPlan').innerHTML = '⭐ ' + (driverInfo.active_plan || 'MIỄN PHÍ');
        
        document.getElementById('profileNameFull').innerText = driverInfo.name || '...';
        document.getElementById('profileID').innerText = driverInfo.uid?.slice(-8) || '...';
        document.getElementById('profilePhone').innerText = driverInfo.phone || '...';
        document.getElementById('profilePlate').innerText = driverInfo.plate || '...';
        document.getElementById('profileCarModel').innerText = driverInfo.carModel || '...';
        document.getElementById('profileFuel').innerText = driverInfo.fuelType === 'xang' ? '⛽ Xăng' : '🔋 Điện';
        document.getElementById('profileCarClass').innerText = driverInfo.carClass === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
        
        try {
            const ratingSnap = await db.ref(`ratings/${driverInfo.uid}`).once('value');
            const ratings = ratingSnap.val();
            if (ratings) {
                const vals = Object.values(ratings);
                const avg = vals.reduce((s, r) => s + (r.rating || 0), 0) / vals.length;
                document.getElementById('profileRating').innerText = avg.toFixed(1);
            }
        } catch(e) {}
        
        loadLocationHistory();
        initMap();
        await initBackgroundGeolocation();
        
        // ⭐ KHỞI TẠO THEO DÕI THỜI TIẾT & VỊ TRÍ
        initWeatherTracking();
        
        startOrderListener();
        renderHistory();
        initCountdown();
        syncDriverOnline(true);
        startAIHotspotChecker();
        startPackageExpiryChecker();
        startForegroundService();
        startLocationPushing();
        startAIDispatch();
        initPushNotifications();
        updateVerificationStatus();
        loadDocumentsList();
        
        // Thêm nút Quên mật khẩu
        addForgotPasswordButton();
        
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            try {
                const snap = await db.ref(`drivers/${driverInfo.uid}/wallet`).once('value');
                const balance = snap.val() || Math.floor(Math.random() * 500000 + 100000);
                walletBalance.innerText = balance.toLocaleString() + 'đ';
            } catch(e) {
                walletBalance.innerText = (Math.floor(Math.random() * 500000 + 100000)).toLocaleString() + 'đ';
            }
        }
        
    } catch(e) { 
        console.error('Init error:', e); 
    }
}
    async function loadDocumentsList() {
        try {
            const snap = await db.ref(`drivers/${driverInfo.uid}/documents`).once('value');
            const docs = snap.val();
            const container = document.getElementById('uploadedDocuments');
            if (docs && Object.keys(docs).length > 0) {
                container.innerHTML = Object.values(docs).map(d => 
                    `<div style="padding: 2px 0;">✅ ${d.name || 'Tài liệu'}</div>`
                ).join('');
            }
        } catch(e) {}
    }

    function addForgotPasswordButton() {
        const loginForm = document.getElementById('stepLogin');
        if (!loginForm) return;
        if (loginForm.querySelector('[data-forgot-added]')) return;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.forgotAdded = '1';
        btn.className = 'forgot-btn';
        btn.innerHTML = '🔑 Quên mật khẩu?';
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            doForgotPassword();
        };
        
        const loginBtn = loginForm.querySelector('.auth-btn');
        if (loginBtn) {
            loginBtn.insertAdjacentElement('afterend', btn);
        } else {
            loginForm.appendChild(btn);
        }
    }

    function initMap() {
        // map.js là owner duy nhất; core chỉ lấy lại instance, không tạo L.map lần hai.
        if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
            map = window.PromaxMap.ensure();
            window.__promaxCoreGpsOwner = true;
            if (map) map.invalidateSize();
            return map;
        }
        if (map) {
            window.__promaxCoreGpsOwner = true;
            map.invalidateSize();
            return map;
        }
        const container = document.getElementById('map');
        if (container && container._leaflet_id && window.map) {
            map = window.map;
            window.__promaxCoreGpsOwner = true;
            map.invalidateSize();
            return map;
        }
        const timestamp = Date.now();
        map = L.map('map', { zoomControl: false, attributionControl: true }).setView([21.0285, 105.8542], 16);
        L.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?v=${timestamp}`, { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
        window.PromaxMap = window.PromaxMap || { instance: map, ensure: () => map };
        window.__promaxCoreGpsOwner = true;
        window.addEventListener('resize', () => map.invalidateSize());
        return map;
    }

    function startForegroundService() {
        const indicator = document.getElementById('fgServiceIndicator');
        if (indicator) indicator.classList.add('active');
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(lock => { wakeLock = lock; }).catch(() => {});
        }
    }
    
    function stopForegroundService() {
        const indicator = document.getElementById('fgServiceIndicator');
        if (indicator) indicator.classList.remove('active');
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

    function syncDriverLocation() {
        if (!currentLat || !currentLng || !driverInfo.uid) return;
        try {
            db.ref(`tai_xe_online/${driverInfo.uid}`).set({
                lat: currentLat, lng: currentLng, heading: currentHeading,
                status: isRunning ? 'busy' : 'ready', lastUpdate: Date.now(),
                plate: driverInfo.plate, name: driverInfo.name,
                isGapMode: isGapMode, backgroundMode: isBackgroundTracking,
                online: isDriverOnline
            }).catch(()=>{});
        } catch(e) {}
    }

    function syncDriverOnline(isOnline) {
        if (!driverInfo.uid) return;
        if (isOnline) syncDriverLocation();
        else db.ref(`tai_xe_online/${driverInfo.uid}`).remove().catch(()=>{});
    }

    function drawRoute(fromLat, fromLng, toLat, toLng) {
        if (routeLayer) map.removeLayer(routeLayer);
        if (!fromLat || !fromLng || !toLat || !toLng) return;
        fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`)
            .then(r => r.json())
            .then(data => { 
                if (data.routes?.[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    routeLayer = L.polyline(coords, { color: '#0054a3', weight: 5, opacity: 0.8 }).addTo(map);
                    if (!isStreetHail) map.fitBounds(routeLayer.getBounds().pad(0.2));
                }
            })
            .catch(() => {});
    }

    function geocodeAddress(address, callback) {
        if (!address) return;
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
            .then(r => r.json())
            .then(data => { if (data && data[0]) callback(parseFloat(data[0].lat), parseFloat(data[0].lon)); })
            .catch(() => {});
    }

    let heatmapLayers = [];
    function openHeatmap() {
        if (heatmapLayers.length) heatmapLayers.forEach(l => map.removeLayer(l));
        heatmapLayers = [];
        const currentHour = new Date().getHours();
        HOTSPOTS.forEach(spot => {
            const isActive = spot.timeSlots.includes(currentHour);
            const marker = L.circleMarker([spot.lat, spot.lng], {
                radius: isActive ? 18 : 8, fillColor: isActive ? '#ff4444' : '#ffaa44', color: '#fff', weight: 2, fillOpacity: 0.7
            }).addTo(map);
            marker.bindTooltip(`<b>${spot.name}</b><br>${isActive ? '🔥 Đang cao điểm' : '⏰ Sắp cao điểm'}`);
            heatmapLayers.push(marker);
        });
        showToast('🔥 Đã hiển thị điểm nóng khách hàng');
        if (lastValidPos) map.flyTo([lastValidPos.lat, lastValidPos.lng], 13);
        closeSidebar();
    }

    function startAIHotspotChecker() {
        setInterval(() => {
            const hour = new Date().getHours();
            const activeSpots = HOTSPOTS.filter(s => s.timeSlots.includes(hour));
            if (activeSpots.length && !isRunning && !_isModalOpening && isDriverOnline) {
                const nearest = activeSpots[0];
                showToast(`🔥 Gợi ý: Khu vực ${nearest.name} đang có nhu cầu cao!`);
                speak(`Khu vực ${nearest.name} đang có nhiều khách.`);
            }
        }, 600000);
    }

    function showAIAlert(msg) { 
        const alertDiv = document.getElementById('aiAlert'); 
        if (!alertDiv) return;
        document.getElementById('aiAlertText').innerText = msg; 
        alertDiv.classList.add('show'); 
        setTimeout(() => alertDiv.classList.remove('show'), 5000); 
    }

    // ==================== PAYMENT & PACKAGE ====================
    async function handlePayment(amount, plan) {
        if (!driverInfo?.uid) {
            showToast('⚠️ Vui lòng đăng nhập trước');
            return;
        }
        
        if (amount === 0) {
            const nextWeek = Date.now() + (7 * 24 * 60 * 60 * 1000);
            await db.ref(`drivers/${driverInfo.uid}`).update({ tp_expiry: nextWeek, active_plan: plan });
            isLocked = false;
            showToast('✅ Kích hoạt gói dùng thử 7 ngày!');
            initCountdown();
            return;
        }
        
        try {
            showToast('⏳ Đang tạo liên kết thanh toán...');
            
            const orderId = `DRV_${driverInfo.uid}_${Date.now()}`;
            const response = await fetch('https://api.payos.vn/v1/payment-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': 'YOUR_CLIENT_ID',
                    'x-api-key': 'YOUR_API_KEY'
                },
                body: JSON.stringify({
                    amount: amount,
                    description: `Nạp gói ${plan} - TAXI PROMAX`,
                    orderCode: orderId,
                    buyerName: driverInfo.name || 'Tài xế',
                    buyerPhone: driverInfo.phone || '',
                    returnUrl: window.location.href,
                    cancelUrl: window.location.href,
                    expiredAt: Math.floor((Date.now() + 15 * 60 * 1000) / 1000)
                })
            });
            
            const data = await response.json();
            if (data.data?.checkoutUrl) {
                window.open(data.data.checkoutUrl, '_blank');
                monitorPaymentStatus(orderId);
            } else {
                showToast('⚠️ Không thể tạo thanh toán, vui lòng thử lại');
            }
        } catch(e) {
            console.error('PayOS error:', e);
            showToast('⚠️ Lỗi thanh toán: ' + e.message);
        }
    }

    function monitorPaymentStatus(orderCode) {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`https://api.payos.vn/v1/payment-requests/${orderCode}`);
                const data = await response.json();
                if (data.data?.status === 'PAID') {
                    clearInterval(interval);
                    showToast('✅ Thanh toán thành công! Đang cập nhật gói cước...');
                    
                    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    await db.ref(`drivers/${driverInfo.uid}`).update({ 
                        tp_expiry: expiry, 
                        active_plan: data.data.description || 'PRO'
                    });
                    isLocked = false;
                    initCountdown();
                    showToast('🎉 Gói cước đã được kích hoạt!');
                    speak('Thanh toán thành công');
                }
            } catch(e) {}
        }, 3000);
    }

    function initCountdown() {
        const check = async () => {
            try {
                if (!driverInfo?.uid) return;
                const snap = await db.ref(`drivers/${driverInfo.uid}`).once('value');
                const d = snap.val();
                const now = Date.now();
                
                const planShow = document.getElementById('planShow');
                const cdVal = document.getElementById('tp-cd-val');
                const profilePlan = document.getElementById('profilePlan');
                const profileExpiry = document.getElementById('profileExpiry');
                const sidebarPlan = document.getElementById('sidebarPlan');
                const miniTimer = document.getElementById('tp-mini-timer');

                if (d && d.tp_expiry && parseInt(d.tp_expiry) > now) {
                    const expiry = parseInt(d.tp_expiry);
                    const days = Math.floor((expiry - now) / 86400000);
                    
                    if (planShow) planShow.innerText = `⭐ GÓI: ${d.active_plan || 'PROMAX'}`;
                    if (cdVal) cdVal.innerText = days + "n";
                    if (profilePlan) profilePlan.innerText = d.active_plan || 'TRIAL';
                    if (profileExpiry) profileExpiry.innerText = new Date(expiry).toLocaleDateString('vi-VN');
                    if (sidebarPlan) sidebarPlan.innerHTML = `⭐ ${d.active_plan || 'PROMAX'}`;
                    if (miniTimer) miniTimer.style.display = 'inline-flex';
                    
                    isLocked = false;
                } else {
                    if (planShow) planShow.innerText = "⭐ GÓI: MIỄN PHÍ";
                    if (profilePlan) profilePlan.innerText = 'Hết hạn';
                    if (profileExpiry) profileExpiry.innerText = 'Hết hạn';
                    if (sidebarPlan) sidebarPlan.innerHTML = '⭐ MIỄN PHÍ';
                    if (miniTimer) miniTimer.style.display = 'none';
                    
                    if (!isLocked && !isRunning) { 
                        isLocked = true; 
                        showToast('⚠️ Gói cước đã hết hạn! Vui lòng gia hạn để nhận đơn.'); 
                    }
                }
            } catch(e) { 
                console.warn('initCountdown error:', e); 
            }
        };
        check(); 
        setInterval(check, 60000);
    }

    function startPackageExpiryChecker() {
        setInterval(async () => {
            try {
                const snap = await db.ref(`drivers/${driverInfo.uid}`).once('value');
                const d = snap.val();
                if (d && d.tp_expiry) {
                    const remaining = parseInt(d.tp_expiry) - Date.now();
                    if (remaining > 0 && remaining < 86400000) {
                        const hours = Math.floor(remaining / 3600000);
                        if (hours <= 24 && hours > 0) showToast(`⚠️ Gói cước còn ${hours} giờ, hãy gia hạn!`);
                    } else if (remaining <= 0) { isLocked = true; }
                }
            } catch(e) {}
        }, 3600000);
    }

    // ==================== ORDER HANDLING ====================
    async function autonomousOrderEligible(order) {
        if (!window.TaxiAutonomous || !order || order.pickupLat == null || order.pickupLng == null) return true;
        try {
            var driver = {
                id: driverInfo.uid,
                lat: Number((typeof currentLat !== 'undefined' ? currentLat : driverInfo.lat) || 0),
                lng: Number((typeof currentLng !== 'undefined' ? currentLng : driverInfo.lng) || 0),
                rating: Number(driverInfo.rating || 5),
                completedTrips: Number(driverInfo.completedTrips || 0),
                acceptanceRate: Number(driverInfo.acceptanceRate || 1),
                online: true,
                carClass: driverInfo.carClass
            };
            var payload = await window.TaxiAutonomous.allocationScore({pickup:{lat:Number(order.pickupLat),lng:Number(order.pickupLng)},hotspotWeight:1,drivers:[driver]});
            var candidate = payload && payload.result && payload.result.candidates && payload.result.candidates[0];
            return !candidate || candidate.eligible !== false;
        } catch (_) {
            return true;
        }
    }
    function startOrderListener() {
        if (!isDriverOnline) return;
        if (orderListener) { orderListener.off(); orderListener = null; }
        orderListener = db.ref('datxe').orderByChild('status').equalTo('waiting');
        orderListener.on('child_added', async (snap) => {
            if (_isModalOpening || isRunning || isLocked || !isDriverOnline) return;
            const order = snap.val(), orderId = snap.key;
            if (!order || order.status !== 'waiting') return;
            if (order.expiresAt && Number(order.expiresAt) <= Date.now()) {
                db.ref(`datxe/${orderId}`).transaction(current => {
                    if (!current || current.status !== 'waiting') return;
                    return {
                        ...current,
                        status: 'cancelled',
                        cancelReason: 'expired',
                        cancelledAt: Date.now(),
                        statusHistory: { ...(current.statusHistory || {}), cancelled: Date.now() }
                    };
                });
                return;
            }
            if (_processedOrders.has(orderId)) return;
            if (!driverInfo.carClass) driverInfo.carClass = '4_seats';
            if (!(await autonomousOrderEligible(order))) return;
            if (order.carType !== driverInfo.carClass && order.carType !== 'both') return;
            
            _processedOrders.add(orderId); 
            _isModalOpening = true; 
            currentOrderId = orderId; 
            currentCustomerData = order;
            isStreetHail = false;
            
            document.getElementById('modalPhone').innerText = order.phone || '...';
            document.getElementById('modalFrom').innerText = order.pickup || '...';
            document.getElementById('modalTo').innerText = order.dropoff || '...';
            document.getElementById('modalClientName').innerText = order.clientName || 'Khách';
            document.getElementById('modalCarType').innerText = order.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ';
            
            let countdown = 15; 
            document.getElementById('tp-modal-timer-val').innerText = countdown;
            document.getElementById('orderModal').style.display = 'flex';
            
            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(() => { 
                countdown--; 
                document.getElementById('tp-modal-timer-val').innerText = countdown; 
                if (countdown <= 0) declineOrder(); 
            }, 1000);
            
            speak("Có đơn đặt xe mới.");
        });
    }
    
    async function acceptOrder() {
        clearInterval(countdownInterval);
        if (!currentOrderId || !currentCustomerData) return;

        const orderRef = db.ref(`datxe/${currentOrderId}`);
        let result;
        try {
            result = await orderRef.transaction(order => {
                if (!order || order.status !== 'waiting') return;
                return {
                    ...order,
                    status: 'driving',
                    driverId: driverInfo.uid,
                    driverName: driverInfo.name,
                    driverPhone: driverInfo.phone,
                    driverPlate: driverInfo.plate,
                    acceptedAt: Date.now(),
                    statusHistory: { ...(order.statusHistory || {}), driving: Date.now() }
                };
            });
        } catch (error) {
            _isModalOpening = false;
            showToast('Không thể nhận chuyến. Vui lòng thử lại.');
            return;
        }

        if (!result || !result.committed) {
            closeModal('orderModal');
            _isModalOpening = false;
            _processedOrders.add(currentOrderId);
            showToast('Đơn này đã được tài xế khác nhận hoặc đã hết hạn.');
            return;
        }

        currentCustomerData = result.snapshot?.val?.() || currentCustomerData;
        closeModal('orderModal');
        if (currentCustomerData.pickupLat && currentCustomerData.pickupLng)
            createCustomerMarker(currentCustomerData.pickupLat, currentCustomerData.pickupLng);
        showTripPanel(currentCustomerData);
        isRunning = true;
        hideTabsDuringTrip();
        hasPickedUp = false;
        totalKm = 0;
        isStreetHail = false;
        lastDisplayedFare = 0;
        document.getElementById('km').innerText = '0.00';
        document.getElementById('cost').innerText = '0';
        document.getElementById('statsUI').classList.add('show');
        listenForCustomerCancel();
        listenForChat();
        _isModalOpening = false;
        speak('Đã nhận đơn.');
        startForegroundService();
        enableKeepAwake();
        if (window.tripEngine && typeof window.tripEngine.beginAppTrip === 'function') {
            window.tripEngine.beginAppTrip(currentOrderId, currentCustomerData);
        }
    }

    function declineOrder() { 
        clearInterval(countdownInterval); 
        closeModal('orderModal'); 
        _isModalOpening = false; 
        speak("Đã bỏ qua đơn."); 
    }

    function showTripPanel(order) {
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tripInfoPanel').style.display = 'block';
        document.getElementById('statsUI').classList.add('show');
        document.getElementById('tripClientName').innerText = order.clientName || 'Khách';
        document.getElementById('tripClientPhone').innerText = order.phone || '...';
        document.getElementById('tripFrom').innerText = order.pickup || '...';
        document.getElementById('tripTo').innerText = order.dropoff || '...';
        const price = order.estimatePrice || 0, km = order.estimateKm || 0;
        document.getElementById('tripPrice').innerHTML = price > 0 ? price.toLocaleString() + 'đ' : 'Tính theo KM';
        document.getElementById('tripEstKm').innerHTML = km > 0 ? km.toFixed(1) + ' km' : '';
        document.getElementById('tripCarType').innerHTML = order.carType === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
        document.getElementById('tripActionButtons').style.display = 'flex';
        document.getElementById('endTripBtn').style.display = 'none';
        document.getElementById('tripStatusText').innerHTML = '🚗 ĐANG ĐẾN ĐÓN KHÁCH';
        if (order.pickupLat && order.pickupLng) drawRoute(currentLat, currentLng, order.pickupLat, order.pickupLng);
    }

    function createCustomerMarker(lat, lng) {
        if (customerMarker) map.removeLayer(customerMarker);
        const icon = L.divIcon({ html: "<div class='customer-marker'>🧍</div>", className: '', iconSize: [26,26], iconAnchor: [13,13] });
        customerMarker = L.marker([lat, lng], { icon }).addTo(map);
        if (driverMarker) map.fitBounds(L.featureGroup([driverMarker, customerMarker]).getBounds().pad(0.3));
    }

    function confirmPickup() {
        hasPickedUp = true;
        document.getElementById('tripActionButtons').style.display = 'none';
        document.getElementById('endTripBtn').style.display = 'block';
        document.getElementById('tripStatusText').innerHTML = '🚕 ĐÃ ĐÓN KHÁCH - ĐANG CHẠY';
        if (customerMarker) map.removeLayer(customerMarker);
        if (currentOrderId && !isStreetHail) {
            const pickedUpAt = Date.now();
            currentCustomerData = {
                ...currentCustomerData,
                status: 'in_progress',
                pickedUpAt,
                statusHistory: { ...(currentCustomerData.statusHistory || {}), picked_up: pickedUpAt, in_progress: pickedUpAt }
            };
            db.ref(`datxe/${currentOrderId}`).update({
                status: 'in_progress',
                pickedUpAt,
                statusHistory: currentCustomerData.statusHistory
            }).catch(() => {});
        }
        if (currentCustomerData?.dropoffLat && currentCustomerData?.dropoffLng)
            drawRoute(currentLat, currentLng, currentCustomerData.dropoffLat, currentCustomerData.dropoffLng);
        else if (currentCustomerData?.dropoff)
            geocodeAddress(currentCustomerData.dropoff, (lat,lng) => drawRoute(currentLat, currentLng, lat, lng));
        speak('Đã đón khách, bắt đầu hành trình.');
    }

    function navigateToPickup() {
        if (!currentCustomerData) return;
        if (currentCustomerData.pickupLat && currentCustomerData.pickupLng) {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${currentCustomerData.pickupLat},${currentCustomerData.pickupLng}&travelmode=driving`, '_blank');
        } else {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${encodeURIComponent(currentCustomerData.pickup)}&travelmode=driving`, '_blank');
        }
    }

    // ==================== TRIP HANDLING ====================
    function handleTrip() {
        if (!isRunning) {
            isRunning = true;
            hideTabsDuringTrip();
            hasPickedUp = true;
            totalKm = 0;
            isStreetHail = true;
            currentOrderId = null;
            lastDisplayedFare = 0;
            lastValidPos = null;
            lastValidTime = 0;
            isGapMode = false;
            
            currentCustomerData = {
                clientName: '🚕 Khách vẫy', phone: '', pickup: 'Vị trí hiện tại', dropoff: 'Chưa xác định',
                estimatePrice: 0, estimateKm: 0, carType: driverInfo.carClass || '4_seats', isStreetHail: true
            };
            
            document.getElementById('km').innerText = '0.00';
            document.getElementById('cost').innerText = '0';
            document.getElementById('statsUI').classList.add('show');
            document.getElementById('homeControls').style.display = 'none';
            document.getElementById('tripInfoPanel').style.display = 'block';
            document.getElementById('tripClientName').innerText = '🚕 Khách vẫy';
            document.getElementById('tripClientPhone').innerText = '---';
            document.getElementById('tripFrom').innerText = 'Vị trí hiện tại';
            document.getElementById('tripTo').innerText = 'Chưa xác định';
            document.getElementById('tripPrice').innerHTML = '0đ';
            document.getElementById('tripKmLive').innerText = '0.00 KM';
            document.getElementById('tripCarType').innerHTML = driverInfo.carClass === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
            document.getElementById('tripActionButtons').style.display = 'none';
            document.getElementById('endTripBtn').style.display = 'block';
            document.getElementById('tripStatusText').innerHTML = '🚕 CHUYẾN VẪY - ĐANG CHẠY';
            
            startForegroundService();
            enableKeepAwake();
            speak("Bắt đầu chuyến vẫy. Đồng hồ sẽ nhảy khi xe di chuyển.");
            showToast("🚕 Chuyến vẫy đã bắt đầu! Đồng hồ tính cước đã sẵn sàng.");
            document.getElementById('wishModal').style.display = 'flex';
        } else {
            showConfirmComplete();
        }
    }

    function closeStreetHailMeter() {
        document.getElementById('streetHailMeter').classList.remove('show');
        if (streetHailTimerInterval) clearInterval(streetHailTimerInterval);
        showConfirmComplete();
    }

    function completeTrip() {
        const MIN_FARE = 20000; // cước tối thiểu (khớp thực tế vận hành)
        const finalKm = Number(totalKm) || 0;
        let finalCost = Math.round(finalKm * currentRate);
        if (finalCost < MIN_FARE) finalCost = MIN_FARE;

        const tripType = isStreetHail ? 'STREET_HAIL' : 'APP_BOOKING';

        // Luôn lưu lịch sử trước khi reset biến
        saveHistory(finalKm, finalCost.toLocaleString('vi-VN'), finalCost, tripType);

        if (currentOrderId && !isStreetHail) {
            db.ref(`datxe/${currentOrderId}`).update({
                status: 'completed',
                completedAt: Date.now(),
                actualKm: finalKm,
                actualPrice: finalCost,
                statusHistory: { ...(currentCustomerData && currentCustomerData.statusHistory ? currentCustomerData.statusHistory : {}), completed: Date.now() }
            }).catch(function(){});
        }

        isRunning = false;
        hasPickedUp = false;
        isStreetHail = false;
        totalKm = 0;
        lastDisplayedFare = 0;
        currentOrderId = null;
        currentCustomerData = null;
        lastValidPos = null;
        lastValidTime = 0;
        isGapMode = false;

        const streetMeter = document.getElementById('streetHailMeter');
        if (streetMeter) streetMeter.classList.remove('show');
        if (typeof streetHailTimerInterval !== 'undefined' && streetHailTimerInterval) {
            clearInterval(streetHailTimerInterval);
            streetHailTimerInterval = null;
        }

        const tripPanel = document.getElementById('tripInfoPanel');
        const homeControls = document.getElementById('homeControls');
        const statsUI = document.getElementById('statsUI');
        const mainBtn = document.getElementById('mainBtn');

        if (tripPanel) tripPanel.style.display = 'none';
        if (homeControls) homeControls.style.display = 'block';
        if (statsUI) statsUI.classList.remove('show');
        if (mainBtn) {
            mainBtn.innerText = "🚖 BẮT ĐẦU CHUYẾN ĐI";
            mainBtn.style.background = "var(--accent)";
        }

        // Hiện lại tab sau khi kết thúc chuyến
        showTabsAfterTrip();

        if (customerMarker) { map.removeLayer(customerMarker); customerMarker = null; }
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

        stopForegroundService();
        disableKeepAwake();

        const endSummary = document.getElementById('endSummary');
        if (endSummary) {
            endSummary.innerHTML = `Quãng đường: <b>${finalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary);font-size:20px;">${finalCost.toLocaleString('vi-VN')}đ</b><br><span style="font-size:11px;">${tripType === 'STREET_HAIL' ? '🚕 Chuyến vẫy' : '📱 Chuyến app'}</span>`;
        }

        const endModal = document.getElementById('endModal');
        if (endModal) endModal.style.display = 'flex';

        speak(`Chuyến đi kết thúc. Tổng tiền ${finalCost.toLocaleString('vi-VN')} đồng.`);

        const kmEl = document.getElementById('km');
        const costEl = document.getElementById('cost');
        if (kmEl) kmEl.innerText = '0.00';
        if (costEl) costEl.innerText = '0';
    }

    async function saveHistory(km, costLabel, costRaw, tripType) {
        const now = Date.now();
        const timeLabel = new Date().toLocaleString('vi-VN');
        const uid = (driverInfo && driverInfo.uid) ? driverInfo.uid : 'local';

        const tripData = {
            km: parseFloat(km) || 0,
            cost: Number(costRaw) || 0,
            costLabel: costLabel || ((Number(costRaw) || 0).toLocaleString('vi-VN') + 'đ'),
            time: timeLabel,
            timestamp: now,
            rate: currentRate || 15000,
            driverId: uid,
            tripType: tripType || 'STREET_HAIL'
        };

        // 1. Luôn ghi localStorage trước (quan trọng nhất)
        try {
            let history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            if (!Array.isArray(history)) history = [];
            history.unshift(tripData);
            localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 100)));
        } catch (e) {
            console.warn('[saveHistory] localStorage error:', e);
        }

        // 2. Ghi Firebase (nếu có uid thật)
        if (uid && uid !== 'local') {
            try {
                await db.ref(`trips/${uid}/${now}`).set(tripData);
            } catch (e) {
                console.warn('[saveHistory] Firebase offline:', e);
            }
        }

        // 3. Render lại lịch sử ngay
        if (typeof renderHistory === 'function') {
            try { renderHistory(); } catch (e) {}
        }
        if (typeof window.renderHistoryPro === 'function') {
            try { window.renderHistoryPro(); } catch (e) {}
        }
    }


    // Export cho History Pro + trip engine (V6)
    window.saveHistory = saveHistory;

    async function renderHistory() {
        const list = document.getElementById('historyList');
        try {
            const snap = await db.ref(`trips/${driverInfo.uid}`).orderByChild('timestamp').limitToLast(50).once('value');
            const data = snap.val();
            if (data) { 
                const trips = Object.values(data).reverse();
                if (trips.length) { 
                    list.innerHTML = trips.map(h => `
                        <div class="history-card">
                            <div class="h-info">
                                <b>${h.time}</b><br>
                                <small>${h.km.toFixed(2)} KM</small>
                                <span class="h-source ${h.tripType === 'STREET_HAIL' ? 'street' : 'cloud'}">${h.tripType === 'STREET_HAIL' ? '🚕 Vẫy' : '📱 App'}</span>
                            </div>
                            <div class="h-price">${h.costLabel}đ</div>
                        </div>`).join(''); 
                    return; 
                }
            }
        } catch(e) {}
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        if (!history.length) list.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">Chưa có chuyến đi nào</div>';
        else list.innerHTML = history.map(h => `
            <div class="history-card">
                <div class="h-info">
                    <b>${h.time}</b><br>
                    <small>${h.km.toFixed(2)} KM</small>
                    <span class="h-source ${h.tripType === 'STREET_HAIL' ? 'street' : 'local'}">${h.tripType === 'STREET_HAIL' ? '🚕 Vẫy' : '📱 App'}</span>
                </div>
                <div class="h-price">${h.costLabel}đ</div>
            </div>`).join('');
    }

    function exportHistoryCSV() {
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        if (!history.length) { showToast('⚠️ Không có dữ liệu để xuất'); return; }
        
        let csv = 'Thời gian,Quãng đường (KM),Tiền cước (VNĐ),Loại chuyến\n';
        history.forEach(h => {
            csv += `${h.time},${h.km.toFixed(2)},${h.cost},${h.tripType === 'STREET_HAIL' ? 'Vẫy' : 'App'}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lich_su_chuyen_di_${driverInfo.name}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        showToast('✅ Đã xuất file CSV');
    }

    // ==================== CHAT ====================
    function listenForChat() {
        if (chatListener) db.ref(`chat/${chatListener}`).off();
        chatListener = currentOrderId;
        if (!currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).orderByChild('timestamp').on('child_added', (snap) => {
            const msg = snap.val();
            if (msg && msg.sender !== 'driver') appendChatMessage(msg);
        });
    }

    function openChat() { 
        document.getElementById('chatOverlay').style.display = 'flex'; 
        const cm = document.getElementById('chatMessages'); 
        if (cm.children.length === 1 && cm.children[0].style.textAlign === 'center') cm.innerHTML = ''; 
    }
    
    function closeChat() { document.getElementById('chatOverlay').style.display = 'none'; }
    
    function sendQuickMessage(msg) {
        if (!currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).push({ sender: 'driver', from: 'driver', senderName: driverInfo.name, text: msg, timestamp: Date.now() });
        appendChatMessage({ text: msg, sender: 'driver', timestamp: Date.now() });
    }
    
    function sendChatMessage() { 
        const input = document.getElementById('chatInput'), text = input.value.trim(); 
        if (!text || !currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).push({ sender: 'driver', from: 'driver', senderName: driverInfo.name, text, timestamp: Date.now() });
        appendChatMessage({ text, sender: 'driver', timestamp: Date.now() }); 
        input.value = '';
    }
    
    function appendChatMessage(msg) { 
        const container = document.getElementById('chatMessages');
        if (container.children.length === 1 && container.children[0].style.textAlign === 'center') container.innerHTML = '';
        const isMe = msg.sender === 'driver'; 
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
        const div = document.createElement('div'); 
        div.className = 'chat-message ' + (isMe ? 'sent' : 'received');
        div.innerHTML = `${msg.text}<div style="font-size:9px;opacity:0.6;margin-top:4px;">${time}</div>`;
        container.appendChild(div); 
        container.scrollTop = container.scrollHeight;
    }
    
    function callCustomer() { 
        const phone = document.getElementById('tripClientPhone').innerText; 
        if (phone && phone !== '...' && phone !== '---') window.location.href = 'tel:' + phone; 
        else showToast('⚠️ Chưa có số điện thoại khách hàng'); 
    }

    function listenForCustomerCancel() {
        if (cancelListener) db.ref(`datxe/${cancelListener}/status`).off();
        cancelListener = currentOrderId;
        if (!currentOrderId) return;
        db.ref(`datxe/${currentOrderId}/status`).on('value', (snap) => { 
            if (snap.val() === 'cancelled' && isRunning) showCancelBanner(); 
        });
    }
    
    function showCancelBanner() { document.getElementById('cancelBanner').style.display = 'block'; speak("Cảnh báo! Khách hàng đã hủy chuyến."); }
    
    function dismissCancelBanner() { 
        document.getElementById('cancelBanner').style.display = 'none'; 
        if (isRunning) {
            isRunning = false; isStreetHail = false;
            document.getElementById('tripInfoPanel').style.display = 'none';
            document.getElementById('homeControls').style.display = 'block';
            document.getElementById('statsUI').classList.remove('show');
            document.getElementById('mainBtn').innerText = "🚖 BẮT ĐẦU CHUYẾN ĐI";
            document.getElementById('mainBtn').style.background = "var(--accent)";
            if (wakeLock) { wakeLock.release(); wakeLock = null; }
            totalKm = 0; lastDisplayedFare = 0; lastValidPos = null; lastValidTime = 0;
            document.getElementById('km').innerText = '0.00';
            document.getElementById('cost').innerText = '0';
            if (customerMarker) map.removeLayer(customerMarker);
            if (routeLayer) map.removeLayer(routeLayer);
            customerMarker = null; routeLayer = null;
            stopForegroundService();
            disableKeepAwake();
        }
    }

    function updateRate(v) { 
        currentRate = parseInt(v); 
        document.getElementById('rateLabel').innerText = currentRate.toLocaleString();
        const meterRate = document.getElementById('meterRate');
        if (meterRate) meterRate.innerText = currentRate.toLocaleString() + 'đ';
    }
    
    function speak(text) { 
        if ('speechSynthesis' in window) { 
            window.speechSynthesis.cancel(); 
            const msg = new SpeechSynthesisUtterance(text); 
            msg.lang = 'vi-VN'; 
            window.speechSynthesis.speak(msg); 
        } 
    }
    
    function showToast(msg) { 
        const toast = document.getElementById('txToast'); 
        if (!toast) return;
        toast.innerText = msg; 
        toast.classList.add('show'); 
        setTimeout(() => toast.classList.remove('show'), 3000); 
    }
    
    function closeModal(id) { 
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none'; 
    }
    
    function showTab(tab, btn) {
        document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        if (tab === 'home') {
            if (isRunning) { 
                document.getElementById('homeControls').style.display = 'none'; 
                document.getElementById('tripInfoPanel').style.display = 'block'; 
                document.getElementById('statsUI').classList.add('show');
            } else { 
                document.getElementById('homeControls').style.display = 'block'; 
                document.getElementById('tripInfoPanel').style.display = 'none'; 
                document.getElementById('statsUI').classList.remove('show');
            }
            setTimeout(() => map.invalidateSize(), 300);
        } else {
            document.getElementById('homeControls').style.display = 'none';
            document.getElementById('tripInfoPanel').style.display = 'none';
            document.getElementById('statsUI').classList.remove('show');
            const tabEl = document.getElementById('tab-' + tab);
            if (tabEl) tabEl.style.display = 'flex';
            if (tab === 'lichsu') renderHistory();
        }
    }
    
    function openSOS() { 
        speak("Đang phát tín hiệu SOS."); 
        showToast("🚨 Đã gửi tín hiệu cứu hộ!"); 
        if (driverInfo.uid && currentLat && currentLng) {
            db.ref(`sos/${driverInfo.uid}`).set({
                lat: currentLat, lng: currentLng,
                name: driverInfo.name, phone: driverInfo.phone,
                timestamp: Date.now(), status: 'active'
            });
        }
        closeSidebar(); 
    }
    
    function openMaintenance() { 
        showToast("🔧 Kiểm tra áp suất lốp trước khi khởi hành."); 
        closeSidebar(); 
    }
    
    function openProfit() { 
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]'); 
        const today = new Date().setHours(0,0,0,0);
        
        const stats = {
            today: history.filter(h => h.timestamp >= today).reduce((s, h) => s + (h.cost || 0), 0),
            week: history.filter(h => h.timestamp >= Date.now() - 7*86400000).reduce((s, h) => s + (h.cost || 0), 0),
            month: history.filter(h => h.timestamp >= Date.now() - 30*86400000).reduce((s, h) => s + (h.cost || 0), 0),
            total: history.reduce((s, h) => s + (h.cost || 0), 0),
            trips: history.length
        };
        
        const msg = `📊 BÁO CÁO DOANH THU\n─────────────────\n📅 Hôm nay:  ${stats.today.toLocaleString()}đ\n📆 Tuần này: ${stats.week.toLocaleString()}đ\n📆 Tháng này: ${stats.month.toLocaleString()}đ\n💰 Tổng:     ${stats.total.toLocaleString()}đ\n🚖 Số chuyến: ${stats.trips}\n${stats.trips > 0 ? `💰 Trung bình: ${(stats.total/stats.trips).toLocaleString()}đ/chuyến` : ''}`;
        showToast(msg); 
        closeSidebar();
    }

    function doLogout() {
        if (isRunning) {
            showToast('⚠️ Vui lòng kết thúc chuyến đi trước khi đăng xuất');
            return;
        }
        showConfirmDialog('Bạn có chắc chắn muốn đăng xuất?', () => {
            stopBackgroundGeolocation();
            stopGPS();
            stopLocationPushing();
            stopAIDispatch();
            stopForegroundService();
            disableKeepAwake();
            
            if (orderListener) { orderListener.off(); orderListener = null; }
            if (chatListener) { db.ref(`chat/${chatListener}`).off(); chatListener = null; }
            if (ratingListener) { db.ref(`ratings/${ratingListener}`).off(); ratingListener = null; }
            if (cancelListener) { db.ref(`datxe/${cancelListener}/status`).off(); cancelListener = null; }
            
            if (driverInfo?.uid) {
                db.ref(`tai_xe_online/${driverInfo.uid}`).remove().catch(()=>{});
            }
            
            localStorage.removeItem('driverInfo');
            location.reload();
        });
    }

    // ==================== BACKGROUND GEOLOCATION ====================
    async function initBackgroundGeolocation() {
        const isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
        if (!isCapacitor) {
            startGPS();
            return;
        }
        
        try {
            if (typeof BackgroundGeolocation === 'undefined') {
                startGPS();
                return;
            }
            
            backgroundGeolocation = BackgroundGeolocation;
            
            await backgroundGeolocation.ready({
                desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
                distanceFilter: 10,
                stopOnTerminate: false,
                startOnBoot: true,
                debug: true,
                logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
                notificationTitle: "TAXI PROMAX",
                notificationText: "Đang theo dõi vị trí của bạn",
                notificationIconColor: "#0054a3",
                notificationIconLarge: "ic_launcher",
                notificationPriority: "PRIORITY_HIGH",
                foregroundService: true,
                locationProvider: BackgroundGeolocation.PROVIDER_ANDROID,
                autoSync: true,
                maxBatchSize: 50,
                batchSync: true
            });
            
            backgroundGeolocation.onLocation((location) => {
                processBackgroundLocation(location);
            }, (error) => {
                console.error('[BG] Lỗi location:', error);
            });
            
            backgroundGeolocation.onMotionChange((event) => {
                const dot = document.getElementById('gpsDot');
                if (dot) event.isMoving ? dot.classList.add('bg') : dot.classList.remove('bg');
            });
            
            backgroundGeolocation.onConnectivityChange((state) => {
                if (state.connected) syncOfflineLocations();
            });
            
            const state = await backgroundGeolocation.getState();
            if (!state.enabled) {
                await backgroundGeolocation.start();
                isBackgroundTracking = true;
                showToast('📍 Đã bật định vị nền (chạy khi tắt màn hình)');
            }
            
            await syncOfflineLocations();
            
            const dot = document.getElementById('gpsDot');
            if (dot) dot.classList.add('bg');
            const statusText = document.getElementById('gpsStatusText');
            if (statusText) statusText.innerText = 'GPS: NÂNG CAO (CHẠY NGẦM)';
            const bgStatus = document.getElementById('profileBgStatus');
            if (bgStatus) bgStatus.innerText = '✅ Đang chạy nền';
            
        } catch (error) {
            console.error('[BG] Lỗi khởi tạo:', error);
            startGPS();
        }
    }
    
    function stopBackgroundGeolocation() {
        if (backgroundGeolocation && isBackgroundTracking) {
            backgroundGeolocation.stop();
            isBackgroundTracking = false;
        }
    }
    
    async function syncOfflineLocations() {
        if (!backgroundGeolocation) return;
        try {
            const locations = await backgroundGeolocation.getLocations();
            if (locations && locations.length > 0) {
                for (const loc of locations) await processBackgroundLocation(loc);
                await backgroundGeolocation.clearLocations();
            }
        } catch(e) {}
    }

    // ==================== XE GHÉP MODULE ====================
    const XG_DB_REF = 'shared_rides';
    const XG_BOOKINGS_REF = 'shared_ride_bookings';
    const XG_REQUESTS_REF = 'customer_requests';
    const XG_CHAT_REF = 'chat_xg';

    let xgCurrentUser = null;
    let xgListenersStarted = false;
    let xgUIInjected = false;
    let xgGeocodeCache = { pickup: null, dropoff: null };
    let xgActiveChatBookingId = null;
    let xgBookingCache = {};
    let xgRequestCache = {};

    function loadXGSession() {
        try {
            const saved = localStorage.getItem('xg_driver_session');
            if (saved) {
                xgCurrentUser = JSON.parse(saved);
                const expiry = xgCurrentUser?.expiry || 0;
                const alertEl = document.getElementById('xgPackageAlert');
                const textEl = document.getElementById('xgPackageText');
                if (Date.now() < expiry) {
                    if (alertEl) alertEl.style.display = 'none';
                } else {
                    if (alertEl) alertEl.style.display = 'flex';
                    if (textEl) textEl.innerText = 'Gói Xe Ghép đã hết hạn! Vui lòng gia hạn.';
                    xgCurrentUser = null;
                    localStorage.removeItem('xg_driver_session');
                }
            } else {
                const alertEl = document.getElementById('xgPackageAlert');
                const textEl = document.getElementById('xgPackageText');
                if (alertEl) alertEl.style.display = 'flex';
                if (textEl) textEl.innerText = 'Đăng ký gói Xe Ghép để đăng chuyến (99.000đ/tháng)';
            }
        } catch(e) {}
    }

    function openXeGhepModule() {
        loadXGSession();
        xgInjectUI();
        document.getElementById('xeGhepModal').style.display = 'flex';
        switchXGTab('driver');
        loadXGRides();
        startXGListeners();
        try {
            const n = document.getElementById('xgDriverName');
            const p = document.getElementById('xgPhone');
            if (n && !n.value && driverInfo?.name) n.value = driverInfo.name;
            if (p && !p.value && driverInfo?.phone) p.value = driverInfo.phone;
        } catch(e) {}
    }

    function closeXeGhepModal() {
        document.getElementById('xeGhepModal').style.display = 'none';
    }

    function switchXGTab(tab) {
        const panels = {
            driver: 'xgDriverPanel',
            passenger: 'xgPassengerPanel',
            bookings: 'xgBookingsPanel',
            requests: 'xgRequestsPanel',
            chat: 'xgChatPanel'
        };
        const tabs = {
            driver: 'xgTabDriver',
            passenger: 'xgTabPassenger',
            bookings: 'xgTabBookings',
            requests: 'xgTabRequests',
            chat: 'xgTabChat'
        };
        for (const key in panels) {
            const p = document.getElementById(panels[key]);
            const t = document.getElementById(tabs[key]);
            if (p) p.style.display = (key === tab) ? 'block' : 'none';
            if (t) {
                if (key === tab) { t.style.background = '#0054a3'; t.style.color = 'white'; }
                else { t.style.background = '#e0e0e0'; t.style.color = '#333'; }
            }
        }
        if (tab === 'passenger') loadXGRides();
        if (tab === 'bookings') renderXGBookings();
        if (tab === 'requests') renderXGRequests();
        if (tab === 'chat') renderXGChatList();
    }

    function showXGPayment() {
        const confirmPay = confirm('💰 ĐĂNG KÝ GÓI XE GHÉP\n\n• Phí: 99.000đ / tháng\n• Đăng chuyến không giới hạn\n• Nhận đặt ghế + chat realtime\n\nBấm OK để thanh toán (Demo - lưu cục bộ)');
        if (confirmPay) {
            const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
            xgCurrentUser = {
                name: driverInfo?.name || 'Tài xế',
                phone: driverInfo?.phone || '',
                expiry: expiry,
                registeredAt: Date.now()
            };
            localStorage.setItem('xg_driver_session', JSON.stringify(xgCurrentUser));
            const alertEl = document.getElementById('xgPackageAlert');
            if (alertEl) alertEl.style.display = 'none';
            showToast('✅ Đăng ký gói Xe Ghép thành công! Hạn đến: ' + new Date(expiry).toLocaleDateString('vi-VN'));
            speak('Đăng ký gói xe ghép thành công');
        }
    }

    async function xgGeocode(address) {
        try {
            const r = await fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(address) + '&format=json&limit=1&countrycodes=vn');
            const d = await r.json();
            if (d && d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
        } catch(e) {}
        return null;
    }

    async function publishXGRide() {
        if (!xgCurrentUser || Date.now() > xgCurrentUser.expiry) {
            showToast('⚠️ Vui lòng đăng ký gói Xe Ghép trước khi đăng chuyến!');
            showXGPayment();
            return;
        }
        const pickup = document.getElementById('xgPickup').value.trim();
        const dropoff = document.getElementById('xgDropoff').value.trim();
        const departureTimeRaw = document.getElementById('xgDepartureTime').value;
        const price = parseInt(document.getElementById('xgPrice').value);
        const seats = parseInt(document.getElementById('xgSeats').value);
        const vehicle = document.getElementById('xgVehicle').value;
        const driverName = document.getElementById('xgDriverName').value.trim();
        const phone = document.getElementById('xgPhone').value.trim();

        if (!pickup || !dropoff || !departureTimeRaw || !price || !seats || !driverName || !phone) {
            showToast('❌ Vui lòng điền đầy đủ thông tin!');
            return;
        }
        if (price < 1000) { showToast('💰 Giá ghế phải lớn hơn 0'); return; }
        if (seats < 1) { showToast('💺 Số ghế phải >= 1'); return; }

        showToast('📍 Đang xác định tọa độ chuyến...');

        if (!xgGeocodeCache.pickup || xgGeocodeCache.pickup.addr !== pickup) {
            const c = await xgGeocode(pickup);
            xgGeocodeCache.pickup = c ? { addr: pickup, lat: c.lat, lng: c.lng } : { addr: pickup, lat: null, lng: null };
        }
        if (!xgGeocodeCache.dropoff || xgGeocodeCache.dropoff.addr !== dropoff) {
            const c = await xgGeocode(dropoff);
            xgGeocodeCache.dropoff = c ? { addr: dropoff, lat: c.lat, lng: c.lng } : { addr: dropoff, lat: null, lng: null };
        }
        const pu = xgGeocodeCache.pickup;
        const dr = xgGeocodeCache.dropoff;

        const departureTimeFormatted = departureTimeRaw.replace('T', ' ') + ':00';
        const route = `${pickup} → ${dropoff}`;

        const rideData = {
            driverId: driverInfo?.uid || `xg_${Date.now()}`,
            driverName: driverName,
            phone: phone,
            pickup: pickup,
            dropoff: dropoff,
            route: route,
            departureTime: departureTimeFormatted,
            vehicle: vehicle,
            price: price,
            seats: seats,
            pickupLat: pu?.lat || (typeof currentLat !== 'undefined' ? currentLat : null),
            pickupLng: pu?.lng || (typeof currentLng !== 'undefined' ? currentLng : null),
            dropoffLat: dr?.lat || null,
            dropoffLng: dr?.lng || null,
            status: 'active',
            timestamp: Date.now(),
            source: 'taxi_promax'
        };

        try {
            await db.ref(XG_DB_REF).push(rideData);
            showToast('✅ Đăng chuyến thành công!');
            document.getElementById('xgPickup').value = '';
            document.getElementById('xgDropoff').value = '';
            document.getElementById('xgDepartureTime').value = '';
            document.getElementById('xgPrice').value = '';
            document.getElementById('xgSeats').value = '3';
            document.getElementById('xgDriverName').value = driverInfo?.name || '';
            document.getElementById('xgPhone').value = driverInfo?.phone || '';
            loadXGRides();
            speak('Đã đăng chuyến xe ghép');
        } catch(e) {
            console.error(e);
            showToast('⚠️ Lỗi khi đăng chuyến: ' + e.message);
        }
    }

    async function loadXGRides() {
        const container = document.getElementById('xgRidesList');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-pulse"></i> Đang tải...</div>';
        try {
            const snapshot = await db.ref(XG_DB_REF).orderByChild('timestamp').once('value');
            const data = snapshot.val();
            if (!data) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">🚫 Chưa có chuyến xe ghép nào</div>';
                return;
            }
            let rides = [];
            for (let id in data) {
                if (data[id].status === 'active') rides.push({ id, ...data[id] });
            }
            rides.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (rides.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">🚫 Không có chuyến nào đang hoạt động</div>';
                return;
            }
            let html = '';
            for (const ride of rides) {
                const priceFormatted = new Intl.NumberFormat('vi-VN').format(ride.price) + ' ₫';
                const vehicleIcon = ride.vehicle === '4-xang' ? '🚗' : (ride.vehicle === '7-xang' ? '🚙' : (ride.vehicle === '4-dien' ? '⚡' : '🔋'));
                html += `
                    <div class="xg-ride-card" style="background:#fff;border:1px solid #eee;border-radius:14px;padding:12px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span style="font-weight:800;font-size:14px;">${escapeHtmlXG(ride.route || (ride.pickup + ' → ' + ride.dropoff))}</span>
                            <span style="background:#e8f5e9;padding:2px 8px;border-radius:12px;font-size:10px;">${vehicleIcon} ${(ride.vehicle||'').replace('-',' ') || 'Xe'}</span>
                        </div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;"><i class="fas fa-map-marker-alt"></i> Đón: ${escapeHtmlXG(ride.pickup)}</div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;"><i class="fas fa-flag-checkered"></i> Trả: ${escapeHtmlXG(ride.dropoff)}</div>
                        <div style="font-size:11px;color:#666;margin-bottom:4px;"><i class="far fa-clock"></i> ${escapeHtmlXG(ride.departureTime)}</div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:6px;">
                            <span style="background:#f0f0f0;padding:4px 8px;border-radius:12px;font-size:11px;"><i class="fas fa-chair"></i> ${ride.seats} ghế trống</span>
                            <span style="color:#d32f2f;font-weight:800;">${priceFormatted}/ghế</span>
                            <a href="tel:${ride.phone}" style="background:#00bfa5;color:white;padding:6px 12px;border-radius:20px;text-decoration:none;font-size:12px;font-weight:700;">
                                <i class="fas fa-phone-alt"></i> Liên hệ
                            </a>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        } catch(e) {
            console.error(e);
            container.innerHTML = '<div style="text-align:center;padding:20px;color:red;">⚠️ Lỗi tải dữ liệu</div>';
        }
    }

    function escapeHtmlXG(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    let xgRefreshInterval = null;
    function startXGAutoRefresh() {
        if (xgRefreshInterval) clearInterval(xgRefreshInterval);
        xgRefreshInterval = setInterval(() => {
            const modal = document.getElementById('xeGhepModal');
            if (modal && modal.style.display === 'flex') {
                const passPanel = document.getElementById('xgPassengerPanel');
                if (passPanel && passPanel.style.display === 'block') loadXGRides();
            }
        }, 30000);
    }

    function xgInjectUI() {
        if (xgUIInjected) return;
        xgUIInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .xg-tabbar { display:flex; gap:6px; padding:10px; overflow-x:auto; background:#f5f5f5; }
            .xg-tabbtn { flex:1; min-width:70px; padding:10px 6px; border:none; border-radius:12px; background:#e0e0e0; color:#333; font-size:11px; font-weight:800; cursor:pointer; position:relative; white-space:nowrap; }
            .xg-badge { position:absolute; top:-4px; right:-4px; background:#d32f2f; color:#fff; font-size:9px; font-weight:900; min-width:18px; height:18px; border-radius:9px; display:none; align-items:center; justify-content:center; padding:0 4px; }
            .xg-bcard { background:#fff; border:2px solid #fff3e0; border-radius:14px; padding:12px; margin-bottom:10px; position:relative; }
            .xg-rcard { background:#fff; border:2px solid #e3f2fd; border-radius:14px; padding:12px; margin-bottom:10px; position:relative; }
            .xg-actions { display:flex; gap:8px; margin-top:10px; }
            .xg-actions button, .xg-actions a { flex:1; padding:10px; border:none; border-radius:10px; font-size:12px; font-weight:800; cursor:pointer; text-align:center; text-decoration:none; }
            .xg-acc { background:#00bfa5; color:#fff; }
            .xg-rej { background:#ef5350; color:#fff; }
            .xg-chatview { position:fixed; inset:0; background:#fff; z-index:17000; display:none; flex-direction:column; }
            .xg-chatview.show { display:flex; }
            .xg-chdr { background:linear-gradient(135deg,#0054a3,#00bfa5); color:#fff; padding:14px; display:flex; align-items:center; gap:12px; }
            .xg-cmsgs { flex:1; overflow-y:auto; padding:14px; background:#f5f5f5; display:flex; flex-direction:column; gap:8px; }
            .xg-msg { max-width:80%; padding:10px 14px; border-radius:16px; font-size:13px; }
            .xg-msg.mine { background:linear-gradient(135deg,#0054a3,#00bfa5); color:#fff; align-self:flex-end; }
            .xg-msg.theirs { background:#fff; color:#333; align-self:flex-start; box-shadow:0 1px 2px rgba(0,0,0,.08); }
            .xg-cinput { padding:10px; background:#fff; border-top:1px solid #eee; display:flex; gap:8px; }
            .xg-cinput input { flex:1; padding:10px 14px; background:#f0f0f0; border:none; border-radius:22px; font-size:13px; }
            .xg-cinput button { width:42px; height:42px; border:none; border-radius:50%; background:linear-gradient(135deg,#0054a3,#00bfa5); color:#fff; cursor:pointer; }
        `;
        document.head.appendChild(style);

        const anchorTab = document.getElementById('xgTabPassenger');
        if (anchorTab) {
            const mk = (id, icon, label) => {
                const b = document.createElement('button');
                b.id = id;
                b.className = 'xg-tabbtn';
                b.innerHTML = `${icon} ${label}<span class="xg-badge" id="${id}_badge">0</span>`;
                b.onclick = () => switchXGTab(id.replace('xgTab','').toLowerCase());
                return b;
            };
            const tb = document.getElementById('xgTabBookings') || mk('xgTabBookings','🎫','Đặt ghế');
            const tr = document.getElementById('xgTabRequests') || mk('xgTabRequests','📨','Yêu cầu');
            const tc = document.getElementById('xgTabChat') || mk('xgTabChat','💬','Chat');
            anchorTab.parentElement.appendChild(tb);
            anchorTab.parentElement.appendChild(tr);
            anchorTab.parentElement.appendChild(tc);
        }

        const anchorPanel = document.getElementById('xgPassengerPanel');
        if (anchorPanel) {
            const mkPanel = (id, html) => {
                if (document.getElementById(id)) return;
                const d = document.createElement('div');
                d.id = id;
                d.style.display = 'none';
                d.style.padding = '14px';
                d.innerHTML = html;
                anchorPanel.parentElement.appendChild(d);
            };
            mkPanel('xgBookingsPanel', '<div id="xgBookingsList"></div>');
            mkPanel('xgRequestsPanel', '<div id="xgRequestsList"></div>');
            mkPanel('xgChatPanel', '<div id="xgChatList"></div>');
        }

        if (!document.getElementById('xgChatView')) {
            const cv = document.createElement('div');
            cv.id = 'xgChatView';
            cv.className = 'xg-chatview';
            cv.innerHTML = `
                <div class="xg-chdr">
                    <button onclick="closeXGChatView()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;">←</button>
                    <div style="flex:1;">
                        <div id="xgChatViewName" style="font-weight:800;font-size:14px;">Khách hàng</div>
                        <div style="font-size:10px;opacity:.9;">Xe Ghép</div>
                    </div>
                </div>
                <div class="xg-cmsgs" id="xgChatViewMessages"></div>
                <div class="xg-cinput">
                    <input type="text" id="xgChatViewInput" placeholder="Nhập tin nhắn..." onkeypress="if(event.key==='Enter')sendXGChatMessage()">
                    <button onclick="sendXGChatMessage()">➤</button>
                </div>
            `;
            document.body.appendChild(cv);
        }
    }

    function startXGListeners() {
        if (xgListenersStarted || !driverInfo) return;
        xgListenersStarted = true;

        db.ref(XG_BOOKINGS_REF).on('child_added', snap => {
            const b = snap.val();
            if (!b || b.driverId !== driverInfo.uid) return;
            xgBookingCache[snap.key] = { id: snap.key, ...b };
            if (b.status === 'waiting') {
                updateXGBadge('bookings');
                showToast(`🎫 Đặt ghế mới từ ${b.customerName || 'Khách'}`);
                speak('Có đặt ghế xe ghép mới');
                if (navigator.vibrate) navigator.vibrate([800,300,800]);
            }
        });
        db.ref(XG_BOOKINGS_REF).on('child_changed', snap => {
            const b = snap.val();
            if (b && b.driverId === driverInfo.uid) {
                xgBookingCache[snap.key] = { id: snap.key, ...b };
                updateXGBadge('bookings');
            }
        });

        db.ref(XG_REQUESTS_REF).on('child_added', snap => {
            const r = snap.val();
            if (!r || r.status !== 'waiting') return;
            xgRequestCache[snap.key] = { id: snap.key, ...r };
            updateXGBadge('requests');
            showToast(`📨 Yêu cầu xe ghép mới: ${r.customerName || 'Khách'}`);
            speak('Có yêu cầu xe ghép mới');
        });

        db.ref(XG_CHAT_REF).on('value', snap => {
            window.xgChatData = snap.val() || {};
            updateXGBadge('chat');
        });
    }

    function updateXGBadge(type) {
        let count = 0;
        if (type === 'bookings') {
            count = Object.values(xgBookingCache).filter(b => b.status === 'waiting').length;
        } else if (type === 'requests') {
            count = Object.values(xgRequestCache).filter(r => r.status === 'waiting').length;
        } else if (type === 'chat') {
            const d = window.xgChatData || {};
            for (const bid in d) {
                if (bid.endsWith('_typing')) continue;
                const msgs = d[bid];
                if (typeof msgs !== 'object') continue;
                for (const mid in msgs) {
                    const m = msgs[mid];
                    if (m && m.sender === 'customer' && !m.readByDriver) count++;
                }
            }
        }
        const el = document.getElementById(`xgTab${type.charAt(0).toUpperCase()+type.slice(1)}_badge`);
        if (el) {
            el.style.display = count > 0 ? 'flex' : 'none';
            el.innerText = count;
        }
    }

    async function renderXGBookings() {
        const box = document.getElementById('xgBookingsList');
        if (!box) return;
        box.innerHTML = '<div style="text-align:center;padding:20px;color:#999;"><i class="fas fa-spinner fa-pulse"></i></div>';
        try {
            const snap = await db.ref(XG_BOOKINGS_REF).orderByChild('driverId').equalTo(driverInfo.uid).once('value');
            const data = snap.val();
            if (!data) { box.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">🎫 Chưa có đặt ghế nào</div>'; return; }
            let list = Object.keys(data).map(id => ({ id, ...data[id] }));
            list.sort((a,b) => (b.timestamp||0)-(a.timestamp||0));
            box.innerHTML = list.map(b => {
                const time = new Date(b.timestamp).toLocaleString('vi-VN');
                let act = '';
                if (b.status === 'waiting') {
                    act = `<div class="xg-actions">
                        <button class="xg-acc" onclick="acceptXGBooking('${b.id}')">✓ Nhận đặt</button>
                        <button class="xg-rej" onclick="rejectXGBooking('${b.id}')">✗ Từ chối</button>
                    </div>`;
                } else if (b.status === 'accepted') {
                    act = `<div class="xg-actions">
                        <a class="xg-acc" href="tel:${b.customerPhone}">📞 Gọi khách</a>
                        <button class="xg-acc" style="background:#0054a3;" onclick="openXGChat('${b.id}','${escapeHtmlXG(b.customerName)}')">💬 Chat</button>
                    </div>`;
                }
                return `<div class="xg-bcard">
                    <div style="font-weight:800;font-size:14px;margin-bottom:6px;">🎫 ${escapeHtmlXG(b.route)}</div>
                    <div style="font-size:12px;color:#666;line-height:1.6;">
                        <div>👤 <b>${escapeHtmlXG(b.customerName||'Khách')}</b> · 📞 ${escapeHtmlXG(b.customerPhone||'---')}</div>
                        <div>💺 ${b.seats} ghế · <span style="color:#d32f2f;font-weight:800;">${(b.totalPrice||0).toLocaleString()}đ</span></div>
                        ${b.note ? `<div>📝 ${escapeHtmlXG(b.note)}</div>` : ''}
                        <div>🕐 ${time} · Trạng thái: <b>${b.status}</b></div>
                    </div>
                    ${act}
                </div>`;
            }).join('');
        } catch(e) { box.innerHTML = '<div style="text-align:center;padding:20px;color:red;">Lỗi tải</div>'; }
    }

    async function acceptXGBooking(id) {
        if (!confirm('Chấp nhận đặt ghế này?')) return;
        await db.ref(XG_BOOKINGS_REF + '/' + id).update({ status: 'accepted', acceptedAt: Date.now() });
        showToast('✅ Đã chấp nhận đặt ghế');
        speak('Đã nhận đặt ghế');
        renderXGBookings();
        updateXGBadge('bookings');
    }

    async function rejectXGBooking(id) {
        if (!confirm('Từ chối đặt ghế này?')) return;
        await db.ref(XG_BOOKINGS_REF + '/' + id).update({ status: 'rejected', rejectedAt: Date.now() });
        showToast('Đã từ chối');
        renderXGBookings();
        updateXGBadge('bookings');
    }

    async function renderXGRequests() {
        const box = document.getElementById('xgRequestsList');
        if (!box) return;
        box.innerHTML = '<div style="text-align:center;padding:20px;color:#999;"><i class="fas fa-spinner fa-pulse"></i></div>';
        try {
            const snap = await db.ref(XG_REQUESTS_REF).orderByChild('timestamp').once('value');
            const data = snap.val();
            if (!data) { box.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">📨 Chưa có yêu cầu nào</div>'; return; }
            let list = [];
            for (const id in data) {
                const r = data[id];
                if (r.status !== 'waiting') continue;
                if (Date.now() - (r.timestamp||0) > 24*60*60*1000) continue;
                if (r.pickupLatitude && typeof currentLat !== 'undefined' && currentLat) {
                    const d = xgHaversine(currentLat, currentLng, r.pickupLatitude, r.pickupLongitude||0);
                    if (d > 30) continue;
                    r._dist = d;
                }
                list.push({ id, ...r });
            }
            list.sort((a,b) => (a._dist||99)-(b._dist||99));
            if (!list.length) { box.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">Không có yêu cầu gần bạn (bán kính 30km)</div>'; return; }
            box.innerHTML = list.map(r => `<div class="xg-rcard">
                <div style="font-weight:800;font-size:14px;margin-bottom:6px;">📨 ${escapeHtmlXG(r.route)}</div>
                <div style="font-size:12px;color:#666;line-height:1.6;">
                    <div>👤 <b>${escapeHtmlXG(r.customerName||'Khách')}</b> · 📞 ${escapeHtmlXG(r.customerPhone||'---')}</div>
                    <div>💺 ${r.seats} ghế · <span style="color:#d32f2f;font-weight:800;">${(r.estimatedPrice||r.price||0).toLocaleString()}đ</span></div>
                    <div>🕐 ${escapeHtmlXG(r.departureTime)}${r._dist ? ' · 📍 '+r._dist.toFixed(1)+' km' : ''}</div>
                </div>
                <div class="xg-actions">
                    <button class="xg-acc" onclick="acceptXGRequest('${r.id}')">✓ Nhận & tạo chuyến</button>
                    <button class="xg-rej" onclick="rejectXGRequest('${r.id}')">✗ Bỏ qua</button>
                </div>
            </div>`).join('');
        } catch(e) { box.innerHTML = '<div style="text-align:center;padding:20px;color:red;">Lỗi tải</div>'; }
    }

    function xgHaversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2-lat1)*Math.PI/180;
        const dLon = (lon2-lon1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    async function acceptXGRequest(id) {
        const snap = await db.ref(XG_REQUESTS_REF + '/' + id).once('value');
        if (!snap.exists()) return;
        const req = snap.val();
        const price = prompt('💰 Nhập giá/ghế (VNĐ):', req.estimatedPrice || req.price || '150000');
        if (!price) return;
        const seats = prompt('💺 Số ghế trống:', '3');
        if (!seats) return;
        try {
            await db.ref(XG_DB_REF).push({
                driverId: driverInfo.uid,
                driverName: driverInfo.name,
                phone: driverInfo.phone,
                pickup: req.pickup,
                dropoff: req.dropoff,
                route: req.route,
                departureTime: req.departureTime,
                vehicle: '4-xang',
                price: parseInt(price),
                seats: parseInt(seats),
                pickupLat: req.pickupLatitude || null,
                pickupLng: req.pickupLongitude || null,
                dropoffLat: req.dropoffLatitude || null,
                dropoffLng: req.dropoffLongitude || null,
                status: 'active',
                timestamp: Date.now(),
                source: 'customer_request_accepted',
                originalRequestId: id
            });
            await db.ref(XG_REQUESTS_REF + '/' + id).update({ status: 'accepted', acceptedBy: driverInfo.uid, acceptedAt: Date.now() });
            showToast('✅ Đã tạo chuyến từ yêu cầu');
            speak('Đã chấp nhận yêu cầu');
            renderXGRequests();
            updateXGBadge('requests');
        } catch(e) { showToast('Lỗi: ' + e.message); }
    }

    async function rejectXGRequest(id) {
        await db.ref(XG_REQUESTS_REF + '/' + id).update({ status: 'rejected', rejectedAt: Date.now() });
        showToast('Đã bỏ qua');
        renderXGRequests();
        updateXGBadge('requests');
    }

    async function renderXGChatList() {
        const box = document.getElementById('xgChatList');
        if (!box) return;
        const bookingsSnap = await db.ref(XG_BOOKINGS_REF).orderByChild('driverId').equalTo(driverInfo.uid).once('value');
        const bookings = bookingsSnap.val() || {};
        const chatData = window.xgChatData || {};
        let list = [];
        for (const bid in chatData) {
            if (bid.endsWith('_typing')) continue;
            const booking = bookings[bid];
            if (!booking) continue;
            const msgs = chatData[bid];
            let last = '', lastTime = 0, unread = 0;
            for (const mid in msgs) {
                const m = msgs[mid];
                if (!m || !m.timestamp) continue;
                if (m.timestamp > lastTime) { lastTime = m.timestamp; last = m.text || ''; }
                if (m.sender === 'customer' && !m.readByDriver) unread++;
            }
            list.push({ bid, name: booking.customerName || 'Khách', last, lastTime, unread });
        }
        list.sort((a,b) => b.lastTime - a.lastTime);
        if (!list.length) { box.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">💬 Chưa có cuộc trò chuyện</div>'; return; }
        box.innerHTML = list.map(c => `<div onclick="openXGChat('${c.bid}','${escapeHtmlXG(c.name)}')" style="background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;">
            <div style="font-weight:800;font-size:13px;">💬 ${escapeHtmlXG(c.name)} ${c.unread>0?`<span style="background:#d32f2f;color:#fff;font-size:9px;padding:2px 6px;border-radius:10px;">${c.unread}</span>`:''}</div>
            <div style="font-size:11px;color:#7f8c8d;">${escapeHtmlXG(c.last.substring(0,50))||'Chưa có tin nhắn'}</div>
        </div>`).join('');
    }

    function openXGChat(bookingId, name) {
        xgActiveChatBookingId = bookingId;
        document.getElementById('xgChatView').classList.add('show');
        document.getElementById('xgChatViewName').innerText = name || 'Khách hàng';
        const mc = document.getElementById('xgChatViewMessages');
        mc.innerHTML = '';

        db.ref(XG_CHAT_REF + '/' + bookingId).once('value', s => {
            const upd = {};
            s.forEach(c => {
                const m = c.val();
                if (m && m.sender === 'customer' && !m.readByDriver) upd[c.key + '/readByDriver'] = true;
            });
            if (Object.keys(upd).length) db.ref(XG_CHAT_REF + '/' + bookingId).update(upd);
        });

        if (window.xgChatMsgListener) db.ref(XG_CHAT_REF + '/' + window.xgChatMsgListener).off();
        window.xgChatMsgListener = bookingId;
        db.ref(XG_CHAT_REF + '/' + bookingId).orderByChild('timestamp').on('child_added', s => {
            const m = s.val();
            if (!m || !m.timestamp) return;
            const isMine = m.sender === 'driver';
            const t = new Date(m.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'});
            const d = document.createElement('div');
            d.className = 'xg-msg ' + (isMine ? 'mine' : 'theirs');
            d.innerHTML = `${escapeHtmlXG(m.text)}<div style="font-size:9px;opacity:.7;margin-top:3px;">${t}</div>`;
            mc.appendChild(d);
            mc.scrollTop = mc.scrollHeight;
        });
    }

    function closeXGChatView() {
        document.getElementById('xgChatView').classList.remove('show');
        if (window.xgChatMsgListener) {
            db.ref(XG_CHAT_REF + '/' + window.xgChatMsgListener).off();
            window.xgChatMsgListener = null;
        }
        xgActiveChatBookingId = null;
        updateXGBadge('chat');
        renderXGChatList();
    }

    function sendXGChatMessage() {
        if (!xgActiveChatBookingId) return;
        const input = document.getElementById('xgChatViewInput');
        const text = input.value.trim();
        if (!text) return;
        db.ref(XG_CHAT_REF + '/' + xgActiveChatBookingId).push({
            sender: 'driver',
            senderName: driverInfo.name,
            text,
            timestamp: Date.now()
        });
        input.value = '';
    }

    const xgBootCheck = setInterval(() => {
        if (driverInfo && !xgListenersStarted) {
            startXGListeners();
        }
    }, 2000);

    startXGAutoRefresh();

    // ==================== LOGIN RESCUE ====================
    (function(){
        function h(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return 'h'+Math.abs(h).toString(36)+'_'+s.length;}
        function find(){
            var a=document.getElementById('authScreen');
            if(!a)return null;
            var tels=a.querySelectorAll('input[type="tel"]');
            var pass=a.querySelectorAll('input[type="password"]');
            var btn=null;
            a.querySelectorAll('button').forEach(function(b){
                if((b.innerText||'').indexOf('ĐĂNG NHẬP')!==-1 && (b.innerText||'').indexOf('đã có')===-1) btn=b;
            });
            return {tel:tels[tels.length-1], pass:pass[0], btn:btn};
        }
        async function go(){
            var f=find(); if(!f||!f.tel)return;
            var phone=(f.tel.value||'').trim();
            var pw=f.pass?f.pass.value:'';
            if(!phone){alert('Nhập số điện thoại');return;}
            var uid=null,user=null;
            var snap=await db.ref('drivers').once('value');
            if(snap.exists()){
                snap.forEach(function(c){
                    var v=c.val();
                    if(v && (String(v.phone)===phone || c.key===phone)){uid=c.key;user=v;}
                });
            }
            if(!user){alert('SĐT '+phone+' chưa đăng ký');return;}
            if(user.passwordHash){
                if(h(pw+phone)!==user.passwordHash && h(pw)!==user.passwordHash){
                    alert('Sai mật khẩu');return;
                }
            } else {
                await db.ref('drivers/'+uid).update({passwordHash:h(pw+phone)});
            }
            user.uid=uid;
            if(!user.carClass)user.carClass=user.carType||'4_seats';
            driverInfo=user;
            persistDriverSession(user);
            var a=document.getElementById('authScreen');
            if(a)a.style.display='none';
            if(typeof initApp==='function')initApp();
            alert('Xin chào '+(user.name||'tài xế'));
        }
        var timer=setInterval(function(){
            var f=find();
            if(f&&f.btn&&!f.btn.dataset.ok){
                f.btn.dataset.ok='1';
                f.btn.onclick=function(e){e.preventDefault();go();};
                f.btn.addEventListener('click',function(e){e.preventDefault();go();});
            }
        },300);
    })();

    // ==================== I18N ====================
    (function () {
        const LANG_KEY = 'promax_lang';
        let lang = localStorage.getItem(LANG_KEY) || 'vi';
        document.documentElement.lang = lang;

        const EN_FULL = {
            'Đối tác tài xế — Thu nhập cao, an toàn': 'Driver partner — High income, safety first',
            'Họ và tên': 'Full name', 'Số điện thoại': 'Phone number', 'Mật khẩu': 'Password',
            'Nhập mật khẩu': 'Enter password', 'Đăng nhập': 'Sign in', 'Đăng ký': 'Register',
            'ĐĂNG KÝ TÀI XẾ': 'REGISTER AS DRIVER', 'ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP': 'HAVE AN ACCOUNT? SIGN IN',
            'Đã có tài khoản? Đăng nhập': 'Have an account? Sign in',
            'Chưa có tài khoản? Đăng ký': 'No account? Register',
            'Quên mật khẩu?': 'Forgot password?', 'CCCD/CMND': 'ID card', 'Biển số xe': 'License plate',
            'Dòng xe': 'Car model', 'Xăng': 'Petrol', 'Điện': 'Electric',
            '4 Chỗ': '4 seats', '7 Chỗ': '7 seats',
            'Trang chủ': 'Home', 'Lịch sử': 'History', 'Hồ sơ': 'Profile', 'Thoát': 'Exit',
            'BẮT ĐẦU CHUYẾN ĐI': 'START TRIP', 'KẾT THÚC CHUYẾN': 'END TRIP',
            'Đăng xuất': 'Log out', 'Kiểm tra xe': 'Vehicle check', 'SOS khẩn cấp': 'SOS emergency',
            'Trợ giúp': 'Help', 'Doanh thu': 'Revenue', 'Hôm nay': 'Today',
            'Tuần này': 'This week', 'Tháng này': 'This month',
            'Đang tải...': 'Loading...', 'Làm mới': 'Refresh', 'Đóng': 'Close', 'Hủy': 'Cancel',
            'Gửi': 'Send', 'Gọi': 'Call', 'Đã đón khách': 'Picked up', 'Chỉ đường': 'Navigate',
            'Quãng đường': 'Distance', 'Tiền cước': 'Fare', 'Đang chạy': 'En route',
            'Tìm chuyến': 'Find rides', 'Của tôi': 'My trips', 'Bản đồ': 'Map',
            'Xe Ghép': 'Ride Share', 'Đặt ghế': 'Book a seat', 'Gửi yêu cầu': 'Send request',
            'Gửi yêu cầu đặt xe': 'Send ride request', 'Điểm đón': 'Pickup point',
            'Điểm đến': 'Destination', 'Điểm trả': 'Drop-off point', 'Số ghế': 'Seats',
            'ghế trống': 'seats left', 'Tài xế': 'Driver', 'Khách hàng': 'Customer',
            'Khách vẫy': 'Street-hail passenger', 'Chưa có chuyến đi nào': 'No trips yet',
            'Chưa có đặt chỗ nào': 'No bookings yet', 'Đang theo dõi...': 'Tracking...',
            'Theo dõi': 'Track', 'Chi tiết': 'Details', 'Đánh giá': 'Rate',
            'Chuyến hoàn tất!': 'Trip completed!', 'Cảm ơn!': 'Thank you!'
        };

        const EN_FRAG = [
            ['Đang tải chuyến xe ghép...', 'Loading ride-share trips...'],
            ['Không có chuyến đang mở', 'No open trips right now'],
            ['Chưa có chuyến xe ghép', 'No ride-share trips yet'],
            ['đ/ghế', ' VND/seat'], ['₫/ghế', ' VND/seat'], ['ghế trống', 'seats left'],
            ['ghế', ' seats'], ['Đang đến đón', 'Arriving'], ['Đã đến đón', 'Arrived'],
            ['Chờ xác nhận', 'Waiting for confirmation'], ['Hoàn thành', 'Completed'],
            ['Đã hủy', 'Cancelled'], ['Đang chạy', 'En route'], ['Đã nhận', 'Accepted'],
            ['Điểm đón:', 'Pickup:'], ['Điểm trả:', 'Drop-off:'], ['Đón:', 'Pickup:'],
            ['Trả:', 'Drop-off:'], ['Liên hệ', 'Contact'], ['Giá/ghế', 'Price/seat'],
            ['Số điện thoại khách', 'Customer phone'], ['Vị trí hiện tại', 'Current location'],
            ['Chưa xác định', 'Not set'], ['Tính theo KM', 'Metered by KM'],
            ['Bắt đầu chuyến', 'Start trip'], ['Kết thúc chuyến', 'End trip'],
            ['Có đơn đặt xe mới', 'New ride request'], ['Đã nhận đơn', 'Order accepted'],
            ['Khách đã hủy', 'Customer cancelled'], ['Mất kết nối', 'Connection lost'],
            ['Đã kết nối lại', 'Reconnected'], ['Đăng nhập thành công', 'Signed in successfully'],
            ['Đăng ký thành công', 'Registered successfully'], ['Sai mật khẩu', 'Wrong password'],
            ['Vui lòng điền đầy đủ', 'Please fill in all fields'], ['phút', ' min'], ['km', ' km']
        ];
        EN_FRAG.sort((a, b) => b[0].length - a[0].length);

        function translateText(t) {
            if (lang === 'vi' || !t) return t;
            const trimmed = t.trim();
            if (EN_FULL[trimmed] !== undefined) {
                const lead = t.slice(0, t.indexOf(trimmed));
                const tail = t.slice(t.indexOf(trimmed) + trimmed.length);
                return lead + EN_FULL[trimmed] + tail;
            }
            let out = t;
            for (const [vi, en] of EN_FRAG) {
                if (out.includes(vi)) out = out.split(vi).join(en);
            }
            return out;
        }

        function walk(root) {
            if (!root || !root.querySelectorAll) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(n => {
                if (!n.nodeValue || !n.nodeValue.trim()) return;
                if (n.parentElement && ['SCRIPT', 'STYLE'].includes(n.parentElement.tagName)) return;
                const nt = translateText(n.nodeValue);
                if (nt !== n.nodeValue) n.nodeValue = nt;
            });
            root.querySelectorAll('input[placeholder], textarea[placeholder], [title]').forEach(el => {
                if (el.placeholder) { const p = translateText(el.placeholder); if (p !== el.placeholder) el.placeholder = p; }
                if (el.title) { const p = translateText(el.title); if (p !== el.title) el.title = p; }
            });
        }

        function makeSwitcher() {
            if (document.getElementById('langSwitcher')) return;
            const b = document.createElement('button');
            b.id = 'langSwitcher';
            b.innerHTML = lang === 'vi' ? '🌐 EN' : '🌐 VI';
            b.style.cssText = 'position:fixed;top:10px;right:60px;z-index:99999;background:rgba(255,255,255,0.95);border:none;border-radius:20px;padding:8px 14px;font-size:12px;font-weight:800;color:#0054a3;box-shadow:0 4px 15px rgba(0,0,0,0.15);cursor:pointer;backdrop-filter:blur(4px);';
            b.onclick = function () {
                const next = lang === 'vi' ? 'en' : 'vi';
                localStorage.setItem(LANG_KEY, next);
                location.reload();
            };
            document.body.appendChild(b);
        }

        function init() {
            makeSwitcher();
            if (lang === 'en') {
                if (document.title.includes('TÀI XẾ')) document.title = 'TAXI PROMAX - DRIVER';
                if (document.title.includes('Xe Ghép')) document.title = 'TAXI PROMAX - Ride Share';
                walk(document.body);
                let timer = null;
                new MutationObserver(() => {
                    clearTimeout(timer);
                    timer = setTimeout(() => walk(document.body), 150);
                }).observe(document.body, { childList: true, subtree: true });
            }
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    })();

    // ==================== ERROR REPORTING ====================
    window.onerror = function(msg, url, line, col, error) {
        try {
            db.ref('error_logs').push({
                message: msg,
                url: url,
                line: line,
                col: col,
                driverId: driverInfo?.uid || 'unknown',
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            }).catch(() => {});
        } catch(e) {}
        return false;
    };

    window.addEventListener('unhandledrejection', function(e) {
        try {
            db.ref('error_logs').push({
                message: e.reason?.message || 'Unhandled rejection',
                driverId: driverInfo?.uid || 'unknown',
                timestamp: Date.now()
            }).catch(() => {});
        } catch(e) {}
    });

    // ==================== ONLINE/OFFLINE ====================
    window.addEventListener('online', () => { 
        document.getElementById('offlineBanner').style.display = 'none'; 
        syncDriverOnline(true); 
        if (isDriverOnline) {
            startOrderListener();
            startLocationPushing();
            startAIDispatch();
        }
        showToast('✅ Đã kết nối lại'); 
    });
    
    window.addEventListener('offline', () => { 
        document.getElementById('offlineBanner').style.display = 'block'; 
        syncDriverOnline(false); 
        stopLocationPushing();
        stopAIDispatch();
    });

    // ==================== KHỞI ĐỘNG ====================
    window.onload = () => {
        const saved = localStorage.getItem('driverInfo');
        if (saved) { 
            driverInfo = JSON.parse(saved); 
            document.getElementById('authScreen').style.display = 'none'; 
            initApp(); 
        }
    };
    


// ==================== PROMAX DRIVER FLOW BRIDGE ====================
// Public adapter for Trip Engine. The legacy variables remain private to this
// classic script; all new flow code talks through this explicit API.
window.PromaxLegacyRuntime = {
    getTotalKm: function() { return Number(totalKm) || 0; },
    getRate: function() { return Number(currentRate) || 15000; },
    getTripContext: function() {
        return { id: currentOrderId, data: currentCustomerData };
    },
    acceptOrder: function() {
        return acceptOrder();
    },
    processLocation: function(location) {
        return processBackgroundLocation(location);
    },
    getPosition: function() {
        if (currentLat == null || currentLng == null) return null;
        return {
            lat: Number(currentLat),
            lng: Number(currentLng),
            heading: Number(currentHeading) || 0,
            timestamp: Date.now()
        };
    },
    setTripContext: function(orderId, orderData) {
        currentOrderId = orderId || null;
        currentCustomerData = orderData || null;
        if (orderData && orderData.isStreetHail) isStreetHail = true;
    },
    setFlowState: function(next) {
        next = next || {};
        isRunning = Boolean(next.isRunning);
        hasPickedUp = Boolean(next.hasPickedUp);
        isStreetHail = Boolean(next.isStreetHail);
        window.navigationMode = next.navigationMode || 'idle';
        window.fareActive = Boolean(next.fareActive);
    },
    resetDistance: function() {
        totalKm = 0;
        lastValidPos = null;
        lastValidTime = 0;
        lastDisplayedFare = 0;
        isGapMode = false;
    }
};

window.__PromaxLegacyHandlers = {
    completeTrip: function() {
        return completeTrip();
    },
    cancelTrip: function(reason) {
        if (currentOrderId && typeof db !== 'undefined') {
            db.ref(`datxe/${currentOrderId}`).update({
                status: 'cancelled',
                cancelReason: reason || 'Tài xế hủy',
                cancelledAt: Date.now()
            }).catch(function() {});
        }
        isRunning = false;
        hasPickedUp = false;
        isStreetHail = false;
        totalKm = 0;
        currentOrderId = null;
        currentCustomerData = null;
        if (typeof stopForegroundService === 'function') stopForegroundService();
        if (typeof disableKeepAwake === 'function') disableKeepAwake();
        var panel = document.getElementById('tripInfoPanel');
        var home = document.getElementById('homeControls');
        var stats = document.getElementById('statsUI');
        if (panel) panel.style.display = 'none';
        if (home) home.style.display = 'block';
        if (stats) stats.classList.remove('show');
    }
};
