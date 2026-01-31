// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN THƯ KÝ XINH ĐẸP TUYỆT ĐỐI (V21)
// KHÔNG LỖI HÌNH - KHÔNG TÊN RIÊNG - NÃO CHATGPT-4O
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
        #ai-wrapper { position: fixed; bottom: 130px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; font-family: 'Quicksand', sans-serif; }
        
        /* Icon Thư Ký Xinh Đẹp - Đảm bảo hiện mặt */
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: url('https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ff4081&mouth=smile&eyes=happy') no-repeat center;
            background-size: cover; border: 3px solid #ff4081;
            box-shadow: 0 5px 25px rgba(255, 64, 129, 0.7);
            cursor: pointer; position: relative;
            animation: floating 3s infinite ease-in-out;
        }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

        #ai-chat-box { 
            width: 320px; max-width: 85vw; background: #fff; 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 15px 50px rgba(0,0,0,0.3);
            border: 2px solid #ff80ab; overflow: hidden; animation: bounce 0.4s;
        }
        @keyframes bounce { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        
        .ai-header { background: linear-gradient(135deg, #ff4081, #f06292); color: white; padding: 15px; text-align: center; font-weight: 700; font-size: 16px; }
        #ai-content { max-height: 280px; min-height: 100px; overflow-y: auto; padding: 15px; font-size: 15px; background: #fffcfd; }
        
        .msg-u { background: #ff4081; color: white; padding: 10px 16px; border-radius: 20px 20px 0 20px; margin: 8px 0; width: fit-content; max-width: 85%; margin-left: auto; }
        .msg-a { background: #fff; color: #333; padding: 10px 16px; border-radius: 20px 20px 20px 0; margin: 8px 0; border: 1px solid #ffcdd2; width: fit-content; max-width: 85%; }

        .ai-input-area { display: flex; padding: 12px; background: #fff; align-items: center; gap: 10px; border-top: 1px solid #ffebee; }
        #ai-txt { flex: 1; border: 1.5px solid #ffcdd2; outline: none; padding: 10px 18px; border-radius: 25px; font-size: 14px; }
        #ai-send, #ai-mic { font-size: 26px; color: #ff4081; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `<div id="ai-chat-box"><div class="ai-header">💖 THƯ KÝ TAXI PROMAX (V21)</div><div id="ai-content"></div><div class="ai-input-area"><button id="ai-mic">🎤</button><input type="text" id="ai-txt" placeholder="Nói với em đi anh..."><button id="ai-send">🚀</button></div></div><div id="ai-root"></div>`;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send');

    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là cô thư ký xinh đẹp của Taxi Promax. KHÔNG ĐƯỢC gọi tên Đạt. Hãy gọi 'anh' và xưng 'em' cực kỳ ngọt ngào. Trả lời ngắn gọn. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) { return "Em luôn ở bên anh! ❤️"; }
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    root.onclick = () => {
        const open = chat.style.display === 'none' || chat.style.display === '';
        chat.style.display = open ? 'flex' : 'none';
        if(open && content.innerHTML === "") {
            addMsg("Chào anh! Em là thư ký xinh đẹp của anh đây. Hôm nay anh muốn em làm gì nào? ✨", 'ai');
        }
    };

    sendBtn.onclick = async () => {
        const msg = txtInput.value.trim();
        if(!msg) return;
        txtInput.value = '';
        addMsg(msg, 'user');
        const reply = await getAIResponse(msg);
        addMsg(reply, 'ai');
    };
})();
