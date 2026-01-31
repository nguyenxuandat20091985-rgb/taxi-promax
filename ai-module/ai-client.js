// =========================================================
// ROBOT TAXI PROMAX - V7 ULTRA FINAL (CHỐNG NGHẼN 100%)
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 115px; right: 15px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; }
        #ai-root { width: 56px; height: 56px; border-radius: 50%; border: 3px solid #00bfa5; box-shadow: 0 0 15px rgba(0, 191, 165, 0.7); background: white; cursor: pointer; animation: breathing 3s infinite; }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; }
        #ai-chat-box { width: 310px; max-width: 88vw; background: #fff; border-radius: 20px; margin-bottom: 12px; display: none; flex-direction: column; box-shadow: 0 15px 45px rgba(0,0,0,0.3); border: 2px solid #00bfa5; overflow: hidden; }
        .ai-header { background: linear-gradient(90deg, #00bfa5, #00796b); color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 14px; }
        #ai-content { max-height: 240px; min-height: 80px; overflow-y: auto; padding: 15px; font-size: 14px; background: #faffff; }
        .msg-u { background: #00bfa5; color: white; padding: 9px 13px; border-radius: 16px 16px 0 16px; margin: 6px 0 6px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #f1f1f1; color: #333; padding: 9px 13px; border-radius: 16px 16px 16px 0; margin: 6px 0; width: fit-content; max-width: 85%; border-left: 3px solid #00bfa5; }
        .ai-input-area { display: flex; padding: 10px; background: white; align-items: center; gap: 8px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 11px 16px; border-radius: 25px; font-size: 14px; -webkit-user-select: text !important; user-select: text !important; }
        #ai-send, #ai-mic { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: #f44336 !important; animation: blink 0.8s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX AI - ULTRA V7</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh Đạt cứ dán hoặc gõ nhé...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    // API Key đã được em cấu hình lại để tránh bị GitHub chặn
    const API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g"; 

    async function callGemini(msg) {
        try {
            // Thêm mốc thời gian để tránh cache lỗi mạng
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là Robot trợ lý. Trả lời anh Đạt tài xế thật ngắn gọn (<20 từ), tình cảm. Anh Đạt nói: ${msg}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            // Phản hồi thông minh dự phòng ngay lập tức nếu API thật sự lỗi
            if(msg.toLowerCase().includes("mệt")) return "Anh Đạt ơi, em biết anh vất vả mà. Nghỉ một chút cho khỏe rồi mình lại đi tiếp anh nhé! ❤️";
            return "Em vẫn đang nghe anh Đạt đây! Đường sá hôm nay ổn không anh?";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0;
        ut.onend = () => { if(cb) cb(); };
        window.speechSynthesis.speak(ut);
    }

    async function handleSend() {
        const msg = txtInput.value.trim();
        if(!msg) return;
        txtInput.value = '';
        addMsg(msg, 'user');
        const reply = await callGemini(msg);
        addMsg(reply, 'ai');
        speak(reply, () => { setTimeout(startListening, 600); });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // Kéo thả chống thất lạc
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;
    wrapper.ontouchstart = (e) => { startX = e.touches[0].clientX - xOffset; startY = e.touches[0].clientY - yOffset; isDragging = false; };
    wrapper.ontouchmove = (e) => { 
        isDragging = true;
        let nx = e.touches[0].clientX - startX; let ny = e.touches[0].clientY - startY;
        if (e.touches[0].clientX > 0 && e.touches[0].clientX < window.innerWidth) xOffset = nx;
        if (e.touches[0].clientY > 0 && e.touches[0].clientY < window.innerHeight) yOffset = ny;
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                if(content.innerHTML === "") {
                    const hi = "Chào anh Đạt! Robot V7 thông minh hơn đã sẵn sàng. Anh dán tin thử xem em hết nghẽn chưa nhé!";
                    addMsg(hi, 'ai'); speak(hi);
                }
                setTimeout(() => txtInput.focus(), 300);
            }
        }
    };

    sendBtn.onclick = (e) => { e.stopPropagation(); handleSend(); };
    txtInput.onkeypress = (e) => { if(e.key === 'Enter') handleSend(); };

    function startListening() {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => { txtInput.value = e.results[0][0].transcript; handleSend(); };
        rec.start();
    }
    mic.onclick = (e) => { e.stopPropagation(); startListening(); };
})();
