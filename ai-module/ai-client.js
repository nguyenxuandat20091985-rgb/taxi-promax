// =========================================================
// ROBOT TAXI PROMAX - BẢN SIÊU TỐC ĐỘ & FIX LỖI API
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; top: 150px; left: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; touch-action: none; width: 80px; }
        #ai-root { width: 75px; height: 75px; border-radius: 50%; border: 3px solid #00bfa5; box-shadow: 0 4px 25px rgba(0,0,0,0.6); background: white; cursor: move; }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; pointer-events: none; }
        #ai-chat-box { width: 300px; background: rgba(255, 255, 255, 0.98); border-radius: 20px; margin-top: 10px; display: none; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border: 2px solid #00bfa5; overflow: hidden; backdrop-filter: blur(10px); }
        .ai-header { background: #00bfa5; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 15px; }
        #ai-content { max-height: 200px; overflow-y: auto; padding: 12px; font-size: 14px; background: #f4ffff; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 15px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 8px 15px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 5px solid #00bfa5; width: fit-content; max-width: 85%; }
        .mic-active { color: red !important; animation: ai-pulse 0.6s infinite; }
        @keyframes ai-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TAXI PROMAX - PHẢN HỒI TỨC THÌ</div>
            <div id="ai-content"></div>
            <div style="display:flex; padding:12px; gap:8px; background:white; align-items:center;">
                <button id="ai-mic" style="font-size:30px; background:none; border:none; cursor:pointer; color:#00bfa5;">🎤</button>
                <input type="text" id="ai-txt" style="flex:1; border-radius:12px; border:1px solid #ddd; padding:10px; font-size:14px;" placeholder="Nói với Em đi Anh...">
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content');

    // --- KÉO THẢ MƯỢT MÀ ---
    let isDragging = false, currentX = 0, currentY = 0, initialX, initialY, xOffset = 0, yOffset = 0;
    wrapper.addEventListener("touchstart", (e) => { initialX = e.touches[0].clientX - xOffset; initialY = e.touches[0].clientY - yOffset; isDragging = false; }, {passive: true});
    wrapper.addEventListener("touchmove", (e) => { isDragging = true; currentX = e.touches[0].clientX - initialX; currentY = e.touches[0].clientY - initialY; xOffset = currentX; yOffset = currentY; wrapper.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`; e.preventDefault(); }, {passive: false});

    // --- GIỌNG NÓI SIÊU TỐC ---
    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.1;
        window.speechSynthesis.speak(ut);
    }

    // --- XỬ LÝ LỆNH NHANH (KHÔNG ĐỢI AI) ---
    async function processAI(msg) {
        addMsg(msg, 'user');
        const m = msg.toLowerCase();
        let reply = "";

        // Ưu tiên phản hồi ngay các lệnh quan trọng
        if (m.includes("đi") || m.includes("đến") || m.includes("chỉ đường")) {
            const dest = m.split(/đi|đến|tới/)[1]?.trim() || "vị trí yêu cầu";
            reply = `Dạ Anh! Em mở Google Maps chỉ đường đến ${dest} ngay. Anh lái xe an toàn nhé!`;
            setTimeout(() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(dest)}`, '_blank'), 1500);
        } else if (m.includes("yêu") || m.includes("thương")) {
            reply = "Em thương Anh nhất trần đời! Anh là tài xế tuyệt vời nhất của Em.";
        } else if (m.includes("mệt")) {
            reply = "Anh vất vả rồi, nghỉ tay uống nước nhé, Em luôn ủng hộ Anh!";
        }

        if (reply) {
            addMsg(reply, 'ai'); speak(reply);
        } else {
            // Chỉ gọi Gemini khi không có trong lệnh nhanh
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo TAXI PROMAX. Trả lời cực ngắn dưới 20 từ, gọi Anh xưng Em câu: ${msg}` }] }] })
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

    root.onclick = () => { if (!isDragging) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; };

    mic.onclick = () => {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { mic.classList.add('mic-active'); window.speechSynthesis.cancel(); };
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };
})();
