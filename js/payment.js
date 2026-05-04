/**
 * TAXI PROMAX - HỆ THỐNG XỬ LÝ THANH TOÁN TỰ ĐỘNG
 * Phát triển bởi: Nguyễn Xuân Đạt
 * Phía Giao diện (GitHub Pages) gọi sang Backend (Vercel)
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
    
    // 1. Xác định nút bấm để hiện trạng thái chờ
    const activeBtn = window.event ? window.event.target : null;
    let originalText = "NẠP NGAY";

    if (activeBtn) {
        originalText = activeBtn.innerText;
        activeBtn.innerText = "ĐANG TẠO QR...";
        activeBtn.disabled = true;
    }

    tpSpeak("Đang kết nối cổng thanh toán. Anh vui lòng chờ giây lát.");

    try {
        // Lấy ID người dùng hoặc mặc định là DAT
        const txID = localStorage.getItem('tx_id') || "DAT";
        const safeDesc = `${txID} ${planName}`.substring(0, 25);

        // 2. GỌI SANG VERCEL 
        // URL này khớp với domain taxi-promax.vercel.app trong ảnh của anh
        const response = await fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                description: safeDesc,
                cancelUrl: window.location.origin + window.location.pathname,
                returnUrl: window.location.origin + window.location.pathname
            }),
        });

        // 3. Xử lý phản hồi
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Máy chủ báo lỗi (${response.status}). Anh kiểm tra lại Vercel Logs.`);
        }

        const data = await response.json();

        if (data && data.checkoutUrl) {
            tpSpeak("Đã tạo mã thành công. Mời anh quét mã để kích hoạt.");
            localStorage.setItem('pending_plan', planName);
            
            // Chuyển hướng sang PayOS
            setTimeout(() => {
                window.location.href = data.checkoutUrl;
            }, 1000);
        } else {
            throw new Error("Không nhận được link thanh toán từ PayOS.");
        }

    } catch (error) {
        console.error("[Lỗi]:", error);
        tpSpeak("Cổng thanh toán đang bận. Anh vui lòng thử lại sau.");
        alert(`Lỗi: ${error.message}\nAnh Đạt kiểm tra xem máy chủ Vercel đã báo READY chưa nhé!`);
    } finally {
        if (activeBtn) {
            activeBtn.innerText = originalText;
            activeBtn.disabled = false;
        }
    }
}

/**
 * HÀM KIỂM TRA TRẠNG THÁI SAU KHI THANH TOÁN XONG
 */
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status'); 
    const planName = localStorage.getItem('pending_plan');

    if (status === 'PAID' || status === 'success') {
        let daysToAdd = 30;
        if(planName === 'CHUYẾN LẺ') daysToAdd = 1;
        if(planName === 'TRẢI NGHIỆM') daysToAdd = 7;
        if(planName === 'PRO MAX') daysToAdd = 90;

        const now = new Date().getTime();
        const currentExpiry = parseInt(localStorage.getItem('tp_expiry') || now);
        const newExpiry = Math.max(currentExpiry, now) + (daysToAdd * 24 * 60 * 60 * 1000);
        
        localStorage.setItem('tp_expiry', newExpiry);
        localStorage.removeItem('pending_plan');

        tpSpeak(`Chúc mừng anh Đạt! Đã kích hoạt thành công gói ${planName}. Chúc anh vạn dặm bình an!`);
        
        // Xóa query string trên URL
        setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', checkPaymentStatus);
