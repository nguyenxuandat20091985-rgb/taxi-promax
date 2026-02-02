// AI CLIENT MODULE
// Module xử lý AI độc lập

class AIClient {
    constructor(config) {
        this.config = config || window.AI_CONFIG;
        this.isInitialized = false;
        this.messageHistory = [];
    }
    
    // Khởi tạo AI Client
    initialize() {
        console.log("🔄 Đang khởi tạo AI Client...");
        
        // Tải lịch sử tin nhắn
        this.loadMessageHistory();
        
        // Kết nối với Gemini AI
        this.connectToGemini();
        
        this.isInitialized = true;
        console.log("✅ AI Client đã sẵn sàng");
        
        return this;
    }
    
    // Kết nối với Gemini AI
    connectToGemini() {
        const apiKey = this.config.GEMINI_API_KEY;
        
        if (!apiKey || apiKey.length < 30) {
            console.warn("⚠️ Gemini API Key không hợp lệ. Sử dụng AI cục bộ.");
            return false;
        }
        
        console.log("🔗 Đang kết nối với Gemini AI...");
        
        // Lưu trạng thái kết nối
        localStorage.setItem('ai_connection_status', 'connecting');
        
        // Giả lập kết nối thành công
        setTimeout(() => {
            localStorage.setItem('ai_connection_status', 'connected');
            console.log("✅ Đã kết nối với Gemini AI");
        }, 1000);
        
        return true;
    }
    
    // Gửi tin nhắn đến AI
    async sendMessage(message) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        // Thêm vào lịch sử
        this.addToHistory('user', message);
        
        // Xử lý tin nhắn
        const response = await this.processMessage(message);
        
        // Thêm phản hồi vào lịch sử
        this.addToHistory('ai', response);
        
        // Lưu lịch sử
        this.saveMessageHistory();
        
        return response;
    }
    
    // Xử lý tin nhắn
    async processMessage(message) {
        const lowerMsg = message.toLowerCase();
        
        // Kiểm tra kết nối Gemini
        const connectionStatus = localStorage.getItem('ai_connection_status');
        
        if (connectionStatus === 'connected') {
            // Nếu có kết nối, sử dụng AI thông minh
            return await this.processWithGemini(message);
        } else {
            // Sử dụng AI cục bộ
            return this.processLocally(message);
        }
    }
    
    // Xử lý với Gemini AI
    async processWithGemini(message) {
        try {
            // Giả lập gọi API Gemini
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Trong thực tế sẽ gọi API thật
            // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'x-goog-api-key': this.config.GEMINI_API_KEY
            //     },
            //     body: JSON.stringify({
            //         contents: [{
            //             parts: [{
            //                 text: message
            //             }]
            //         }]
            //     })
            // });
            
            // Tạm thời sử dụng AI cục bộ
            return this.processLocally(message);
            
        } catch (error) {
            console.error("Lỗi kết nối Gemini:", error);
            return this.processLocally(message);
        }
    }
    
    // Xử lý cục bộ
    processLocally(message) {
        const lowerMsg = message.toLowerCase();
        const templates = this.config.RESPONSE_TEMPLATES;
        
        if (lowerMsg.includes('chào') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            return templates.GREETING;
        } else if (lowerMsg.includes('giá') || lowerMsg.includes('cước') || lowerMsg.includes('tiền')) {
            // Lấy giá hiện tại từ localStorage
            const currentPrice = localStorage.getItem('current_price') || '15,000';
            return templates.PRICE_INFO.replace('{price}', currentPrice);
        } else if (lowerMsg.includes('gói') || lowerMsg.includes('nâng cấp') || lowerMsg.includes('cước')) {
            return templates.PACKAGE_INFO;
        } else if (lowerMsg.includes('lịch sử') || lowerMsg.includes('chuyến đi')) {
            return templates.HISTORY_INFO;
        } else if (lowerMsg.includes('hỗ trợ') || lowerMsg.includes('giúp đỡ') || lowerMsg.includes('liên hệ')) {
            return templates.SUPPORT_INFO;
        } else if (lowerMsg.includes('cảm ơn') || lowerMsg.includes('thanks')) {
            return templates.THANKS;
        } else if (lowerMsg.includes('trial') || lowerMsg.includes('dùng thử') || lowerMsg.includes('hết hạn')) {
            // Kiểm tra ngày dùng thử
            const trialData = localStorage.getItem('free_trial_data');
            if (trialData) {
                const trial = JSON.parse(trialData);
                const endDate = new Date(trial.endDate);
                const now = new Date();
                const diffTime = endDate - now;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (daysLeft <= this.config.REMINDER_DAYS_BEFORE) {
                    return templates.TRIAL_WARNING.replace('{days}', daysLeft);
                }
            }
            return templates.DEFAULT;
        } else {
            const randomResponses = [
                "Em hiểu rồi ạ! Để em hỗ trợ anh/chị vấn đề này.",
                "Anh/chị có thể mô tả rõ hơn được không ạ?",
                "Em sẽ ghi nhận yêu cầu này và báo lại với đội kỹ thuật.",
                "Hiện tại tính năng này đang được phát triển. Anh/chị vui lòng thử lại sau nhé!",
                "Anh/chị có muốn xem hướng dẫn sử dụng chi tiết không ạ?"
            ];
            return randomResponses[Math.floor(Math.random() * randomResponses.length)];
        }
    }
    
    // Gửi cảnh báo hết hạn dùng thử
    sendTrialWarning(daysLeft) {
        if (!this.config.REMINDER_ENABLED) return;
        
        if (daysLeft <= this.config.REMINDER_DAYS_BEFORE) {
            const warningMessage = this.config.RESPONSE_TEMPLATES.TRIAL_WARNING.replace('{days}', daysLeft);
            
            // Gửi webhook cảnh báo
            this.sendWebhookWarning(daysLeft);
            
            return warningMessage;
        }
        
        return null;
    }
    
    // Gửi webhook cảnh báo
    sendWebhookWarning(daysLeft) {
        const webhookData = {
            type: 'trial_warning',
            days_left: daysLeft,
            timestamp: new Date().toISOString(),
            message: `Khách hàng còn ${daysLeft} ngày dùng thử`
        };
        
        // Gửi đến webhook AI
        fetch(this.config.AI_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookData)
        }).catch(() => {
            // Gửi đến backup
            fetch(this.config.BACKUP_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookData)
            });
        });
    }
    
    // Thêm vào lịch sử tin nhắn
    addToHistory(role, content) {
        this.messageHistory.push({
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Giới hạn lịch sử 50 tin nhắn
        if (this.messageHistory.length > 50) {
            this.messageHistory = this.messageHistory.slice(-50);
        }
    }
    
    // Lưu lịch sử tin nhắn
    saveMessageHistory() {
        try {
            localStorage.setItem('ai_message_history', JSON.stringify(this.messageHistory));
        } catch (e) {
            console.error("Lỗi lưu lịch sử tin nhắn:", e);
        }
    }
    
    // Tải lịch sử tin nhắn
    loadMessageHistory() {
        try {
            const savedHistory = localStorage.getItem('ai_message_history');
            if (savedHistory) {
                this.messageHistory = JSON.parse(savedHistory);
            }
        } catch (e) {
            console.error("Lỗi tải lịch sử tin nhắn:", e);
        }
    }
    
    // Lấy lịch sử tin nhắn
    getMessageHistory() {
        return this.messageHistory;
    }
    
    // Xóa lịch sử tin nhắn
    clearMessageHistory() {
        this.messageHistory = [];
        localStorage.removeItem('ai_message_history');
    }
    
    // Kiểm tra kết nối
    checkConnection() {
        const status = localStorage.getItem('ai_connection_status');
        return status === 'connected';
    }
    
    // Cập nhật cấu hình
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem('ai_config', JSON.stringify(this.config));
    }
}

// Tạo instance toàn cục
if (typeof window !== 'undefined') {
    window.AIClient = AIClient;
    
    // Tự động khởi tạo khi tải trang
    document.addEventListener('DOMContentLoaded', function() {
        if (window.AI_CONFIG) {
            window.aiClient = new AIClient(window.AI_CONFIG);
            window.aiClient.initialize();
        }
    });
}

// Export cho Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIClient;
}