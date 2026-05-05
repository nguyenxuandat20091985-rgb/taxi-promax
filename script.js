/**
 * TAXI PROMAX - BỘ NÃO ĐIỀU KHIỂN (CORE LOGIC)
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let map, marker, lastPos;
let isRunning = false;
let totalKm = 0;
let currentRate = 15000; 

// --- 2. QUẢN LÝ ĐĂNG KÝ & ĐỊNH DANH ---
function checkRegistration() {
    const phone = localStorage.getItem('userPhone'); // Đồng nhất biến với payment.js
    if (!phone) {
        document.getElementById('regModal').style.display = 'flex';
    } else {
        updateUI(phone);
        if (typeof updateSubscriptionUI === "function") updateSubscriptionUI();
    }
}

function processRegistration() {
    const phoneInput = document.getElementById('regPhone');
    const phone = phoneInput.value.replace(/\D/g, ''); 
    
    if (phone.length >= 10) {
        localStorage.setItem('userPhone', phone);
        
        // Tạo ID thiết bị duy nhất
        const deviceID = "PMX-" + Math.random().toString(36).toUpperCase().slice(2, 7);
        localStorage.setItem('deviceID', deviceID);
        
        updateUI(phone);
        document.getElementById('regModal').style.display = 'none';
        
        // Tự động tặng 7 ngày dùng thử cho tài xế mới
        if (!localStorage.getItem('tp_trial_used')) {
            tpHandlePayment(0, "GÓI THỬ 7D"); 
        }
    } else {
        alert("Anh vui lòng nhập đúng số điện thoại!");
    }
}

function updateUI(phone) {
    if(document.getElementById('idShow')) document.getElementById('idShow').innerText = "🆔 " + phone;
    if(document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
    if(document.getElementById('profileID')) document.getElementById('profileID').innerText = localStorage.getItem('deviceID') || "ĐANG CẤP...";
}

function clearRegistration() {
    if (confirm("Anh có chắc chắn muốn đăng xuất? Mọi dữ liệu gói cước và lịch sử sẽ bị xóa khỏi máy này.")) {
        localStorage.clear();
        location.reload();
    }
}

// --- 3. HỆ THỐNG GPS & ĐO QUÃNG ĐƯỜNG CHUẨN ---
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([16.047, 108.206], 6); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    const icon = L.divIcon({ 
        className: 'pulsating-circle',
        html: '<div style="width:18px;height:18px;background:#0054a3;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.4);"></div>' 
    });
    
    marker = L.marker([16.047, 108.206], { icon }).addTo(map);

    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newPos = L.latLng(latitude, longitude);
        
        // Chỉ cập nhật nếu độ chính xác GPS tốt (dưới 50m)
        if (accuracy > 50) return;

        marker.setLatLng(newPos);
        
        if (isRunning && lastPos) {
            const dist = newPos.distanceTo(lastPos) / 1000; // Đổi sang KM
            
            /** * THUẬT TOÁN LỌC NHIỄU GPS CỦA ĐẠT PROMAX:
             * 1. Phải di chuyển trên 10m mới tính (tránh nhảy số khi đứng yên)
             * 2. Tốc độ không được quá 150km/h (tránh lỗi nhảy vọt tọa độ)
             */
            if (dist > 0.01 && dist < 0.3) { 
                totalKm += dist;
                updateStatsDisplay();
            }
        }
        
        if (!lastPos) map.setView(newPos, 16);
        lastPos = newPos;
    }, err => {
        console.error("Lỗi định vị:", err);
    }, { enableHighAccuracy: true, maximumAge: 1000 });
}

function updateStatsDisplay() {
    document.getElementById('km').innerText = totalKm.toFixed(2);
    const cost = Math.round(totalKm * currentRate);
    document.getElementById('cost').innerText = cost.toLocaleString();
}

// --- 4. ĐIỀU KHIỂN CHUYẾN ĐI ---
function handleTrip() {
    const btn = document.getElementById('mainBtn');
    
    // Kiểm tra hạn dùng trước khi cho bắt đầu (Chỉ tài khoản còn hạn mới được chạy)
    if (!isRunning && typeof isSubscribed === "function" && !isSubscribed()) {
        if(typeof tpSpeak === "function") tpSpeak("Anh ơi, gói cước hết hạn rồi. Nạp thêm để bắt đầu chuyến đi nhé.");
        alert("Gói cước của anh đã hết hạn!");
        showTab('vi');
        return;
    }

    if (!isRunning) {
        // Bắt đầu
        isRunning = true;
        totalKm = 0;
        updateStatsDisplay();
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "#d32f2f"; // Đỏ
        if(typeof tpSpeak === "function") tpSpeak("Bắt đầu tính cước. Chúc anh thượng lộ bình an.");
    } else {
        // Kết thúc
        isRunning = false;
        const finalCost = Math.round(totalKm * currentRate);
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "#00bfa5"; // Xanh
        
        if (totalKm > 0.05) {
            saveHistory(totalKm, finalCost);
            if(typeof tpSpeak === "function") tpSpeak(`Kết thúc chuyến đi. Tổng cộng ${totalKm.toFixed(1)} km. Số tiền ${finalCost.toLocaleString()} đồng.`);
        }
    }
}

function updateRate(value) {
    currentRate = parseInt(value);
    document.getElementById('rateVal').innerText = currentRate.toLocaleString() + "đ";
}

// --- 5. ĐIỀU HƯỚNG TAB MƯỢT MÀ ---
function showTab(tabName, btn) {
    // Ẩn tất cả tab
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    // Bỏ active tất cả nút
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Hiện tab được chọn
    const target = document.getElementById('tab-' + tabName);
    if (target) {
        target.style.display = 'flex';
        target.style.flexDirection = 'column';
    }
    
    // Active nút bấm
    if (btn) btn.classList.add('active');
    else {
        // Nếu chuyển tab bằng code (không bấm nút)
        const navItems = document.querySelectorAll('.nav-item');
        if(tabName === 'vi') navItems[1].classList.add('active');
    }
    
    // Fix lỗi bản đồ bị đen khi chuyển tab
    if (tabName === 'home' || !tabName) {
        setTimeout(() => { if(map) map.invalidateSize(); }, 300);
    }
}

// --- 6. QUẢN LÝ LỊCH SỬ (LƯU BỀN VỮNG) ---
function saveHistory(km, cost) {
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth()+1}`;
    
    const newTrip = { time: timeStr, km: km.toFixed(2), cost: cost.toLocaleString() };
    
    // Lưu vào LocalStorage để không bị mất khi load lại trang
    let history = JSON.parse(localStorage.getItem('trip_history') || "[]");
    history.unshift(newTrip);
    history = history.slice(0, 50); // Giữ tối đa 50 chuyến
    localStorage.setItem('trip_history', JSON.stringify(history));
    
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem('trip_history') || "[]");
    container.innerHTML = history.map(trip => `
        <div class="p-card" style="margin-bottom:10px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:#666;">${trip.time}</span>
                <b style="color:#0054a3;">+${trip.cost}đ</b>
            </div>
            <div style="font-size:14px; font-weight:bold; margin-top:5px;">🏁 Quãng đường: ${trip.km} km</div>
        </div>
    `).join('');
}

// --- KHỞI CHẠY HỆ THỐNG ---
window.onload = () => {
    checkRegistration();
    initMap();
    renderHistory();
    // Tự động cập nhật giao diện gói cước từ payment.js
    if (typeof updateSubscriptionUI === "function") updateSubscriptionUI();
};
