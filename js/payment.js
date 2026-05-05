/**
 * TAXI PROMAX - HỆ THỐNG THANH TOÁN QR TỰ ĐỘNG
 * Phát triển bởi: Nguyễn Xuân Đạt
 * Tính năng: Hiển thị mã QR tại chỗ, không chuyển trang.
 */

// 1. Hàm phát âm thanh thông báo
function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
    }
}

// 2. Hàm tạo và hiển thị QR Code
async function createPayment(amount, planName) {
    const activeBtn = window.event ? window.event.target : null;
    let originalText = "NẠP NGAY";

    if (activeBtn) {
        originalText = activeBtn.innerText;
        activeBtn.innerText = "ĐANG TẠO QR...";
        activeBtn.disabled = true;
    }

    tpSpeak("Đang kết nối cổng thanh toán. Anh vui lòng chờ giây lát.");

    try {
        const txID = localStorage.getItem('tx_id') || "DAT";
        const desc = `${txID} ${planName}`;

        const response = await fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                description: desc
            }),
        });

        if (!response.ok) throw new Error(`Lỗi kết nối (${response.status})`);

        const data = await response.json();

        // data.qrCode là link ảnh QR từ PayOS trả về
        if (data && data.qrCode) {
            tpSpeak("Đã tạo mã thành công. Mời anh quét mã để kích hoạt gói cước.");
            localStorage.setItem('pending_plan', planName);
            
            // Hiển thị Modal QR Code lên màn hình
            showQRModal(data.qrCode, amount, planName, data.checkoutUrl);
        } else {
            throw new Error("Không lấy được mã QR.");
        }

    } catch (error) {
        console.error(error);
        tpSpeak("Cổng thanh toán bận. Anh thử lại nhé.");
        alert("Lỗi: " + error.message);
    } finally {
        if (activeBtn) {
            activeBtn.innerText = originalText;
            activeBtn.disabled = false;
        }
    }
}

// 3. Hàm tạo giao diện hiển thị QR (Modal)
function showQRModal(qrImageUrl, amount, planName, checkoutUrl) {
    // Kiểm tra nếu đã có modal cũ thì xóa đi
    const oldModal = document.getElementById('tp-qr-modal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div id="tp-qr-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:white; width:100%; max-width:400px; border-radius:20px; padding:20px; text-align:center; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <span onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:10px; right:15px; font-size:24px; cursor:pointer; color:#999;">&times;</span>
                
                <h3 style="color:#333; margin-bottom:5px;">THANH TOÁN QR</h3>
                <p style="color:#666; font-size:14px; margin-bottom:15px;">Gói: <b>${planName}</b></p>
                
                <div style="background:#f9f9f9; padding:10px; border-radius:10px; margin-bottom:15px;">
                    <img src="${qrImageUrl}" style="width:100%; aspect-ratio:1/1; border-radius:5px;" alt="QR Payment">
                </div>

                <div style="margin-bottom:15px;">
                    <p style="margin:0; font-size:13px; color:#666;">Số tiền cần nạp:</p>
                    <h2 style="margin:0; color:#e91e63;">${amount.toLocaleString()}đ</h2>
                </div>

                <p style="font-size:12px; color:red; font-style:italic; margin-bottom:15px;">* Vui lòng không sửa nội dung chuyển khoản</p>
                
                <button onclick="window.open('${checkoutUrl}', '_blank')" style="width:100%; padding:12px; background:#007bff; color:white; border:none; border-radius:10px; font-weight:bold; margin-bottom:10px;">MỞ TRANG THANH TOÁN</button>
                <button onclick="location.reload()" style="width:100%; padding:10px; background:#eee; border:none; border-radius:10px;">ĐÃ CHUYỂN KHOẢN XONG</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 4. Hàm kiểm tra trạng thái khi quay lại (Dùng cho Webhook/Redirect)
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let daysToAdd = 30;
        if(planName?.includes('LẺ')) daysToAdd = 1;
        if(planName?.includes('MAX')) daysToAdd = 90;
        if(planName?.includes('7')) daysToAdd = 7;

        const now = new Date().getTime();
        const currentExpiry = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExpiry = Math.max(currentExpiry, now) + (daysToAdd * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExpiry);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Chúc mừng anh Đạt! Kích hoạt thành công gói ${planName}. Chúc anh vạn dặm bình an!`);
        
        setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
        }, 4000);
    }
}

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', checkPaymentStatus);
