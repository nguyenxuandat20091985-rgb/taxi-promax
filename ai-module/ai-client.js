// =========================================================
// SIÊU AI VOICE HYBRID - NGUYEN XUAN DAT (FIX XUNG ĐỘT)
// =========================================================

const GEMINI_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g";

// 1. CHỨC NĂNG MICRO (Chạy độc lập, không đụng vào nạp tiền)
function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    const micBtn = document.getElementById('mic-btn');

    recognition.onstart = () => { micBtn?.classList.add('mic-active'); };
    recognition.onend = () => { micBtn?.classList.remove('mic-active'); };

    recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        const input = document.getElementById('ai-input');
        if(input) {
            input.value = voiceText;
            chatWithAI(); 
        }
    };
    recognition.start();
}

// 2. LOGIC AI (Chỉ đọc dữ liệu hiển thị, CẤM ghi đè ví tiền)
async function chatWithAI() {
    const inputField = document.getElementById('ai-input');
    const chatContainer = document.getElementById('chat-content');
    if(!inputField || !chatContainer) return;

    const userText = inputField.value.trim();
    if (!userText) return;

    // Ghi tin nhắn người dùng
    chatContainer.innerHTML += `<div class="user-msg"><b>Anh Đạt:</b> ${userText}</div>`;
    inputField.value = "";

    // LẤY DỮ LIỆU ĐỂ AI HIỂU (CHỈ ĐỌC)
    const km = document.getElementById('km')?.innerText || "0";
    const cost = document.getElementById('cost')?.innerText || "0";
    const rate = document.getElementById('rateLabel')?.innerText || "15000";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Bạn là trợ lý ảo của anh NGUYỄN XUÂN ĐẠT trên app TAXI PROMAX. 
                        Thông tin hiện tại: Đã đi ${km}km, tổng tiền ${cost}đ. 
                        Hãy trả lời ngắn gọn câu hỏi này của lái xe: "${userText}"`
                    }]
                }]
            })
        });

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;
        
        renderAIReply(reply);
    } catch (e) {
        // Phản hồi dự phòng khi mất mạng
        if(userText.includes("giá")) {
            renderAIReply(`Giá hiện tại là ${rate}đ/km. Anh yên tâm chạy nhé!`);
        } else {
            renderAIReply("Dạ em vẫn đang theo dõi hành trình của anh đây ạ!");
        }
    }
}

function renderAIReply(text) {
    const chatContainer = document.getElementById('chat-content');
    if(chatContainer) {
        chatContainer.innerHTML += `<div class="ai-msg" style="color:#00e5ff"><b>AI:</b> ${text}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Đọc tiếng
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'vi-VN';
        window.speechSynthesis.speak(speech);
    }
}
