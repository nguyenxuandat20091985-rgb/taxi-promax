/**
 * TAXI PROMAX - HỆ THỐNG THANH TOÁN QR CAO CẤP
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

async function createPayment(amount, planName) {
    tpSpeak(`Đang khởi tạo mã thanh toán cho gói ${planName}.`);

    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 

    const txID = localStorage.getItem('tx_id') || "DAT";
    const description = `${txID} ${planName}`;

    // Link QR chuẩn VietQR
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    localStorage.setItem('pending_plan', planName);

    // Đăng ký đơn hàng ngầm để kích hoạt tự động
    try {
        fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: description }),
        });
    } catch (e) { console.error("API Error"); }

    showQRModal(qrImageUrl, amount, planName, description);
}

function showQRModal(qrImageUrl, amount, planName, description) {
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(5px);">
            <div style="background:white; width:90%; max-width:360px; border-radius:24px; overflow:hidden; text-align:center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                
                <div style="background:linear-gradient(135deg, #0054a3 0%, #003366 100%); color:white; padding:20px;">
                    <div style="font-size:12px; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Cổng thanh toán an toàn</div>
                    <div style="font-size:18px; font-weight:bold; margin-top:5px;">BIDV SmartBanking</div>
                </div>

                <div style="padding:25px;">
                    <p style="margin:0; color:#666; font-size:14px;">Bạn đang đăng ký <b>${planName}</b></p>
                    
                    <div style="margin:20px 0; padding:10px; border:1px solid #f0f0f0; border-radius:20px; background:#fff;">
                        <img src="${qrImageUrl}" style="width:100%; display:block; border-radius:12px;" alt="QR Payment">
                    </div>

                    <div style="background:#f4f7fa; padding:15px; border-radius:16px; margin-bottom:20px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#666;">
                            <span>Số tiền:</span>
                            <span style="color:#d32f2f; font-weight:bold; font-size:16px;">${amount.toLocaleString()}đ</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:13px; color:#666;">
                            <span>Nội dung:</span>
                            <span style="color:#0054a3; font-weight:bold;">${description}</span>
                        </div>
                    </div>

                    <p style="font-size:12px; color:#888; line-height:1.5;">
                        <i class="fas fa-info-circle"></i> Hệ thống sẽ tự động kích hoạt dịch vụ ngay sau khi nhận được thanh toán.
                    </p>
                </div>

                <div style="display:flex; border-top:1px solid #eee; background:#fafafa;">
                    <button onclick="document.getElementById('tp-qr-overlay').remove()" style="flex:1; padding:18px; border:none; background:none; color:#888; font-weight:600; cursor:pointer;">Hủy bỏ</button>
                    <button onclick="location.reload()" style="flex:1; padding:18px; border:none; background:none; color:#0054a3; font-weight:bold; cursor:pointer;">Tôi đã thanh toán</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

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
        window.history.replaceState({}, '', window.location.pathname);
    }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
