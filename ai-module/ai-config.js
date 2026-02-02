// AI Configuration for Taxi Promax
const AIConfig = {
    // Gemini AI Key
    GEMINI_API_KEY: "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g",
    GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    
    // ChatGPT Integration
    OPENAI_API_KEY: "sk-proj-xxxxxxxx", // Will be set by admin
    OPENAI_API_URL: "https://api.openai.com/v1/chat/completions",
    
    // System Prompts
    SYSTEM_PROMPTS: {
        DRIVER_ASSISTANT: "Bạn là trợ lý AI cho ứng dụng Taxi Promax. Hỗ trợ tài xế tính cước, định vị, và giao tiếp với khách hàng.",
        ADMIN_ASSISTANT: "Bạn là trợ lý AI quản lý hệ thống Taxi Promax. Báo cáo thống kê, quản lý users, và hỗ trợ admin.",
        CUSTOMER_SERVICE: "Bạn là trợ lý hỗ trợ khách hàng Taxi Promax. Giải đáp thắc mắc về giá cước, đặt xe, và thanh toán."
    },
    
    // Voice Settings
    VOICE_SETTINGS: {
        enabled: true,
        language: "vi-VN",
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
    },
    
    // Cache Settings
    CACHE_SETTINGS: {
        enabled: true,
        duration: 3600000, // 1 hour
        maxSize: 100
    },
    
    // Webhook Settings
    WEBHOOK_SETTINGS: {
        main: "https://taxi-promax.vercel.app/api/webhook",
        backup: "https://nguyenxuandat20091985-rgb.github.io/api/webhook",
        timeout: 5000,
        retries: 3
    },
    
    // Security Settings
    SECURITY: {
        encryptLocalStorage: true,
        checksumEnabled: true,
        checksumKey: "309f930afb5691846cd5abbbd3624d507fa8fb5d715d9da03474a711cf262fb2",
        validateRequests: true
    },
    
    // Feature Flags
    FEATURES: {
        voiceAssistant: true,
        realTimeTracking: true,
        paymentVerification: true,
        tripHistory: true,
        packageManagement: true,
        adminDashboard: true,
        holidayThemes: true
    },
    
    // UI Settings
    UI_SETTINGS: {
        theme: "platinum",
        colors: {
            primary: "#00bfa5",
            dark: "#002d26",
            gold: "#ffc107",
            danger: "#ff5252"
        },
        animations: true,
        fullScreen: true,
        responsive: true
    },
    
    // Payment Settings
    PAYMENT: {
        bankAccount: "BIDV 4430269669 - NGUYỄN XUÂN ĐẠT",
        packages: {
            BASIC: 19000,
            PRO: 29000,
            VIP: 49000,
            LIFETIME: 999000
        },
        trialDays: 7,
        autoActivate: true
    },
    
    // Map Settings
    MAP_SETTINGS: {
        provider: "openstreetmap",
        defaultZoom: 16,
        defaultCenter: [21.0285, 105.8542],
        trackingInterval: 1000,
        accuracyThreshold: 10
    },
    
    // Initialize function
    init: function() {
        console.log("AI Config initialized for Taxi Promax");
        this.loadFromStorage();
        return this;
    },
    
    // Save to localStorage
    saveToStorage: function() {
        try {
            const configToSave = {
                VOICE_SETTINGS: this.VOICE_SETTINGS,
                UI_SETTINGS: this.UI_SETTINGS,
                FEATURES: this.FEATURES,
                SECURITY: this.SECURITY
            };
            localStorage.setItem('ai_config', JSON.stringify(configToSave));
            return true;
        } catch (error) {
            console.error("Error saving AI config:", error);
            return false;
        }
    },
    
    // Load from localStorage
    loadFromStorage: function() {
        try {
            const savedConfig = JSON.parse(localStorage.getItem('ai_config') || '{}');
            
            if (savedConfig.VOICE_SETTINGS) {
                this.VOICE_SETTINGS = { ...this.VOICE_SETTINGS, ...savedConfig.VOICE_SETTINGS };
            }
            
            if (savedConfig.UI_SETTINGS) {
                this.UI_SETTINGS = { ...this.UI_SETTINGS, ...savedConfig.UI_SETTINGS };
            }
            
            if (savedConfig.FEATURES) {
                this.FEATURES = { ...this.FEATURES, ...savedConfig.FEATURES };
            }
            
            if (savedConfig.SECURITY) {
                this.SECURITY = { ...this.SECURITY, ...savedConfig.SECURITY };
            }
            
            console.log("AI Config loaded from storage");
            return true;
        } catch (error) {
            console.error("Error loading AI config:", error);
            return false;
        }
    },
    
    // Update settings
    updateSetting: function(category, key, value) {
        if (this[category] && this[category][key] !== undefined) {
            this[category][key] = value;
            this.saveToStorage();
            return true;
        }
        return false;
    },
    
    // Get all settings
    getAllSettings: function() {
        return {
            GEMINI_API_KEY: this.GEMINI_API_KEY ? "********" : "Not set",
            SYSTEM_PROMPTS: this.SYSTEM_PROMPTS,
            VOICE_SETTINGS: this.VOICE_SETTINGS,
            FEATURES: this.FEATURES,
            UI_SETTINGS: this.UI_SETTINGS,
            PAYMENT: this.PAYMENT,
            SECURITY: {
                ...this.SECURITY,
                checksumKey: "********"
            }
        };
    },
    
    // Validate configuration
    validate: function() {
        const errors = [];
        
        if (!this.GEMINI_API_KEY) {
            errors.push("Gemini API Key is required");
        }
        
        if (!this.SECURITY.checksumKey) {
            errors.push("Checksum Key is required for security");
        }
        
        if (!this.PAYMENT.bankAccount) {
            errors.push("Bank account is required for payments");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    // Reset to defaults
    reset: function() {
        // Keep sensitive data
        const geminiKey = this.GEMINI_API_KEY;
        const checksumKey = this.SECURITY.checksumKey;
        
        // Reset object
        Object.assign(this, {
            GEMINI_API_KEY: geminiKey,
            GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
            SYSTEM_PROMPTS: {
                DRIVER_ASSISTANT: "Bạn là trợ lý AI cho ứng dụng Taxi Promax. Hỗ trợ tài xế tính cước, định vị, và giao tiếp với khách hàng.",
                ADMIN_ASSISTANT: "Bạn là trợ lý AI quản lý hệ thống Taxi Promax. Báo cáo thống kê, quản lý users, và hỗ trợ admin.",
                CUSTOMER_SERVICE: "Bạn là trợ lý hỗ trợ khách hàng Taxi Promax. Giải đáp thắc mắc về giá cước, đặt xe, và thanh toán."
            },
            VOICE_SETTINGS: {
                enabled: true,
                language: "vi-VN",
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            },
            SECURITY: {
                encryptLocalStorage: true,
                checksumEnabled: true,
                checksumKey: checksumKey,
                validateRequests: true
            },
            FEATURES: {
                voiceAssistant: true,
                realTimeTracking: true,
                paymentVerification: true,
                tripHistory: true,
                packageManagement: true,
                adminDashboard: true,
                holidayThemes: true
            },
            UI_SETTINGS: {
                theme: "platinum",
                colors: {
                    primary: "#00bfa5",
                    dark: "#002d26",
                    gold: "#ffc107",
                    danger: "#ff5252"
                },
                animations: true,
                fullScreen: true,
                responsive: true
            },
            PAYMENT: {
                bankAccount: "BIDV 4430269669 - NGUYỄN XUÂN ĐẠT",
                packages: {
                    BASIC: 19000,
                    PRO: 29000,
                    VIP: 49000,
                    LIFETIME: 999000
                },
                trialDays: 7,
                autoActivate: true
            }
        });
        
        localStorage.removeItem('ai_config');
        console.log("AI Config reset to defaults");
        return true;
    }
};

// Initialize and export
const AIConfigInstance = AIConfig.init();
window.AIConfig = AIConfigInstance;