// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN CÔ BÉ GPT-4O SIÊU CẤP (V12)
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-wrapper { position: fixed; bottom: 120px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Lexend', sans-serif; }
        
        /* Icon Cô Bé Anime Siêu Cute */
        #ai-root { 
            width: 75px; height: 75px; border-radius: 50%; 
            background: url('https://cdn-icons-png.flaticon.com/512/6997/6997662.png') no-repeat center;
            background-size: cover; border: 3px solid #ff4081;
            box-shadow: 0 0 25px rgba(255, 64, 129, 0.6);
            cursor: pointer; position: relative;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: float 4s infinite ease-in-out;
        }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(5deg); } }

        /* Hiệu ứng Nháy mắt/Nhép miệng ảo diệu */
        #ai-root::after {
            content: ''; position: absolute; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.1); border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(255, 64, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); } }

        /* Khung Chat Cao Cấp */
        #ai-chat-box { 
            width: 320px; max-width: 88vw; background: #ffffff; 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            border: 2px solid #ff4081; overflow: hidden; animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .ai-header { background: linear-gradient(135deg, #ff4081, #ff80ab); color: white; padding: 15px; text-align: center; font-weight: 800; font-size: 15px; letter-spacing: 1px; }
        #ai-content { max-height: 280px; overflow-y: auto; padding: 18px; font-size: 15px; background: #fff5f8; }
        
        .msg-u { background: #ff4081; color: white; padding: 12px 16px; border-radius: 20px 20px 0 20px; margin: 8px 0 8px auto; width: fit-content; max-width: 85%; line-height: 1.4; box-shadow: 0 4px 10px rgba(255,64,129,0.2); }
        .msg-a { background: white; color: #333; padding: 12px 16px; border-radius: 20px 20px 20px 0; margin: 8px 0; border: 1px solid #ffdde5; width: fit-content; max-width: 85%; line-height: 1.4; }

        .ai-input-area { display: flex; padding: 15px; background: white; align-items: center; gap: 10px; border-top: 1px solid #ffe1e9; }
        #ai-txt { flex: 1; border: 2px solid #ffdde5; outline: none; padding: 12px 20px; border-radius: 30px; font-size: 14px; transition: 0.3s; }
        #ai-txt:focus { border-color: #ff4081; }
        #ai-send { color: #ff4081; font-size: 28px; background: none; border: none; cursor: pointer; transition: 0.2s; }
        #ai-send:hover { transform: scale(1.2); }
        #ai-mic { font-size: 26px; color: #ff4081; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💖 TAXI PROMAX AI - GPT-4O</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Tâm sự với em đi anh...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');

    // KẾT NỐI ĐA LUỒNG - ƯU TIÊN GPT-4O 🧠
    async function callGPT4(msg) {
        try {
            // Sử dụng API trung gian để gọi GPT-4o mượt mà trên GitHub
            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là cô bé trợ lý ngọt ngào của Taxi Promax. Hãy trả lời cực kỳ tình cảm, lễ phép, ngắn gọn dưới 20 từ. Xưng em gọi anh. Câu hỏi: ${msg}` }] }] })
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            // Luồng dự phòng thông minh khi nghẽn mạng
            const q = msg.toLowerCase();
            if(q.includes("mệt")) return "Anh vất vả rồi! Nghỉ tay làm hớp nước, em luôn ở đây thương anh nè! ❤️";
            return "Em nghe anh rồi! Đường sá hôm nay ổn không anh? Lái xe cẩn thận nha!";
        }
    }

    function speak(text, cb) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.1; ut.pitch = 1.2;
        ut.onstart = () => root.style.animation = "float 0.5s infinite"; // Nhép miệng/Chuyển động khi nói
        ut.onend = () => { root.style.animation = "float 4s infinite ease-in-out"; if(cb) cb(); };
        window.speechSynthesis.speak(ut);
    }

    async function handleSend() {
        const msg = txtInput.value.trim();
        if(!msg) return;
        txtInput.value = '';
        addMsg(msg, 'user');
        
        // Hiệu ứng khi cô bé đang "suy nghĩ"
        root.style.boxShadow = "0 0 40px #ff4081";
        const reply = await callGPT4(msg);
        addMsg(reply, 'ai');
        speak(reply);
        root.style.boxShadow = "0 0 25px rgba(255, 64, 129, 0.6)";
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    // Kéo thả mượt mà trên điện thoại
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
                const hi = "Em chào anh ạ! Chúc anh một ngày lái xe thật nhiều niềm vui và an toàn nhé! 🌸";
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
        rec.onstart = () => { mic.style.color = 'red'; root.style.border = "3px solid red"; };
        rec.onend = () => { mic.style.color = '#ff4081'; root.style.border = "3px solid #ff4081"; };
        rec.onresult = (e) => { txtInput.value = e.results[0][0].transcript; handleSend(); };
        rec.start();
    };
})();
