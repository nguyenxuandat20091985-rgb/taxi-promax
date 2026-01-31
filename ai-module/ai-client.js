// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN DI CHUYỂN SIÊU MƯỢT (V24)
// FIX LỖI KÉO THẢ - HÌNH ẢNH LUÔN SÁNG - NÃO GPT-4O
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
        
        #ai-wrapper { 
            position: fixed; bottom: 130px; right: 20px; z-index: 2147483647; 
            display: flex; flex-direction: column; align-items: flex-end; 
            touch-action: none; font-family: 'Quicksand', sans-serif; 
        }
        
        /* Icon Thư Ký Xinh Đẹp - Luôn sáng rạng rỡ */
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6vT4L9-S-8Iu_R_6-mF7iX7Y6lU8e0w_N_A&s') no-repeat center;
            background-size: cover; border: 3px solid #4CAF50;
            box-shadow: 0 5px 25px rgba(76, 175, 80, 0.7);
            cursor: pointer; position: relative;
            animation: floating 3s infinite ease-in-out;
        }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        /* Khung Chat */
        #ai-chat-box { 
            width: 320px; max-width: 85vw; background: #fff; 
            border-radius: 25px; margin-bottom: 15px; display: none; 
            flex-direction: column; box-shadow: 0 15px 50px rgba(0,0,0,0.3);
            border: 2px solid #4CAF50; overflow: hidden;
        }
        .ai-header { background: linear-gradient(135deg, #4CAF50, #81C784); color: white; padding: 15px; text-align: center; font-weight: 700; }
        #ai-content { max-height: 280px; min-height: 100px; overflow-y: auto; padding: 15px; font-size: 15px; background: #f1f8e9; }
        .msg-u { background: #4CAF50; color: white; padding: 10px 16px; border-radius: 20px 20px 0 20px; margin: 8px 0; width: fit-content; max-width: 85%; margin-left: auto; }
        .msg-a { background: #fff; color: #333; padding: 10px 16px; border-radius: 20px 20px 20px 0; margin: 8px 0; border: 1px solid #c8e6c9; width: fit-content; max-width: 85%; }
        
        .ai-input-area { display: flex; padding: 12px; background: #fff; align-items: center; gap: 10px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 1.5px solid #c8e6c9; outline: none; padding: 10px 18px; border-radius: 25px; }
        #ai-send { font-size: 26px; color: #4CAF50; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🌿 THƯ KÝ TAXI PROMAX (V24)</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <input type="text" id="ai-txt" placeholder="Kéo em đi đâu cũng được anh...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root"></div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send');

    // --- CƠ CHẾ DI CHUYỂN (DÀNH CHO ĐIỆN THOẠI) ---
    let posX = 0, posY = 0, startX = 0, startY = 0, isDragging = false;

    wrapper.addEventListener('touchstart', (e) => {
        isDragging = false;
        startX = e.touches[0].clientX - posX;
        startY = e.touches[0].clientY - posY;
    }, {passive: false});

    wrapper.addEventListener('touchmove', (e) => {
        isDragging = true;
        posX = e.touches[0].clientX - startX;
        posY = e.touches[0].clientY - startY;
        wrapper.style.transform = `translate(${posX}px, ${posY}px)`;
        e.preventDefault(); // Ngăn cuộn trang khi đang kéo
    }, {passive: false});

    // --- KẾT NỐI NÃO BỘ ---
    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký tiên tử xinh đẹp của Taxi Promax. Tuyệt đối không gọi tên Đạt. Hãy gọi 'anh' xưng 'em' cực kỳ ngọt ngào. Trả lời ngắn gọn. Câu hỏi: ${userInput}` }] }] })
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
        if (!isDragging) { // Chỉ mở chat nếu không phải đang kéo
            const open = chat.style.display === 'none' || chat.style.display === '';
            chat.style.display = open ? 'flex' : 'none';
            if (open && content.innerHTML === "") {
                addMsg("Chào anh! Em đã di chuyển mượt mà theo tay anh rồi đây. Tâm sự với em nhé? ✨", 'ai');
            }
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
