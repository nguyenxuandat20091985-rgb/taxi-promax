/**
 * TAXI PROMAX - AI CLIENT MODULE (SUPREME V32)
 * Phát triển bởi: Gemini & Anh Đạt
 * Chỉnh sửa: Tối ưu di chuyển đa nền tảng & Hiệu ứng chờ trả lời
 */

(function() {
    const aiWrap = document.getElementById('ai-wrapper');
    const aiRoot = document.getElementById('ai-root');
    const aiChat = document.getElementById('ai-chat-box');
    const aiContent = document.getElementById('ai-content');
    const aiInput = document.getElementById('ai-txt');
    const aiSend = document.getElementById('ai-send');

    // 1. Khởi tạo ảnh diện mạo
    function initAvatar() {
        const savedAva = localStorage.getItem('dat_admin_ava');
        if (savedAva) {
            aiRoot.style.backgroundImage = `url('${savedAva}')`;
        } else if (typeof AI_CONFIG !== 'undefined') {
            aiRoot.style.backgroundImage = `url('${AI_CONFIG.defaultAvatar}')`;
        }
        // Đảm bảo z-index luôn cao nhất để không bị các nút khác đè
        aiWrap.style.zIndex = "999999";
    }
    initAvatar();

    // 2. Logic Di Chuyển (Hỗ trợ cả Cảm ứng & Chuột)
    let isDragging = false, currentX = 0, currentY = 0, initialX, initialY, xOffset = 0, yOffset = 0;

    const dragStart = (e) => {
        initialX = (e.type === "touchstart" ? e.touches[0].clientX : e.clientX) - xOffset;
        initialY = (e.type === "touchstart" ? e.touches[0].clientY : e.clientY) - yOffset;
        isDragging = false;
    };

    const drag = (e) => {
        isDragging = true;
        const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
        
        currentX = clientX - initialX;
        currentY = clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        aiWrap.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        if (e.type === "touchmove") e.preventDefault();
    };

    const dragEnd = () => {
        initialX = currentX;
        initialY = currentY;
    };

    // Sự kiện cảm ứng
    aiWrap.addEventListener('touchstart', dragStart, { passive: true });
    aiWrap.addEventListener('touchend', dragEnd, { passive: true });
    aiWrap.addEventListener('touchmove', drag, { passive: false });
    // Sự kiện chuột (Để anh test trên PC mượt)
    aiWrap.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', (e) => { if(initialX !== undefined && xOffset !== currentX) drag(e); });
    document.addEventListener('mouseup', dragEnd);

    // 3. Hàm thêm tin nhắn (Có xử lý xuống dòng)
    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'user' ? 'msg-u' : 'msg-a';
        msgDiv.innerText = text; // Dùng innerText để an toàn bảo mật
        aiContent.appendChild(msgDiv);
        aiContent.scrollTop = aiContent.scrollHeight;
        return msgDiv;
    }

    // 4. Mở/Đóng Chat
    aiRoot.addEventListener('click', () => {
        if (!isDragging) {
            const isHidden = aiChat.style.display === 'none' || aiChat.style.display === '';
            aiChat.style.display = isHidden ? 'flex' : 'none';
            if (isHidden && aiContent.innerHTML === "") {
                addMessage(`Chào anh ${typeof AI_CONFIG !== 'undefined' ? AI_CONFIG.adminName : 'Đạt'}! Em nghe lệnh anh ạ. ✨`, 'ai');
            }
        }
    });

    // 5. Kết nối API Gemini (Có hiệu ứng chờ)
    async function callGemini(prompt) {
        const apiKey = (typeof AI_CONFIG !== 'undefined') ? AI_CONFIG.geminiKey : '';
        if (!apiKey) {
            addMessage("Chưa cấu hình Key AI anh ơi!", 'ai');
            return;
        }

        // Tạo tin nhắn chờ
        const loadingMsg = addMessage("Đang soạn tin...", 'ai');
        loadingMsg.style.opacity = "0.6";

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Trả lời anh Đạt: ${prompt}` }] }]
                })
            });
            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            
            // Xóa tin nhắn chờ và hiện tin nhắn thật
            loadingMsg.remove();
            addMessage(aiText, 'ai');
        } catch (error) {
            loadingMsg.innerText = "Lỗi rồi, anh kiểm tra Key hoặc mạng nhé!";
        }
    }

    aiSend.onclick = () => {
        const msg = aiInput.value.trim();
        if (msg) {
            addMessage(msg, 'user');
            aiInput.value = '';
            callGemini(msg);
        }
    };

    aiInput.onkeypress = (e) => { if (e.key === 'Enter') aiSend.click(); };

})();
