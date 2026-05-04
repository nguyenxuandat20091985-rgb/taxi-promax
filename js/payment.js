/**
 * TAXI PROMAX - HỆ THỐNG XỬ LÝ THANH TOÁN TỰ ĐỘNG
 * Phát triển bởi: Nguyễn Xuân Đạt
 */

// 1. Hàm phát thông báo bằng giọng nói (Voice AI trợ lý)
function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        // Hủy các câu nói đang chờ để ưu tiên câu mới nhất
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        msg.rate = 1.0; // Tốc độ nói
        msg.pitch = 1.0; // Độ cao giọng
        window.speechSynthesis.speak(msg);
    }
}

// 2. Hàm xử lý khi khách bấm nút "NẠP NGAY" hoặc "KÍCH HOẠT"
async function createPayment(amount, description) {
    console.log(`[PayOS] Đang khởi tạo đơn hàng: ${amount}đ - Nội dung: ${description}`);
    
    // Tìm nút bấm vừa nhấn để hiển thị trạng thái chờ
    const activeBtn = event?.target || document.querySelector('.p-btn');
    const originalText = activeBtn ? activeBtn.innerText : "NẠP NGAY";

    if (activeBtn) {
        activeBtn.innerText = "ĐANG TẠO MÃ QR...";
        activeBtn.disabled = true;
        activeBtn.style.opacity = "0.7";
    }

    // Thông báo bằng giọng nói để anh biết hệ thống đang chạy
    tpSpeak("Đang kết nối cổng thanh toán. Anh vui lòng chờ trong giây lát.");

    try {
        // Gửi yêu cầu đến API Vercel của anh
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                description: description || `Taxi ProMax ID ${localStorage.getItem('tx_id')}`
            }),
        });

        // Nếu API trả về lỗi kỹ thuật (404, 500...)
        if (!response.ok) {
            throw new Error(`Lỗi máy chủ (${response.status})`);
        }

        const data = await response.json();

        // Kiểm tra link thanh toán từ PayOS trả về
        if (data && data.checkoutUrl) {
            tpSpeak("Đã tạo mã thanh toán thành công. Mời anh quét mã để tiếp tục.");
            
            // Chuyển hướng sang trang mã QR của BIDV/PayOS
            setTimeout(() => {
                window.location.href = data.checkoutUrl;
            }, 1500);
            
        } else {
            throw new Error(data.error || "Không nhận được phản hồi từ cổng PayOS");
        }

    } catch (error) {
        console.error("[PayOS Error]:", error);
        
        // Thông báo lỗi bằng giọng nói và hộp thoại
        tpSpeak("Cổng thanh toán đang bận hoặc lỗi kết nối. Anh vui lòng thử lại sau.");
        alert(`Lỗi hệ thống: ${error.message}\nAnh Đạt kiểm tra lại API trên Vercel nhé!`);

    } finally {
        // Trả lại trạng thái ban đầu cho nút bấm nếu gặp lỗi
        if (activeBtn) {
            activeBtn.innerText = originalText;
            activeBtn.disabled = false;
            activeBtn.style.opacity = "1";
        }
    }
}

// 3. Hàm kiểm tra trạng thái gói sau khi quay lại từ trang thanh toán
function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success') {
        tpSpeak("Chúc mừng anh Đạt! Gói cước Taxi ProMax đã được kích hoạt thành công. Chúc anh vạn dặm bình an!");
        
        // Cập nhật giao diện (Giả định anh dùng các ID này trong index.html)
        const planBadge = document.getElementById('planShow');
        if (planBadge) {
            planBadge.innerText = "⭐ GÓI: VIP PRO (ACTIVE)";
            planBadge.style.color = "#ffc107";
        }
        
        // Xóa các tham số trên URL để tránh hiện lại thông báo khi load lại trang
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancel') {
        tpSpeak("Giao dịch đã được hủy bỏ.");
    }
}

// Tự động chạy kiểm tra trạng thái khi file JS này được load
document.addEventListener('DOMContentLoaded', checkPaymentStatus);
