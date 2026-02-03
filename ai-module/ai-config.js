// AI Configuration for Taxi Promax - FULL VERSION BY GEMINI
const AIConfig = {
    // 1. THÔNG TIN CỐ ĐỊNH
    GEMINI_API_KEY: "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g",
    GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    
    OPENAI_API_KEY: "sk-proj-xxxxxxxx", 
    OPENAI_API_URL: "https://api.openai.com/v1/chat/completions",
    
    // 2. CẤU HÌNH THANH TOÁN (Đã khớp với BIDV của anh)
    PAYMENT: {
        bankAccount: "BIDV 4430269669 - NGUYỄN XUÂN ĐẠT",
        packages: {
            BASIC: 19000,
            PRO: 29000,
            VIP: 49000,
            LIFETIME: 999000
        },
        autoActivate: true
    },

    // 3. TÍNH NĂNG (Đã mở khóa tối đa cho anh)
    FEATURES: {
        voiceAssistant: true,
        realTimeTracking: true,
        paymentVerification: true,
        tripHistory: true,
        packageManagement: true,
        adminDashboard: true, // LUÔN BẬT QUYỀN ADMIN
        holidayThemes: true,
        aiIndependent: true   // Kích hoạt AI độc lập
    },

    // 4. TRỢ LÝ GIỌNG NÓI (Cấu hình chuẩn tiếng Việt)
    VOICE_SETTINGS: {
        enabled: true,
        language: "vi-VN",
        rate: 0.9,  // Tốc độ nói vừa phải
        pitch: 1.0,
        volume: 1.0
    },

    // 5. GIAO DIỆN (Theme Platinum cao cấp)
    UI_SETTINGS: {
        theme: "platinum",
        colors: {
            primary: "#00bfa5",
            dark: "#002d26",
            gold: "#ffc107",
            danger: "#ff5252"
        },
        animations: true,
        fullScreen: true
    },

    // 6. BỘ XỬ LÝ KÍCH HOẠT TỰ ĐỘNG (Dành cho SePay/Casso)
    processPayment: function(amount, note) {
        console.log("Hệ thống đang kiểm tra giao dịch...");
        
        // Tự động kích hoạt dựa trên số tiền anh nạp
        let activatedPkg = "";
        if (amount >= 999000) activatedPkg = "LIFETIME";
        else if (amount >= 49000) activatedPkg = "VIP";
        else if (amount >= 29000) activatedPkg = "PRO";
        else if (amount >= 19000) activatedPkg = "BASIC";

        if (activatedPkg) {
            localStorage.setItem('user_role', 'ADMIN');
            localStorage.setItem('active_package', activatedPkg);
            localStorage.setItem('payment_status', 'COMPLETED');
            
            // Thông báo giọng nói nếu có thể
            this.speak(`Xác nhận đã nhận ${amount} đồng. Đã kích hoạt gói ${activatedPkg} cho anh Đạt.`);
            return true;
        }
        return false;
    },

    // 7. HÀM PHÁT NGÔN (Để AI nói chuyện)
    speak: function(text) {
        if (!this.VOICE_SETTINGS.enabled) return;
        const msg = new SpeechSynthesisUtterance();
        msg.text = text;
        msg.lang = this.VOICE_SETTINGS.language;
        msg.rate = this.VOICE_SETTINGS.rate;
        window.speechSynthesis.speak(msg);
    },

    // 8. HỆ THỐNG KHỞI TẠO
    init: function() {
        console.log("Taxi Promax AI System - Đang khởi động...");
        
        // Tự động cấp quyền Admin cho thiết bị của anh
        localStorage.setItem('user_role', 'ADMIN');
        
        this.loadFromStorage();
        
        // Nếu đã có gói cước, thông báo chào mừng
        const currentPkg = localStorage.getItem('active_package');
        if (currentPkg) {
            console.log("Gói cước hiện tại:", currentPkg);
        }
        
        return this;
    },

    saveToStorage: function() {
        const configToSave = {
            VOICE_SETTINGS: this.VOICE_SETTINGS,
            UI_SETTINGS: this.UI_SETTINGS,
            FEATURES: this.FEATURES
        };
        localStorage.setItem('ai_config', JSON.stringify(configToSave));
    },

    loadFromStorage: function() {
        try {
            const saved = JSON.parse(localStorage.getItem('ai_config') || '{}');
            Object.assign(this.VOICE_SETTINGS, saved.VOICE_SETTINGS);
            Object.assign(this.FEATURES, saved.FEATURES);
            Object.assign(this.UI_SETTINGS, saved.UI_SETTINGS);
        } catch (e) { console.error("Lỗi load cấu hình"); }
    },

    updateSetting: function(category, key, value) {
        if (this[category]) {
            this[category][key] = value;
            this.saveToStorage();
            return true;
        }
        return false;
    }
};

// Khởi tạo ngay lập tức
const AIConfigInstance = AIConfig.init();
window.AIConfig = AIConfigInstance;
