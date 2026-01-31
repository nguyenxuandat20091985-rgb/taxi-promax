// =========================================================
// ROBOT TAXI PROMAX - PHIÊN BẢN SIÊU CẤP CHUYÊN NGHIỆP
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper {
            position: fixed; bottom: 120px; right: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: flex-end;
            touch-action: none; width: 85px;
        }

        /* Robot sinh động: Nháy mắt & Phát sáng */
        #ai-root { 
            width: 80px; height: 80px; border-radius: 50%; 
            border: 3px solid #00bfa5; 
            box-shadow: 0 0 20px rgba(0, 191, 165, 0.6);
            background: white; cursor: pointer;
            transition: all 0.3s ease;
            animation: breathing 3s ease-in-out infinite;
        }
        @keyframes breathing {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.08); filter: brightness(1.2); box-shadow: 0 0 30px rgba(0, 191, 165, 0.9); }
        }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; pointer-events: none; }
        
        /* Tab chat mờ ảo (Glassmorphism) cực đẹp */
        #ai-chat-box { 
            width: 300px; background: rgba(255, 255, 255, 0.9); 
            border-radius: 25px 25px 5px 25px; margin-bottom: 15px; 
            display: none; flex-direction: column; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.3); 
            border: 1px solid rgba(255,255,255,0.5);
            overflow: hidden; backdrop-filter: blur(15px);
            animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popUp {
            from { opacity: 0; transform: translateY(30px) scale(0.5); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ai-header { 
            background: linear-gradient(135deg, #00bfa5, #00796b); 
            color: white; padding: 12px; text-align: center; 
            font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        #ai-content { max-height: 220px; overflow-y: auto; padding: 15px; font-size: 14px; scroll-behavior: smooth; }
        .msg-u { background: #00bfa5; color: white; padding: 10px 15px; border-radius: 20px 20px 0 20px; margin: 8px 0 8px auto; width: fit-content; max-width: 80%; box-shadow: 0 4px 10px rgba(0,191,165,0.2); }
        .msg-a { background: white; color: #004d40; padding: 10px 15px; border-radius: 20px 20px 20px 0; margin: 8px 0; border: 1px solid #eee; width: fit-content; max-width: 80%; }
        
        .ai-input-area { display: flex; padding: 12px; background: rgba(255,255,255,0.8); align-items: center; gap: 10px; }
        #ai-txt { flex: 1; border: none; outline: none; padding: 10px 15px; border-radius: 25px; font-size: 14px; background: #f0f4f4; }
        #ai-mic { font-size: 32px; color: #00bfa5; background: none; border: none; cursor: pointer; transition: 0.3s; }
        .mic-active { color: #f44336 !important; transform: scale(1.3); filter: drop-shadow(0 0 5px red); }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TRỢ LÝ TAXI PROMAX AI</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh cần em chỉ đường không?">
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
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;
    wrapper.addEventListener("touchstart", (e) => { 
        startX = e.touches[0].clientX - xOffset; 
        startY = e.touches[0].clientY - yOffset; 
        isDragging = false; 
    });
    wrapper.addEventListener("touchmove", (e) => { 
        isDragging = true; 
        xOffset = e.touches[0].clientX - startX; 
        yOffset = e.touches[0].clientY - startY; 
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`; 
    });

    // --- GIỌNG NÓI ẤM ÁP ---
    function speak(text, callback) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 0.95; ut.pitch = 1.1;
        ut.onend = () => { if(callback) callback(); };
        window.speechSynthesis.speak(ut);
    }

    // --- MỞ CHAT ---
    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible && content.innerHTML === "") {
                const welcome = "Chào anh Đạt! Robot Promax đã sẵn sàng. Anh muốn đi đâu hay tâm sự gì với em không?";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        const m = msg.toLowerCase();
        let reply = "";

        if (m.includes("đi") || m.includes("đến") || m.includes("chỉ đường")) {
            const dest = m.split(/đi|đến|tới/)[1]?.trim() || "vị trí mới";
            reply = `Dạ anh, để em dẫn đường cho anh đến ${dest}. Anh chú ý biển báo và tốc độ nhé!`;
            setTimeout(() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(dest)}`, '_blank'), 2000);
        }

        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Trả lời cực ngắn, thân mật, gọi là Anh. Luôn nhắc nhở anh lái xe an toàn.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe anh rồi ạ, anh cứ vững tay lái nhé!"; }
        }
        addMsg(reply, 'ai'); 
        speak(reply, () => {
            // Tự động mở Mic sau khi Robot nói xong để anh hỏi tiếp (Rảnh tay)
            setTimeout(() => { startListening(); }, 500);
        });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    function startListening() {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if(!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    }

    mic.onclick = (e) => { e.stopPropagation(); startListening(); };
})();
