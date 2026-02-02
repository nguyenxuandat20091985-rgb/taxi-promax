// AI Client for Taxi Promax - Gemini & ChatGPT Integration
class AIClient {
    constructor() {
        this.config = window.AIConfig || {};
        this.conversationHistory = [];
        this.isSpeaking = false;
        this.speechSynthesis = window.speechSynthesis;
        this.initialize();
    }
    
    initialize() {
        this.loadConversationHistory();
        this.setupEventListeners();
        console.log("AI Client initialized");
    }
    
    // ==================== GEMINI AI INTEGRATION ====================
    async queryGemini(prompt, context = "DRIVER_ASSISTANT") {
        try {
            if (!this.config.GEMINI_API_KEY) {
                throw new Error("Gemini API Key not configured");
            }
            
            const systemPrompt = this.config.SYSTEM_PROMPTS[context] || this.config.SYSTEM_PROMPTS.DRIVER_ASSISTANT;
            
            const response = await fetch(`${this.config.GEMINI_API_URL}?key=${this.config.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }
            
            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Xin lỗi, tôi không thể phản hồi ngay lúc này.";
            
            // Save to history
            this.saveToHistory(prompt, aiResponse, context);
            
            return {
                success: true,
                response: aiResponse,
                source: 'gemini'
            };
        } catch (error) {
            console.error("Gemini query error:", error);
            return {
                success: false,
                error: error.message,
                response: "Hệ thống AI tạm thời gián đoạn. Vui lòng thử lại sau."
            };
        }
    }
    
    // ==================== VOICE SYNTHESIS ====================
    speak(text) {
        if (!this.config.VOICE_SETTINGS.enabled || this.isSpeaking) {
            return false;
        }
        
        return new Promise((resolve) => {
            this.isSpeaking = true;
            
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.config.VOICE_SETTINGS.language;
            utterance.rate = this.config.VOICE_SETTINGS.rate;
            utterance.pitch = this.config.VOICE_SETTINGS.pitch;
            utterance.volume = this.config.VOICE_SETTINGS.volume;
            
            utterance.onend = () => {
                this.isSpeaking = false;
                resolve(true);
            };
            
            utterance.onerror = (error) => {
                console.error("Speech synthesis error:", error);
                this.isSpeaking = false;
                resolve(false);
            };
            
            this.speechSynthesis.speak(utterance);
        });
    }
    
    stopSpeaking() {
        this.speechSynthesis.cancel();
        this.isSpeaking = false;
    }
    
    // ==================== CONVERSATION MANAGEMENT ====================
    saveToHistory(userMessage, aiResponse, context) {
        const conversation = {
            timestamp: Date.now(),
            context: context,
            user: userMessage,
            ai: aiResponse
        };
        
        this.conversationHistory.unshift(conversation);
        
        // Keep only last 50 conversations
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(0, 50);
        }
        
        // Save to localStorage
        this.saveConversationHistory();
        
        return conversation;
    }
    
    getConversationHistory(limit = 10) {
        return this.conversationHistory.slice(0, limit);
    }
    
    clearConversationHistory() {
        this.conversationHistory = [];
        localStorage.removeItem('ai_conversation_history');
        return true;
    }
    
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('ai_conversation_history');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error("Error loading conversation history:", error);
            this.conversationHistory = [];
        }
    }
    
    saveConversationHistory() {
        try {
            localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error("Error saving conversation history:", error);
        }
    }
    
    // ==================== PAYMENT VERIFICATION ====================
    async verifyPayment(transactionData) {
        try {
            if (!this.config.SECURITY.checksumEnabled) {
                return { success: true, message: "Checksum validation disabled" };
            }
            
            // Generate checksum
            const checksum = this.generateChecksum(transactionData);
            
            if (checksum !== transactionData.checksum) {
                return { 
                    success: false, 
                    error: "Checksum validation failed",
                    message: "Giao dịch không hợp lệ. Vui lòng thử lại."
                };
            }
            
            // Simulate webhook verification
            const verificationResult = await this.simulateWebhookVerification(transactionData);
            
            return verificationResult;
        } catch (error) {
            console.error("Payment verification error:", error);
            return {
                success: false,
                error: error.message,
                message: "Xác thực thanh toán thất bại. Vui lòng liên hệ hỗ trợ."
            };
        }
    }
    
    generateChecksum(data) {
        const str = JSON.stringify(data) + this.config.SECURITY.checksumKey;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    async simulateWebhookVerification(transactionData) {
        // This simulates the actual webhook verification
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    verifiedAt: new Date().toISOString(),
                    package: transactionData.package,
                    amount: transactionData.amount,
                    message: "Thanh toán đã được xác thực thành công"
                });
            }, 1500);
        });
    }
    
    // ==================== TRIP ANALYSIS ====================
    analyzeTrip(tripData) {
        try {
            const { distance, duration, cost, rate } = tripData;
            
            // Calculate efficiency
            const efficiency = (cost / distance).toFixed(2);
            const hourlyEarning = (cost / (duration / 60)).toFixed(0);
            
            const analysis = {
                efficiency: efficiency,
                hourlyEarning: hourlyEarning,
                recommendation: this.generateRecommendation(efficiency, hourlyEarning),
                insights: this.generateInsights(tripData)
            };
            
            return {
                success: true,
                analysis: analysis
            };
        } catch (error) {
            console.error("Trip analysis error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    generateRecommendation(efficiency, hourlyEarning) {
        if (efficiency > 20000) {
            return "Chuyến đi có hiệu suất tốt! Tiếp tục duy trì.";
        } else if (efficiency > 15000) {
            return "Hiệu suất trung bình. Có thể cải thiện bằng cách chọn tuyến đường tốt hơn.";
        } else {
            return "Hiệu suất thấp. Xem xét điều chỉnh giá hoặc tìm vị trí có nhu cầu cao hơn.";
        }
    }
    
    generateInsights(tripData) {
        const insights = [];
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 7 && hour <= 9) {
            insights.push("Giờ cao điểm sáng: Giá có thể tăng 10-15%");
        }
        
        if (hour >= 17 && hour <= 19) {
            insights.push("Giờ cao điểm chiều: Nhu cầu cao, tăng giá hợp lý");
        }
        
        if (tripData.distance > 10) {
            insights.push("Chuyến đi dài: Có thể đề xuất khách hàng đặt gói cự ly");
        }
        
        if (tripData.cost > 200000) {
            insights.push("Chuyến đi giá trị cao: Cân nhắc ưu đãi cho khách hàng thân thiết");
        }
        
        return insights;
    }
    
    // ==================== PACKAGE MANAGEMENT ====================
    getPackageRecommendation(usageData) {
        const { dailyTrips, monthlyEarning, featuresUsed } = usageData;
        
        if (monthlyEarning > 3000000) {
            return {
                recommended: "LIFETIME",
                reason: "Thu nhập cao, đầu tư một lần dùng vĩnh viễn",
                savings: "Tiết kiệm ~2.9 triệu/năm so với gói VIP"
            };
        } else if (dailyTrips > 15) {
            return {
                recommended: "VIP",
                reason: "Số chuyến nhiều, cần trợ lý AI và backup cloud",
                savings: "Hiệu quả hơn 35% so với gói PRO"
            };
        } else if (featuresUsed.includes('real-time') || featuresUsed.includes('pdf')) {
            return {
                recommended: "PRO",
                reason: "Cần bản đồ real-time và xuất hóa đơn",
                savings: "Phù hợp với nhu cầu chuyên nghiệp"
            };
        } else {
            return {
                recommended: "BASIC",
                reason: "Nhu cầu cơ bản, chi phí thấp",
                savings: "Tiết kiệm 10k so với gói PRO"
            };
        }
    }
    
    // ==================== UTILITIES ====================
    setupEventListeners() {
        // Listen for AI requests from other parts of the app
        window.addEventListener('ai-request', (event) => {
            this.handleAIRequest(event.detail);
        });
        
        // Listen for payment events
        window.addEventListener('payment-verification', async (event) => {
            const result = await this.verifyPayment(event.detail);
            window.dispatchEvent(new CustomEvent('payment-result', { detail: result }));
        });
        
        // Listen for trip analysis requests
        window.addEventListener('trip-analysis', (event) => {
            const result = this.analyzeTrip(event.detail);
            window.dispatchEvent(new CustomEvent('trip-analysis-result', { detail: result }));
        });
    }
    
    async handleAIRequest(request) {
        const { type, data, context } = request;
        
        switch (type) {
            case 'query':
                return await this.queryGemini(data, context);
            case 'speak':
                return await this.speak(data);
            case 'analyze':
                return this.analyzeTrip(data);
            case 'recommend':
                return this.getPackageRecommendation(data);
            default:
                return {
                    success: false,
                    error: "Unknown request type"
                };
        }
    }
    
    // ==================== PUBLIC API ====================
    async ask(prompt, context = "DRIVER_ASSISTANT") {
        return await this.queryGemini(prompt, context);
    }
    
    async say(text) {
        return await this.speak(text);
    }
    
    stop() {
        this.stopSpeaking();
    }
    
    getHistory() {
        return this.getConversationHistory();
    }
    
    clearHistory() {
        return this.clearConversationHistory();
    }
    
    getConfig() {
        return this.config.getAllSettings();
    }
    
    updateConfig(category, key, value) {
        return this.config.updateSetting(category, key, value);
    }
    
    validateConfig() {
        return this.config.validate();
    }
    
    resetConfig() {
        return this.config.reset();
    }
}

// Initialize and export
const AI = new AIClient();
window.AI = AI;

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!window.AI) {
        window.AI = new AIClient();
    }
    console.log("Taxi Promax AI Module ready");
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
}