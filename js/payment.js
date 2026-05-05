/**
 * TAXI PROMAX - THANH TOÁN QR TỰ ĐỘNG
 * Phát triển bởi: Nguyễn Xuân Đạt
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
    const activeBtn = window.event ? window.event.target : null;
    if (activeBtn) activeBtn.disabled = true;

    tpSpeak("Đang khởi tạo mã QR thanh toán.");

    try {
        const txID = localStorage.getItem('tx_id') || "DAT";
        const desc = `${txID} ${planName}`;

        // BƯỚC 1: Gọi backend để báo cho PayOS biết có đơn hàng mới
        const response = await fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: desc }),
        });

        const data = await response.json();

        // BƯỚC 2: Nếu backend trả về qrCode thành công
        if (data && data.qrCode) {
            localStorage.setItem('pending_plan', planName);
            
            // Hiện Modal chứa mã QR chuẩn BIDV từ PayOS
            showQRModal(data.qrCode, amount, planName, desc);
            
            tpSpeak("Mã QR đã sẵn sàng. Hệ thống sẽ tự động kích hoạt sau khi anh chuyển khoản thành công.");
        } else {
            throw new Error("Không thể tạo mã QR lúc này.");
        }
    } catch (error) {
        alert("Lỗi kết nối: " + error.message);
    } finally {
        if (activeBtn) activeBtn.disabled = false;
    }
}

function showQRModal(qrImageUrl, amount, planName, desc) {
    const oldModal = document.getElementById('tp-qr-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="tp-qr-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:white; width:100%; max-width:360px; border-radius:20px; overflow:hidden; text-align:center;">
                <div style="background:#0054a3; color:white; padding:15px; font-weight:bold;">THANH TOÁN BIDV</div>
                <div style="padding:20px;">
                    <p style="margin-bottom:10px;">Gói: <b>${planName}</b></p>
                    <div style="border:1px solid #eee; padding:10px; border-radius:10px;">
                        <img src="${qrImageUrl}" style="width:100%; border-radius:5px;">
                    </div>
                    <h2 style="color:#d32f2f; margin:15px 0;">${amount.toLocaleString()}đ</h2>
                    <p style="font-size:13px; color:#666;">Nội dung: <b>${desc}</b></p>
                    <p style="font-size:11px; color:red; margin-top:10px;">* Hệ thống tự động mở khóa sau khi nhận tiền.</p>
                </div>
                <button onclick="document.getElementById('tp-qr-modal').remove()" style="width:100%; padding:15px; border:none; background:#f1f1f1; font-weight:bold; cursor:pointer;">ĐÓNG</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// BƯỚC 3: TỰ ĐỘNG KIỂM TRA (Webhook xử lý)
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'PAID' || status === 'success') {
        let days = 30;
        if (planName.includes("LẺ")) days = 1;
        if (planName.includes("MAX")) days = 90;
        if (planName.includes("7")) days = 7;

        const now = new Date().getTime();
        const current = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExp = Math.max(current, now) + (days * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExp);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Kích hoạt thành công gói ${planName}. Chúc anh vạn dặm bình an!`);
        window.history.replaceState({}, '', window.location.pathname);
    }
}
document.addEventListener('DOMContentLoaded', checkPaymentStatus);
