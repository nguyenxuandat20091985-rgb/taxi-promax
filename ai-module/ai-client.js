// =========================================================
// ROBOT TAXI PROMAX - FIX LỖI KẾT NỐI GEMINI
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 120px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; }
        #ai-root { width: 55px; height: 55px; border-radius: 50%; border: 3px solid #00bfa5; box-shadow: 0 0 15px rgba(0, 191, 165, 0.7); background: white; cursor: pointer; animation: breathing 3s infinite; }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; }
        #ai-chat-box { width: 280px; background: rgba(255, 255, 255, 0.95); border-radius: 20px; margin-bottom: 10px; display: none; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #00bfa5; overflow: hidden; backdrop-filter: blur(10px); }
        .ai-header { background: #00bfa5; color: white; padding: 10px; text-align: center; font-weight: bold; font-size: 13px; }
        #ai-content { max-height: 200px; overflow-y: auto; padding: 12px; font-size: 13px; background: #f9ffff; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: white; color: #333; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 4px solid #00bfa5; width: fit-content; max-width: 85%; }
        .ai-input-area { display: flex; padding: 10px; background: white; align-items: center; gap: 8px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 8px 12px; border-radius: 20px; font-size: 12px; }
        #ai-mic { font-size: 24px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: #f44336 !important; animation: blink 0.8s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX AI - SIÊU THÔNG MINH</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh muốn nói gì với em?">
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt');

    // --- Cập nhật Key mới dự phòng ---
    const API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g"; 

    async function callGemini(msg) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Trả lời cực ngắn gọn, thân mật với anh Đạt tài xế. Câu hỏi: ${msg}` }] }]
                })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            return "Em nghe rồi! Anh lái xe cẩn thận nhé, mạng hơi yếu nhưng em vẫn ở đây.";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0;
        ut.onend = () => { if(cb) cb(); };
        window.speechSynthesis.speak(ut);
    }

    async function processAI(msg) {
        if(!msg) return;
        addMsg(msg, 'user');
        const reply = await callGemini(msg);
        addMsg(reply, 'ai');
        speak(reply, () => { setTimeout(startListening, 600); });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // --- HỆ THỐNG ĐIỀU KHIỂN ---
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;
    wrapper.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX - xOffset; startY = e.touches[0].clientY - yOffset; isDragging = false; });
    wrapper.addEventListener("touchmove", (e) => { 
        isDragging = true;
        xOffset = e.touches[0].clientX - startX; 
        yOffset = e.touches[0].clientY - startY;
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
    });

    root.onclick = () => {
        if (!isDragging) {
            chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
            if (chat.style.display === 'flex' && content.innerHTML === "") {
                const hi = "Chào Anh Đạt! Em đã sẵn sàng tâm sự cùng anh rồi đây.";
                addMsg(hi, 'ai'); speak(hi);
            }
        }
    };

    function startListening() {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    }

    mic.onclick = (e) => { e.stopPropagation(); startListening(); };
})();
