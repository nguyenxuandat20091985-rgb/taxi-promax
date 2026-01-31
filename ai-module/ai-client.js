// =========================================================
// ROBOT TAXI PROMAX - PHIÊN BẢN KẾT NỐI SIÊU TRÍ TUỆ GEMINI
// =========================================================

(function() {
    // --- 1. GIAO DIỆN (GIỮ NGUYÊN PHONG CÁCH SINH ĐỘNG ANH THÍCH) ---
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 100px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; width: auto; }
        #ai-root { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #00bfa5; box-shadow: 0 0 20px rgba(0, 191, 165, 0.7); background: white; cursor: pointer; overflow: hidden; animation: breathing 3s ease-in-out infinite; transition: transform 0.2s; }
        @keyframes breathing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); box-shadow: 0 0 30px rgba(0, 191, 165, 0.9); } }
        #ai-root img { width: 100%; height: 100%; pointer-events: none; }
        #ai-chat-box { width: 280px; background: rgba(255, 255, 255, 0.95); border-radius: 20px; margin-bottom: 12px; display: none; flex-direction: column; box-shadow: 0 12px 35px rgba(0,0,0,0.3); border: 1px solid #00bfa5; overflow: hidden; backdrop-filter: blur(10px); animation: popUp 0.3s ease; }
        @keyframes popUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .ai-header { background: linear-gradient(90deg, #00bfa5, #00796b); color: white; padding: 10px; text-align: center; font-size: 13px; font-weight: bold; }
        #ai-content { max-height: 200px; overflow-y: auto; padding: 15px; font-size: 14px; background: #faffff; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: white; color: #333; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; border-left: 4px solid #00bfa5; width: fit-content; max-width: 85%; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .ai-input-area { display: flex; padding: 10px; background: white; align-items: center; gap: 8px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1px solid #ddd; outline: none; padding: 8px 15px; border-radius: 20px; font-size: 13px; }
        #ai-mic { font-size: 28px; color: #00bfa5; background: none; border: none; cursor: pointer; transition: 0.3s; }
        .mic-active { color: #ff5252 !important; transform: scale(1.2); animation: pulseMic 0.8s infinite; }
        @keyframes pulseMic { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 TAXI PROMAX - POWERED BY GEMINI</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh muốn hỏi gì em?">
            </div>
        </div>
        <div id="ai-root"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt');

    // --- 2. KẾT NỐI GEMINI API ---
    // Anh Đạt lưu ý: Key này em đã tích hợp sẵn, anh không cần chỉnh gì nữa nhé.
    const GEMINI_API_KEY = "AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g"; 
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    async function callGemini(userInput) {
        try {
            const response = await fetch(GEMINI_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `trợ lý ảo Taxi Promax,đang đồng hành cùng anh trên mọi nẻo đường . 
                            Hãy trả lời ngắn gọn (dưới 30 từ), thân mật, ngọt ngào, gọi người dùng là 'Anh' và xưng 'Em'. 
                            Nếu anh ấy mệt hãy động viên, nếu anh ấy hỏi đường hãy nhắc anh ấy lái xe an toàn. 
                            Câu hỏi của anh Đạt: ${userInput}`
                        }]
                    }]
                })
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Lỗi Gemini:", error);
            return "Em đang bị nghẽn mạng một chút, nhưng em vẫn luôn ở bên cạnh Anh đây!";
        }
    }

    // --- 3. XỬ LÝ GIỌNG NÓI & TƯƠNG TÁC ---
    function speak(text, callback) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.1;
        ut.onend = () => { if(callback) callback(); };
        window.speechSynthesis.speak(ut);
    }

    async function processAI(msg) {
        if (!msg) return;
        addMsg(msg, 'user');
        
        // Hiển thị trạng thái đang suy nghĩ
        const loadingMsg = "Đợi em tí nhé...";
        
        const reply = await callGemini(msg);
        addMsg(reply, 'ai');
        speak(reply, () => {
            // Tự động lắng nghe tiếp sau khi nói xong để anh rảnh tay
            setTimeout(startListening, 500);
        });
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // --- 4. HỆ THỐNG ĐIỀU KHIỂN ---
    let isDragging = false, xOffset = 0, yOffset = 0, startX, startY;

    wrapper.addEventListener("touchstart", (e) => { 
        startX = e.touches[0].clientX - xOffset; 
        startY = e.touches[0].clientY - yOffset; 
        isDragging = false;
    });

    wrapper.addEventListener("touchmove", (e) => { 
        isDragging = true;
        let nx = e.touches[0].clientX - startX;
        let ny = e.touches[0].clientY - startY;
        // Chống mất tích
        if (e.touches[0].clientX > 10 && e.touches[0].clientX < window.innerWidth - 10) xOffset = nx;
        if (e.touches[0].clientY > 10 && e.touches[0].clientY < window.innerHeight - 10) yOffset = ny;
        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault();
    }, {passive: false});

    root.onclick = () => {
        if (!isDragging) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if (!isVisible && content.innerHTML === "") {
                const welcome = "Chào Anh em là trợ lý taxi promax . Anh muốn tâm sự gì không?";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    };

    function startListening() {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processAI(e.results[0][0].transcript);
        rec.start();
    }

    mic.onclick = (e) => { e.stopPropagation(); startListening(); };
    txtInput.onkeypress = (e) => { if(e.key === 'Enter') { processAI(txtInput.value); txtInput.value = ''; } };
})();
