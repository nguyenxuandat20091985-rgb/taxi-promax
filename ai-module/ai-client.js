// =========================================================
// ROBOT TAXI PROMAX - BẢN TINH TẾ & CHỐNG THẤT LẠC
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper {
            position: fixed; bottom: 100px; right: 10px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: flex-end;
            touch-action: none; width: auto;
        }

        /* Robot nhỏ gọn, tinh tế */
        #ai-root { 
            width: 55px; height: 55px; border-radius: 50%; 
            border: 2px solid #00bfa5; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            background: white; cursor: pointer; overflow: hidden;
            transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        #ai-root img { width: 100%; height: 100%; object-fit: cover; }
        
        /* Tab chat nhỏ gọn, hiệu ứng kính mờ */
        #ai-chat-box { 
            width: 70vw; max-width: 250px; background: rgba(255, 255, 255, 0.9); 
            border-radius: 15px; margin-bottom: 8px; 
            display: none; flex-direction: column; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
            border: 1px solid rgba(0, 191, 165, 0.2);
            overflow: hidden; backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

        .ai-header { background: #00bfa5; color: white; padding: 6px; text-align: center; font-size: 11px; font-weight: bold; }
        #ai-content { max-height: 150px; overflow-y: auto; padding: 10px; font-size: 13px; }
        .msg-u { background: #00bfa5; color: white; padding: 6px 10px; border-radius: 12px 12px 0 12px; margin: 4px 0 4px auto; width: fit-content; max-width: 85%; font-size: 12px; }
        .msg-a { background: white; color: #333; padding: 6px 10px; border-radius: 12px 12px 12px 0; margin: 4px 0; border: 1px solid #eee; width: fit-content; max-width: 85%; font-size: 12px; }
        
        .ai-input-area { display: flex; padding: 8px; background: #fff; align-items: center; gap: 5px; }
        #ai-txt { flex: 1; border: 1px solid #f0f0f0; outline: none; padding: 6px 10px; border-radius: 15px; font-size: 12px; background: #f9f9f9; }
        #ai-mic { font-size: 24px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: blink 0.8s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh cần gì...">
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content');

    // --- KÉO THẢ GIỚI HẠN TRONG MÀN HÌNH ---
    let xOffset = 0, yOffset = 0, startX, startY;
    wrapper.addEventListener("touchstart", (e) => { 
        startX = e.touches[0].clientX - xOffset; 
        startY = e.touches[0].clientY - yOffset; 
    }, {passive: true});

    wrapper.addEventListener("touchmove", (e) => { 
        let newX = e.touches[0].clientX - startX;
        let newY = e.touches[0].clientY - startY;

        // Giới hạn không cho bay ra ngoài
        const rect = wrapper.getBoundingClientRect();
        const b = 10; // Khoảng cách an toàn mép
        if (e.touches[0].clientX > b && e.touches[0].clientX < window.innerWidth - b) xOffset = newX;
        if (e.touches[0].clientY > b && e.touches[0].clientY < window.innerHeight - b) yOffset = newY;

        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault();
    }, {passive: false});

    // --- GIỌNG NÓI & PHẢN HỒI ---
    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.1;
        window.speechSynthesis.speak(ut);
    }

    root.onclick = () => {
        const isVisible = chat.style.display === 'flex';
        chat.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible && content.innerHTML === "") {
            const hi = "Chào anh! Em ở đây hỗ trợ anh.";
            addMsg(hi, 'ai'); speak(hi);
        }
        // Tự động đóng sau 10s để đỡ vướng
        if(chat.style.display === 'flex') {
            clearTimeout(window.aiCloseTimer);
            window.aiCloseTimer = setTimeout(() => { chat.style.display = 'none'; }, 10000);
        }
    };

    async function processAI(msg) {
        addMsg(msg, 'user');
        const m = msg.toLowerCase();
        if (m.includes("đi") || m.includes("đến")) {
            const d = m.split(/đi|đến/)[1]?.trim();
            speak(`Dạ anh, mở đường đến ${d}`);
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}`, '_blank');
            return;
        }
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Trả lời ngắn gọn dưới 15 từ, gọi Anh xưng Em câu: ${msg}` }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            addMsg(reply, 'ai'); speak(reply);
        } catch (e) { addMsg("Em nghe anh rồi!", 'ai'); }
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    mic.onclick = (e) => {
        e.stopPropagation();
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };
})();
