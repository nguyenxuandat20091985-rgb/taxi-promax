/**
 * TAXI PROMAX - AI CONFIGURATION
 * Quản lý các thiết lập hệ thống Trợ lý ảo
 */

const AI_CONFIG = {
    // 1. Cài đặt cơ bản
    active: true,
    botName: "TAXI AI PROMAX",
    adminName: "Đạt", // Để thư ký gọi đúng tên anh
    
    // 2. Cấu hình Diện mạo (Quan trọng để fix lỗi vòng tròn đen)
    defaultAvatar: "https://raw.githubusercontent.com/nguyenxuandat20091985-rgb/taxi-promax/main/CC_20260130_193050.png",
    themeColor: "#00f2ff", // Màu chủ đạo của Trợ lý

    // 3. Cấu hình Kết nối Gemini
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    geminiKey: "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g", // Đã đổi tên biến cho khớp với client.js

    // 4. Nội dung phản hồi
    welcomeMessage: "Chào anh! TAXI AI PROMAX đã sẵn sàng cùng anh ra khơi. ✨",
    errorMessage: "Lỗi kết nối rồi anh Đạt ơi, anh kiểm tra lại mạng hoặc Key nhé!"
};
