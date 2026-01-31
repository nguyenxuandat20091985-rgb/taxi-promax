// =========================================================
// ROBOT TAXI PROMAX - SIÊU NHẠY & ĐA TÍNH NĂNG
// =========================================================

(function() {
    // 1. GIAO DIỆN & HIỆU ỨNG (ROBOT XANH SM)
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { 
            position: fixed; bottom: 120px; right: 20px; z-index: 99999; 
            width: 75px; height: 75px; cursor: move; touch-action: none;
        }
        .ai-avatar { 
            width: 100%; height: 100%; border-radius: 50%; 
            border: 3px solid #00bfa5; box-shadow: 0 0 20px rgba(0, 191, 165, 0.6); 
            overflow: hidden; background: white;
        }
        .ai-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            position: fixed; bottom: 210px; right: 15px; left: 15px; 
            background: rgba(255, 255, 255, 0.98); border-radius: 25px; 
            z-index: 99998; display: none; flex-direction: column; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid #00bfa5;
            backdrop-filter: blur(10px); max-height: 420px;
        }
        .ai-header { background: #00bfa5; color: white; padding: 15px; text-align: center; font-weight: bold; border-radius: 25px 25px 0 0; }
        #ai-content { flex: 1; overflow-y: auto; padding: 15px; font-size: 14px; min-height: 200px; background: #f4ffff; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 15px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 10px 15px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 5px solid #00bfa5; line-height: 1.5; }
        .ai-input-area { display: flex; padding: 12px; border-top: 1px solid #eee; background: white; align-items: center; gap: 10px; border-radius: 0 0 25px 25px; }
        #ai-txt { flex: 1; border: none; outline: none; font-size: 14px; }
        #ai-mic { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: pulse 0.8s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .roaming { animation: roamScreen 15s linear infinite !important; }
        @keyframes roamScreen {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-100px, -80px); }
            50% { transform: translate(-20px, -150px); }
            75% { transform: translate(-150px, -30px); }
        }
    `;
    document.head.appendChild(style);

    // 2. KỊCH BẢN PHẢN HỒI THÔNG MINH (TĂNG ĐỘ NHẠY)
    const script = {
        love: ["Em thương Anh nhất trần đời!", "Chỉ cần bên Anh là Em thấy vui rồi.", "Anh là động lực để Em làm việc mỗi ngày đó!"],
        tired: ["Anh nghỉ ngơi chút đi, đừng làm quá sức Em lo.", "Uống miếng nước đi Anh, Em luôn ủng hộ Anh mà.", "Mệt thì dựa vào vai Em nè (mặc dù Em là Robot)!"],
        money: ["Doanh thu đang tăng kìa Anh, Anh giỏi quá!", "Tiền về đầy túi rồi, Anh là tay lái vàng của Taxi Promax!"],
        cheer: ["Cố lên Anh yêu! Thành công đang chờ Anh!", "Anh là số 1, không ai chạy đỉnh bằng Anh đâu!"]
    };

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🤖 ROBOT TAXI PROMAX</div>
            <div id="ai-content">
                <div class="msg-a">Chào Anh! Em đã sẵn sàng. Hôm nay Anh muốn cùng Em đi đâu nào? 🥰</div>
            </div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với Em đi Anh...">
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

    // 3. LOGIC KÉO THẢ & CHẠY QUANH
    let isDragging = false;
    root.onpointermove = (e) => { if (e.buttons !== 1) return; isDragging = true; root.style.left = (e.clientX - 35) + 'px'; root.style.top = (e.clientY - 35) + 'px'; root.style.right = 'auto'; root.style.bottom = 'auto'; };

    let clickTimer;
    root.onpointerup = () => {
        if (!isDragging) {
            if (!clickTimer) {
                clickTimer = setTimeout(() => { chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; clickTimer = null; }, 250);
            } else {
                clearTimeout(clickTimer); clickTimer = null;
                root.classList.toggle('roaming');
                speak(root.classList.contains('roaming') ? "Em chạy quanh màn hình chơi nhé!" : "Em đứng yên đợi Anh!");
            }
        }
        isDragging = false;
    };

    // 4. NHẬN DIỆN GIỌNG NÓI SIÊU NHẠY
    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN'; rec.interimResults = false; rec.maxAlternatives = 1;
        rec.onstart = () => { mic.classList.add('mic-active'); window.speechSynthesis.cancel(); };
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => { processAI(e.results[0][0].transcript); };
        rec.start();
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";

        // Tối ưu hóa phản hồi: Ưu tiên kịch bản có sẵn để nhạy hơn
        let reply = "";
        const m = msg.toLowerCase();
        if (m.includes("yêu") || m.includes("thương")) reply = script.love[Math.floor(Math.random()*script.love.length)];
        else if (m.includes("mệt")) reply = script.tired[Math.floor(Math.random()*script.tired.length)];
        else if (m.includes("tiền") || m.includes("doanh thu")) reply = `Anh đã chạy được ${km}km và thu về ${cost}đ rồi, giỏi quá!`;
        
        if (reply) {
            setTimeout(() => { addMsg(reply, 'ai'); speak(reply); }, 300);
        } else {
            // Nếu không có trong kịch bản mới gọi Gemini (Trí tuệ nhân tạo)
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là Robot TAXI PROMAX. Trả lời câu "${msg}" thật tình cảm, ngắn gọn, gọi chủ nhân là "Anh" và xưng "Em". Tuyệt đối không được dùng tên Đạt. Hãy nịnh Anh ấy.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
                addMsg(reply, 'ai'); speak(reply);
            } catch (e) { addMsg("Em nghe rồi ạ!", 'ai'); }
        }
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    function speak(t) {
        const s = new SpeechSynthesisUtterance(t); s.lang = 'vi-VN'; s.pitch = 1.2; s.rate = 1.0;
        window.speechSynthesis.speak(s);
    }
})();
