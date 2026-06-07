/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN (PAYOS)
 * FIX v2.0:
 * [FIX-1] Đúng Firebase URL: taxipromax-new (Asia Southeast)
 * [FIX-2] Trial bypass: kiểm tra Firebase + localStorage
 * [FIX-3] Bỏ tpSpeak duplicate (đã có trong index.html)
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

// ============================================================
// CONFIG — ĐÚNG URL FIREBASE (Asia Southeast)
// ============================================================
const PAYMENT_FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";

// ============================================================
// [FIX-3] KHÔNG khai báo lại tpSpeak ở đây
// tpSpeak đã có trong index.html — dùng chung window scope
// Nếu payment.js load độc lập (trang khác) thì mới cần fallback
// ============================================================
function _safeSpeak(text) {
    if (typeof tpSpeak === 'function') {
        tpSpeak(text); // Dùng hàm từ index.html
    } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg  = new SpeechSynthesisUtterance(text);
        msg.lang   = 'vi-VN';
        msg.rate   = 1.1;
        window.speechSynthesis.speak(msg);
    }
}

// ============================================================
// KIỂM TRA GÓI CÒN HẠN (localStorage + Firebase)
// ============================================================
function isSubscribed() {
    const expiry = localStorage.getItem('tp_expiry');
    if (!expiry) return false;
    return (parseInt(expiry) - Date.now()) > 0;
}

// ============================================================
// [FIX-2] KÍCH HOẠT GÓI CƯỚC
// Trial: kiểm tra Firebase trước, không chỉ localStorage
// ============================================================
window.tpHandlePayment = async function(amount, planName) {
    const txId = localStorage.getItem('tx_id') || 'TAIXE';

    if (amount === 0) {
        // --- GÓI DÙNG THỬ ---
        // [FIX-2] Kiểm tra Firebase trước để tránh bypass bằng xóa localStorage
        try {
            const res  = await fetch(`${PAYMENT_FIREBASE_URL}/tai_xe_online/${txId}/trial_used.json`);
            const used = await res.json();

            if (used === true || localStorage.getItem('tp_trial_used')) {
                _safeSpeak("Gói dùng thử này anh đã sử dụng rồi ạ.");
                alert("Mỗi tài xế chỉ được dùng thử 1 lần duy nhất!");
                return;
            }
        } catch (e) {
            // Offline → fallback localStorage
            if (localStorage.getItem('tp_trial_used')) {
                alert("Mỗi tài xế chỉ được dùng thử 1 lần duy nhất!");
                return;
            }
        }

        // Kích hoạt trial
        const trialExp  = Date.now() + (7 * 24 * 60 * 60 * 1000);
        const trialPlan = "GÓI DÙNG THỬ";

        // Lưu localStorage
        localStorage.setItem('tp_trial_used',    'true');
        localStorage.setItem('tp_expiry',        trialExp);
        localStorage.setItem('active_plan_name', trialPlan);

        // [FIX-1] Sync Firebase ĐÚNG URL — đánh dấu trial_used để chống bypass
        fetch(`${PAYMENT_FIREBASE_URL}/tai_xe_online/${txId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tp_expiry:        trialExp,
                active_plan_name: trialPlan,
                trial_used:       true        // Chống bypass localStorage
            })
        }).catch(e => console.error("[payment] Firebase trial sync error:", e));

        _safeSpeak("Kích hoạt gói dùng thử 7 ngày thành công. Chúc anh thượng lộ bình an!");
        updateSubscriptionUI();

    } else {
        // --- GÓI TRẢ PHÍ → PayOS ---
        createPayment(amount, planName);
    }
};

// ============================================================
// TẠO THANH TOÁN PAYOS
// ============================================================
async function createPayment(amount, planName) {
    const txId = localStorage.getItem('tx_id') || 'TAIXE';

    _safeSpeak(`Đang khởi tạo cổng thanh toán QR cho gói ${planName}. Anh vui lòng chờ trong giây lát.`);

    // Đổi trạng thái nút tránh bấm trùng
    const mainBtn = document.getElementById('mainBtn');
    if (mainBtn) {
        mainBtn.disabled  = true;
        mainBtn.innerText = "⏳ ĐANG KHỞI TẠO QR...";
    }

    try {
        const response = await fetch('/api/payment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount:      amount,
                planName:    planName,
                driverPhone: txId
            })
        });

        const data = await response.json();

        if (data.success && data.checkoutUrl) {
            localStorage.setItem('pending_plan', planName);
            window.location.href = data.checkoutUrl;
        } else {
            if (mainBtn) {
                mainBtn.disabled  = false;
                mainBtn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
            }
            alert("Lỗi kết nối PayOS: " + (data.error || "Kiểm tra lại cấu hình Vercel!"));
        }

    } catch (err) {
        if (mainBtn) {
            mainBtn.disabled  = false;
            mainBtn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        }
        console.error("[payment] PayOS API error:", err);
        alert("Không thể kết nối máy chủ thanh toán. Vui lòng thử lại!");
    }
}

// ============================================================
// [FIX-1] UPDATE UI GÓI CƯỚC — Đọc Firebase trước
// Fallback localStorage nếu offline
// ============================================================
async function updateSubscriptionUI() {
    const txId     = localStorage.getItem('tx_id') || 'TAIXE';
    const planShow = document.getElementById('planShow');
    const banner   = document.getElementById('tp-mini-timer');
    const cdVal    = document.getElementById('tp-cd-val');
    if (!planShow) return;

    let expiry   = null;
    let planName = null;

    // Thử đọc từ Firebase trước (nguồn tin cậy nhất)
    try {
        const res  = await fetch(`${PAYMENT_FIREBASE_URL}/tai_xe_online/${txId}.json`);
        const data = await res.json();
        if (data && data.tp_expiry) {
            expiry   = parseInt(data.tp_expiry);
            planName = data.active_plan_name || 'PROMAX';
            // Đồng bộ ngược về localStorage
            localStorage.setItem('tp_expiry',        expiry);
            localStorage.setItem('active_plan_name', planName);
        }
    } catch (e) {
        // Offline → fallback localStorage
        expiry   = parseInt(localStorage.getItem('tp_expiry') || '0');
        planName = localStorage.getItem('active_plan_name')   || 'FREE';
    }

    const now  = Date.now();
    const dist = expiry - now;

    if (!expiry || dist <= 0) {
        planShow.innerText   = "⭐ GÓI: MIỄN PHÍ";
        planShow.style.color = "var(--danger)";
        if (banner) banner.style.display = 'none';
        return;
    }

    // Còn hạn → hiện thời gian còn lại
    const days  = Math.floor(dist / (1000 * 60 * 60 * 24));
    const hours = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    planShow.innerText   = `⭐ GÓI: ${planName}`;
    planShow.style.color = "#0054a3";

    if (banner) {
        banner.style.display = 'inline-flex';
        if (cdVal) cdVal.innerText = `${days}n ${hours}h`;
    }
}

// ============================================================
// XỬ LÝ CALLBACK TỪ PAYOS (sau khi thanh toán xong)
// ============================================================
function checkPaymentStatus() {
    const params   = new URLSearchParams(window.location.search);
    const status   = params.get('status');
    const planName = params.get('plan') || localStorage.getItem('pending_plan');
    const txId     = localStorage.getItem('tx_id') || 'PROMAX';

    if ((status === 'success' || status === 'PAID') && planName) {
        // Tính số ngày theo tên gói
        let days = 0;
        const upper = planName.toUpperCase();
        if      (upper.includes("LẺ"))                                   days = 1;
        else if (upper.includes("PRO MAX") || upper.includes("PROMAX")) days = 90;
        else if (upper.includes("PRO"))                                  days = 30;
        else if (upper.includes("THỬ"))                                  days = 7;

        if (days > 0) {
            const now        = Date.now();
            const currentExp = parseInt(localStorage.getItem('tp_expiry') || now);
            const startTime  = Math.max(currentExp, now); // Cộng dồn nếu còn hạn
            const newExp     = startTime + (days * 24 * 60 * 60 * 1000);

            // 1. Lưu localStorage ngay
            localStorage.setItem('tp_expiry',        newExp);
            localStorage.setItem('active_plan_name', planName);
            localStorage.removeItem('pending_plan');

            // 2. [FIX-1] Sync Firebase ĐÚNG URL
            fetch(`${PAYMENT_FIREBASE_URL}/tai_xe_online/${txId}.json`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tp_expiry:        newExp,
                    active_plan_name: planName.toUpperCase()
                })
            }).then(() => {
                console.log("[payment] ✅ Gói đã sync Firebase:", planName, newExp);
            }).catch(e => {
                console.error("[payment] Firebase sync error:", e);
                // Sẽ tự sync lại lần sau khi có mạng
            });

            _safeSpeak(`Chúc mừng anh đã kích hoạt thành công gói ${planName}. Hệ thống định vị chuyên dụng đã sẵn sàng!`);
        }

        // Xóa params URL tránh kích hoạt lại khi reload
        window.history.replaceState({}, '', window.location.pathname);

    } else if (status === 'cancel') {
        _safeSpeak("Giao dịch nạp gói cước đã bị hủy.");
        window.history.replaceState({}, '', window.location.pathname);
    }

    // Cập nhật UI sau khi xử lý
    updateSubscriptionUI();
}

// ============================================================
// KHỞI ĐỘNG
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    checkPaymentStatus();

    // Cập nhật UI mỗi 5 phút (giảm từ 1 phút — tiết kiệm tài nguyên)
    setInterval(updateSubscriptionUI, 5 * 60 * 1000);
});
