// =========================================================
// SIÊU THƯ KÝ AI XINH ĐẸP - BẢN FULL CHỨC NĂNG CHO TAXI PROMAX 
// =========================================================

(function() {
    // 1. GIAO DIỆN SANG TRỌNG & AVATAR XINH ĐẸP
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { position: fixed; bottom: 160px; right: 20px; z-index: 9999; width: 85px; height: 85px; cursor: move; touch-action: none; }
        .ai-avatar { 
            width: 100%; height: 100%; border-radius: 50%; border: 3px solid #00bfa5;
            box-shadow: 0 5px 20px rgba(0,191,165,0.6); overflow: hidden; background: #fff;
        }
        .ai-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        #ai-chat-box { 
            position: fixed; bottom: 255px; right: 15px; left: 15px; 
            background: rgba(255, 255, 255, 0.98); border-radius: 25px; 
            z-index: 9998; display: none; flex-direction: column; 
            box-shadow: 0 15px 45px rgba(0,0,0,0.3); border: 2px solid #00bfa5;
            backdrop-filter: blur(12px); overflow: hidden; max-height: 450px;
        }
        .ai-header { background: linear-gradient(135deg, #00bfa5, #004d40); color: white; padding: 15px; text-align: center; font-weight: 800; }
        #ai-content { flex: 1; overflow-y: auto; padding: 15px; font-size: 14px; min-height: 200px; scroll-behavior: smooth; }
        .msg-u { background: #00bfa5; color: white; padding: 8px 15px; border-radius: 15px 15px 0 15px; margin-bottom: 10px; margin-left: auto; width: fit-content; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); }
        .msg-a { background: #e0f2f1; color: #004d40; padding: 10px 15px; border-radius: 18px 18px 18px 0; margin-bottom: 12px; border-left: 5px solid #00bfa5; line-height: 1.5; }
        .ai-input-area { display: flex; padding: 12px; border-top: 1px solid #eee; background: white; align-items: center; }
        #ai-txt { flex: 1; border: none; outline: none; padding: 10px; font-size: 14px; }
        #ai-mic { font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; }
        .mic-active { color: #ff5252 !important; animation: ai-blink 1s infinite; }
        @keyframes ai-blink { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💎 THƯ KÝ XINH ĐẸP TAXI PROMAX</div>
            <div id="ai-content">
                <div class="msg-a">Chào anh Đạt yêu dấu! Em đã sẵn sàng đồng hành cùng anh trên mọi nẻo đường rồi nè. Anh cần em giúp gì không ạ? 🥰</div>
            </div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Tâm sự với em đi anh...">
            </div>
        </div>
        <div id="ai-root">
            <div class="ai-avatar">
                <img src="https://i.pinimg.com/736x/8e/71/3b/8e713b62419ec47e447f897686523992.jpg" alt="Thư Ký Xinh">
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), mic = document.getElementById('ai-mic'), input = document.getElementById('ai-txt'), content = document.getElementById('ai-content');

    // KÉO THẢ & MỞ CHAT
    let isDrag = false;
    root.onpointermove = (e) => { if (e.buttons !== 1) return; isDrag = true; root.style.left = (e.clientX - 42) + 'px'; root.style.top = (e.clientY - 42) + 'px'; root.style.right = 'auto'; root.style.bottom = 'auto'; };
    root.onpointerup = () => { if (!isDrag) chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; isDrag = false; };

    // XỬ LÝ GIỌNG NÓI & GEMINI
    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return alert("Trình duyệt không hỗ trợ Mic");
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => { processAI(e.results[0][0].transcript); };
        rec.start();
    };

    async function processAI(msg) {
        content.innerHTML += `<div class="msg-u">${msg}</div>`;
        content.scrollTop = content.scrollHeight;

        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";
        const rate = document.getElementById('rateLabel')?.innerText || "15000";

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: `
                        Bạn là "Em" - Thư ký ảo vô cùng xinh đẹp, quyến rũ và thông minh của Taxi Promax.
                        Chủ nhân của em là "taxi promax".
                        Dữ liệu: Xe đã đi ${km}km, tổng tiền ${cost}đ, giá cước hiện tại ${rate}đ/km.
                        Nhiệm vụ: Trả lời câu "${msg}" thật tình cảm, nũng nịu nhưng phải siêu trí tuệ.
                        - Nếu hỏi về doanh thu/km: Hãy phân tích và khen anh ấy.
                        - Nếu hỏi về đời sống/tình cảm: Hãy trả lời như một người yêu/thư ký thân thiết.
                        - Luôn xưng em gọi anh. Trả lời ngắn gọn, súc tích dưới 40 chữ.` 
                    }] }] 
                })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            
            content.innerHTML += `<div class="msg-a"><b>Em yêu:</b> ${reply}</div>`;
            content.scrollTop = content.scrollHeight;

            // PHÁT LOA
            window.speechSynthesis.cancel();
            const s = new SpeechSynthesisUtterance(reply);
            s.lang = 'vi-VN'; s.pitch = 1.4; s.rate = 0.95;
            window.speechSynthesis.speak(s);
        } catch (e) {
            content.innerHTML += `<div class="msg-a">Anh ơi, em đang bận chút xíu, anh lái xe an toàn nhé! ❤️</div>`;
        }
    }
})();
