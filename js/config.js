// File: js/config.js - Hệ thống Taxi ProMax
// Bản quyền thuộc về: NGUYEN XUAN DAT

const Config = {
    // 1. THÔNG TIN CHỦ SỞ HỮU (Nhận tiền về đây)
    OWNER: {
        NAME: "NGUYEN XUAN DAT",
        BANK: "BIDV",
        STK: "4430269669"
    },

    // 2. 🔑 KẾT NỐI PAYOS (Đã điền mã của anh Đạt từ ảnh chụp)
    // Nguồn: Screenshot_20260128_001712_Chrome.jpg
    PAYOS_CONFIG: {
        CLIENT_ID: "8310065a-605d-4555-8933-5965487779f3",
        API_KEY: "0f438069-79f8-466d-9618-e39755197824",
        CHECKSUM_KEY: "01f66be9445100780f2d95b584d56711902462e71c99f928a3f8582772596489"
    },

    // 3. CÁC GÓI CƯỚC TÀI XẾ CÓ THỂ MUA
    PACKAGES: [
        { id: "BASIC", name: "Gói Ngày (BASIC)", price: 19000, days: 1 },
        { id: "PRO", name: "Gói Tháng (PRO)", price: 490000, days: 30 }
    ],

    // 4. HÀM XỬ LÝ TẠO LINK THANH TOÁN (Dành cho trang payment.html)
    getPaymentUrl: function(packageId, deviceId) {
        const pkg = this.PACKAGES.find(p => p.id === packageId);
        if (!pkg) return null;

        // Tạo nội dung chuyển khoản tự động để anh dễ quản lý
        // Cấu trúc: NAP [ID Thiết Bị] [Gói]
        const description = `NAP ${deviceId} ${pkg.id}`;
        
        // Trả về dữ liệu để tạo QR VietQR Pro
        return {
            accountNumber: this.OWNER.STK,
            accountName: this.OWNER.NAME,
            amount: pkg.price,
            description: description,
            bankCode: "BIDV"
        };
    }
};

// Đóng băng đối tượng để bảo mật cấu hình
Object.freeze(Config);
console.log("Taxi ProMax Config Loaded - Welcome Admin Nguyen Xuan Dat");
