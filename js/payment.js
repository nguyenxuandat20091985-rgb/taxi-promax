/**
 * TAXI PROMAX - GIAO DIỆN THANH TOÁN TỰ ĐỘNG
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
    tpSpeak(`Đang tạo mã QR cho gói ${planName}.`);

    const BANK_ID = "bidv"; 
    const ACCOUNT_NO = "4430269669"; 
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; 

    const txID = localStorage.getItem('tx_id') || "DAT";
    const description = `${txID} ${planName}`;

    // Link tạo QR sạch sẽ, chuyên nghiệp
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-qr_only.png?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    localStorage.setItem('pending_plan', planName);

    // Đăng ký đơn hàng ngầm (để tự động kích hoạt)
    try {
        fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, description: description }),
        });
    } catch (e) { console.log("API ngầm đang chạy..."); }

    showQRModal(qrImageUrl, amount, planName, description);
}

function showQRModal(qrImageUrl, amount, planName, description) {
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(8px);">
            <div style="background:white; width:90%; max-width:350px; border-radius:25px; overflow:hidden; text-align:center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                
                <div style="background:#0054a3; color:white; padding:20px; font-weight:bold; font-size:18px;">
                    THANH TOÁN QR
                </div>

                <div style="padding:25px;">
                    <div style="margin-bottom:15px; font-size:15px; color:#555;">Gói: <b>${planName}</b></div>
                    
                    <div style="border:1px solid #eee; padding:10px; border-radius:15px; background:#fff;">
                        <img src="${qrImageUrl}" style="width:100%; display:block; border-radius:10px;">
                    </div>

                    <div style="margin-top:20px; background:#f8f9fa; padding:15px; border-radius:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
                            <span style="color:#888;">Số tiền:</span>
                            <span style="color:#d32f2f; font-weight:bold;">${amount.toLocaleString()}đ</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:13px;">
                            <span style="color:#888;">Nội dung:</span>
                            <span style="color:#0054a3; font-weight:bold;">${description}</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; border-top:1px solid #eee;">
                    <button onclick="document.getElementById('tp-qr-overlay').remove()" style="flex:1; padding:18px; border:none; background:none; color:#999; font-weight:bold; cursor:pointer;">HỦY BỎ</button>
                    <button onclick="location.reload()" style="flex:1; padding:18px; border:none; background:none; color:#0054a3; font-weight:bold; cursor:pointer;">XÁC NHẬN</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Giữ nguyên logic checkPaymentStatus bên dưới...
