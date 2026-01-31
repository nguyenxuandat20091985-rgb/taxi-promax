// =========================================================
// TAXI PROMAX AI - PHIÊN BẢN ADMIN CHỦ ĐỘNG (V26)
// TỰ CHỌN ẢNH TỪ ĐIỆN THOẠI - GIAO DIỆN SIÊU "CHUYẾN"
// =========================================================

(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap');
        
        #ai-wrapper { 
            position: fixed; bottom: 150px; right: 20px; z-index: 2147483647; 
            display: flex; flex-direction: column; align-items: flex-end; 
            touch-action: none; font-family: 'Lexend', sans-serif; 
        }
        
        /* Icon Trợ Lý - Viền LED chạy cực chuyến */
        #ai-root { 
            width: 95px; height: 95px; border-radius: 50%; 
            background: #222 url('https://i.ibb.co/0jXq0M3n/angel.jpg') no-repeat center;
            background-size: cover; border: 4px solid #00ff88;
            box-shadow: 0 0 20px #00ff88, inset 0 0 10px #00ff88;
            cursor: pointer; position: relative;
            animation: floating 3s infinite ease-in-out, neonPulse 2s infinite;
        }
        @keyframes neonPulse { 0%, 100% { border-color: #00ff88; box-shadow: 0 0 20px #00ff88; } 50% { border-color: #00dbff; box-shadow: 0 0 30px #00dbff; } }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

        /* Nút Admin thay ảnh (Ẩn) */
        #admin-upload { position: absolute; top: -10px; left: -10px; background: #333; color: #fff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1px solid #fff; z-index: 10; cursor: pointer; }

        /* Khung Chat "Chuyến" - Kính mờ hiện đại */
        #ai-chat-box { 
            width: 340px; max-width: 88vw; background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px); border-radius: 30px; margin-bottom: 20px; 
            display: none; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.4);
            border: 2px solid rgba(0, 255, 136, 0.3); overflow: hidden;
        }
        .ai-header { background: linear-gradient(90deg, #1a1a1a, #333); color: #00ff88; padding: 18px; text-align: center; font-weight: 700; border-bottom: 1px solid #444; letter-spacing: 1px; }
        #ai-content { max-height: 300px; min-height: 120px; overflow-y: auto; padding: 20px; font-size: 15px; background: rgba(255,255,255,0.5); }
        
        .msg-u { background: #1a1a1a; color: #00ff88; padding: 12px 18px; border-radius: 20px 20px 0 20px; margin: 10px 0 10px auto; width: fit-content; max-width: 85%; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); }
        .msg-a { background: #fff; color: #222; padding: 12px 18px; border-radius: 20px 20px 20px 0; margin: 10px 0; border: 1px solid #eee; width: fit-content; max-width: 85%; font-weight: 500; }

        .ai-input-area { display: flex; padding: 15px; background: #fff; align-items: center; gap: 12px; border-top: 1px solid #eee; }
        #ai-txt { flex: 1; border: 2px solid #eee; outline: none; padding: 12px 20px; border-radius: 30px; font-size: 14px; transition: 0.3s; }
        #ai-txt:focus { border-color: #00ff88; }
        #ai-send { font-size: 28px; color: #1a1a1a; background: none; border: none; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">TAXI PROMAX SUPREME AI</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <input type="text" id="ai-txt" placeholder="Lệnh cho em đi anh...">
                <button id="ai-send">🚀</button>
            </div>
        </div>
        <div id="ai-root">
            <div id="admin-upload">⚙️</div>
        </div>
        <input type="file" id="file-input" style="display:none" accept="image/*">
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send'), fileInput = document.getElementById('file-input'), adminBtn = document.getElementById('admin-upload');

    // --- CƠ CHẾ ADMIN TỰ THAY ẢNH ---
    const savedImg = localStorage.getItem('taxi_ai_img');
    if(savedImg) root.style.backgroundImage = `url(${savedImg})`;

    adminBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            root.style.backgroundImage = `url(${reader.result})`;
            localStorage.setItem('taxi_ai_img', reader.result);
            alert("Đã cập nhật diện mạo Thư ký cho anh!");
        };
        reader.readAsDataURL(file);
    };

    // --- DI CHUYỂN MƯỢT MÀ ---
    let curX = 0, curY = 0, startX = 0, startY = 0, drag = false;
    wrapper.ontouchstart = (e) => { drag = false; startX = e.touches[0].clientX - curX; startY = e.touches[0].clientY - curY; };
    wrapper.ontouchmove = (e) => { drag = true; curX = e.touches[0].clientX - startX; curY = e.touches[0].clientY - startY; wrapper.style.transform = `translate(${curX}px, ${curY}px)`; e.preventDefault(); };

    // --- NÃO BỘ GPT-4O ---
    async function getAIResponse(userInput) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký cấp cao của Taxi Promax. Không gọi tên Đạt. Gọi 'anh' xưng 'em'. Trả lời cực chuyến, thông minh, chuyên nghiệp nhưng vẫn ngọt ngào. Câu hỏi: ${userInput}` }] }] })
            });
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (e) { return "Lệnh của anh đã được ghi nhận! ❤️"; }
    }

    function addMsg(t, s) {
        const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t;
        content.appendChild(d); content.scrollTop = content.scrollHeight;
    }

    root.onclick = () => {
        if (!drag) {
            const open = chat.style.display === 'none' || chat.style.display === '';
            chat.style.display = open ? 'flex' : 'none';
            if (open && content.innerHTML === "") {
                addMsg("Thư ký Taxi Promax báo cáo! Diện mạo của em nằm trong tay anh, anh muốn em nhìn thế nào cũng được. Lệnh cho em đi!", 'ai');
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
