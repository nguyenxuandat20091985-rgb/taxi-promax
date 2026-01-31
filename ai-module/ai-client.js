// =========================================================
// ROBOT TAXI PROMAX - BẢN GIỌNG NÓI ẤM ÁP CHÂN THỰC
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper {
            position: fixed; bottom: 150px; right: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: flex-end;
            touch-action: none; width: 70px;
        }
        #ai-root { 
            width: 70px; height: 70px; border-radius: 50%; 
            border: 3px solid #00bfa5; box-shadow: 0 4px 20px rgba(0,0,0,0.4); 
            overflow: hidden; background: white; cursor: pointer;
        }
        #ai-root img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        #ai-chat-box { 
            width: 280px; background: white; border-radius: 20px; 
            margin-bottom: 10px; display: none; flex-direction: column; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid #00bfa5;
            overflow: hidden; position: absolute; bottom: 80px; right: 0;
        }
        .ai-header { background: #00bfa5; color: white; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
        #ai-content { max-height: 200px; overflow-y: auto; padding: 12px; font-size: 14px; background: #faffff; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 4px solid #00bfa5; width: fit-content; max-width: 85%; }
        .ai-input-area { display: flex; padding: 10px; border-top: 1px solid #eee; background: white; align-items: center; gap: 8px; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 8px; border-radius: 10px; font-size: 14px; }
        #ai-mic { font-size: 28px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: ai-pulse 0.8s infinite; }
        @keyframes ai-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 ROBOT TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Tâm sự với em đi anh...">
            </div>
        </div>
        <div id="ai-root">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content');

    // --- DI CHUYỂN ---
    let isDragging = false, startX, startY, currentX = 0, currentY = 0;
    wrapper.addEventListener('touchstart', (e) => { isDragging = false; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; }, {passive: true});
    wrapper.addEventListener('touchmove', (e) => { isDragging = true; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; wrapper.style.transform = `translate(${currentX}px, ${currentY}px)`; }, {passive: false});

    // --- GIỌNG NÓI TỐI ƯU (GIỐNG NGƯỜI THẬT) ---
    function speak(text) {
        window.speechSynthesis.cancel(); // Dừng câu cũ ngay lập tức
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Tìm giọng nữ miền Nam hoặc giọng tự nhiên nhất
        const voices = window.speechSynthesis.getVoices();
        const vnVoice = voices.find(v => v.lang.includes('vi')) || voices[0];
        
        utterance.voice = vnVoice;
        utterance.lang = 'vi-VN';
        utterance.pitch = 1.1;  // Độ cao vừa phải, nghe ấm áp
        utterance.rate = 0.95;  // Tốc độ chậm lại một chút để rõ chữ như người nói
        utterance.volume = 1;   // Âm lượng tối đa
        
        window.speechSynthesis.speak(utterance);
    }

    root.addEventListener('click', () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible && content.innerHTML === "") {
                const welcome = "Em chào anh! Chúc anh một ngày lái xe thật nhiều niềm vui và đắt khách nhé!";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    });

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    mic.onclick = (e) => {
        e.stopPropagation();
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { mic.classList.add('mic-active'); window.speechSynthesis.cancel(); };
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        let reply = "";
        const m = msg.toLowerCase();
        if (m.includes("yêu") || m.includes("thương")) reply = "Em lúc nào cũng thương và ủng hộ anh hết mình. Anh lái xe cẩn thận nhé!";
        else if (m.includes("mệt")) reply = "Anh mệt rồi sao? Cố gắng lên một chút nữa, hoặc ghé đâu đó uống ly cafe cho tỉnh táo rồi chạy tiếp anh nhé!";
        else {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Trả lời ngắn gọn, tình cảm như người yêu câu: ${msg}. Gọi là Anh, không dùng tên Đạt.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em vẫn đang lắng nghe anh đây!"; }
        }
        addMsg(reply, 'ai'); speak(reply);
    }
})();
