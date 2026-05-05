/**
 * TAXI PROMAX - HỆ THỐNG HIỂN THỊ QR TẠI CHỖ
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

// Hàm này hiện QR ngay lập tức khi bấm nút
function createPayment(amount, planName) {
    tpSpeak(`Đang tạo mã QR cho gói ${planName}. Anh vui lòng quét mã để thanh toán.`);
    
    // Thông tin tài khoản của anh
    const BANK_ID = "BIDV";
    const ACCOUNT_NO = "123456789"; // ANH ĐIỀN SỐ TÀI KHOẢN CỦA ANH VÀO ĐÂY
    const ACCOUNT_NAME = "NGUYEN XUAN DAT"; // ANH ĐIỀN TÊN KHÔNG DẤU CỦA ANH
    
    const txID = localStorage.getItem('tx_id') || "DAT";
    const description = `${txID} ${planName}`.replace(/\s+/g, '%20');

    // Tạo link ảnh QR trực tiếp (Dùng VietQR API cho nhanh và hiện luôn)
    const qrImageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${amount}&addInfo=${description}&accountName=${ACCOUNT_NAME}`;

    localStorage.setItem('pending_plan', planName);
    
    // Gọi hàm hiển thị bảng QR
    showQRModal(qrImageUrl, amount, planName);
}

function showQRModal(qrImageUrl, amount, planName) {
    // Xóa modal cũ nếu có
    const existModal = document.getElementById('tp-qr-overlay');
    if (existModal) existModal.remove();

    const modalHtml = `
        <div id="tp-qr-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center;">
            <div style="background:white; width:90%; max-width:350px; border-radius:15px; overflow:hidden; text-align:center; font-family:sans-serif; position:relative;">
                
                <div style="background:#0054a3; color:white; padding:15px; font-weight:bold;">
                    THANH TOÁN QUA BIDV
                </div>

                <div style="padding:20px;">
                    <p style="margin:0 0 10px 0; color:#555;">Gói cước: <b>${planName}</b></p>
                    
                    <img src="${qrImageUrl}" style="width:100%; border:1px solid #eee; border-radius:10px;" alt="Mã QR">
                    
                    <div style="margin-top:15px;">
                        <p style="margin:0; font-size:12px; color:#888;">Số tiền cần chuyển:</p>
                        <h2 style="margin:5px 0; color:#d32f2f;">${amount.toLocaleString()}đ</h2>
                    </div>

                    <p style="font-size:11px; color:#666; background:#fff3cd; padding:8px; border-radius:5px; border:1px solid #ffeeba;">
                        <b>Lưu ý:</b> Giữ nguyên nội dung chuyển khoản để hệ thống tự động kích hoạt.
                    </p>
                </div>

                <div style="display:flex; border-top:1px solid #eee;">
                    <button onclick="document.getElementById('tp-qr-overlay').remove()" style="flex:1; padding:15px; border:none; background:none; color:#666; cursor:pointer; border-right:1px solid #eee;">ĐÓNG</button>
                    <button onclick="location.reload()" style="flex:1; padding:15px; border:none; background:none; color:#0054a3; font-weight:bold; cursor:pointer;">XÁC NHẬN</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Giữ lại hàm kiểm tra để cộng ngày sau khi anh xác nhận thủ công hoặc từ webhook
function checkPaymentStatus() {
    // Phần này vẫn như cũ để xử lý logic cộng hạn dùng
}
document.addEventListener('DOMContentLoaded', checkPaymentStatus);
