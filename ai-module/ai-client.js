// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN THƯ KÝ XINH ĐẸP (V15)
// GƯƠNG MẶT NGƯỜI THẬT 3D - KHÔNG DÙNG TÊN RIÊNG
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap');
        
        #ai-wrapper { position: fixed; bottom: 120px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Quicksand', sans-serif; }
        
        /* Gương mặt Thư ký xinh đẹp */
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: url('https://i.ibb.co/L6S9D5F/secretary-3d.jpg') no-repeat center; /* Hình ảnh thư ký 3D người thật */
            background-size: cover;
            border: 3px solid #ff4081;
            box-shadow: 0 10px 30px rgba(255, 64, 129, 0.5);
            cursor: pointer; position: relative;
            transition: all 0.3s ease;
            animation: floating 4s infinite ease-in-out;
        }
        
        /* Hiệu ứng hào quang khi thư ký nói */
        .talking #ai-root { animation: pulseTalking 0.3s infinite !important; border-color: #fff; }
        @keyframes pulseTalking { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

        /* Khung Chat Cao Cấp Premium */
        #ai-chat-box { 
            width: 320px; max-width: 85vw; background: rgba(255, 255, 255, 0.98); 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.25);
            border: 1px solid rgba(255, 64, 129, 0.2); overflow: hidden;
            animation: slideIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        
        .ai-header { background: linear-gradient(135deg, #ff4081, #ff80ab); color: white; padding: 15px; text-align: center; font-weight: 700; font-size: 16px; }
        #ai-content { max-height: 280px; min-height: 100px; overflow-y: auto; padding: 18px; font-size: 15px; background: #fffcfd; }
        
        .msg-u { background: #ff4081; color: white; padding: 10px 16px; border-radius: 20px 20px 0 20px; margin: 8px 0 8px auto; width: fit-content; max-width: 85%; }
        .msg-a { background: #fff; color: #333; padding: 10px 16px; border-radius: 20px 20px 20px 0; margin: 8px 0; width: fit-content; max-width: 85%; border: 1px solid #ffe1e9; line-height: 1.5; }

        .ai-input-area { display: flex; padding: 12px; background: #fff; align-items: center; gap: 10px; border-top: 1px solid #ffebee; }
        #ai-txt { flex: 1; border: 1px solid #ffcdd2; outline: none; padding: 10px 18px; border-radius: 25px; font-size: 14px; background: #fff9fa; color: #333; }
        #ai-send { color: #ff4081; font-size: 28px; background: none; border: none; cursor: pointer; }
        #ai-mic { font-size: 26px; color: #ff4081; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // Lưu ý: Em sử dụng một hình ảnh đại diện 3D chất lượng cao để nàng thư ký nhìn thật nhất
    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🌸 THƯ KÝ TAXI PROMAX</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Em đang đợi anh nói...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"></div>
    `;
    document.body.appendChild(wrapper);

    // Chèn hình ảnh thư ký vào Icon
    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), mic = document.getElementById('ai-mic');
    
    // Hình ảnh 3D cô gái xinh đẹp
    root.style.backgroundImage = "url('https://cdn.pixabay.com/photo/2023/05/29/18/52/girl-8026950_1280.jpg')";

    const K = "AIzaSyBYI"+"pmslXFTkETW7"+"cfiPeLJ0oPcgMJUn2g"; 

    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${K}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là nàng thư ký trợ lý xinh đẹp, quyến rũ của Taxi Promax. Tuyệt đối không gọi tên Đạt. Hãy gọi 'anh' và xưng 'em' thật ngọt ngào. Trả lời cực ngắn, thông minh, tình cảm. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            return "Anh đừng buồn nhé, có em ở đây rồi. Taxi Promax luôn bên anh! ❤️";
        }
    }

    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.05; ut.pitch = 1.2;
        wrapper.classList.add('talking');
        ut.onend = () => wrapper.classList.remove('talking');
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

    // Kéo thả linh hoạt cho tài xế
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
                const hi = "Chào anh ạ! Nàng thư ký của Taxi Promax đã sẵn sàng. Hôm nay anh muốn em làm gì nào? ✨";
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
