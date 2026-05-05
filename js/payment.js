/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN
 * Phát triển bởi: Nguyễn Xuân Đạt - 4430269669
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

// 2. Hiển thị thông tin gói cước lên màn hình chính
function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "CHƯA ĐĂNG KÝ";
    const statusContainer = document.getElementById('subscription-status'); // Đảm bảo trong HTML có ID này

    if (!statusContainer) return;

    if (!expiry) {
        statusContainer.innerHTML = `<div style="color: #888;">Gói: <b>${planName}</b></div>`;
        return;
    }

    const now = new Date().getTime();
    const timeLeft = parseInt(expiry) - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

    if (timeLeft <= 0) {
        statusContainer.innerHTML = `<div style="color: red; font-weight: bold;">Hết hạn: Vui lòng gia hạn</div>`;
        localStorage.removeItem('tp_expiry');
        localStorage.removeItem('active_plan_name');
    } else {
        let alertStyle = daysLeft <= 2 ? "color: red; animation: blink 1s infinite;" : "color: #0054a3;";
        statusContainer.innerHTML = `
            <div style="background: #f8f9fa; padding: 10px; border-radius: 10px; border: 1px solid #eee;">
                <div style="font-size: 13px; color: #666;">Gói đang dùng: <b style="color: #333;">${planName}</b></div>
                <div style="font-size: 15px; ${alertStyle}">Còn lại: <b>${daysLeft} ngày</b></div>
            </div>
        `;

        // Cảnh báo giọng nói khi sắp hết hạn (dưới 2 ngày)
        if (daysLeft <= 2 && !sessionStorage.getItem('notified_expiry')) {
            tpSpeak(`Cảnh báo, gói cước của anh Đạt sắp hết hạn. Anh vui lòng gia hạn để không bị gián đoạn.`);
            sessionStorage.setItem('notified_expiry', 'true');
        }
    }
}

// 3. Hàm khởi tạo thanh toán
async function createPayment(amount, planName) {
    tpSpeak(`Đang tạo mã QR thanh toán gói ${planName}.`);

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
    } catch (e) { console.log("Background registration..."); }

    showQRModal(qrImageUrl, amount, planName, description);
}

// 4. Giao diện Modal QR (Đã bỏ chữ "Giữ nguyên")
function showQRModal(qrImageUrl, amount, planName, description) {
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(8px);">
            <div style="background:white; width:90%; max-width:350px; border-radius:25px; overflow:hidden; text-align:center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                <div style="background:#0054a3; color:white; padding:18px; font-weight:bold; font-size:17px;">THANH TOÁN QR</div>
                <div style="padding:25px;">
                    <div style="margin-bottom:15px; color:#555;">Đăng ký: <b>${planName}</b></div>
                    <div style="border:1px solid #eee; padding:10px; border-radius:15px;"><img src="${qrImageUrl}" style="width:100%; display:block; border-radius:10px;"></div>
                    <div style="margin-top:20px; background:#f8f9fa; padding:15px; border-radius:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
                            <span style="color:#888;">Số tiền:</span>
                            <span style="color:#d32f2f; font-weight:bold;">${amount.toLocaleString()}đ</span>
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

// 5. Kiểm tra và kích hoạt tự động
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 30;
        if(planName?.includes("LẺ")) days = 1;
        if(planName?.includes("MAX")) days = 90;
        if(planName?.includes("7")) days = 7;

        const now = new Date().getTime();
        const current = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExp = Math.max(current, now) + (days * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExp);
        localStorage.setItem('active_plan_name', planName); // Lưu tên gói để hiển thị
        localStorage.removeItem('pending_plan');

        tpSpeak(`Chúc mừng anh Đạt! Kích hoạt thành công gói ${planName}.`);
        window.history.replaceState({}, '', window.location.pathname);
    }
    updateSubscriptionUI();
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
