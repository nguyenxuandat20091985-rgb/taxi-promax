// File: js/payment.js

// Hàm này sẽ chạy khi anh bấm vào các gói nạp tiền
async function selectPack(price, name, el) {
    // 1. Hiệu ứng chọn gói (đổi màu khung)
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    console.log(`Đang khởi tạo đơn hàng: ${name} - Giá: ${price} VNĐ`);

    // 2. Tạo mã đơn hàng ngẫu nhiên (PayOS yêu cầu mã số)
    const orderCode = Number(String(Date.now()).slice(-6)); 

    try {
        // 3. Gọi đến server (Vercel API) để lấy link thanh toán
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: price,
                description: `NAP ${name}`, // Ví dụ: NAP GOI THANG
                orderCode: orderCode
            })
        });

        const data = await response.json();

        // 4. Xử lý kết quả trả về
        if (data.checkoutUrl) {
            // Nếu thành công, chuyển hướng tài xế sang trang quét mã QR của PayOS
            window.location.href = data.checkoutUrl;
        } else {
            console.error("Lỗi PayOS:", data);
            alert("Không thể tạo mã QR. Anh hãy kiểm tra lại cấu hình API Key trên Vercel nhé!");
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Lỗi kết nối máy chủ! Anh kiểm tra xem đã tạo thư mục /api trên Vercel chưa?");
    }
}
