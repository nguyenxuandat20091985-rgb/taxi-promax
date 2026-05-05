/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN
 * Chủ tài khoản: NGUYỄN XUÂN ĐẠT - 4430269669
 * Cơ chế: Khóa Bản đồ nhiệt/Tìm khách khi hết hạn. Tính tiền chuyến vẫy vẫn mở.
 */

// 1. Hàm phát âm thanh thông báo
function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        window.speechSynthesis.speak(msg);
    }
}

// 2. KIỂM TRA TRẠNG THÁI GÓI CƯỚC (Hàm này dùng để đóng/mở tính năng)
function isSubscribed() {
    const expiry = localStorage.getItem('tp_expiry');
    if (!expiry) return false;
    const now = new Date().getTime();
    return (parseInt(expiry) - now) > 0;
}

// 3. HÀM DÙNG ĐỂ KHÓA TÍNH NĂNG CAO CẤP
// Anh dùng hàm này bọc quanh các tính năng Tìm khách và Bản đồ nhiệt
function accessPremiumFeature(featureName, callback) {
    if (isSubscribed()) {
        callback(); // Còn hạn thì cho chạy
    } else {
        tpSpeak(`Gói dùng thử của anh Đạt đã hết hạn. Anh nạp thêm để dùng tính năng ${featureName} nhé.`);
        alert(`Tính năng ${featureName} đã bị khóa. Vui lòng nạp gói cước để mở lại!`);
        // Tự động cuộn đến phần chọn gói cước
        const pricing = document.getElementById('pricing-section');
        if (pricing) pricing.scrollIntoView({behavior: "smooth"});
    }
}

// 4. Hiển thị thông tin gói cước lên giao diện
function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "CHƯA ĐĂNG KÝ";
    const statusContainer = document.getElementById('subscription-status');

    if (!statusContainer) return;

    if (!expiry) {
        statusContainer.innerHTML = `<div style="color: #888; font-size: 14px;">Trạng thái: <b>${planName}</b></div>`;
        return;
    }

    const now = new Date().getTime();
    const timeLeft = parseInt(expiry) - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

    if (timeLeft <= 0) {
        statusContainer.innerHTML = `<div style="color: #d32f2f; font-weight: bold; background: #fff1f0; padding: 10px; border-radius: 12px; border: 1px solid #ffa39e;">Gói đã hết hạn - Vui lòng nạp thêm</div>`;
        localStorage.removeItem('tp_expiry');
        localStorage.removeItem('active_plan_name');
    } else {
        let isExpiringSoon = daysLeft <= 2;
        statusContainer.innerHTML = `
            <div style="background: white; padding: 12px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee;">
                <div style="font-size: 12px; color: #888; text-transform: uppercase;">Gói dịch vụ</div>
                <div style="font-size: 16px; color: #333; font-weight: bold; margin: 4px 0;">${planName}</div>
                <div style="font-size: 14px; color: ${isExpiringSoon ? '#ff4d4f' : '#52c41a'}; font-weight: 500;">
                    ${isExpiringSoon ? '⚠️ Sắp hết hạn: ' : '✅ Còn lại: '} ${daysLeft} ngày
                </div>
            </div>
        `;

        if (isExpiringSoon && !sessionStorage.getItem('notified_expiry')) {
            tpSpeak(`Anh Đạt ơi, gói cước sắp hết hạn rồi. Anh nhớ gia hạn để không bị khóa tính năng tìm khách nhé.`);
            sessionStorage.setItem('notified_expiry', 'true');
        }
    }
}

// 5. Hàm khởi tạo thanh toán QR
async function createPayment(amount, planName) {
    tpSpeak(`Đang tạo mã QR BIDV nạp gói ${planName}.`);

    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 

    const txID = localStorage.getItem('tx_id') || "DAT";
    const description = `${txID} ${planName}`;

    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    localStorage.setItem('pending_plan', planName);

    try {
        fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: description }),
        });
    } catch (e) { console.log("Silent registration..."); }

    showQRModal(qrImageUrl, amount, planName, description);
}

// 6. Giao diện Modal QR chuyên nghiệp
function showQRModal(qrImageUrl, amount, planName, description) {
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(8px);">
            <div style="background:white; width:90%; max-width:350px; border-radius:25px; overflow:hidden; text-align:center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                <div style="background:linear-gradient(135deg, #0054a3 0%, #002d5a 100%); color:white; padding:18px; font-weight:bold; font-size:17px;">THANH TOÁN BIDV</div>
                <div style="padding:25px;">
                    <div style="margin-bottom:15px; color:#666; font-size:14px;">Gói cước: <b>${planName}</b></div>
                    <div style="border:1px solid #f0f0f0; padding:8px; border-radius:16px; background:#fff;">
                        <img src="${qrImageUrl}" style="width:100%; display:block; border-radius:10px;">
                    </div>
                    <div style="margin-top:20px; background:#f8f9fa; padding:15px; border-radius:15px;">
                        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
                            <span style="color:#888;">Số tiền:</span>
                            <span style="color:#d32f2f; font-weight:bold; font-size:16px;">${amount.toLocaleString()}đ</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:13px;">
                            <span style="color:#888;">Nội dung:</span>
                            <span style="color:#0054a3; font-weight:bold;">${description}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; border-top:1px solid #eee;">
                    <button onclick="document.getElementById('tp-qr-overlay').remove()" style="flex:1; padding:18px; border:none; background:none; color:#999; font-weight:bold; cursor:pointer;">HỦY BỎ</button>
                    <button onclick="location.reload()" style="flex:1; padding:18px; border:none; background:none; color:#0054a3; font-weight:bold; cursor:pointer;">XÁC NHẬN</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 7. Tự động kiểm tra và cộng hạn dùng
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 30;
        if(planName?.includes("LẺ")) days = 1;
        else if(planName?.includes("MAX")) days = 90;
        else if(planName?.includes("7") || planName?.includes("THỬ")) days = 7;

        const now = new Date().getTime();
        const current = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExp = Math.max(current, now) + (days * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExp);
        localStorage.setItem('active_plan_name', planName);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Tuyệt vời! Đã kích hoạt thành công gói ${planName}. Cảm ơn anh ạ.`);
        window.history.replaceState({}, '', window.location.pathname);
    }
    updateSubscriptionUI();
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
