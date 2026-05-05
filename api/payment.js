/**
 * TAXI PROMAX - QUẢN LÝ GÓI CƯỚC & THANH TOÁN 
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
    const driverPhone = localStorage.getItem('userPhone') || "0388724966"; 

    if (amount === 0) {
        if (!localStorage.getItem('tp_trial_used')) {
            localStorage.setItem('pending_plan', "GÓI DÙNG THỬ");
            localStorage.setItem('tp_trial_used', 'true');
            window.location.href = window.location.pathname + "?status=success";
        } else {
            tpSpeak("Gói dùng thử này anh đã sử dụng rồi ạ.");
            alert("Mỗi tài xế chỉ được dùng thử 1 lần duy nhất!");
        }
    } else {
        createPayment(amount, planName, driverPhone);
    }
};

async function createPayment(amount, planName, phone) {
    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 
    const description = `PROMAX ${phone} ${planName.toUpperCase().replace(/\s/g, '')}`;
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    localStorage.setItem('pending_plan', planName);
    tpSpeak(`Đang tạo mã QR nạp gói ${planName}.`);

    const qrModal = document.getElementById('tp-qr-overlay');
    const qrImg = document.getElementById('qrImageDisplay');
    const qrAmt = document.getElementById('qrAmountShow');
    const qrCnt = document.getElementById('qrContentShow');

    if (qrModal && qrImg) {
        qrImg.src = qrImageUrl;
        qrAmt.innerText = amount.toLocaleString() + "đ";
        qrCnt.innerText = description;
        qrModal.style.display = 'flex';
    } else {
        alert(`THÔNG TIN NẠP TIỀN:\nSTK: ${ACCOUNT_NO} (BIDV)\nSố tiền: ${amount.toLocaleString()}đ\nNội dung: ${description}`);
    }
}

function updateSubscriptionUI() {
    const expiry = localStorage.getItem('tp_expiry');
    const planName = localStorage.getItem('active_plan_name') || "CHƯA NẠP";
    const planShow = document.getElementById('planShow');
    if (!planShow) return;

    if (!expiry) {
        planShow.innerText = "⭐ GÓI: " + planName;
        return;
    }

    const now = new Date().getTime();
    const timeLeft = parseInt(expiry) - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

    if (timeLeft <= 0) {
        planShow.innerText = "❌ HẾT HẠN";
        planShow.style.color = "#ff4d4d";
    } else {
        planShow.innerText = `⭐ ${planName} (${daysLeft}D)`;
        planShow.style.color = "#f1c40f";
    }
}

function checkPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const planName = localStorage.getItem('pending_plan');

    if (status === 'success' || status === 'PAID') {
        let days = 0;
        if (planName.includes("LẺ")) days = 1;
        else if (planName.includes("PRO MAX")) days = 90;
        else if (planName.includes("PRO")) days = 30;
        else if (planName.includes("THỬ")) days = 7;

        if (days > 0) {
            const now = new Date().getTime();
            const currentExp = parseInt(localStorage.getItem('tp_expiry') || now);
            const startTime = Math.max(currentExp, now);
            const newExp = startTime + (days * 24 * 60 * 60 * 1000);
            
            localStorage.setItem('tp_expiry', newExp);
            localStorage.setItem('active_plan_name', planName);
            localStorage.removeItem('pending_plan');

            tpSpeak(`Đã kích hoạt thành công gói ${planName}.`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
    updateSubscriptionUI();
}

document.addEventListener('DOMContentLoaded', () => {
    checkPaymentStatus();
    setInterval(updateSubscriptionUI, 60000);
});
