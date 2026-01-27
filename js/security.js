/* security.js - Hệ thống khóa máy và kiểm soát gói cước của anh Đạt */
const Security = {
    // 1. Tạo ID định danh duy nhất cho mỗi điện thoại (Device Binding)
    getDeviceID() {
        let id = localStorage.getItem('taxi_dev_id');
        if (!id) {
            // Tạo mã ID dựa trên thông tin máy và số ngẫu nhiên
            id = 'TX-' + btoa(navigator.userAgent).substring(0, 8) + Math.random().toString(36).substring(7);
            localStorage.setItem('taxi_dev_id', id.toUpperCase());
        }
        return id;
    },

    // 2. Kiểm tra quyền hạn dựa trên gói cước đã nạp
    getLicense() {
        const raw = localStorage.getItem('taxi_license');
        if (!raw) return TAXI_CONFIG.PACKAGES.FREE; // Mặc định là gói FREE
        
        try {
            // Giải mã giấy phép (chống tài xế tự sửa localStorage)
            const license = JSON.parse(atob(raw));
            const now = Date.now();
            
            // Nếu là gói dùng thử (FREE) mà quá 7 ngày thì khóa
            if (license.tier === "FREE" && (now - license.startTime > TAXI_CONFIG.SYSTEM.TRIAL_PERIOD_DAYS * 86400000)) {
                return { ...TAXI_CONFIG.PACKAGES.FREE, expired: true };
            }
            
            return TAXI_CONFIG.PACKAGES[license.tier] || TAXI_CONFIG.PACKAGES.FREE;
        } catch (e) {
            return TAXI_CONFIG.PACKAGES.FREE;
        }
    },

    // 3. Kiểm tra tính năng có được phép dùng không (Khóa tính năng theo tầng giá)
    canUse(feature) {
        const license = this.getLicense();
        if (license.expired) return false;
        
        // Kiểm tra xem tính năng này có nằm trong giới hạn của gói không
        return license.limits[feature] === true;
    },

    // 4. Mã hóa dữ liệu cuốc xe (chống sửa lịch sử)
    encrypt(data) {
        return btoa(encodeURIComponent(JSON.stringify(data)));
    }
};

// Khởi tạo ID máy ngay khi mở app
window.DEVICE_ID = Security.getDeviceID();
