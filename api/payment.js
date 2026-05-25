/**
 * TAXI PROMAX - FRONTEND QUẢN LÝ GÓI CƯỚC & THANH TOÁN (KẾT NỐI PAYOS BẢO MẬT)
 * Đã sửa lỗi đồng bộ, tích hợp API Node và phát giọng nói AI tiếng Việt rực rỡ
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

function tpSpeak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'vi-VN';
        msg.rate = 1.1; 
        window.speechSynthesis.speak(msg);
    }
}

function isSubscribed() {
    const expiry = localStorage.getItem('tp_expiry');
    if (!expiry) return false;
    const now = new Date().getTime();
    return (parseInt(expiry) - now) > 0;
}

window.tpHandlePayment = function(amount, planName) {
    const driverPhone = localStorage.getItem('userPhone') || localStorage.getItem('tx_id') || "TAIXE"; 

    if (amount === 0) {
        if (!localStorage.getItem('tp_trial_used')) {
            localStorage.setItem('pending_plan', "GÓI DÙNG THỬ");
            localStorage.setItem('tp_trial_used', 'true');
            // Chuyển hướng kích hoạt nhanh thành công gói dùng thử
            window.location.href = window.location.origin + window.location.pathname + "?status=success&plan=" + encodeURIComponent("GÓI DÙNG THỬ");
        } else {
            tpSpeak("Gói dùng thử này anh đã sử dụng rồi ạ.");
            alert("Mỗi tài xế chỉ được dùng thử 1 lần duy nhất!");
        }
    } else {
        createPayment(amount, planName, driverPhone);
    }
};

// Gọi API Backend Vercel để lấy link thanh toán chính thức từ PayOS
async function createPayment(amount, planName, phone) {
    tpSpeak(`Đang khởi tạo cổng thanh toán QR ngân hàng BIDV cho gói ${planName}. Anh vui lòng chờ trong giây lát.`);

    // Thay đổi trạng thái nút bấm chính để tránh bấm trùng đơn
    const mainBtn = document.getElementById('mainBtn');
    if (mainBtn) mainBtn.innerText = "⏳ ĐANG KHỞI TẠO QR...";

    try {
        const response = await fetch('/api/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                planName: planName,
                driverPhone: phone
            })
        });

        const data = await response.json();

        if (data.success && data.checkoutUrl) {
            localStorage.setItem('pending_plan', planName);
            // Chuyển hướng màn hình sang trang hiển thị QR chuẩn của PayOS
            window.location.href = data.checkoutUrl;
        } else {
            if (mainBtn) mainBtn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
            alert("Lỗi kết nối PayOS: " + (data.error || "Vui lòng kiểm tra lại cấu hình biến môi trường Vercel!"));
        }
    } catch (err) {
        if (mainBtn) mainBtn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        console.error("Payment API error:", err);
        alert("Không thể kết nối với máy chủ thanh toán Backend!");
    }
}

function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "FREE (7D)";
    const planShow = document.getElementById('planShow');
    if (!planShow) return;

    if (!expiry) {
        planShow.innerText = "⭐ GÓI: " + planName;
        planShow.style.color = "var(--gold)";
        return;
    }

    const now = new Date().getTime();
    const timeLeft = parseInt(expiry) - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

    if (timeLeft <= 0) {
        planShow.innerText = "❌ HẾT HẠN";
        planShow.style.color = "#ff5252";
    } else {
        planShow.innerText = `⭐ ${planName.toUpperCase()} (${daysLeft}N)`;
        planShow.style.color = "#00bfa5";
    }
}

function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = params.get('plan') || localStorage.getItem('pending_plan');
    const txId = localStorage.getItem('tx_id') || "PROMAX";

    if ((status === 'success' || status === 'PAID') && planName) {
        let days = 0;
        const upperPlan = planName.toUpperCase();
        
        if (upperPlan.includes("LẺ")) days = 1;
        else if (upperPlan.includes("PRO MAX") || upperPlan.includes("PROMAX")) days = 90;
        else if (upperPlan.includes("PRO")) days = 30;
        else if (upperPlan.includes("THỬ")) days = 7;

        if (days > 0) {
            const now = new Date().getTime();
            const currentExp = parseInt(localStorage.getItem('tp_expiry') || now);
            const startTime = Math.max(currentExp, now);
            const newExp = startTime + (days * 24 * 60 * 60 * 1000);
            
            // 1. Cập nhật cục bộ trên máy tài xế
            localStorage.setItem('tp_expiry', newExp);
            localStorage.setItem('active_plan_name', planName);
            localStorage.removeItem('pending_plan');

            // 2. Bắn dữ liệu đồng bộ lên Realtime Database Firebase tổng đài
            fetch(`https://taxi-promax-default-rtdb.firebaseio.com/tai_xe_online/${txId}.json`, {
                method: 'PATCH',
                body: JSON.stringify({ tp_expiry: newExp, active_plan_name: planName.toUpperCase() })
            }).catch(e => console.error("Firebase sync error:", e));

            tpSpeak(`Chúc mừng anh Đạt đã kích hoạt thành công gói ${planName}. Hệ thống định vị chuyên dụng nâng cao đã sẵn sàng!`);
            
            // Xóa tham số trạng thái trên thanh URL tránh bị lặp cuốc khi reload trang
            window.history.replaceState({}, '', window.location.pathname);
        }
    } else if (status === 'cancel') {
        tpSpeak("Giao dịch nạp gói cước đã bị hủy bỏ.");
        window.history.replaceState({}, '', window.location.pathname);
    }
    updateSubscriptionUI();
}

document.addEventListener('DOMContentLoaded', () => {
    checkPaymentStatus();
    setInterval(updateSubscriptionUI, 60000);
});
