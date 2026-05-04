async function createPayment(amount, planName) {
    const activeBtn = window.event ? window.event.target : null;
    let originalText = "NẠP NGAY";

    if (activeBtn) {
        originalText = activeBtn.innerText;
        activeBtn.innerText = "ĐANG TẠO QR...";
        activeBtn.disabled = true;
    }

    tpSpeak("Đang kết nối cổng thanh toán. Anh vui lòng chờ giây lát.");

    try {
        const txID = localStorage.getItem('tx_id') || "DAT";
        // Gửi description để backend khử dấu
        const desc = `${txID} ${planName}`;

        // GỌI SANG VERCEL
        const response = await fetch('https://taxi-promax.vercel.app/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                description: desc
            }),
        });

        if (!response.ok) {
            throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
        }

        const data = await response.json();

        if (data && data.checkoutUrl) {
            tpSpeak("Đã tạo mã thành công. Mời anh quét mã.");
            localStorage.setItem('pending_plan', planName);
            // Chuyển hướng sang trang thanh toán của PayOS
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error("Không nhận được phản hồi từ PayOS.");
        }

    } catch (error) {
        console.error(error);
        tpSpeak("Máy chủ đang bận. Anh vui lòng thử lại.");
        alert("Lỗi: " + error.message);
    } finally {
        if (activeBtn) {
            activeBtn.innerText = originalText;
            activeBtn.disabled = false;
        }
    }
}
