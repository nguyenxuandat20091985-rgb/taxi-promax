// Pricing configuration
PRICING: {
    BASE_FEE: 10000,           // Phí mở cửa
    PRICE_PER_KM: 12000,       // Giá mỗi km
    PRICE_PER_MINUTE: 500,     // Giá mỗi phút
    PEAK_HOUR_MULTIPLIER: 1.2, // Hệ số giờ cao điểm
    PEAK_HOURS: [              // Giờ cao điểm
        { start: 6, end: 9 },   // Sáng
        { start: 16, end: 19 }  // Chiều
    ]
},

// Package configuration
PACKAGES: {
    FREE: {
        name: 'FREE',
        maxDistance: 10,        // km
        historyDays: 7,
        exportReport: false,
        prioritySupport: false,
        price: 0
    },
    BASIC: {
        name: 'BASIC',
        maxDistance: 50,
        historyDays: 30,
        exportReport: true,
        prioritySupport: false,
        price: 50000
    },
    PRO: {
        name: 'PRO',
        maxDistance: 9999,      // Không giới hạn
        historyDays: 90,
        exportReport: true,
        prioritySupport: true,
        price: 100000
    },
    VIP: {
        name: 'VIP',
        maxDistance: 9999,
        historyDays: 365,
        exportReport: true,
        prioritySupport: true,
        apiAccess: true,
        customUI: true,
        price: 200000
    }
},

// System configuration
SYSTEM: {
    ENCRYPTION_KEY: 'taxi-promax-v5.1-secure-key-2023',
    LICENSE_PREFIX: 'TAXI-',
    MAX_TRIP_HISTORY: 100,
    GPS_UPDATE_INTERVAL: 3000,   // 3 giây
    MAX_IDLE_TIME: 300000        // 5 phút
},

// Payment configuration
PAYMENT: {
    QR_CODE_SIZE: 200,
    BANK_ACCOUNT: '123456789',
    BANK_NAME: 'Vietcombank',
    ACCOUNT_HOLDER: 'TAXI PROMAX',
    SUPPORT_EMAIL: 'support@taxipromax.com',
    SUPPORT_PHONE: '1900 1234'
},

// API endpoints (simulated)
API: {
    VERIFY_LICENSE: '/api/verify-license',
    PROCESS_PAYMENT: '/api/process-payment',
    GENERATE_REPORT: '/api/generate-report',
    BACKUP_DATA: '/api/backup-data'
},

// Map configuration
MAP: {
    DEFAULT_ZOOM: 15,
    DEFAULT_CENTER: [10.8231, 106.6297], // Tọa độ mặc định (HCM)
    MARKER_COLOR: '#007bff',
    TRACK_COLOR: '#dc3545'
}
