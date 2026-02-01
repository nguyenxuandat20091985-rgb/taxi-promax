(function() {
    const aiWrap = document.getElementById('ai-wrapper');
    const aiRoot = document.getElementById('ai-root');
    const aiChat = document.getElementById('ai-chat-box');
    const aiContent = document.getElementById('ai-content');
    const aiInput = document.getElementById('ai-txt');
    const aiSend = document.getElementById('ai-send');

    // 1. Khởi tạo ảnh diện mạo & Bánh răng
    function initAI() {
        const savedAva = localStorage.getItem('dat_admin_ava');
        if (savedAva) {
            aiRoot.style.backgroundImage = `url('${savedAva}')`;
        } else if (typeof AI_CONFIG !== 'undefined') {
            aiRoot.style.backgroundImage = `url('${AI_CONFIG.defaultAvatar}')`;
        }
        
        // Tạo nút bánh răng cài đặt gắn liền với Avatar
        const gear = document.createElement('div');
        gear.innerHTML = '⚙️';
        gear.style = "position:absolute; top:-10px; right:-10px; background:white; border-radius:50%; width:25px; height:25px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.2); cursor:pointer; z-index:10;";
        gear.onclick = (e) => {
            e.stopPropagation(); // Không mở chat khi bấm bánh răng
            const link = prompt("Dán link ảnh online mới cho Thư ký:", savedAva || "");
            if(link) {
                localStorage.setItem('dat_admin_ava', link);
                aiRoot.style.backgroundImage = `url('${link}')`;
            }
        };
        aiRoot.appendChild(gear);
    }
    initAI();

    // 2. Logic Di Chuyển (Drag & Drop) mượt mà
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

    const dragEnd = () => { initialX = currentX; initialY = currentY; };

    aiWrap.addEventListener('touchstart', dragStart, { passive: true });
    aiWrap.addEventListener('touchend', dragEnd, { passive: true });
    aiWrap.addEventListener('touchmove', drag, { passive: false });

    // 3. Mở/Đóng Chat (Chỉ khi không phải đang kéo)
    aiRoot.addEventListener('click', () => {
        if (!isDragging) {
            const isHidden = aiChat.style.display === 'none' || aiChat.style.display === '';
            aiChat.style.display = isHidden ? 'flex' : 'none';
        }
    });

    // 4. Gửi tin nhắn
    aiSend.onclick = async () => {
        const msg = aiInput.value.trim();
        if (!msg) return;
        
        // Thêm tin nhắn user
        const uMsg = document.createElement('div');
        uMsg.className = 'msg-u';
        uMsg.textContent = msg;
        aiContent.appendChild(uMsg);
        aiInput.value = '';
        aiContent.scrollTop = aiContent.scrollHeight;

        try {
            const res = await fetch(`${AI_CONFIG.apiEndpoint}?key=${AI_CONFIG.geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: msg }] }] })
            });
            const data = await res.json();
            const aMsg = document.createElement('div');
            aMsg.className = 'msg-a';
            aMsg.textContent = data.candidates[0].content.parts[0].text;
            aiContent.appendChild(aMsg);
            aiContent.scrollTop = aiContent.scrollHeight;
        } catch (e) { console.error("Lỗi AI"); }
    };
})();
