// AI MODULE CONFIGURATION
// File cấu hình AI độc lập

const AI_CONFIG = {
    // API Keys
    GEMINI_API_KEY: "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g",
    CHATGPT_API_KEY: "",
    
    // AI Settings
    AI_NAME: "Trợ lý Taxi ProMax",
    AI_AVATAR: "https://i.imgur.com/9JZ7Q2c.png",
    AI_GREETING: "Xin chào! Tôi là trợ lý AI của Taxi ProMax. Tôi có thể giúp gì cho bạn?",
    
    // Reminder Settings
    REMINDER_ENABLED: true,
    REMINDER_DAYS_BEFORE: 3,
    
    // Webhook URLs
    AI_WEBHOOK: "https://taxi-promax.vercel.app/api/ai-webhook",
    BACKUP_WEBHOOK: "https://nguyenxuandat20091985-rgb.github.io/api/ai-webhook",
    
    // Response Templates
    RESPONSE_TEMPLATES: {
        GREETING: "Chào anh/chị! Em là trợ lý ảo Taxi ProMax. Em có thể giúp gì cho anh/chị ạ? ✨",
        PRICE_INFO: "Hiện tại anh/chị đang sử dụng đơn giá {price}đ/km. Tổng cước = Quãng đường x Đơn giá.",
        PACKAGE_INFO: "Hệ thống có 4 gói: BASIC (19k/tháng), PRO (29k/tháng), VIP 1TH (49k/tháng), VIP TRỌN ĐỜI (999k).",
        HISTORY_INFO: "Anh/chị có thể xem lịch sử tất cả chuyến đi trong mục 'Lịch sử'.",
        SUPPORT_INFO: "Liên hệ hỗ trợ: Qua hệ thống AI này hoặc trực tiếp với admin.",
        THANKS: "Không có gì ạ! Chúc anh/chị có những chuyến đi an toàn và thuận lợi.",
        TRIAL_WARNING: "⏰ CHÚ Ý: Chỉ còn {days} ngày dùng thử! Nâng cấp ngay để không bị gián đoạn.",
        DEFAULT: "Em hiểu rồi ạ! Để em hỗ trợ anh/chị vấn đề này."
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
}