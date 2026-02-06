async function selectPack(price, name, el) {
    // 1. Hiệu ứng chọn gói (Đổi màu khung)
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    }

    // 2. Hiệu ứng chờ và Chống bấm liên tiếp (Spam)
    let originalContent = "";
    if (el) {
        originalContent = el.innerHTML; // Lưu lại nội dung cũ
        el.style.pointerEvents = "none"; // Khóa nút không cho bấm thêm
        el.style.opacity = "0.7";
        // Thay nội dung nút thành biểu tượng chờ
        const btn = el.querySelector('.p-btn');
        if (btn) btn.innerHTML = "⌛ ĐANG KẾT NỐI...";
    }

    console.log(`Đang khởi tạo đơn hàng: ${name} - Giá: ${price} VNĐ`);

    // 3. Tạo mã đơn hàng ngẫu nhiên (Lấy 8 số cuối của timestamp)
    const orderCode = Number(String(Date.now()).slice(-8)); 

    try {
        // 4. Gọi đến server (Vercel API) để lấy link thanh toán
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: price,
                description: `NAP ${name.toUpperCase()}`, 
                orderCode: orderCode
            })
        });

        const data = await response.json();

        // 5. Xử lý kết quả trả về
        if (data.checkoutUrl) {
            // Chuyển hướng sang trang quét mã QR của PayOS
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error(data.error || "Lỗi API");
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("❌ KHÔNG THỂ TẠO MÃ QR!\nAnh kiểm tra lại API Key hoặc Internet nhé.");
        
        // Khôi phục lại trạng thái nút nếu lỗi
        if (el) {
            el.innerHTML = originalContent;
            el.style.pointerEvents = "auto";
            el.style.opacity = "1";
        }
    }
}
