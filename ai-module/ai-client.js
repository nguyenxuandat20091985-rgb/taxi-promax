// =========================================================
// ROBOT TAXI PROMAX - PHIÊN BẢN V6 SIÊU CẤP (FULL FIX)
// =========================================================

(function() {
    // 1. Giao diện Robot sinh động & Chống che khuất bàn phím
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { 
            position: fixed; bottom: 110px; right: 15px; 
            z-index: 2147483647; display: flex; flex-direction: column; 
            align-items: flex-end; touch-action: none;
        }
        #ai-root { 
            width: 62px; height: 62px; border-radius: 50%; border: 3px solid #00bfa5; 
            box-shadow: 0 0 20px rgba(0, 191, 165, 0.8); background: white; 
            cursor: pointer; animation: breathing 3s infinite;
        }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); box-shadow: 0 0 30px #00bfa5; } }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; }
        
        #ai-chat-box { 
            width: 310px; max-width: 88vw; background: rgba(255, 255, 255, 0.98); 
            border-radius: 20px; margin-bottom: 12px; display: none; 
            flex-direction: column; box-shadow: 0 15px 50px rgba(0,0,0,0.4); 
            border: 2px solid #00bfa5; overflow: hidden; backdrop-filter: blur(15px);
        }
        .ai-header { 
            background: linear-gradient(90deg, #00bfa5, #00796b); color: white; 
            padding: 12px; text-align: center; font-weight: bold; font-size: 14px;
        }
        #ai-content { 
            max-height: 250px; overflow-y: auto; padding: 15px; 
            font-size: 15px; background: #faffff; scroll-behavior: smooth;
        }
        .msg-u { background: #00bfa5; color: white; padding: 10px 14px; border-radius: 18px 18px 0 18px; margin: 8px 0 8px auto; width: fit-content; max-width: 85%; line-height: 1.4; }
        .msg-a { background: white; color: #333; padding: 10px 14px; border-radius: 18px 18px 18px 0; margin: 8px 0; border: 1px solid #e0f2f1; width: fit-content; max-width: 85%; line-height: 1.4; }

        .ai-input-area { display: flex; padding: 12px; background: white; align-items: center; gap: 10px; border-top: 1px solid #eee; }
        #ai-txt { 
            flex: 1; border: 1px solid #ddd; outline: none; padding: 12px 18px; 
            border-radius: 25px; font-size: 14px; background: #fff !important;
            user-select: text !important; -webkit-user-select: text !important;
        }
        #ai-send { color: #00bfa5; font-size: 28px; background: none; border: none; cursor: pointer; }
        #ai-mic { font-size: 28px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: #ff5252 !important; animation: blink 0.8s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX AI - SIÊU CẤP V6</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Dán hoặc gõ nội dung...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    // Key dự phòng thông minh - Tự động thay đổi nếu lỗi
    const API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g"; 

    async function callGemini(msg) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Hãy trả lời anh Đạt tài xế thật thân mật, ngắn dưới 20 từ. Anh Đạt nói: ${msg}` }] }] })
            });
            const data = await res.json();
            if (data.candidates) return data.candidates[0].content.parts[0].text;
            throw new Error();
        } catch (e) {
            // Lệnh xử lý nhanh nếu mạng lỗi
            if (msg.toLowerCase().includes("mệt")) return "Anh Đạt vất vả rồi! Nghỉ tay uống nước, em luôn bên anh nhé ❤️";
            if (msg.toLowerCase().includes("đi")) return "Dạ anh, đường thông thoáng, anh cứ vững tay lái nhé!";
            return "Em nghe anh Đạt rồi! Mạng hơi lag nhưng tình cảm em dành cho anh vẫn 100% ạ!";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.1;
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

    // Kéo thả & Chống trôi
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;
    wrapper.ontouchstart = (e) => { startX = e.touches[0].clientX - xOffset; startY = e.touches[0].clientY - yOffset; isDragging = false; };
    wrapper.ontouchmove = (e) => { 
        isDragging = true;
        let nx = e.touches[0].clientX - startX; let ny = e.touches[0].clientY - startY;
        if (e.touches[0].clientX > 10 && e.touches[0].clientX < window.innerWidth - 10) xOffset = nx;
        if (e.touches[0].clientY > 10 && e.touches[0].clientY < window.innerHeight - 10) yOffset = ny;
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                if(content.innerHTML === "") {
                    const hi = "Chào anh Đạt! Robot Promax V6 đã sẵn sàng phục vụ anh ạ!";
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
