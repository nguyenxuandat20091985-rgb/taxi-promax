/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN
 * Chủ tài khoản: NGUYỄN XUÂN ĐẠT - 4430269669
 * Cơ chế: Khóa tính năng cao cấp khi hết hạn.
 */

// 1. PHÁT ÂM THANH THÔNG BÁO
function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        window.speechSynthesis.speak(msg);
    }
}

// 2. KIỂM TRA TRẠNG THÁI GÓI CƯỚC
function isSubscribed() {
    const expiry = localStorage.getItem('tp_expiry');
    if (!expiry) return false;
    const now = new Date().getTime();
    return (parseInt(expiry) - now) > 0;
}

// 3. KHÓA TÍNH NĂNG CAO CẤP (Dùng cho Radar/Bản đồ nhiệt)
function accessPremiumFeature(featureName, callback) {
    if (isSubscribed()) {
        callback();
    } else {
        tpSpeak(`Gói dịch vụ đã hết hạn. Anh Đạt nạp thêm để dùng tính năng ${featureName} nhé.`);
        alert(`Tính năng ${featureName} yêu cầu gói cước còn hạn!`);
        showTab('vi'); // Chuyển sang tab Ví tiền để nạp
    }
}

// 4. CẦU NỐI THANH TOÁN (Gọi từ các nút bấm ở index.html)
function tpHandlePayment(amount, planName) {
    if (amount === 0) {
        // Xử lý gói dùng thử 7 ngày (Chỉ dùng 1 lần)
        if (!localStorage.getItem('tp_trial_activated')) {
            localStorage.setItem('pending_plan', planName);
            localStorage.setItem('tp_trial_activated', 'true');
            // Kích hoạt ngay bằng cách giả lập status success
            window.location.href = window.location.pathname + "?status=success";
        } else {
            tpSpeak("Gói dùng thử này anh đã sử dụng rồi ạ.");
            alert("Anh đã dùng gói dùng thử trước đó!");
        }
    } else {
        // Gọi hàm tạo QR BIDV
        createPayment(amount, planName);
    }
}

// 5. KHỞI TẠO THANH TOÁN QR BIDV
async function createPayment(amount, planName) {
    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 

    // Nội dung: PROMAX + SĐT + Tên Gói
    const phone = localStorage.getItem('user_phone') || "0000000000";
    const description = `PROMAX ${phone} ${planName.replace(/\s/g, '')}`;

    // Link ảnh QR từ VietQR (Tự động điền số tiền và nội dung)
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    localStorage.setItem('pending_plan', planName);

    // Phát âm thanh
    tpSpeak(`Đang tạo mã QR BIDV nạp gói ${planName}. Anh quét mã để kích hoạt nhé.`);

    // Hiển thị Modal QR đã có sẵn trong file index.html của anh
    const qrModal = document.getElementById('tp-qr-overlay');
    const qrImg = document.getElementById('qrImageDisplay');
    const qrAmt = document.getElementById('qrAmountShow');
    const qrCnt = document.getElementById('qrContentShow');

    if (qrModal && qrImg) {
        qrImg.src = qrImageUrl;
        qrAmt.innerText = amount.toLocaleString() + "đ";
        qrCnt.innerText = description;
        qrModal.style.display = 'flex';
    } else {
        // Nếu file index chưa cập nhật Modal mới, dùng hàm dự phòng
        showQRModalFallback(qrImageUrl, amount, planName, description);
    }
}

// 6. TỰ ĐỘNG CẬP NHẬT GIAO DIỆN GÓI CƯỚC
function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "CHƯA ĐĂNG KÝ";
    const planShow = document.getElementById('planShow');

    if (!planShow) return;

    if (!expiry) {
        planShow.innerText = "⭐ GÓI: " + planName;
        return;
    }

    const now = new Date().getTime();
    const timeLeft = parseInt(expiry) - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

    if (timeLeft <= 0) {
        planShow.innerText = "❌ HẾT HẠN";
        planShow.style.color = "red";
    } else {
        planShow.innerText = `⭐ ${planName} (${daysLeft}D)`;
        planShow.style.color = "var(--gold)";
        
        // Nhắc gia hạn nếu còn dưới 2 ngày
        if (daysLeft <= 2 && !sessionStorage.getItem('notified_expiry')) {
            tpSpeak(`Anh ơi, gói cước còn ${daysLeft} ngày là hết hạn. Anh nhớ nạp thêm nhé.`);
            sessionStorage.setItem('notified_expiry', 'true');
        }
    }
}

// 7. KIỂM TRA TRẠNG THÁI SAU KHI QUAY LẠI TỪ THANH TOÁN
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 0;
        if(planName?.includes("LẺ")) days = 1;
        else if(planName?.includes("MAX")) days = 90;
        else if(planName?.includes("PRO")) days = 30;
        else if(planName?.includes("7") || planName?.includes("THỬ")) days = 7;

        if (days > 0) {
            const now = new Date().getTime();
            const current = parseInt(localStorage.getItem('tp_expiry') || now);
            const newExp = Math.max(current, now) + (days * 24 * 60 * 60 * 1000);
            
            localStorage.setItem('tp_expiry', newExp);
            localStorage.setItem('active_plan_name', planName);
            localStorage.removeItem('pending_plan');

            tpSpeak(`Tuyệt vời! Đã kích hoạt thành công gói ${planName}. Chúc anh nổ cuốc liên tục.`);
            
            // Xóa tham số status trên URL cho sạch
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
    updateSubscriptionUI();
}

// Hàm dự phòng nếu Modal trong index.html bị lỗi
function showQRModalFallback(url, amt, plan, desc) {
    alert(`THÔNG TIN THANH TOÁN BIDV:\n- Gói: ${plan}\n- Số tiền: ${amt.toLocaleString()}đ\n- Nội dung: ${desc}\n\n(Vui lòng quét mã QR trên màn hình tiếp theo)`);
    window.open(url, '_blank');
}

// Khởi chạy khi tải trang
document.addEventListener('DOMContentLoaded', checkPaymentStatus);
