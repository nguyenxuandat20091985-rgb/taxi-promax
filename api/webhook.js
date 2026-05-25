import PayOS from '@payos/node';

const payos = new PayOS(
    process.env.PAYOS_CLIENT_ID, 
    process.env.PAYOS_API_KEY, 
    process.env.PAYOS_CHECKSUM_KEY
);

export default async function handler(req, res) {
    // Chỉ tiếp nhận phương thức POST từ cấu hình Webhook PayOS
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookData = req.body;

        // Khóa bảo vệ 1: Bỏ qua kiểm tra nếu là gói tin test cấu hình kết nối của PayOS
        if (!webhookData || webhookData.desc === "Confirm Webhook" || webhookData.description === "Confirm Webhook") {
            return res.status(200).json({ success: true, message: "Cấu hình webhook thành công!" });
        }
        
        // Khóa bảo vệ 2: Xác thực chữ ký số tránh hacker nạp khống dữ liệu
        const verifiedData = payos.verifyPaymentWebhookData(webhookData);

        if (verifiedData) {
            const description = verifiedData.description; // Định dạng chuẩn: "PROMAX TAIXE GOIPRO" hoặc "PROMAX 0388724966 PRO"
            const parts = description.split(' ');
            
            // Lấy Số điện thoại (hoặc mã tài xế) và tên gói từ chuỗi tin nhắn
            const phone = parts[1] || "TAIXE";
            const planName = parts.slice(2).join(' ').toUpperCase(); // Lấy phần chữ phía sau (Ví dụ: "PRO", "PRO MAX", "LẺ")

            // 🛠️ LOGIC TỰ ĐỘNG TÍNH TOÁN NGÀY HẠN DÙNG DỰA TRÊN TÊN GÓI CƯỚC
            let days = 0;
            if (planName.includes("LẺ")) days = 1;
            else if (planName.includes("PROMAX") || planName.includes("PRO MAX")) days = 90;
            else if (planName.includes("PRO")) days = 30;
            else if (planName.includes("THỬ")) days = 7;

            if (days > 0) {
                const msToAdd = days * 24 * 60 * 60 * 1000; // Quy đổi ngày ra miligiây
                const dbUrl = `https://taxi-promax-default-rtdb.firebaseio.com/tai_xe_online/${phone}.json`;

                // 1. Lấy hạn dùng hiện tại của tài xế trên Firebase về để kiểm tra
                const response = await fetch(dbUrl);
                const driverData = response.ok ? await response.json() : null;

                const now = Date.now();
                // Nếu tài xế cũ còn hạn dùng thì cộng dồn tiếp, nếu hết hạn hoặc tài xế mới thì lấy thời gian hiện tại làm gốc
                let currentExpiry = (driverData && driverData.tp_expiry) ? parseInt(driverData.tp_expiry) : now;
                let startTime = Math.max(currentExpiry, now);
                let newExpiry = startTime + msToAdd;

                // 2. Cập nhật hạn dùng mới và trạng thái gói trực tiếp lên Firebase Realtime Database
                await fetch(dbUrl, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tp_expiry: newExpiry,
                        active_plan_name: planName,
                        last_payment_time: now
                    })
                });

                console.log(`[ webhook ] Kích hoạt thành công gói ${planName} (+${days} ngày) cho tài xế: ${phone}`);
            }

            // Trả về trạng thái 200 báo cho PayOS biết hệ thống của anh đã xử lý đơn thành công
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ success: false, error: "Xác thực chữ ký đơn hàng thất bại" });

    } catch (error) {
        console.error("[ webhook Lỗi ]:", error);
        // Vẫn trả về 200 hoặc 400 có kiểm soát để tránh PayOS spam gửi lại lệnh liên tục khi lỗi logic nội bộ
        return res.status(400).json({ success: false, error: error.message });
    }
}
