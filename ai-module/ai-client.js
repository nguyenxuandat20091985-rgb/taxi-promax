(function() {
    // 1. Khai báo các thành phần giao diện
    const aiWrap = document.getElementById('ai-wrapper');
    const aiRoot = document.getElementById('ai-root');
    const aiChat = document.getElementById('ai-chat-box');
    const aiContent = document.getElementById('ai-content');
    const aiInput = document.getElementById('ai-txt');
    const aiSend = document.getElementById('ai-send');

    // 2. Tạo Bánh Răng Cài Đặt (Gắn liền với Avatar)
    const gear = document.createElement('div');
    gear.innerHTML = '⚙️';
    gear.style = "position:absolute; top:-5px; right:-5px; background:#fff; border:1px solid #008080; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:16px; cursor:pointer; z-index:100; box-shadow:0 2px 8px rgba(0,0,0,0.2);";
    
    // Tạo ô input ẩn để chọn ảnh từ điện thoại
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    // Xử lý khi chọn ảnh từ điện thoại
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imgBase64 = event.target.result;
                localStorage.setItem('dat_admin_ava', imgBase64); // Lưu vào máy anh
                aiRoot.style.backgroundImage = `url('${imgBase64}')`;
                alert("Đã cập nhật ảnh Thư ký cho anh Đạt!");
            };
            reader.readAsDataURL(file);
        }
    };

    gear.onclick = (e) => {
        e.stopPropagation(); // Không cho mở chat khi bấm cài đặt
        fileInput.click(); // Mở thư viện ảnh điện thoại
    };
    aiRoot.appendChild(gear);
    aiRoot.appendChild(fileInput);

    // 3. Khởi tạo ảnh ban đầu
    const savedAva = localStorage.getItem('dat_admin_ava');
    if (savedAva) {
        aiRoot.style.backgroundImage = `url('${savedAva}')`;
    } else if (typeof AI_CONFIG !== 'undefined') {
        aiRoot.style.backgroundImage = `url('${AI_CONFIG.defaultAvatar}')`;
    }

    // 4. Logic Di Chuyển (Drag) mượt mà
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
        xOffset = currentX; yOffset = currentY;
        aiWrap.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        if (e.type === "touchmove") e.preventDefault();
    };

    const dragEnd = () => { initialX = currentX; initialY = currentY; };

    aiWrap.addEventListener('touchstart', dragStart, { passive: true });
    aiWrap.addEventListener('touchend', dragEnd, { passive: true });
    aiWrap.addEventListener('touchmove', drag, { passive: false });

    // 5. Mở/Đóng Bảng Chat khi bấm vào Thư ký
    aiRoot.onclick = () => {
        if (!isDragging) {
            const isHidden = aiChat.style.display === 'none' || aiChat.style.display === '';
            aiChat.style.display = isHidden ? 'flex' : 'none';
            if(isHidden && aiContent.innerHTML === "") {
                const msg = document.createElement('div');
                msg.className = 'msg-a';
                msg.textContent = `Chào anh Đạt! Em đã online.`;
                aiContent.appendChild(msg);
            }
        }
    };

    // 6. Gửi tin nhắn tới Gemini
    aiSend.onclick = async () => {
        const val = aiInput.value.trim();
        if (!val) return;
        
        const uMsg = document.createElement('div');
        uMsg.className = 'msg-u'; uMsg.textContent = val;
        aiContent.appendChild(uMsg);
        aiInput.value = '';
        aiContent.scrollTop = aiContent.scrollHeight;

        try {
            const res = await fetch(`${AI_CONFIG.apiEndpoint}?key=${AI_CONFIG.geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: val }] }] })
            });
            const data = await res.json();
            const aMsg = document.createElement('div');
            aMsg.className = 'msg-a';
            aMsg.textContent = data.candidates[0].content.parts[0].text;
            aiContent.appendChild(aMsg);
            aiContent.scrollTop = aiContent.scrollHeight;
        } catch { 
            const eMsg = document.createElement('div');
            eMsg.className = 'msg-a'; eMsg.textContent = "Em nghe đây anh!";
            aiContent.appendChild(eMsg);
        }
    };
})();
