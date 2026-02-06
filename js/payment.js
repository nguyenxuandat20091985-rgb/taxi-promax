// File: js/payment.js

async function selectPack(price, name, el) {
    // 1. Hiệu ứng chọn gói
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    }

    // 2. Chống bấm liên tiếp (Spam)
    const originalContent = el ? el.innerHTML : "";
    if (el) el.style.opacity = "0.5";
    
    console.log(`Đang khởi tạo đơn hàng: ${name} - Giá: ${price} VNĐ`);

    // 3. Tạo mã đơn hàng (PayOS yêu cầu số nguyên, tối đa 9007199254740991)
    // Dùng timestamp là chuẩn nhất
    const orderCode = Number(String(Date.now()).slice(-8)); 

    try {
        // 4. Gọi đến server (Vercel API)
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: price,
                description: `NAP ${name}`, 
                orderCode: orderCode
            })
        });

        const data = await response.json();

        // 5. Xử lý kết quả
        if (data.checkoutUrl) {
            // Chuyển hướng sang cổng thanh toán
            window.location.href = data.checkoutUrl;
        } else {
            console.error("Lỗi từ API:", data);
            alert("❌ Lỗi: " + (data.error || "Không thể tạo mã QR. Anh kiểm tra lại API Key trên Vercel!"));
            if (el) el.style.opacity = "1";
        }
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("❌ Lỗi kết nối! Anh kiểm tra xem đã Push thư mục /api lên Vercel chưa?");
        if (el) el.style.opacity = "1";
    }
}
