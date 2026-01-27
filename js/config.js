/* Taxi Promax v5.1 - Official Configuration by Nguyen Xuan Dat */
const TAXI_CONFIG = {
    VERSION: '5.1',
    APP_NAME: 'Taxi Promax',
    
    // Cấu hình thanh toán - Tiền sẽ về đây khi khách nạp
    PAYMENT: {
        BANK_NAME: 'BIDV',
        BANK_ACCOUNT: '4430269669', // STK của anh Đạt
        ACCOUNT_HOLDER: 'NGUYEN XUAN DAT',
        QR_CODE_SIZE: 250,
        ZALOPAY_ACCOUNT: '0987654321', // Anh có thể sửa số ZaloPay tại đây
        METHODS: {
            BANK: 'Chuyển khoản BIDV',
            ZALOPAY: 'ZaloPay QR'
        }
    },
    
    // Cấu hình giá cước mặc định (Có thể thay đổi theo từng vùng)
    TARIFF: {
        BASE_FEE: 10000,           // Giá mở cửa
        PRICE_PER_KM: 12000,       // Giá mỗi km
        PRICE_PER_MINUTE: 500,     // Giá thời gian chờ/phút
        PEAK_HOUR_MULTIPLIER: 1.2, // Hệ số giờ cao điểm
        INTER_PROVINCE_RATE: 1.5   // Hệ số đi tỉnh
    },
    
    // Hệ thống gói dịch vụ 4 tầng để anh thu tiền hàng tháng/năm/trọn đời
    PACKAGES: {
        FREE: {
            name: 'FREE',
            description: 'Dùng thử 7 ngày',
            limits: { maxTripsPerDay: 10, trialDays: 7, hasOffline: false },
            price: 0
        },
        BASIC: {
            name: 'BASIC',
            description: '19.000đ/tháng - 149.000đ/năm',
            limits: { maxTripsPerDay: 999, hasOffline: true, hasPriceEstimate: false },
            pricing: { monthly: 19000, yearly: 149000, lifetime: 0 }
        },
        PRO: {
            name: 'PRO',
            description: '29.000đ/tháng - 229.000đ/năm',
            limits: { hasMap: true, hasInvoice: true, hasPriceEstimate: true },
            pricing: { monthly: 29000, yearly: 229000, lifetime: 0 }
        },
        VIP: {
            name: 'VIP',
            description: 'Đầy đủ tính năng - Trọn đời 999k',
            limits: { hasAI: true, hasVoice: true, hasCloud: true, noAds: true },
            pricing: { monthly: 49000, yearly: 399000, lifetime: 999000 }
        }
    },
    
    // Hệ thống bảo mật
    SYSTEM: {
        ENCRYPTION_KEY: 'taxi-promax-v5.1-secure-key-2026',
        LICENSE_PREFIX: 'TAXIV5-',
        GPS_UPDATE_INTERVAL: 3000, // Cập nhật GPS mỗi 3 giây
        MAX_HISTORY_DAYS: 365
    }
};

// Đảm bảo code không bị lỗi khi gọi biến
window.CONFIG = TAXI_CONFIG; 
