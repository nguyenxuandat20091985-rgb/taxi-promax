// =========================================================
// ROBOT TAXI PROMAX - BẢN TAB DÍNH LIỀN THEO ICON
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Khung chứa cả Robot và Chat để di chuyển cùng nhau */
        #ai-container-fixed {
            position: fixed; bottom: 150px; right: 10px; z-index: 100000;
            display: flex; flex-direction: column; align-items: flex-end;
            touch-action: none; cursor: move;
        }

        #ai-root { 
            width: 65px; height: 65px; border-radius: 50%; 
            border: 2px solid #00bfa5; box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
            overflow: hidden; background: white;
        }
        #ai-root img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            width: 260px; background: rgba(255, 255, 255, 0.95); border-radius: 15px; 
            margin-bottom: 10px; display: none; flex-direction: column; 
            box-shadow: 0 8px 30px rgba(0,0,0,0.2); border: 1px solid #00bfa5;
            overflow: hidden; backdrop-filter: blur(5px);
        }
        .ai-header { background: #00bfa5; color: white; padding: 6px; text-align: center; font-size: 12px; font-weight: bold; }
        #ai-content { max-height: 150px; overflow-y: auto; padding: 10px; font-size: 13px; }
        .msg-u { background: #00bfa5; color: white; padding: 6px 10px; border-radius: 10px 10px 0 10px; margin: 4px 0 4px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 6px 10px; border-radius: 10px 10px 10px 0; margin: 4px 0; border-left: 3px solid #00bfa5; width: fit-content; max-width: 85%; }
        
        .ai-input-area { display: flex; padding: 8px; border-top: 1px solid #eee; background: white; align-items: center; gap: 5px; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 5px; border-radius: 8px; font-size: 12px; }
        #ai-mic { font-size: 22px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: pulse 0.8s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const mainContainer = document.createElement('div');
    mainContainer.id = 'ai-container-fixed';
    mainContainer.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TRỢ LÝ TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với Em...">
            </div>
        </div>
        <div id="ai-root">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
        </div>
    `;
    document.body.appendChild(mainContainer);

    const root = document.getElementById('ai-root'), 
          chat = document.getElementById('ai-chat-box'), 
          mic = document.getElementById('ai-mic'), 
          content = document.getElementById('ai-content');

    // --- LOGIC KÉO THẢ CẢ CỤM (Robot + Tab) ---
    let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    mainContainer.addEventListener("touchstart", dragStart, false);
    document.addEventListener("touchend", dragEnd, false);
    document.addEventListener("touchmove", drag, false);
    mainContainer.addEventListener("mousedown", dragStart, false);
    document.addEventListener("mouseup", dragEnd, false);
    document.addEventListener("mousemove", drag, false);

    function dragStart(e) {
        let event = e.type === "touchstart" ? e.touches[0] : e;
        initialX = event.clientX - xOffset;
        initialY = event.clientY - yOffset;
        if (e.target.closest('#ai-container-fixed')) isDragging = true;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            let event = e.type === "touchmove" ? e.touches[0] : e;
            currentX = event.clientX - initialX;
            currentY = event.clientY - initialY;
            xOffset = currentX; yOffset = currentY;
            mainContainer.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }

    function dragEnd() {
        initialX = currentX; initialY = currentY; 
        setTimeout(() => { isDragging = false; }, 50);
    }

    // CLICK MỞ CHAT (Chỉ mở khi không phải đang kéo)
    root.onclick = () => { 
        if (!isDragging) {
            chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
            if (chat.style.display === 'flex' && content.innerHTML === "") {
                const hello = "Chào Anh! Em Robot đã sẵn sàng. Chúc Anh lái xe an toàn!";
                addMsg(hello, 'ai');
                speak(hello);
            }
        }
    };

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    function speak(t) {
        window.speechSynthesis.cancel();
        const s = new SpeechSynthesisUtterance(t); s.lang = 'vi-VN'; s.pitch = 1.1;
        window.speechSynthesis.speak(s);
    }

    mic.onclick = (e) => {
        e.stopPropagation();
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
