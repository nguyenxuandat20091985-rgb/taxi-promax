// =========================================================
// ROBOT TAXI PROMAX - BẢN SINH ĐỘNG & GIAO DIỆN CHUYÊN NGHIỆP
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper {
            position: fixed; bottom: 100px; right: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: center;
            touch-action: none; width: 85px;
        }

        /* Robot sinh động với hiệu ứng thở (breathing) */
        #ai-root { 
            width: 75px; height: 75px; border-radius: 50%; 
            border: 3px solid #00bfa5; 
            box-shadow: 0 0 15px rgba(0, 191, 165, 0.5);
            background: white; cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: breathing 3s ease-in-out infinite;
            z-index: 2;
        }
        @keyframes breathing {
            0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(0, 191, 165, 0.5); }
            50% { transform: scale(1.05); box-shadow: 0 0 25px rgba(0, 191, 165, 0.8); }
        }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; pointer-events: none; }
        
        /* Tab chat nằm trên chuyên nghiệp */
        #ai-chat-box { 
            width: 280px; background: rgba(255, 255, 255, 0.95); 
            border-radius: 20px; margin-bottom: 15px; 
            display: none; flex-direction: column; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.2); 
            border: 1px solid rgba(0, 191, 165, 0.3);
            overflow: hidden; backdrop-filter: blur(10px);
            animation: slideUp 0.4s ease-out;
            transform-origin: bottom;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.8); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ai-header { 
            background: linear-gradient(90deg, #00bfa5, #009688); 
            color: white; padding: 10px; text-align: center; 
            font-size: 13px; font-weight: bold; letter-spacing: 0.5px;
        }
        #ai-content { max-height: 180px; overflow-y: auto; padding: 12px; font-size: 14px; background: rgba(244, 255, 255, 0.4); }
        .msg-u { background: #00bfa5; color: white; padding: 8px 14px; border-radius: 18px 18px 2px 18px; margin: 6px 0 6px auto; width: fit-content; max-width: 85%; font-size: 13px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .msg-a { background: white; color: #004d40; padding: 8px 14px; border-radius: 18px 18px 18px 2px; margin: 6px 0; border: 1px solid #e0f2f1; width: fit-content; max-width: 85%; font-size: 13px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        
        .ai-input-area { display: flex; padding: 10px; border-top: 1px solid rgba(0,0,0,0.05); background: white; align-items: center; gap: 8px; }
        #ai-txt { flex: 1; border: 1px solid #eee; outline: none; padding: 8px 12px; border-radius: 20px; font-size: 13px; background: #f9f9f9; }
        #ai-mic { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; transition: 0.2s; }
        #ai-mic:active { transform: scale(1.2); }
        .mic-active { color: #ff5252 !important; animation: ai-pulse 0.8s infinite; }
        @keyframes ai-pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX AI</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với em đi anh...">
            </div>
        </div>
        <div id="ai-root">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), 
          chat = document.getElementById('ai-chat-box'), 
          mic = document.getElementById('ai-mic'), 
          content = document.getElementById('ai-content');

    // --- KÉO THẢ MƯỢT MÀ ---
    let isDragging = false, currentX = 0, currentY = 0, initialX, initialY, xOffset = 0, yOffset = 0;
    wrapper.addEventListener("touchstart", (e) => { 
        initialX = e.touches[0].clientX - xOffset; 
        initialY = e.touches[0].clientY - yOffset; 
        isDragging = false; 
    }, {passive: true});
    
    wrapper.addEventListener("touchmove", (e) => { 
        isDragging = true; 
        currentX = e.touches[0].clientX - initialX; 
        currentY = e.touches[0].clientY - initialY; 
        xOffset = currentX; yOffset = currentY; 
        wrapper.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`; 
    }, {passive: true});

    // --- GIỌNG NÓI ---
    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.1;
        window.speechSynthesis.speak(ut);
    }

    // --- XỬ LÝ CHAT ---
    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible && content.innerHTML === "") {
                const welcome = "Em chào anh! Chúc anh vạn dặm bình an. Anh muốn em hỗ trợ gì không?";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        const m = msg.toLowerCase();
        let reply = "";

        if (m.includes("đi") || m.includes("đến") || m.includes("chỉ đường")) {
            const dest = m.split(/đi|đến|tới/)[1]?.trim() || "vị trí yêu cầu";
            reply = `Dạ Anh! Em mở Google Maps chỉ đường đến ${dest} ngay.`;
            setTimeout(() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(dest)}`, '_blank'), 1500);
        }

        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo TAXI PROMAX. Trả lời ngắn câu: ${msg}. Gọi Anh xưng Em.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe anh rồi ạ!"; }
        }
        addMsg(reply, 'ai'); speak(reply);
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    mic.onclick = (e) => {
        e.stopPropagation();
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if(!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { mic.classList.add('mic-active'); window.speechSynthesis.cancel(); };
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };
})();
