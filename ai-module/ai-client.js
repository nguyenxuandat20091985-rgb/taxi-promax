// =========================================================
// ROBOT TAXI PROMAX - BẢN DI ĐỘNG & VẼ ĐƯỜNG TRỰC TIẾP
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper {
            position: fixed; top: 100px; left: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: center;
            touch-action: none; width: 70px;
        }
        #ai-root { 
            width: 70px; height: 70px; border-radius: 50%; 
            border: 3px solid #00bfa5; box-shadow: 0 4px 20px rgba(0,0,0,0.5); 
            background: white; cursor: move; transition: transform 0.1s;
        }
        #ai-root img { width: 100%; height: 100%; border-radius: 50%; pointer-events: none; }
        
        #ai-chat-box { 
            width: 300px; background: white; border-radius: 15px; 
            margin-top: 10px; display: none; flex-direction: column; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid #00bfa5;
            overflow: hidden;
        }
        #ai-map-overlay {
            width: 90vw; height: 60vh; position: fixed; top: 10%; left: 5%;
            z-index: 2147483646; display: none; border-radius: 20px;
            box-shadow: 0 0 50px rgba(0,0,0,0.5); border: 3px solid #00bfa5;
        }
        .ai-header { background: #00bfa5; color: white; padding: 10px; text-align: center; font-weight: bold; position: relative; }
        .close-map { position: absolute; right: 10px; top: 5px; font-size: 20px; cursor: pointer; }
        #ai-content { max-height: 150px; overflow-y: auto; padding: 12px; font-size: 14px; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; width: fit-content; max-width: 85%; }
        .mic-active { color: red !important; animation: ai-pulse 0.8s infinite; }
        @keyframes ai-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
        <div id="ai-chat-box">
            <div class="ai-header">🤖 TRỢ LÝ TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div style="display:flex; padding:10px; gap:5px;">
                <button id="ai-mic" style="font-size:25px; background:none; border:none;">🎤</button>
                <input type="text" id="ai-txt" style="flex:1; border-radius:10px; border:1px solid #ccc; padding:5px;" placeholder="Anh muốn đi đâu?">
            </div>
        </div>
    `;
    
    const mapOverlay = document.createElement('div');
    mapOverlay.id = 'ai-map-overlay';
    document.body.appendChild(wrapper);
    document.body.appendChild(mapOverlay);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content');

    // --- CƠ CHẾ KÉO THẢ MỚI (CHỐNG LIỆT) ---
    let active = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    wrapper.addEventListener("touchstart", dragStart, {passive: false});
    document.addEventListener("touchend", dragEnd, {passive: false});
    document.addEventListener("touchmove", drag, {passive: false});

    function dragStart(e) {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
        if (e.target === root || root.contains(e.target)) active = true;
    }

    function drag(e) {
        if (active) {
            e.preventDefault();
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
            xOffset = currentX; yOffset = currentY;
            wrapper.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    }

    function dragEnd() { active = false; }

    // --- VẼ TUYẾN ĐƯỜNG ĐÈ LÊN BẢN ĐỒ ---
    function drawRoute(destination) {
        const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=YOUR_GOOGLE_MAPS_KEY&origin=My+Location&destination=${encodeURIComponent(destination)}&mode=driving`;
        mapOverlay.innerHTML = `
            <div class="ai-header">TUYẾN ĐƯỜNG ĐẾN: ${destination.toUpperCase()} <span class="close-map" onclick="document.getElementById('ai-map-overlay').style.display='none'">×</span></div>
            <iframe width="100%" height="90%" frameborder="0" style="border:0" src="${mapUrl}" allowfullscreen></iframe>
        `;
        mapOverlay.style.display = 'block';
        return `Em đã vạch tuyến đường đến ${destination} ngay trên màn hình cho anh rồi đó. Anh nhớ chú ý đường một chiều nhé!`;
    }

    root.onclick = () => {
        if (!active) {
            chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
        }
    };

    function speak(text, callback) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 0.95; ut.pitch = 1.1;
        ut.onend = () => { if(callback) callback(); };
        window.speechSynthesis.speak(ut);
    }

    async function processAI(msg) {
        addMsg(msg, 'user');
        let reply = "";
        const m = msg.toLowerCase();

        if (m.includes("đi") || m.includes("tới") || m.includes("đến")) {
            const dest = m.split(/đi|tới|đến/)[1].trim();
            if(dest) reply = drawRoute(dest);
        }

        if (!reply) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo TAXI PROMAX. Trả lời cực ngắn, tình cảm câu: ${msg}. Gọi là Anh.` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
            } catch (e) { reply = "Em nghe anh rồi!"; }
        }
        addMsg(reply, 'ai'); speak(reply);
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    mic.onclick = () => {
        const Rec = window.webkitSpeechRecognition;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    };
})();
