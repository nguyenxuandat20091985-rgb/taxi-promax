// =========================================================
// ROBOT TAXI PROMAX - BẢN FIX HIỂN THỊ CHẮC CHẮN 100%
// =========================================================

(function() {
    // 1. CSS HIỂN THỊ CỰC MẠNH (Đảm bảo Micro và Khung Chat luôn nổi lên trên)
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { 
            position: fixed; bottom: 120px; right: 20px; z-index: 100000; 
            width: 80px; height: 80px; cursor: pointer; touch-action: none;
        }
        .ai-avatar { 
            width: 100%; height: 100%; border-radius: 50%; 
            border: 4px solid #00bfa5; box-shadow: 0 0 20px rgba(0, 191, 165, 0.8); 
            overflow: hidden; background: white;
        }
        .ai-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 350px; background: white; border-radius: 20px; 
            z-index: 100001; display: none; flex-direction: column; 
            box-shadow: 0 0 100px rgba(0,0,0,0.5); border: 2px solid #00bfa5;
            overflow: hidden; height: 450px;
        }
        .ai-header { background: #00bfa5; color: white; padding: 15px; text-align: center; font-weight: bold; position: relative; }
        .ai-close { position: absolute; right: 15px; top: 12px; font-size: 20px; cursor: pointer; }
        
        #ai-content { flex: 1; overflow-y: auto; padding: 15px; font-size: 15px; background: #f4ffff; display: flex; flex-direction: column; }
        .msg-u { background: #00bfa5; color: white; padding: 10px 15px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 80%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 10px 15px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 5px solid #00bfa5; width: fit-content; max-width: 80%; }
        
        .ai-input-area { display: flex; padding: 15px; border-top: 1px solid #eee; background: white; align-items: center; gap: 10px; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 10px; border-radius: 10px; font-size: 14px; }
        #ai-mic { font-size: 35px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: pulse 0.8s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .roaming { animation: roamScreen 15s linear infinite !important; }
        @keyframes roamScreen {
            0%, 100% { left: 20px; bottom: 120px; }
            25% { left: 80%; bottom: 80%; }
            50% { left: 50%; bottom: 50%; }
            75% { left: 10px; bottom: 70%; }
        }
    `;
    document.head.appendChild(style);

    // 2. CẤU TRÚC GIAO DIỆN
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">
                🤖 TRỢ LÝ TAXI PROMAX
                <span class="ai-close" id="ai-close">✕</span>
            </div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói hoặc viết đi Anh...">
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
          content = document.getElementById('ai-content'),
          close = document.getElementById('ai-close');

    // 3. HÀM CHÀO HỎI & PHÁT TIẾNG
    function welcome() {
        const h = new Date().getHours();
        let txt = h < 12 ? "Chào Anh buổi sáng! Chúc Anh vạn dặm bình an!" : "Chào Anh! Em Robot đã sẵn sàng hỗ trợ Anh!";
        addMsg(txt, 'ai');
        speak(txt);
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); 
        d.className = s === 'user' ? 'msg-u' : 'msg-a'; 
        d.textContent = t;
        content.appendChild(d); 
        content.scrollTop = content.scrollHeight;
    }

    function speak(t) {
        window.speechSynthesis.cancel();
        const s = new SpeechSynthesisUtterance(t); 
        s.lang = 'vi-VN'; s.pitch = 1.1; s.rate = 1.0;
        window.speechSynthesis.speak(s);
    }

    // 4. MỞ KHUNG CHAT (Bấm vào Robot là hiện)
    root.onclick = () => {
        chat.style.display = 'flex';
        if (content.children.length === 0) welcome();
    };
    
    close.onclick = (e) => {
        e.stopPropagation();
        chat.style.display = 'none';
    };

    // 5. MIC SIÊU NHẠY
    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return alert("Trình duyệt Anh không hỗ trợ Micro");
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        // Kịch bản yêu thương nịnh nọt
        const m = msg.toLowerCase();
        let reply = "";
        if (m.includes("yêu") || m.includes("thương")) reply = "Em thương Anh nhất trần đời, Anh lo lái xe an toàn nhé!";
        else if (m.includes("mệt")) reply = "Anh mệt hả? Nghỉ tay uống nước đi Anh, Em thương Anh lắm!";
        else if (m.includes("chạy")) root.classList.toggle('roaming');

        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là Robot TAXI PROMAX. Trả lời câu "${msg}" thật tình cảm, ngắn gọn, gọi chủ là "Anh", tuyệt đối không dùng tên Đạt.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe Anh rồi ạ!"; }
        }
        addMsg(reply, 'ai'); speak(reply);
    }
})();
