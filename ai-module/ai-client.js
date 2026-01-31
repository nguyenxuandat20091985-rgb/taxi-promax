// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN CÔ BÉ TRỢ LÝ ĐÁNG YÊU (V11)
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 120px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        
        /* Icon Cô Bé Trợ Lý */
        #ai-root { 
            width: 70px; height: 70px; border-radius: 50%; 
            background: #fff; border: 3px solid #ff80ab;
            box-shadow: 0 5px 20px rgba(255, 128, 171, 0.5);
            cursor: pointer; position: relative; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
            animation: bounce 3s infinite ease-in-out;
        }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        /* Giao diện Cô Bé (Vẽ bằng CSS) */
        .girl-face { position: relative; width: 100%; height: 100%; background: #ffe0bd; border-radius: 50%; }
        .hair { position: absolute; top: 0; width: 100%; height: 50%; background: #4e342e; border-radius: 50% 50% 0 0; }
        .eye { position: absolute; width: 10px; height: 10px; background: #333; border-radius: 50%; top: 35px; animation: blink 4s infinite; }
        .eye.l { left: 18px; } .eye.r { right: 18px; }
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        .blush { position: absolute; width: 10px; height: 6px; background: #ff8a80; border-radius: 50%; top: 45px; opacity: 0.6; }
        .blush.l { left: 12px; } .blush.r { right: 12px; }
        #mouth { 
            position: absolute; width: 14px; height: 6px; border: 2px solid #ff5252; 
            border-top: none; border-radius: 0 0 10px 10px; bottom: 12px; left: 50%; transform: translateX(-50%); 
        }
        .talking #mouth { animation: talk 0.2s infinite; border-radius: 50%; height: 10px; }
        @keyframes talk { 0%, 100% { height: 6px; } 50% { height: 12px; } }

        /* Khung Chat Cute */
        #ai-chat-box { 
            width: 310px; max-width: 85vw; background: rgba(255, 255, 255, 0.98); 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border: 2px solid #ff80ab; overflow: hidden;
        }
        .ai-header { background: linear-gradient(135deg, #ff80ab, #f06292); color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 14px; }
        #ai-content { max-height: 260px; overflow-y: auto; padding: 15px; font-size: 14px; background: #fff9fa; }
        .msg-u { background: #ff80ab; color: white; padding: 10px 15px; border-radius: 18px 18px 0 18px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; box-shadow: 0 2px 5px rgba(255,128,171,0.3); }
        .msg-a { background: white; color: #444; padding: 10px 15px; border-radius: 18px 18px 18px 0; margin: 5px 0; border: 1px solid #ffcdd2; width: fit-content; max-width: 85%; }

        .ai-input-area { display: flex; padding: 12px; background: white; align-items: center; gap: 10px; border-top: 1px solid #ffebee; }
        #ai-txt { flex: 1; border: 1px solid #ffcdd2; outline: none; padding: 10px 18px; border-radius: 25px; font-size: 14px; }
        #ai-send { color: #f06292; font-size: 26px; border: none; background: none; cursor: pointer; }
        #ai-mic { font-size: 24px; color: #f06292; border: none; background: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🌸 CÔ BÉ TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nói với em đi anh...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root">
            <div class="girl-face">
                <div class="hair"></div>
                <div class="eye l"></div><div class="eye r"></div>
                <div class="blush l"></div><div class="blush r"></div>
                <div id="mouth"></div>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    const K = "AIzaSyBYI"+"pmslXFTkETW7"+"cfiPeLJ0oPcgMJUn2g"; 

    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${K}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là cô bé trợ lý đáng yêu của Taxi Promax. Hãy trả lời cực kỳ ngắn gọn, ngọt ngào, lễ phép. Luôn gọi 'anh' xưng 'em'. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            const q = userInput.toLowerCase();
            if(q.includes("mệt")) return "Anh nghỉ ngơi chút nha, có em ở đây tâm sự với anh rồi nè! ❤️";
            return "Em vẫn đang nghe anh đây ạ! Anh lái xe cẩn thận nha.";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.1; 
        ut.onstart = () => root.classList.add('talking');
        ut.onend = () => { root.classList.remove('talking'); if(cb) cb(); };
        window.speechSynthesis.speak(ut);
    }

    async function handleSend() {
        const msg = txtInput.value.trim();
        if(!msg) return;
        txtInput.value = '';
        addMsg(msg, 'user');
        const reply = await getAIResponse(msg);
        addMsg(reply, 'ai');
        speak(reply);
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    let x = 0, y = 0, sx, sy, isDrag = false;
    wrapper.ontouchstart = (e) => { sx = e.touches[0].clientX - x; sy = e.touches[0].clientY - y; isDrag = false; };
    wrapper.ontouchmove = (e) => {
        isDrag = true;
        x = e.touches[0].clientX - sx; y = e.touches[0].clientY - sy;
        wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if(!isDrag) {
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';
            if(!isVisible && content.innerHTML === "") {
                const welcome = "Em chào anh ạ! Chúc anh một ngày lái xe thật nhiều niềm vui nhé!";
                addMsg(welcome, 'ai'); speak(welcome);
            }
        }
    };

    sendBtn.onclick = handleSend;
    txtInput.onkeypress = (e) => e.key === 'Enter' && handleSend();

    mic.onclick = () => {
        const Rec = window.webkitSpeechRecognition || window.SpeechRecognition;
        if(!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => { mic.style.color = 'red'; };
        rec.onend = () => { mic.style.color = '#f06292'; };
        rec.onresult = (e) => { txtInput.value = e.results[0][0].transcript; handleSend(); };
        rec.start();
    };
})();
