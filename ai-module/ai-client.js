// =========================================================
// ROBOT TAXI PROMAX - HỖ TRỢ CHỈ ĐƯỜNG & RẢNH TAY
// =========================================================

(function() {
    // Giữ nguyên CSS cũ và thêm hiệu ứng nhấp nháy khi đang nghe tự động
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 150px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; width: 70px; }
        #ai-root { width: 70px; height: 70px; border-radius: 50%; border: 3px solid #00bfa5; box-shadow: 0 4px 20px rgba(0,0,0,0.4); overflow: hidden; background: white; cursor: pointer; }
        #ai-root img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        #ai-chat-box { width: 280px; background: white; border-radius: 20px; margin-bottom: 10px; display: none; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid #00bfa5; position: absolute; bottom: 80px; right: 0; }
        .ai-header { background: #00bfa5; color: white; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
        #ai-content { max-height: 200px; overflow-y: auto; padding: 12px; font-size: 14px; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 4px solid #00bfa5; width: fit-content; max-width: 85%; }
        .ai-input-area { display: flex; padding: 10px; border-top: 1px solid #eee; align-items: center; gap: 8px; }
        #ai-mic { font-size: 28px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: ai-pulse 0.8s infinite; }
        @keyframes ai-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `<div id="ai-chat-box"><div class="ai-header">🤖 TAXI PROMAX AI</div><div id="ai-content"></div><div class="ai-input-area"><button id="ai-mic">🎤</button><input type="text" id="ai-txt" placeholder="Anh muốn đi đâu?"></div></div><div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>`;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content');

    // Giữ màn hình luôn sáng
    let wakeLock = null;
    async function requestWakeLock() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} }

    // Chỉ đường bằng Google Maps
    function openMap(destination) {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
        window.open(url, '_blank');
        return `Em đang mở bản đồ chỉ đường đến ${destination} cho anh. Anh lái xe cẩn thận, chú ý tốc độ và đường cấm nhé!`;
    }

    // Giọng nói
    function speak(text, callback) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.pitch = 1.1; ut.rate = 1.0;
        ut.onend = () => { if(callback) callback(); };
        window.speechSynthesis.speak(ut);
    }

    // Lắng nghe tự động (Độ nhạy cao)
    function startListening() {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => {
            const result = e.results[0][0].transcript;
            processAI(result);
        };
        rec.start();
    }

    async function processAI(msg) {
        addMsg(msg, 'user');
        let reply = "";
        const m = msg.toLowerCase();

        // Lệnh chỉ đường
        if (m.includes("chỉ đường") || m.includes("đến") || m.includes("tới")) {
            const dest = m.replace("chỉ đường", "").replace("đến", "").replace("tới", "").trim();
            if(dest) reply = openMap(dest);
        }

        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo TAXI PROMAX. Trả lời ngắn câu: ${msg}. Gọi là Anh, xưng Em. Anh đang lái xe nên hãy nhắc anh chú ý đường cấm và tốc độ nếu cần.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe anh rồi!"; }
        }

        addMsg(reply, 'ai');
        // Sau khi nói xong sẽ tự động mở Mic nghe tiếp trong 5 giây
        speak(reply, () => {
            setTimeout(() => { startListening(); }, 500);
        });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    root.onclick = () => {
        requestWakeLock();
        chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
        if(chat.style.display === 'flex' && content.innerHTML === "") {
            const welcome = "Em chào anh! Anh muốn đi đâu, cứ bảo em chỉ đường cho nhé!";
            addMsg(welcome, 'ai'); speak(welcome);
        }
    };

    mic.onclick = (e) => { e.stopPropagation(); requestWakeLock(); startListening(); };
})();
