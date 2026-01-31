(function() {
    // 1. CSS GIAO DIỆN (GIỮ NGUYÊN BẢN ĐẸP ANH THÍCH)
    const style = document.createElement('style');
    style.innerHTML = `
        #robot-boss { position: fixed; bottom: 150px; right: 20px; z-index: 9999; width: 65px; height: 65px; cursor: move; touch-action: none; filter: drop-shadow(0 0 15px #00bfa5); }
        #chat-premium { position: fixed; bottom: 230px; right: 20px; left: 20px; background: rgba(255, 255, 255, 0.98); border-radius: 25px; z-index: 9998; display: none; flex-direction: column; box-shadow: 0 15px 40px rgba(0,0,0,0.3); border: 1px solid #00bfa5; backdrop-filter: blur(10px); }
        .chat-header-pro { background: linear-gradient(135deg, #00bfa5, #004d40); color: white; padding: 12px; text-align: center; font-weight: 800; border-radius: 25px 25px 0 0; }
        #chat-main-area { height: 200px; overflow-y: auto; padding: 15px; font-size: 13px; }
        .msg-ai { background: #e0f2f1; color: #004d40; padding: 10px 15px; border-radius: 18px 18px 18px 0; margin-bottom: 12px; border-left: 5px solid #00bfa5; line-height: 1.5; }
        .chat-input-pro { display: flex; padding: 10px; border-top: 1px solid #eee; align-items: center; }
        #mic-pro { font-size: 24px; color: #00bfa5; background: none; border: none; }
        .mic-on { color: red !important; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `<div id="chat-premium"><div class="chat-header-pro">💎 THƯ KÝ AI PROMAX</div><div id="chat-main-area"><div class="msg-ai">Chào anh Đạt đẹp trai! Em là trợ lý siêu trí tuệ của riêng anh đây. Chúc anh vạn dặm bình an nhé! ❤️</div></div><div class="chat-input-pro"><button id="mic-pro">🎤</button><input type="text" id="input-pro" placeholder="Nói với em..." style="flex:1; border:none; outline:none; padding:10px;"></div></div><div id="robot-boss"><img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" style="width:100%;"></div>`;
    document.body.appendChild(container);

    const robot = document.getElementById('robot-boss'), chat = document.getElementById('chat-premium'), mic = document.getElementById('mic-pro'), input = document.getElementById('input-pro'), area = document.getElementById('chat-main-area');

    // LOGIC KÉO THẢ (LUNG TUNG)
    let isDragging = false;
    robot.onpointermove = (e) => { if (e.buttons !== 1) return; isDragging = true; robot.style.left = (e.clientX - 30) + 'px'; robot.style.top = (e.clientY - 30) + 'px'; robot.style.right = 'auto'; robot.style.bottom = 'auto'; };
    robot.onpointerup = () => { if (!isDragging) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; isDragging = false; };

    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const speech = new Rec(); speech.lang = 'vi-VN';
        speech.onstart = () => mic.classList.add('mic-on');
        speech.onend = () => mic.classList.remove('mic-on');
        speech.onresult = (e) => { const txt = e.results[0][0].transcript; talk(txt); };
        speech.start();
    };

    async function talk(msg) {
        area.innerHTML += `<div style="text-align:right; margin-bottom:10px; color:#00bfa5;"><b>Anh Đạt:</b> ${msg}</div>`;
        area.scrollTop = area.scrollHeight;

        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";
        const rate = document.getElementById('rateLabel')?.innerText || "15000";

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký ảo cực kỳ ngọt ngào, thông minh của anh Nguyễn Xuân Đạt. Dữ liệu: Xe đi ${km}km, thu nhập ${cost}đ, giá ${rate}đ/km. Hãy trả lời câu hỏi "${msg}" một cách siêu trí tuệ, có chiều sâu, dùng ngôn ngữ tình cảm, xưng em gọi anh.` }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            
            area.innerHTML += `<div class="msg-ai"><b>Thư ký:</b> ${reply}</div>`;
            area.scrollTop = area.scrollHeight;

            // CẤU HÌNH GIỌNG NÓI NGỌT NGÀO
            const s = new SpeechSynthesisUtterance(reply);
            s.lang = 'vi-VN';
            s.pitch = 1.2; // Giọng cao hơn một chút cho nữ tính
            s.rate = 0.9;  // Nói chậm lại một chút cho tình cảm
            s.volume = 1;
            window.speechSynthesis.speak(s);
        } catch (e) { area.innerHTML += `<div class="msg-ai">Anh Đạt ơi, em đang bận xử lý dữ liệu một chút, anh lái xe cẩn thận nhé!</div>`; }
    }
})();
