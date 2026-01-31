// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN ĐA LUỒNG & SINH ĐỘNG (V10)
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 120px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; }
        
        /* ROBOT SINH ĐỘNG VẼ BẰNG CODE */
        #ai-root { 
            width: 65px; height: 65px; border-radius: 50%; 
            background: #fff; border: 3px solid #00bfa5;
            box-shadow: 0 0 20px rgba(0, 191, 165, 0.6);
            cursor: pointer; position: relative; overflow: hidden;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: breathing 3s infinite;
        }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

        /* Mắt chớp */
        .eye { position: absolute; width: 9px; height: 9px; background: #333; border-radius: 50%; top: 24px; animation: blink 4s infinite; }
        .eye.l { left: 18px; } .eye.r { right: 18px; }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }

        /* Miệng nhép theo giọng nói */
        #mouth { 
            position: absolute; width: 18px; height: 4px; background: #333; 
            bottom: 18px; left: 50%; transform: translateX(-50%); 
            border-radius: 10px; transition: 0.1s; 
        }
        .talking #mouth { animation: lipSync 0.2s infinite; }
        @keyframes lipSync { 0%, 100% { height: 4px; width: 18px; } 50% { height: 12px; width: 14px; border-radius: 50%; } }

        /* Hào quang cảm xúc */
        #ai-root.happy { border-color: #ff4081; box-shadow: 0 0 25px #ff4081; }
        #ai-root.listening { border-color: #ff5252; box-shadow: 0 0 25px #ff5252; }

        /* Khung Chat Glassmorphism */
        #ai-chat-box { 
            width: 310px; max-width: 85vw; background: rgba(255, 255, 255, 0.95); 
            border-radius: 20px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.25);
            border: 1px solid rgba(0, 191, 165, 0.3); backdrop-filter: blur(10px);
            overflow: hidden;
        }
        .ai-header { background: linear-gradient(90deg, #00bfa5, #00796b); color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 14px; }
        #ai-content { max-height: 250px; overflow-y: auto; padding: 15px; font-size: 14px; background: #f9ffff; }
        .msg-u { background: #00bfa5; color: white; padding: 10px 14px; border-radius: 18px 18px 0 18px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: white; color: #333; padding: 10px 14px; border-radius: 18px 18px 18px 0; margin: 5px 0; border: 1px solid #eee; width: fit-content; max-width: 85%; }

        .ai-input-area { display: flex; padding: 12px; background: white; align-items: center; gap: 10px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 10px 15px; border-radius: 25px; font-size: 14px; -webkit-user-select: text !important; user-select: text !important; }
        #ai-send, #ai-mic { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX - MULTI-BRAIN V10</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Taxi Promax đang lắng nghe...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root">
            <div class="eye l"></div><div class="eye r"></div>
            <div id="mouth"></div>
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    const API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g";

    // --- LOGIC ĐA LUỒNG THÔNG MINH ---
    async function getAIResponse(userInput) {
        // Luồng 1: Gemini (Chính)
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Hãy trả lời cực ngắn gọn, thân mật. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            console.log("Gemini lỗi, chuyển sang luồng dự phòng...");
            
            // Luồng 2: Dự phòng thông minh (Local/Proxy Engine)
            const q = userInput.toLowerCase();
            if (q.includes("mệt")) return "Anh vất vả rồi! Tấp vào lề nghỉ ngơi, uống nước cho khỏe rồi mình lại đi tiếp anh nhé. ❤️";
            if (q.includes("là ai")) return "Em là Robot thông minh của Taxi Promax, người bạn đồng hành tin cậy của anh!";
            if (q.includes("đi đâu")) return "Anh cứ vững tay lái, đường nào cũng thông thoáng khi có em đồng hành!";
            return "Taxi Promax luôn bên anh! Mạng hơi lag chút nhưng tình cảm của em dành cho anh vẫn 100% ạ!";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; 
        ut.onstart = () => root.classList.add('talking');
        ut.onend = () => { root.classList.remove('talking'); if(cb) cb(); };
        window.speechSynthesis.speak(ut);
    }

    async function handleSend() {
        const msg = txtInput.value.trim();
        if(!msg) return;
        txtInput.value = '';
        addMsg(msg, 'user');
        
        // Cảm xúc vui vẻ khi được khen
        if(msg.toLowerCase().match(/hay|giỏi|đẹp|yêu|cảm ơn/)) root.classList.add('happy');

        const reply = await getAIResponse(msg);
        addMsg(reply, 'ai');
        speak(reply);
        
        setTimeout(() => root.classList.remove('happy'), 3000);
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // Chạm để mở/đóng và Kéo thả mượt mà
    let x = 0, y = 0, sx, sy, isDrag = false;
    wrapper.ontouchstart = (e) => { sx = e.touches[0].clientX - x; sy = e.touches[0].clientY - y; isDrag = false; };
    wrapper.ontouchmove = (e) => {
        isDrag = true;
        let nx = e.touches[0].clientX - sx; let ny = e.touches[0].clientY - sy;
        if(e.touches[0].clientX > 10 && e.touches[0].clientX < window.innerWidth - 10) x = nx;
        if(e.touches[0].clientY > 10 && e.touches[0].clientY < window.innerHeight - 10) y = ny;
        wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if(!isDrag) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if(!isVisible && content.innerHTML === "") {
                const welcome = "Taxi Promax chào anh! Chúc anh một ngày lái xe rạng rỡ và an toàn.";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    };

    sendBtn.onclick = handleSend;
    txtInput.onkeypress = (e) => e.key === 'Enter' && handleSend();

    mic.onclick = () => {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if(!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { root.classList.add('listening'); mic.style.color = 'red'; };
        rec.onend = () => { root.classList.remove('listening'); mic.style.color = '#00bfa5'; };
        rec.onresult = (e) => { txtInput.value = e.results[0][0].transcript; handleSend(); };
        rec.start();
    };
})();
