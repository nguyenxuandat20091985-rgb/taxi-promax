/**
 * TAXI PROMAX - HỆ THỐNG QR BIDV TỰ ĐỘNG
 * Chủ tài khoản: NGUYỄN XUÂN ĐẠT - 4430269669
 */

function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        window.speechSynthesis.speak(msg);
    }
}

// 1. Hàm chính khi ấn "NẠP NGAY"
async function createPayment(amount, planName) {
    tpSpeak(`Đang tạo mã QR BIDV nạp gói ${planName}.`);

    // --- THÔNG TIN CHUẨN CỦA ANH ĐẠT ---
    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 
    // ----------------------------------

    const txID = localStorage.getItem('tx_id') || "DAT";
    const description = `${txID} ${planName}`;

    // Link tạo QR chuẩn VietQR (Hiện QR tĩnh nhưng có sẵn tiền và nội dung)
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    localStorage.setItem('pending_plan', planName);

    // Đăng ký đơn hàng ngầm với PayOS/Vercel để hệ thống tự động kích hoạt
    try {
        fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: description }),
        });
    } catch (e) { console.error("Lỗi đăng ký đơn hàng ngầm"); }

    showQRModal(qrImageUrl, amount, planName, description);
}

// 2. Giao diện bảng QR
function showQRModal(qrImageUrl, amount, planName, description) {
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; padding:15px;">
            <div style="background:white; width:100%; max-width:360px; border-radius:20px; overflow:hidden; text-align:center; box-shadow: 0 0 30px rgba(255,255,255,0.3);">
                
                <div style="background:#0054a3; color:white; padding:15px; font-weight:bold;">THANH TOÁN QR BIDV</div>

                <div style="padding:20px;">
                    <p style="margin:0 0 10px 0; color:#333;">Gói cước: <b>${planName}</b></p>
                    
                    <div style="padding:5px; border:2px solid #0054a3; border-radius:15px; background:white;">
                        <img src="${qrImageUrl}" style="width:100%; display:block; border-radius:10px;" alt="QR BIDV">
                    </div>

                    <div style="margin-top:15px; background:#f8f9fa; padding:10px; border-radius:10px; border:1px dashed #0054a3;">
                        <p style="margin:0; font-size:12px; color:#666;">Nội dung chuyển khoản (Giữ nguyên):</p>
                        <p style="margin:5px 0 0 0; font-size:18px; color:#d32f2f; font-weight:bold;">${description}</p>
                    </div>

                    <h2 style="margin:15px 0 5px 0; color:#333;">${amount.toLocaleString()}đ</h2>
                    <p style="font-size:11px; color:red;">* Hệ thống tự động kích hoạt sau khi nhận tiền.</p>
                </div>

                <div style="display:flex; border-top:1px solid #eee;">
                    <button onclick="document.getElementById('tp-qr-overlay').remove()" style="flex:1; padding:15px; border:none; background:#f8f9fa; color:#333; font-weight:bold; cursor:pointer;">ĐÓNG</button>
                    <button onclick="location.reload()" style="flex:1; padding:15px; border:none; background:#0054a3; color:white; font-weight:bold; cursor:pointer;">XÁC NHẬN</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 3. Tự động cộng ngày khi Webhook báo về
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 30;
        if(planName && planName.includes("LẺ")) days = 1;
        if(planName && planName.includes("MAX")) days = 90;
        if(planName && (planName.includes("7") || planName.includes("THỬ"))) days = 7;

        const now = new Date().getTime();
        const current = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExp = Math.max(current, now) + (days * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExp);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Kích hoạt thành công gói ${planName}. Cảm ơn anh Đạt!`);
        alert(`Chúc mừng anh Đạt! Gói ${planName} đã được kích hoạt thành công.`);
        
        window.history.replaceState({}, '', window.location.pathname);
    }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
