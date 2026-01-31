// =========================================================
// THƯ KÝ ROBOT XANH SM - ICON DI CHUYỂN LINH HOẠT
// =========================================================

(function() {
    // 1. GIAO DIỆN & ANIMATION
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { 
            position: fixed; bottom: 120px; right: 20px; z-index: 99999; 
            width: 70px; height: 70px; cursor: move; touch-action: none;
            transition: transform 0.3s ease;
        }
        .ai-avatar { 
            width: 100%; height: 100%; border-radius: 50%; 
            border: 3px solid #00bfa5; box-shadow: 0 0 15px rgba(0, 191, 165, 0.5); 
            overflow: hidden; background: white; animation: float 3s ease-in-out infinite;
        }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .ai-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            position: fixed; bottom: 200px; right: 20px; width: 300px;
            background: white; border-radius: 20px; z-index: 99998; 
            display: none; flex-direction: column; box-shadow: 0 5px 25px rgba(0,0,0,0.2); 
            border: 2px solid #00bfa5; overflow: hidden; max-height: 400px;
        }
        .ai-header { background: #00bfa5; color: white; padding: 12px; text-align: center; font-weight: bold; }
        #ai-content { flex: 1; overflow-y: auto; padding: 12px; font-size: 13px; background: #f9ffff; min-height: 150px; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 12px 12px 0 12px; margin: 5px 0 5px auto; width: fit-content; max-width: 80%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 8px 12px; border-radius: 12px 12px 12px 0; margin: 5px 0; border-left: 3px solid #00bfa5; width: fit-content; max-width: 80%; }
        .ai-input-area { display: flex; padding: 10px; border-top: 1px solid #eee; background: white; align-items: center; gap: 5px; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 8px; border-radius: 15px; }
        #ai-mic { font-size: 20px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        
        /* Chế độ chạy quanh màn hình */
        .roaming { animation: roamScreen 20s linear infinite !important; }
        @keyframes roamScreen {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-150px, -50px); }
            50% { transform: translate(-50px, -200px); }
            75% { transform: translate(-200px, -100px); }
            100% { transform: translate(0, 0); }
        }
    `;
    document.head.appendChild(style);

    // 2. TẠO GIAO DIỆN (Dùng icon Robot Xanh SM)
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TRỢ LÝ XANH SM</div>
            <div id="ai-content">
                <div class="msg-a">Chào anh! Em là Robot Xanh SM đây. Em đã sẵn sàng chạy quanh màn hình cùng anh rồi! 🚕💨</div>
            </div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với em nè...">
            </div>
        </div>
        <div id="ai-root">
            <div class="ai-avatar">
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), input = document.getElementById('ai-txt'), content = document.getElementById('ai-content');

    // 3. LOGIC KÉO THẢ (DI CHUYỂN BẰNG TAY)
    let isDragging = false;
    root.onpointermove = (e) => { 
        if (e.buttons !== 1) return; 
        isDragging = true;
        root.style.left = (e.clientX - 35) + 'px'; 
        root.style.top = (e.clientY - 35) + 'px';
        root.style.right = 'auto'; root.style.bottom = 'auto';
    };

    // 4. CLICK ĐỂ MỞ CHAT / DOUBLE CLICK ĐỂ TỰ CHẠY
    let clickTimer;
    root.onpointerup = (e) => {
        if (!isDragging) {
            if (!clickTimer) {
                clickTimer = setTimeout(() => {
                    chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
                    clickTimer = null;
                }, 250);
            } else {
                clearTimeout(clickTimer);
                clickTimer = null;
                // Double click: Bật/Tắt tự chạy quanh
                root.classList.toggle('roaming');
                const isRoaming = root.classList.contains('roaming');
                addMsg(isRoaming ? "Em bắt đầu đi dạo quanh màn hình đây! 🏃‍♂️" : "Em đứng yên trực lệnh anh nhé! 🤖", 'ai');
            }
        }
        isDragging = false;
    };

    // 5. TRÍ TUỆ NHÂN TẠO & GIỌNG NÓI
    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => { processAI(e.results[0][0].transcript); };
        rec.start();
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là Robot trợ lý Xanh SM. Hãy trả lời câu "${msg}" thật thông minh, ngắn gọn, nịnh chủ. Dữ liệu: đã đi ${km}km, thu ${cost}đ. Đừng dùng tên Đạt, hãy gọi là "Anh".` }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            addMsg(reply, 'ai');
            speak(reply);
        } catch (e) { console.error(e); }
    }

    function addMsg(text, sender) {
        const div = document.createElement('div');
        div.className = sender === 'user' ? 'msg-u' : 'msg-a';
        div.textContent = text;
        content.appendChild(div);
        content.scrollTop = content.scrollHeight;
    }

    function speak(text) {
        window.speechSynthesis.cancel();
        const s = new SpeechSynthesisUtterance(text);
        s.lang = 'vi-VN'; s.pitch = 1.2; s.rate = 1.0;
        window.speechSynthesis.speak(s);
    }
})();
