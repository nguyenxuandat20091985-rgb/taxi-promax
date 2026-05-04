/**
 * TAXI PROMAX - HỆ THỐNG XỬ LÝ THANH TOÁN TỰ ĐỘNG
 * Phát triển bởi: Nguyễn Xuân Đạt
 */

function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
    }
}

async function createPayment(amount, planName) {
    console.log(`[PayOS] Khởi tạo: ${amount}đ - Gói: ${planName}`);
    
    // Lấy nút bấm từ sự kiện (fix lỗi event target)
    const activeBtn = window.event ? window.event.target : null;
    let originalText = "NẠP NGAY";

    if (activeBtn && activeBtn.classList.contains('p-btn')) {
        originalText = activeBtn.innerText;
        activeBtn.innerText = "ĐANG TẠO QR...";
        activeBtn.disabled = true;
    }

    tpSpeak("Đang kết nối cổng thanh toán. Anh vui lòng chờ giây lát.");

    try {
        const txID = localStorage.getItem('tx_id') || "DAT-PRO";
        // Cắt chuỗi Description ngắn gọn để không lỗi PayOS (Max 25 ký tự)
        const safeDesc = `${txID} ${planName}`.substring(0, 25);

        const response = await fetch('/api/payos', { // Đảm bảo file trong api/ tên là payos.js
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                description: safeDesc
            }),
        });

        if (!response.ok) throw new Error(`Lỗi máy chủ (${response.status})`);

        const data = await response.json();

        if (data && data.checkoutUrl) {
            tpSpeak("Đã tạo mã thành công. Mời anh quét mã để kích hoạt.");
            // Lưu lại gói đang mua để sau khi quay lại mình cộng hạn dùng
            localStorage.setItem('pending_plan', planName);
            
            setTimeout(() => {
                window.location.href = data.checkoutUrl;
            }, 1000);
        } else {
            throw new Error("Không nhận được link thanh toán");
        }

    } catch (error) {
        tpSpeak("Lỗi kết nối. Anh vui lòng thử lại sau.");
        alert(`Lỗi: ${error.message}`);
    } finally {
        if (activeBtn && activeBtn.classList.contains('p-btn')) {
            activeBtn.innerText = originalText;
            activeBtn.disabled = false;
        }
    }
}

// Hàm kiểm tra khi anh quay lại từ ngân hàng
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success') {
        // LOGIC CỘNG HẠN DÙNG (Giả lập)
        let daysToAdd = 30;
        if(planName === 'CHUYẾN LẺ') daysToAdd = 1;
        if(planName === 'PRO MAX') daysToAdd = 90;
        if(planName === 'TRIAL 7D') daysToAdd = 7;

        const newExpiry = new Date().getTime() + (daysToAdd * 24 * 60 * 60 * 1000);
        localStorage.setItem('tp_expiry', newExpiry);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Chúc mừng anh Đạt! Đã kích hoạt gói ${planName} thành công. Chúc anh vạn dặm bình an!`);
        
        setTimeout(() => {
            window.location.href = window.location.pathname; // Xóa sạch rác trên URL
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
