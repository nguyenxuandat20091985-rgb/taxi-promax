// File: payment.js
async function createPayment(price, packageName) {
    const orderCode = Number(String(Date.now()).slice(-6)); // Tạo mã đơn hàng ngẫu nhiên
    
    try {
        // Gọi đến API để tạo link thanh toán (Đây là bước quan trọng nhất)
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: price,
                description: `Nap ${packageName}`,
                orderCode: orderCode
            })
        });

        const data = await response.json();

        if (data.checkoutUrl) {
            // Nếu thành công, chuyển hướng người dùng sang trang thanh toán PayOS
            window.location.href = data.checkoutUrl;
        } else {
            alert("Lỗi kết nối thanh toán, sếp kiểm tra lại API Key nhé!");
        }
    } catch (error) {
        console.error("Lỗi rồi anh ơi:", error);
        alert("Không thể tạo đơn hàng. Hãy thử lại sau!");
    }
}
