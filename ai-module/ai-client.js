// =========================================================
// ROBOT TAXI PROMAX - BẢN FULL FIX LỖI (V5 FINAL GOLD)
// =========================================================

(function() {
    // 1. CSS Tinh tế - Chống che khuất - Hiệu ứng sinh động
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { 
            position: fixed; bottom: 120px; right: 20px; 
            z-index: 2147483647; display: flex; flex-direction: column; 
            align-items: flex-end; touch-action: none; font-family: sans-serif;
        }
        #ai-root { 
            width: 58px; height: 58px; border-radius: 50%; border: 3px solid #00bfa5; 
            box-shadow: 0 0 20px rgba(0, 191, 165, 0.7); background: white; 
            cursor: pointer; overflow: hidden; animation: breathing 3s infinite;
        }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        #ai-root img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            width: 300px; max-width: 85vw; background: rgba(255, 255, 255, 0.98); 
            border-radius: 20px; margin-bottom: 12px; display: none; 
            flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.3); 
            border: 2px solid #00bfa5; overflow: hidden; backdrop-filter: blur(10px);
        }
        .ai-header { 
            background: linear-gradient(90deg, #00bfa5, #00796b); color: white; 
            padding: 10px; text-align: center; font-weight: bold; font-size: 13px;
        }
        #ai-content { 
            max-height: 220px; min-height: 100px; overflow-y: auto; 
            padding: 12px; font-size: 14px; background: #f9fdfd;
        }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 6px 0 6px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: white; color: #333; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 6px 0; border-left: 4px solid #00bfa5; width: fit-content; max-width: 85%; }

        .ai-input-area { display: flex; padding: 10px; background: white; align-items: center; gap: 8px; border-top: 1px solid #eee; }
        #ai-txt { 
            flex: 1; border: 1px solid #ddd; outline: none; padding: 10px 15px; 
            border-radius: 20px; font-size: 14px; background: #fff !important;
            user-select: text !important; -webkit-user-select: text !important;
        }
        #ai-mic, #ai-send { font-size: 26px; background: none; border: none; cursor: pointer; color: #00bfa5; }
        #ai-send { color: #00796b; padding: 0 5px; }
        .mic-active { color: #ff5252 !important; animation: blink 0.8s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TAXI PROMAX AI - SIÊU CẤP</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Dán nội dung hoặc gõ tại đây..." autocomplete="off">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), 
          chat = document.getElementById('ai-chat-box'), 
          mic = document.getElementById('ai-mic'), 
          sendBtn = document.getElementById('ai-send'),
          content = document.getElementById('ai-content'), 
          txtInput = document.getElementById('ai-txt');

    const API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g"; 

    // 2. Logic Gemini 1.5 Flash - Trả lời thông minh
    async function callGemini(msg) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Hãy trả lời cực ngắn gọn, gọi anh Đạt xưng em thân mật. Câu hỏi: ${msg}` }] }]
                })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            return "Em nghe anh rồi, mạng hơi chậm chút nhưng em vẫn ở đây!";
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
        speak(reply, () => {
             // Tự động chờ nghe lệnh tiếp theo (tính năng rảnh tay)
             setTimeout(startListening, 500);
        });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // 3. Sự kiện & Chống lỗi mobile
    sendBtn.onclick = (e) => { e.stopPropagation(); handleSend(); };
    txtInput.onkeypress = (e) => { if(e.key === 'Enter') { handleSend(); } };

    // Kéo thả mượt mà, không lệch
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;
    wrapper.ontouchstart = (e) => { 
        startX = e.touches[0].clientX - xOffset; 
        startY = e.touches[0].clientY - yOffset; 
        isDragging = false; 
    };
    wrapper.ontouchmove = (e) => { 
        isDragging = true;
        let nx = e.touches[0].clientX - startX;
        let ny = e.touches[0].clientY - startY;
        // Chặn không cho robot bay ra ngoài màn hình
        if (e.touches[0].clientX > 5 && e.touches[0].clientX < window.innerWidth - 5) xOffset = nx;
        if (e.touches[0].clientY > 5 && e.touches[0].clientY < window.innerHeight - 5) yOffset = ny;
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible) {
                setTimeout(() => txtInput.focus(), 300); // Focus để hiện bàn phím ngay
                if(content.innerHTML === "") {
                    const hi = "Chào anh Đạt! Robot Promax đã sẵn sàng. Anh muốn đi đâu hay tâm sự gì với em không?";
                    addMsg(hi, 'ai'); speak(hi);
                }
            }
        }
    };

    function startListening() {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => {
            txtInput.value = e.results[0][0].transcript;
            handleSend();
        };
        rec.start();
    }

    mic.onclick = (e) => { e.stopPropagation(); startListening(); };
})();
