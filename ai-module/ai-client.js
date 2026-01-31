(function() {
    // 1. CSS GIAO DIỆN (Đã tối ưu hiển thị)
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-avatar-root { 
            position: fixed; bottom: 150px; right: 20px; z-index: 9999; 
            width: 85px; height: 85px; cursor: move; touch-action: none;
        }
        .avatar-circle {
            width: 100%; height: 100%; border-radius: 50%; border: 3px solid #00bfa5;
            box-shadow: 0 0 20px rgba(0,191,165,0.6); overflow: hidden; background: #fff;
        }
        .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
        
        #chat-premium { 
            position: fixed; bottom: 250px; right: 15px; left: 15px; 
            background: rgba(255, 255, 255, 0.98); border-radius: 25px; 
            z-index: 9998; display: none; flex-direction: column; 
            box-shadow: 0 15px 40px rgba(0,0,0,0.3); border: 2px solid #00bfa5;
            backdrop-filter: blur(10px); overflow: hidden; max-height: 400px;
        }
        .chat-header { background: linear-gradient(135deg, #00bfa5, #004d40); color: white; padding: 12px; text-align: center; font-weight: 800; font-size: 14px; }
        #chat-flow { flex: 1; overflow-y: auto; padding: 15px; font-size: 13px; min-height: 200px; }
        .msg-user { background: #00bfa5; color: white; padding: 8px 15px; border-radius: 15px 15px 0 15px; margin-bottom: 10px; margin-left: auto; width: fit-content; }
        .msg-ai { background: #e0f2f1; color: #004d40; padding: 10px 15px; border-radius: 18px 18px 18px 0; margin-bottom: 12px; border-left: 5px solid #00bfa5; line-height: 1.5; }
        .chat-input-pro { display: flex; padding: 10px; border-top: 1px solid #eee; background: white; align-items: center; }
        #input-pro { flex: 1; border: none; outline: none; padding: 10px; }
        #mic-btn { font-size: 24px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: red !important; animation: blink 1s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // 2. TẠO CẤU TRÚC (Sử dụng ảnh đại diện xinh đẹp trực tiếp)
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="chat-premium">
            <div class="chat-header">💖 THƯ KÝ AI TAXI PROMAX</div>
            <div id="chat-flow">
                <div class="msg-ai">Chào anh Đạt! Em đã hiện hình rồi nè. Hôm nay anh chạy xe có mệt không, để em tâm sự với anh nhé? 🥰</div>
            </div>
            <div class="chat-input-pro">
                <button id="mic-btn">🎤</button>
                <input type="text" id="input-pro" placeholder="Nói với em đi anh...">
            </div>
        </div>
        <div id="ai-avatar-root">
            <div class="avatar-circle">
                <img id="ai-img" src="https://i.pinimg.com/736x/8e/71/3b/8e713b62419ec47e447f897686523992.jpg" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712139.png'">
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const avatar = document.getElementById('ai-avatar-root'), chat = document.getElementById('chat-premium'), mic = document.getElementById('mic-btn'), input = document.getElementById('input-pro'), flow = document.getElementById('chat-flow');

    // 3. LOGIC KÉO THẢ
    let isDragging = false;
    avatar.onpointermove = (e) => { if (e.buttons !== 1) return; isDragging = true; avatar.style.left = (e.clientX - 40) + 'px'; avatar.style.top = (e.clientY - 40) + 'px'; avatar.style.right = 'auto'; avatar.style.bottom = 'auto'; };
    avatar.onpointerup = () => { if (!isDragging) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; isDragging = false; };

    // 4. TRÍ TUỆ NHÂN TẠO & GIỌNG NÓI
    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return alert("Trình duyệt không hỗ trợ Mic");
        const speech = new Rec(); speech.lang = 'vi-VN';
        speech.onstart = () => mic.classList.add('mic-active');
        speech.onend = () => mic.classList.remove('mic-active');
        speech.onresult = (e) => { handleAI(e.results[0][0].transcript); };
        speech.start();
    };

    async function handleAI(msg) {
        flow.innerHTML += `<div class="msg-user">${msg}</div>`;
        flow.scrollTop = flow.scrollHeight;
        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là em thư ký AI xinh đẹp, ngọt ngào của anh Đạt lái xe taxi. Dữ liệu: đi được ${km}km, thu được ${cost}đ. Hãy trả lời câu "${msg}" thật tình cảm, ngắn gọn dưới 30 chữ, xưng em gọi anh Đạt.` }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            flow.innerHTML += `<div class="msg-ai"><b>Em:</b> ${reply}</div>`;
            flow.scrollTop = flow.scrollHeight;

            window.speechSynthesis.cancel();
            const s = new SpeechSynthesisUtterance(reply);
            s.lang = 'vi-VN'; s.pitch = 1.4; s.rate = 0.9;
            window.speechSynthesis.speak(s);
        } catch (e) { console.error(e); }
    }
})();
