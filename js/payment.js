// Hàm xử lý khi khách bấm nút "NẠP NGAY"
async function createPayment(amount, description) {
    // 1. Hiển thị thông báo để khách biết hệ thống đang xử lý
    const btn = event?.target;
    const originalText = btn ? btn.innerText : "NẠP NGAY";
    if (btn) {
        btn.innerText = "ĐANG TẠO MÃ QR...";
        btn.disabled = true;
    }

    try {
        // 2. Gửi yêu cầu lên máy chủ Vercel của anh
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                description: description || "Nap tien Taxi ProMax"
            }),
        });

        // 3. Đọc dữ liệu trả về
        const data = await response.json();

        // 4. Kiểm tra xem có link thanh toán chưa
        if (data && data.checkoutUrl) {
            // Nếu có, đưa khách sang trang mã QR của BIDV ngay
            window.location.href = data.checkoutUrl;
        } else {
            console.error("Lỗi từ máy chủ:", data);
            alert("Anh Đạt ơi, máy chủ báo lỗi: " + (data.error || "Không lấy được link"));
        }

    } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Lỗi kết nối rồi anh ơi! Anh kiểm tra lại mạng hoặc Vercel nhé.");
    } finally {
        // Trả lại trạng thái nút bấm nếu có lỗi
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

// Lắng nghe sự kiện từ các nút bấm có class 'btn-nap' (nếu anh có đặt class)
// Hoặc anh có thể gọi trực tiếp onclick="createPayment(19000, 'Goi Basic')" trong HTML
