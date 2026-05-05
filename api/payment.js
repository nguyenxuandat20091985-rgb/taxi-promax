
/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN 
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 * Hệ thống: Tự động tính toán hạn dùng và khóa tính năng Premium.
 */

// 1. PHÁT ÂM THANH THÔNG BÁO (Hỗ trợ tương tác giọng nói)
function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        msg.rate = 1.1; // Tốc độ nói nhanh hơn chút cho chuyên nghiệp
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

// 3. KHÓA TÍNH NĂNG CAO CẤP
function accessPremiumFeature(featureName, callback) {
    if (isSubscribed()) {
        callback();
    } else {
        tpSpeak(`Gói dịch vụ đã hết hạn. Anh Đạt nạp thêm để dùng tính năng ${featureName} nhé.`);
        alert(`Tính năng ${featureName} yêu cầu gói cước còn hạn!`);
        if(typeof showTab === "function") showTab('vi'); 
    }
}

// 4. CẦU NỐI THANH TOÁN (Bắt sự kiện từ các nút trong index.html)
window.tpHandlePayment = function(amount, planName) {
    // Lấy SĐT từ hệ thống đăng ký của anh
    const driverPhone = localStorage.getItem('userPhone') || "0388724966"; 

    if (amount === 0) {
        // Xử lý gói dùng thử 7 ngày
        if (!localStorage.getItem('tp_trial_used')) {
            localStorage.setItem('pending_plan', "GÓI DÙNG THỬ");
            localStorage.setItem('tp_trial_used', 'true');
            // Kích hoạt ngay bằng cách giả lập status
            window.location.href = window.location.pathname + "?status=success";
        } else {
            tpSpeak("Gói dùng thử này anh đã sử dụng rồi ạ.");
            alert("Mỗi tài xế chỉ được dùng thử 1 lần duy nhất!");
        }
    } else {
        createPayment(amount, planName, driverPhone);
    }
};

// 5. TẠO QR THANH TOÁN
async function createPayment(amount, planName, phone) {
    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 

    // Nội dung chuyển khoản chuẩn để sau này anh dùng API quét cho dễ
    const description = `PROMAX ${phone} ${planName.toUpperCase().replace(/\s/g, '')}`;

    // VietQR Template: qr_only (Chỉ hiện mã QR và thông tin tối giản)
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    localStorage.setItem('pending_plan', planName);
    tpSpeak(`Đang tạo mã QR nạp gói ${planName}. Anh quét mã để kích hoạt tự động nhé.`);

    // Hiển thị lên Modal QR trong index.html
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
        // Nếu Modal bị lỗi hoặc chưa load kịp
        alert(`THÔNG TIN THANH TOÁN:\nSố tiền: ${amount.toLocaleString()}đ\nNội dung: ${description}`);
        window.open(qrImageUrl, '_blank');
    }
}

// 6. TỰ ĐỘNG CẬP NHẬT GIAO DIỆN (Đồng bộ với Header)
function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "CHƯA NẠP";
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
        planShow.style.color = "#ff4d4d";
    } else {
        planShow.innerText = `⭐ ${planName} (${daysLeft}D)`;
        planShow.style.color = "#f1c40f";
        
        // Cảnh báo hết hạn bằng giọng nói khi còn dưới 1 ngày
        if (daysLeft === 1 && !sessionStorage.getItem('warned')) {
            tpSpeak("Anh Đạt ơi, gói cước của anh chỉ còn một ngày. Anh nhớ nạp để không bị gián đoạn nhé.");
            sessionStorage.setItem('warned', 'true');
        }
    }
}

// 7. XỬ LÝ KÍCH HOẠT SAU KHI NẠP TIỀN
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 0;
        // Logic cộng ngày dựa trên tên gói
        if (planName.includes("LẺ")) days = 1;
        else if (planName.includes("PRO MAX")) days = 90;
        else if (planName.includes("PRO")) days = 30;
        else if (planName.includes("THỬ")) days = 7;

        if (days > 0) {
            const now = new Date().getTime();
            const currentExp = parseInt(localStorage.getItem('tp_expiry') || now);
            
            // Nếu còn hạn thì cộng dồn, nếu hết hạn thì cộng từ hôm nay
            const startTime = Math.max(currentExp, now);
            const newExp = startTime + (days * 24 * 60 * 60 * 1000);
            
            localStorage.setItem('tp_expiry', newExp);
            localStorage.setItem('active_plan_name', planName);
            localStorage.removeItem('pending_plan');

            tpSpeak(`Tuyệt vời! Đã kích hoạt thành công gói ${planName}. Chúc anh nổ cuốc liên tục.`);
            
            // Làm sạch URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
    updateSubscriptionUI();
}

// Chạy kiểm tra ngay khi load trang
document.addEventListener('DOMContentLoaded', () => {
    checkPaymentStatus();
    // Cập nhật giao diện mỗi phút để tính toán lại ngày
    setInterval(updateSubscriptionUI, 60000);
});
