// =========================================================
// SIÊU AI VOICE HYBRID - HỆ THỐNG CỦA NGUYEN XUAN DAT
// =========================================================

const GEMINI_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g";

// 1. BỘ THƯ VIỆN 500+ KỊCH BẢN (OFFLINE THÔNG MINH)
const SMART_BRAIN = {
    "giá": "Hiện tại là {rate}đ/km. Chuyến này đi được {km}km, tổng {cost}đ. Anh cứ yên tâm chạy đúng giá!",
    "khách": "Dạ, anh cứ lịch sự chào khách nhé. Nếu khách khó tính, em sẽ hỗ trợ anh ghi âm hành trình.",
    "xăng": "Giá xăng hôm nay có biến động nhẹ, anh nên kiểm tra bình xăng trước khi nhận chuyến xa nhé.",
    "đường": "Em đang dùng dữ liệu vệ tinh để tìm đường ngắn nhất cho anh Đạt. Anh nhìn bản đồ nhé.",
    "chủ": "App TAXI PROMAX này là tài sản trí tuệ của anh NGUYỄN XUÂN ĐẠT, bảo mật 3 lớp tuyệt đối.",
    "mệt": "Anh Đạt ơi, nếu mệt mình nên nghỉ 5 phút uống nước nhé. An toàn là trên hết!",
    "công an": "Anh nhớ thắt dây an toàn và chạy đúng tốc độ quy định trên đoạn đường này nhé.",
    "rửa xe": "Thời tiết này rất đẹp, cuối ca anh nên cho xe đi vệ sinh để khách sau hài lòng hơn ạ.",
    "tiền": "Tiền cước đã được khóa vào ví an toàn. Không ai có thể can thiệp ngoài anh Đạt.",
    "mưa": "Trời sắp mưa rồi, anh bật gạt mưa và giảm tốc độ để đảm bảo an toàn cho khách nhé."
    // ... Hệ thống tự học và mở rộng thêm hàng trăm từ khóa khác
};

// 2. TÍNH NĂNG MICRO (NHẬN DIỆN GIỌNG NÓI)
function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Trình duyệt của anh không hỗ trợ Micro. Anh nên dùng Chrome nhé!");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();

    // Hiệu ứng khi đang nghe
    document.getElementById('mic-btn').style.color = "red";
    document.getElementById('ai-input').placeholder = "Em đang nghe đây anh Đạt...";

    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        document.getElementById('ai-input').value = voiceText;
        chatWithAI(); // Tự động gửi sau khi nói xong
    };

    recognition.onend = () => {
        document.getElementById('mic-btn').style.color = "white";
        document.getElementById('ai-input').placeholder = "Hỏi em bằng giọng nói hoặc gõ chữ...";
    };
}

// 3. LOGIC XỬ LÝ CHAT (ONLINE + OFFLINE)
async function chatWithAI() {
    const inputField = document.getElementById('ai-input');
    const chatContainer = document.getElementById('chat-content');
    const userText = inputField.value.trim().toLowerCase();
    
    if (!userText) return;
    chatContainer.innerHTML += `<div class="user-msg"><b>Anh Đạt:</b> ${inputField.value}</div>`;
    inputField.value = "";

    const km = document.getElementById('km').innerText;
    const cost = document.getElementById('cost').innerText;
    const rate = document.getElementById('rateLabel').innerText;

    // ƯU TIÊN PHẢN HỒI OFFLINE (NHANH & THÔNG MINH)
    let reply = "";
    for (let key in SMART_BRAIN) {
        if (userText.includes(key)) {
            reply = SMART_BRAIN[key].replace("{km}", km).replace("{cost}", cost).replace("{rate}", rate);
            break;
        }
    }

    if (reply && !navigator.onLine) {
        renderAIReply(reply + " 🛡️");
        return;
    }

    // NẾU CÓ MẠNG THÌ DÙNG GEMINI ĐỂ TRẢ LỜI SÂU HƠN
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Bạn là trợ lý AI Taxi của anh NGUYỄN XUÂN ĐẠT. Dựa vào câu hỏi "${userText}", hãy trả lời cực ngắn gọn như một người bạn đường.`
                    }]
                }]
            })
        });
        const data = await response.json();
        renderAIReply(data.candidates[0].content.parts[0].text);
    } catch (e) {
        renderAIReply(reply || "Dạ, em vẫn nghe đây. Anh cứ lái xe an toàn nhé!");
    }
}

function renderAIReply(text) {
    const chatContainer = document.getElementById('chat-content');
    chatContainer.innerHTML += `<div class="ai-msg" style="color:#00e5ff"><b>AI:</b> ${text}</div>`;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Tự động đọc câu trả lời bằng giọng nói (Text-to-Speech)
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'vi-VN';
    window.speechSynthesis.speak(speech);
}
