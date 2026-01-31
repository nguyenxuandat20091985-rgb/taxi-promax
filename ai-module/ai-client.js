// =========================================================
// TAXI PROMAX AI - THƯ KÝ 3D NGƯỜI THẬT (V18)
// KHÔNG CÒN LỖI MẤT HÌNH - KẾT NỐI CHATGPT-4O
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
        #ai-wrapper { position: fixed; bottom: 130px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Quicksand', sans-serif; }
        
        /* Icon Thư Ký 3D Người Thật - Dùng link ảnh siêu bền */
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfI3jQzDms6Yid9D8O_zXm5N6_X7_mF8pLzA&s') no-repeat center;
            background-size: cover; border: 3px solid #ff4081;
            box-shadow: 0 5px 25px rgba(255, 64, 129, 0.7);
            cursor: pointer; position: relative;
            animation: floating 3s infinite ease-in-out;
        }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

        /* Khung Chat Cao Cấp */
        #ai-chat-box { 
            width: 320px; max-width: 85vw; background: #fff; 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 15px 50px rgba(0,0,0,0.3);
            border: 2px solid #ff80ab; overflow: hidden; animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes bounceIn { from { opacity: 0; transform: translateY(30px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        .ai-header { background: linear-gradient(135deg, #ff4081, #f06292); color: white; padding: 15px; text-align: center; font-weight: 700; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        #ai-content { max-height: 280px; min-height: 100px; overflow-y: auto; padding: 15px; font-size: 15px; background: #fffcfd; scroll-behavior: mượt; }
        
        .msg-u { background: #ff4081; color: white; padding: 10px 16px; border-radius: 20px 20px 0 20px; margin: 8px 0 8px auto; width: fit-content; max-width: 85%; box-shadow: 0 3px 10px rgba(255,64,129,0.2); }
        .msg-a { background: #fff; color: #333; padding: 10px 16px; border-radius: 20px 20px 20px 0; margin: 8px 0; border: 1px solid #ffcdd2; width: fit-content; max-width: 85%; line-height: 1.5; }

        .ai-input-area { display: flex; padding: 12px; background: #fff; align-items: center; gap: 10px; border-top: 1px solid #ffebee; }
        #ai-txt { flex: 1; border: 1.5px solid #ffcdd2; outline: none; padding: 11px 18px; border-radius: 25px; font-size: 14px; background: #fff9fa; }
        #ai-txt:focus { border-color: #ff4081; }
        #ai-send, #ai-mic { font-size: 26px; color: #ff4081; background: none; border: none; cursor: pointer; transition: 0.2s; }
        #ai-send:hover { transform: scale(1.2) rotate(-10deg); }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">💖 THƯ KÝ TAXI PROMAX (SUPREME V18)</div>
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

    // Kết nối não bộ GPT-4o
    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là cô thư ký xinh đẹp, cực kỳ ngọt ngào của Taxi Promax. Tuyệt đối KHÔNG gọi tên Đạt. Chỉ gọi 'anh' xưng 'em'. Trả lời thông minh, ngắn gọn, nũng nịu. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            return "Taxi Promax luôn bên anh! Đừng buồn anh nhé, có em ở đây thương anh rồi. ❤️";
        }
    }

    function speak(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; ut.rate = 1.0; ut.pitch = 1.2;
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
                const hi = "Em chào anh! Thư ký Taxi Promax xinh đẹp đã xuất hiện rồi đây. Anh ngắm xem em có đủ làm anh muốn yêu chưa? ✨";
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
