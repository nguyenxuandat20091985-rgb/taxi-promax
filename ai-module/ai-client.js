// =========================================================
// ROBOT TAXI PROMAX - BẢN SIÊU GỌN & KÉO THẢ LINH HOẠT
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { 
            position: fixed; bottom: 150px; right: 10px; z-index: 100000; 
            width: 65px; height: 65px; cursor: move; touch-action: none;
            transition: transform 0.2s;
        }
        .ai-avatar { 
            width: 100%; height: 100%; border-radius: 50%; 
            border: 2px solid #00bfa5; box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
            overflow: hidden; background: white;
        }
        .ai-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            position: fixed; bottom: 230px; right: 10px;
            width: 280px; background: rgba(255, 255, 255, 0.95); border-radius: 15px; 
            z-index: 99999; display: none; flex-direction: column; 
            box-shadow: 0 8px 30px rgba(0,0,0,0.2); border: 1px solid #00bfa5;
            overflow: hidden; backdrop-filter: blur(5px);
        }
        .ai-header { background: #00bfa5; color: white; padding: 8px; text-align: center; font-size: 13px; font-weight: bold; }
        #ai-content { max-height: 180px; overflow-y: auto; padding: 10px; font-size: 13px; background: rgba(244, 255, 255, 0.5); }
        .msg-u { background: #00bfa5; color: white; padding: 6px 12px; border-radius: 10px 10px 0 10px; margin: 4px 0 4px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 6px 12px; border-radius: 10px 10px 10px 0; margin: 4px 0; border-left: 3px solid #00bfa5; width: fit-content; max-width: 85%; }
        
        .ai-input-area { display: flex; padding: 10px; border-top: 1px solid #eee; background: white; align-items: center; gap: 8px; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 6px; border-radius: 8px; font-size: 12px; }
        #ai-mic { font-size: 24px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: pulse 0.8s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TRỢ LÝ TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với Em...">
            </div>
        </div>
        <div id="ai-root">
            <div class="ai-avatar">
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const root = document.getElementById('ai-root'), 
          chat = document.getElementById('ai-chat-box'), 
          mic = document.getElementById('ai-mic'), 
          input = document.getElementById('ai-txt'), 
          content = document.getElementById('ai-content');

    // --- LOGIC KÉO THẢ (Di chuyển Robot mọi nơi) ---
    let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    root.addEventListener("touchstart", dragStart, false);
    document.addEventListener("touchend", dragEnd, false);
    document.addEventListener("touchmove", drag, false);
    root.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);

    function dragStart(e) {
        initialX = (e.type === "touchstart" ? e.touches[0].clientX : e.clientX) - xOffset;
        initialY = (e.type === "touchstart" ? e.touches[0].clientY : e.clientY) - yOffset;
        if (e.target === root || root.contains(e.target)) isDragging = true;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = (e.type === "touchmove" ? e.touches[0].clientX : e.clientX) - initialX;
            currentY = (e.type === "touchmove" ? e.touches[0].clientY : e.clientY) - initialY;
            xOffset = currentX; yOffset = currentY;
            root.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }

    function dragEnd() {
        initialX = currentX; initialY = currentY; isDragging = false;
    }

    // --- LOGIC CHAT & GIỌNG NÓI ---
    root.onclick = () => { if(!isDragging) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; };

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    function speak(t) {
        window.speechSynthesis.cancel();
        const s = new SpeechSynthesisUtterance(t); s.lang = 'vi-VN'; s.pitch = 1.1;
        window.speechSynthesis.speak(s);
    }

    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { mic.classList.add('mic-active'); };
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        let reply = "";
        const m = msg.toLowerCase();
        if (m.includes("yêu") || m.includes("thương")) reply = "Em thương Anh nhất, lo lái xe an toàn nhé!";
        else if (m.includes("mệt")) reply = "Anh nghỉ tay uống nước đi, Em luôn bên Anh!";
        
        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là Robot trợ lý. Trả lời câu "${msg}" thật ngắn gọn, gọi chủ là Anh, không dùng tên Đạt.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe Anh rồi!"; }
        }
        addMsg(reply, 'ai'); speak(reply);
    }
})();
