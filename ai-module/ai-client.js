// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN CÔ BÉ NGOAN NGOÃN (V14)
// TUYỆT ĐỐI KHÔNG DÙNG TÊN RIÊNG - CHỈ TAXI PROMAX
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;500;700&display=swap');
        
        #ai-wrapper { position: fixed; bottom: 125px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Lexend', sans-serif; }
        
        /* Icon Cô Bé Trợ Lý 3D Cực Xinh */
        #ai-root { 
            width: 75px; height: 75px; border-radius: 50%; 
            background: url('https://cdn-icons-png.flaticon.com/512/4140/4140047.png') no-repeat center;
            background-size: 90%; background-color: white;
            border: 3px solid #ff4081;
            box-shadow: 0 8px 25px rgba(255, 64, 129, 0.4);
            cursor: pointer; position: relative;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: floating 3s infinite ease-in-out;
        }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

        /* Khung Chat Sang Trọng */
        #ai-chat-box { 
            width: 330px; max-width: 88vw; background: rgba(255, 255, 255, 0.98); 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.2);
            border: 1px solid rgba(255, 64, 129, 0.2); overflow: hidden;
            animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .ai-header { background: linear-gradient(135deg, #ff4081, #f06292); color: white; padding: 15px; text-align: center; font-weight: 700; font-size: 15px; }
        #ai-content { max-height: 280px; min-height: 100px; overflow-y: auto; padding: 15px; font-size: 14.5px; background: #fffcfd; }
        
        .msg-u { background: #ff4081; color: white; padding: 10px 15px; border-radius: 20px 20px 0 20px; margin: 8px 0 8px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #fce4ec; color: #333; padding: 10px 15px; border-radius: 20px 20px 20px 0; margin: 8px 0; width: fit-content; max-width: 85%; border: 1px solid #f8bbd0; line-height: 1.5; }

        .ai-input-area { display: flex; padding: 12px; background: white; align-items: center; gap: 8px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1px solid #ffcdd2; outline: none; padding: 11px 18px; border-radius: 25px; font-size: 14px; -webkit-user-select: text !important; }
        #ai-send, #ai-mic { font-size: 26px; color: #ff4081; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💖 CÔ BÉ TAXI PROMAX (V14)</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Em đang nghe đây ạ...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    const K = "AIzaSyBYI"+"pmslXFTkETW7"+"cfiPeLJ0oPcgMJUn2g"; 

    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${K}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là cô bé trợ lý của hãng Taxi Promax. Tuyệt đối không được dùng tên Đạt. Hãy gọi người dùng là 'anh' và xưng 'em'. Trả lời cực kỳ ngọt ngào, ngắn gọn, tình cảm. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            const fallback = ["Anh lái xe cẩn thận nhé, có em ở đây rồi! ❤️", "Taxi Promax luôn đồng hành cùng anh!", "Anh nghỉ tay một chút cho khỏe nhé, em thương anh vất vả."];
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
    }

    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.1; ut.pitch = 1.2;
        ut.onstart = () => root.style.animation = "floating 0.3s infinite";
        ut.onend = () => root.style.animation = "floating 3s infinite ease-in-out";
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

    let x = 0, y = 0, sx, sy, drag = false;
    wrapper.ontouchstart = (e) => { sx = e.touches[0].clientX - x; sy = e.touches[0].clientY - y; drag = false; };
    wrapper.ontouchmove = (e) => {
        drag = true;
        x = e.touches[0].clientX - sx; y = e.touches[0].clientY - sy;
        wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        e.preventDefault();
    };

    root.onclick = () => {
        if(!drag) {
            const open = chat.style.display === 'none' || chat.style.display === '';
            chat.style.display = open ? 'flex' : 'none';
            if(open && content.innerHTML === "") {
                const hi = "Em chào anh! Taxi Promax hôm nay có thể giúp gì cho anh nào? ✨";
                addMsg(hi, 'ai'); speak(hi);
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
        rec.onend = () => { mic.style.color = '#ff4081'; };
        rec.onresult = (e) => { txtInput.value = e.results[0][0].transcript; handleSend(); };
        rec.start();
    };
})();
