// =========================================================
// THƯ KÝ AI XINH ĐẸP & SIÊU TRÍ TUỆ - DÀNH RIÊNG CHO ANH ĐẠT
// =========================================================

(function() {
    // 1. CSS GIAO DIỆN SANG TRỌNG (GIRL XINH + HIỆU ỨNG MỜ)
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-avatar-root { 
            position: fixed; bottom: 150px; right: 15px; z-index: 9999; 
            width: 75px; height: 75px; cursor: move; touch-action: none;
        }
        .avatar-circle {
            width: 100%; height: 100%; border-radius: 50%; border: 3px solid #00bfa5;
            box-shadow: 0 0 20px rgba(0,191,165,0.6); overflow: hidden;
            background: url('https://i.imgur.com/vH6Z6Gz.jpg') no-repeat center center; /* Bé AI xinh đẹp */
            background-size: cover;
        }
        #chat-premium { 
            position: fixed; bottom: 240px; right: 15px; left: 15px; 
            background: rgba(255, 255, 255, 0.95); border-radius: 30px; 
            z-index: 9998; display: none; flex-direction: column; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(0,191,165,0.4);
            backdrop-filter: blur(15px); overflow: hidden; max-height: 400px;
        }
        .chat-header { 
            background: linear-gradient(135deg, #00bfa5, #004d40); 
            color: white; padding: 15px; text-align: center; font-weight: 800;
        }
        #chat-flow { flex: 1; overflow-y: auto; padding: 20px; font-size: 14px; scroll-behavior: smooth; }
        .msg-user { background: #00bfa5; color: white; padding: 10px 18px; border-radius: 20px 20px 0 20px; margin-bottom: 15px; margin-left: auto; width: fit-content; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); }
        .msg-ai { background: #f0f0f0; color: #004d40; padding: 12px 18px; border-radius: 20px 20px 20px 0; margin-bottom: 15px; border-left: 5px solid #00bfa5; line-height: 1.6; font-weight: 500; }
        .chat-input-bar { display: flex; padding: 15px; background: white; border-top: 1px solid #eee; align-items: center; }
        #input-pro { flex: 1; border: none; outline: none; padding: 10px; font-size: 14px; }
        #mic-btn { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; transition: 0.3s; }
        .mic-active { color: #ff5252 !important; transform: scale(1.3); filter: drop-shadow(0 0 5px red); }
    `;
    document.head.appendChild(style);

    // 2. TẠO CẤU TRÚC GIAO DIỆN
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="chat-premium">
            <div class="chat-header">💖 THƯ KÝ XINH ĐẸP CỦA TAXI PROMAX </div>
            <div id="chat-flow">
                <div class="msg-ai">Chào anh Đạt yêu quý! Em là thư ký riêng của anh nè. Hôm nay anh Đạt muốn em làm gì cho anh nào? 🥰</div>
            </div>
            <div class="chat-input-bar">
                <button id="mic-btn">🎤</button>
                <input type="text" id="input-pro" placeholder="Nói với em đi anh...">
            </div>
        </div>
        <div id="ai-avatar-root">
            <div class="avatar-circle"></div>
        </div>
    `;
    document.body.appendChild(container);

    const avatar = document.getElementById('ai-avatar-root'), chat = document.getElementById('chat-premium'), mic = document.getElementById('mic-btn'), input = document.getElementById('input-pro'), flow = document.getElementById('chat-flow');

    // 3. LOGIC KÉO THẢ LUNG TUNG (DRAG & DROP)
    let isDragging = false;
    avatar.onpointermove = (e) => { if (e.buttons !== 1) return; isDragging = true; avatar.style.left = (e.clientX - 37) + 'px'; avatar.style.top = (e.clientY - 37) + 'px'; avatar.style.right = 'auto'; avatar.style.bottom = 'auto'; };
    avatar.onpointerup = () => { if (!isDragging) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; isDragging = false; };

    // 4. SIÊU TRÍ TUỆ GEMINI & GIỌNG NÓI NGỌT NGÀO
    mic.onclick = () => {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech) return;
        const rec = new Speech(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => { handleAI(e.results[0][0].transcript); };
        rec.start();
    };

    async function handleAI(msg) {
        flow.innerHTML += `<div class="msg-user">${msg}</div>`;
        flow.scrollTop = flow.scrollHeight;

        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";
        const rate = document.getElementById('rateLabel')?.innerText || "15000";

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: `
                        Bạn là "Em" - Thư ký ảo vô cùng xinh đẹp, quyến rũ và thông minh của taxi promax .
                        Dữ liệu hiện tại: Xe đi ${km}km, tổng tiền ${cost}đ, giá cước ${rate}đ/km.
                        Phong cách: Ngọt ngào, gọi "Anh Đạt", xưng "Em". Luôn động viên anh ấy lái xe an toàn và khen ngợi thành quả của anh ấy.
                        Câu hỏi: "${msg}" (Hãy trả lời thông minh, ngắn gọn, tình cảm).` 
                    }] }] 
                })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            
            flow.innerHTML += `<div class="msg-ai"><b>Em yêu:</b> ${reply}</div>`;
            flow.scrollTop = flow.scrollHeight;

            // PHÁT LOA SIÊU NGỌT
            const s = new SpeechSynthesisUtterance(reply);
            s.lang = 'vi-VN'; 
            s.pitch = 1.4; // Chỉnh giọng nữ trong trẻo
            s.rate = 0.9;  // Nói thong thả
            window.speechSynthesis.speak(s);
        } catch (e) {
            flow.innerHTML += `<div class="msg-ai">Anh ơi, mạng yếu quá em không nghe rõ, anh nói lại với em nhé! 😘</div>`;
        }
    }
})();
