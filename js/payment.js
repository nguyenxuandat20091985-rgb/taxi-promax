/**
 * TAXI PROMAX - HỆ THỐNG THANH TOÁN QR TỰ ĐỘNG
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

        // Gọi sang backend Vercel để đăng ký giao dịch với PayOS (Để tự động kích hoạt)
        const response = await fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: desc }),
        });

        const data = await response.json();

        if (data && data.qrCode) {
            localStorage.setItem('pending_plan', planName);
            // Hiển thị mã QR lên màn hình cho khách quét
            showQRModal(data.qrCode, amount, planName);
            tpSpeak("Mã QR đã sẵn sàng. Anh vui lòng quét mã, hệ thống sẽ tự động kích hoạt sau khi nhận được tiền.");
        } else {
            throw new Error("Không lấy được mã QR từ hệ thống.");
        }
    } catch (error) {
        alert("Lỗi: " + error.message);
        tpSpeak("Cổng thanh toán gặp sự cố, anh vui lòng thử lại.");
    } finally {
        if (activeBtn) activeBtn.disabled = false;
    }
}

function showQRModal(qrImageUrl, amount, planName) {
    const oldModal = document.getElementById('tp-qr-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="tp-qr-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:white; width:100%; max-width:360px; border-radius:20px; overflow:hidden; text-align:center; box-shadow: 0 0 20px rgba(255,255,255,0.2);">
                <div style="background:#0054a3; color:white; padding:15px; font-weight:bold;">THANH TOÁN QR BIDV</div>
                <div style="padding:20px;">
                    <p style="margin-bottom:10px;">Gói cước: <b>${planName}</b></p>
                    <img src="${qrImageUrl}" style="width:100%; border-radius:10px; border:1px solid #eee;">
                    <h2 style="color:#d32f2f; margin:15px 0;">${amount.toLocaleString()}đ</h2>
                    <p style="font-size:12px; color:red;">* Hệ thống tự động kích hoạt sau 1-3 phút thanh toán thành công.</p>
                </div>
                <button onclick="document.getElementById('tp-qr-modal').remove()" style="width:100%; padding:15px; border:none; background:#f1f1f1; font-weight:bold; cursor:pointer;">ĐÓNG</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// HÀM TỰ ĐỘNG KÍCH HOẠT KHI QUAY LẠI TRANG
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    // Nếu PayOS báo PAID hoặc success thì cộng ngày
    if (status === 'PAID' || status === 'success') {
        let daysToAdd = 30; // Mặc định 30 ngày
        if (planName.includes("LẺ")) daysToAdd = 1;
        if (planName.includes("MAX")) daysToAdd = 90;
        if (planName.includes("7") || planName.includes("THỬ")) daysToAdd = 7;

        const now = new Date().getTime();
        const currentExpiry = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExpiry = Math.max(currentExpiry, now) + (daysToAdd * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExpiry);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Kích hoạt thành công gói ${planName}. Cảm ơn anh Đạt!`);
        alert(`Chúc mừng! Gói ${planName} đã được kích hoạt.`);
        
        // Làm sạch URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
