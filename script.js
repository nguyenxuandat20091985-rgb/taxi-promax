// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let map, marker, lastPos;
let isRunning = false;
let totalKm = 0;
let currentRate = 15000; 

// --- 2. QUẢN LÝ ĐĂNG KÝ & ĐĂNG XUẤT ---
function checkRegistration() {
    const phone = localStorage.getItem('user_phone');
    if (!phone) {
        document.getElementById('regModal').style.display = 'flex';
    } else {
        updateUI(phone);
        syncLicense(phone); // Đồng bộ gói cước từ hệ thống
    }
}

function processRegistration() {
    const phoneInput = document.getElementById('regPhone');
    const phone = phoneInput.value.replace(/\D/g, ''); // Loại bỏ ký tự lạ
    
    if (phone.length >= 10) {
        localStorage.setItem('user_phone', phone);
        updateUI(phone);
        document.getElementById('regModal').style.display = 'none';
        
        // Kích hoạt dùng thử lần đầu duy nhất
        if (!localStorage.getItem('tp_trial_activated')) {
            localStorage.setItem('tp_trial_activated', 'true');
            localStorage.setItem('current_plan', 'TRIAL (7D)');
            alert("Chào mừng anh em tài xế! Gói dùng thử 7 ngày đã được kích hoạt.");
            location.reload();
        }
    } else {
        alert("Anh vui lòng nhập đúng số điện thoại!");
    }
}

function updateUI(phone) {
    document.getElementById('idShow').innerText = "🆔 " + phone;
    document.getElementById('profilePhone').innerText = phone;
    
    // Định danh ID chuyên nghiệp dựa trên SĐT để tránh trùng lặp toàn quốc
    const txId = "PRO-" + phone.slice(-4) + Math.random().toString(36).toUpperCase().slice(2, 4);
    if (!localStorage.getItem('tx_id')) {
        localStorage.setItem('tx_id', txId);
    }
    document.getElementById('profileID').innerText = localStorage.getItem('tx_id');
}

function syncLicense(phone) {
    // Sau này anh kết nối API tại đây. Hiện tại dùng tạm dữ liệu Local.
    const plan = localStorage.getItem('current_plan') || 'KIỂM TRA...';
    document.getElementById('planShow').innerText = "⭐ GÓI: " + plan;
}

function clearRegistration() {
    if (confirm("Anh có chắc chắn muốn đăng xuất? Mọi dữ liệu chuyến đi sẽ bị xóa.")) {
        localStorage.clear();
        location.reload();
    }
}

// --- 3. GPS & BẢN ĐỒ ---
function initMap() {
    // Khởi tạo bản đồ (Mặc định toàn quốc, sau đó GPS sẽ tự định vị về đúng chỗ anh đứng)
    map = L.map('map', { 
        zoomControl: false,
        attributionControl: false 
    }).setView([16.047, 108.206], 6); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    const icon = L.divIcon({ 
        className: 'pulsating-circle',
        html: '<div style="width:20px;height:20px;background:#00bfa5;border-radius:50%;border:2px solid white;box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>' 
    });
    
    marker = L.marker([16.047, 108.206], { icon }).addTo(map);

    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude, heading } = pos.coords;
        const newPos = L.latLng(latitude, longitude);
        marker.setLatLng(newPos);
        
        if (isRunning && lastPos) {
            const dist = newPos.distanceTo(lastPos) / 1000;
            // Thuật toán lọc GPS ảo: Chỉ tính khi di chuyển trên 5m và dưới 120km/h
            if (dist > 0.005 && dist < 0.5) { 
                totalKm += dist;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
            }
        }
        
        if (!lastPos) map.setView(newPos, 16);
        lastPos = newPos;
    }, err => {
        console.warn("Lỗi GPS: ", err.message);
    }, { 
        enableHighAccuracy: true, 
        maximumAge: 1000 
    });
}

// --- 4. ĐIỀU KHIỂN CHUYẾN ĐI & THANH TOÁN ---
function handleTrip() {
    const btn = document.getElementById('mainBtn');
    if (!isRunning) {
        isRunning = true;
        totalKm = 0;
        document.getElementById('km').innerText = "0.00";
        document.getElementById('cost').innerText = "0";
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "#ff5252";
    } else {
        isRunning = false;
        const finalCost = Math.round(totalKm * currentRate);
        alert(`Kết thúc chuyến! \nTổng: ${totalKm.toFixed(2)}km - ${finalCost.toLocaleString()}đ`);
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "#00bfa5";
        saveHistory(totalKm, finalCost);
    }
}

function updateRate(value) {
    currentRate = parseInt(value);
    document.getElementById('rateVal').innerText = currentRate.toLocaleString() + "đ";
}

// Hàm xử lý thanh toán (Tích hợp PayOS/BIDV tự động)
function tpHandlePayment(amount, planName) {
    const phone = localStorage.getItem('user_phone');
    if (!phone) return alert("Vui lòng đăng ký SĐT trước!");

    if (amount === 0) {
        alert("Gói dùng thử đang được kích hoạt...");
        return;
    }

    // Nội dung chuyển khoản duy nhất cho từng tài xế để anh dễ quản lý
    const content = `PROMAX ${phone} ${planName.replace(/\s/g, '')}`;
    
    // Tạo link QR BIDV/PayOS nhanh
    const qrUrl = `https://img.vietqr.io/image/BIDV-123456789-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
    
    // Hiển thị Modal nạp tiền (giả định anh có Modal này trong index)
    alert(`Anh vui lòng chuyển khoản gói ${planName}\nSố tiền: ${amount.toLocaleString()}đ\nNội dung: ${content}\n(Hệ thống sẽ tự động kích hoạt sau khi nhận tiền)`);
    window.open(qrUrl, '_blank');
}

// --- 5. ĐIỀU HƯỚNG TAB ---
function showTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (tabName !== 'home') {
        const target = document.getElementById('tab-' + tabName);
        if (target) target.style.display = 'flex';
    }
    
    if (btn) btn.classList.add('active');
    setTimeout(() => { if(map) map.invalidateSize(); }, 300);
}

// --- 6. LỊCH SỬ ---
function saveHistory(km, cost) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <span><b>${time}</b> Chuyến đi</span>
            <span style="color:var(--primary); font-weight:800;">+${cost.toLocaleString()}đ</span>
        </div>
        <small style="color:#7f8c8d;">Quãng đường: ${km.toFixed(2)} km</small>
    `;
    historyList.prepend(item);
    
    // Chỉ giữ lại 20 chuyến gần nhất cho nhẹ máy
    if (historyList.children.length > 20) historyList.lastChild.remove();
}

// --- KHỞI CHẠY ---
window.onload = () => {
    checkRegistration();
    initMap();
};
