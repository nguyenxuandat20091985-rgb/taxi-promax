// Taxi Promax v5.1 - Configuration
const CONFIG = {
    VERSION: '5.1',
    APP_NAME: 'Taxi Promax',
    
    // Pricing configuration
    PRICING: {
        BASE_FEE: 10000,
        PRICE_PER_KM: 12000,
        PRICE_PER_MINUTE: 500,
        PEAK_HOUR_MULTIPLIER: 1.2,
        INTER_PROVINCE_RATE: 1.5
    },
    
    // Package configuration (Updated as requested)
    PACKAGES: {
        FREE: {
            name: 'FREE',
            description: 'Dùng thử 7 ngày',
            features: [
                '✓ Tối đa 10 chuyến/ngày',
                '✓ Tính tiền cơ bản',
                '✓ Lưu 20 chuyến gần nhất',
                '✗ Bản đồ real-time',
                '✗ Xuất hóa đơn PDF',
                '✗ Offline mode'
            ],
            limits: {
                maxTripsPerDay: 10,
                maxHistory: 20,
                trialDays: 7,
                hasMap: false,
                hasInvoice: false,
                hasOffline: false
            },
            pricing: {
                monthly: 0,
                yearly: 0,
                lifetime: 0
            }
        },
        BASIC: {
            name: 'BASIC',
            description: 'Cho tài xế nghiệp dư',
            features: [
                '✓ Không giới hạn chuyến',
                '✓ Tính tiền km + thời gian',
                '✓ Lịch sử không giới hạn',
                '✓ Offline mode',
                '✗ Bản đồ real-time',
                '✗ Báo giá trước'
            ],
            limits: {
                maxTripsPerDay: 9999,
                maxHistory: 9999,
                hasMap: false,
                hasInvoice: false,
                hasOffline: true,
                hasPriceEstimate: false
            },
            pricing: {
                monthly: 19000,
                yearly: 149000,
                lifetime: 0
            }
        },
        PRO: {
            name: 'PRO',
            description: 'Cho tài xế chuyên nghiệp',
            features: [
                '✓ Bản đồ real-time',
                '✓ Báo giá trước',
                '✓ Bảng giá liên tỉnh',
                '✓ Xuất hóa đơn PDF',
                '✓ Phân tích thu nhập',
                '✗ AI gợi ý giá cước'
            ],
            limits: {
                hasMap: true,
                hasInvoice: true,
                hasOffline: true,
                hasPriceEstimate: true,
                hasInterProvince: true,
                hasAnalytics: true,
                hasAI: false
            },
            pricing: {
                monthly: 29000,
                yearly: 229000,
                lifetime: 0
            }
        },
        VIP: {
            name: 'VIP',
            description: 'Doanh nghiệp & cao cấp',
            features: [
                '✓ Dashboard cá nhân',
                '✓ AI gợi ý giá cước',
                '✓ Trợ lý giọng nói',
                '✓ Backup cloud',
                '✓ Không quảng cáo',
                '✓ Hỗ trợ 24/7'
            ],
            limits: {
                hasMap: true,
                hasInvoice: true,
                hasOffline: true,
                hasPriceEstimate: true,
                hasInterProvince: true,
                hasAnalytics: true,
                hasAI: true,
                hasVoice: true,
                hasCloud: true,
                noAds: true,
                prioritySupport: true
            },
            pricing: {
                monthly: 49000,
                yearly: 399000,
                lifetime: 999000
            }
        }
    },
    
    // Payment configuration
    PAYMENT: {
        QR_CODE_SIZE: 200,
        ZALOPAY_ACCOUNT: '0987654321',
        BANK_ACCOUNT: '123456789',
        BANK_NAME: 'Vietcombank',
        ACCOUNT_HOLDER: 'TAXI PROMAX',
        
        // Payment methods
        METHODS: {
            ZALOPAY: 'ZaloPay',
            MOMO: 'MoMo',
            BANK: 'Chuyển khoản',
            CASH: 'Tiền mặt'
        }
    },
    
    // System configuration
    SYSTEM: {
        ENCRYPTION_KEY: 'taxi-promax-v5.1-secure-key-2026',
        LICENSE_PREFIX: 'TAXIV5-',
        GPS_UPDATE_INTERVAL: 3000,
        MAX_HISTORY_DAYS: 365,
        
        // Trial period
        TRIAL_PERIOD_DAYS: 7,
        MAX_TRIAL_TRIPS: 10
    }
};
