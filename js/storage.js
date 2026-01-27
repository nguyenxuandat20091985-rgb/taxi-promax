/* storage.js - Sổ ghi chép cuốc xe và lịch sử thu nhập của anh Đạt */
const Storage = {
    // 1. Lưu cuốc xe vừa chạy xong
    saveTrip(tripData) {
        let history = this.getHistory();
        const newTrip = {
            id: 'TRIP-' + Date.now(),
            date: new Date().toLocaleString('vi-VN'),
            ...tripData
        };
        
        history.unshift(newTrip); // Cho cuốc mới nhất lên đầu
        
        // Kiểm tra giới hạn của gói (FREE chỉ lưu 20 cuốc)
        const license = Security.getLicense();
        if (license.tier === "FREE") {
            history = history.slice(0, TAXI_CONFIG.PACKAGES.FREE.limits.maxHistory || 20);
        }

        // Mã hóa trước khi cất vào kho
        localStorage.setItem('taxi_history_secure', Security.encrypt(history));
    },

    // 2. Lấy danh sách lịch sử để xem lại
    getHistory() {
        const raw = localStorage.getItem('taxi_history_secure');
        if (!raw) return [];
        try {
            // Giải mã để đọc dữ liệu
            return JSON.parse(decodeURIComponent(atob(raw)));
        } catch (e) {
            console.error("Lỗi đọc lịch sử:", e);
            return [];
        }
    },

    // 3. Tính tổng doanh thu (Phân tích thu nhập cho gói PRO/VIP)
    getAnalytics() {
        const history = this.getHistory();
        return {
            totalRevenue: history.reduce((sum, t) => sum + t.fare, 0),
            totalKm: history.reduce((sum, t) => sum + t.distance, 0),
            totalTrips: history.length
        };
    },

    // 4. Xóa trắng dữ liệu (Dùng khi tài xế muốn làm mới app)
    clearData() {
        if(confirm("Anh có chắc muốn xóa hết lịch sử không?")) {
            localStorage.removeItem('taxi_history_secure');
            location.reload();
        }
    }
};
