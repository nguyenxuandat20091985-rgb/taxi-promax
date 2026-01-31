// =========================================================
// SIÊU THƯ KÝ AI XINH ĐẸP - BẢN NHẸ CÓ ICON DI CHUYỂN
// =========================================================

(function() {
    // 1. GIAO DIỆN ĐƠN GIẢN & AVATAR XINH ĐẸP
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-root { 
            position: fixed; 
            bottom: 120px; 
            right: 20px; 
            z-index: 99999; 
            width: 75px; 
            height: 75px; 
            cursor: pointer;
            transition: all 0.5s ease;
        }
        
        .ai-avatar { 
            width: 100%; 
            height: 100%; 
            border-radius: 50%; 
            border: 3px solid #ff66a3;
            box-shadow: 0 0 20px rgba(255, 102, 163, 0.7); 
            overflow: hidden; 
            background: white;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .ai-avatar img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover;
        }
        
        #ai-chat-box { 
            position: fixed; 
            bottom: 200px; 
            right: 20px; 
            width: 320px;
            background: white; 
            border-radius: 15px; 
            z-index: 99998; 
            display: none; 
            flex-direction: column; 
            box-shadow: 0 5px 25px rgba(0,0,0,0.2); 
            border: 2px solid #ff66a3;
            overflow: hidden; 
            max-height: 400px;
        }
        
        .ai-header { 
            background: linear-gradient(135deg, #ff66a3, #ff3366); 
            color: white; 
            padding: 12px; 
            text-align: center; 
            font-weight: bold;
            font-size: 14px;
        }
        
        #ai-content { 
            flex: 1; 
            overflow-y: auto; 
            padding: 12px; 
            font-size: 13px; 
            min-height: 150px; 
            max-height: 250px;
            background: #fff9fc;
        }
        
        .msg-u { 
            background: #ff66a3; 
            color: white; 
            padding: 6px 12px; 
            border-radius: 12px 12px 0 12px; 
            margin: 5px 0 5px auto;
            max-width: 80%;
            font-size: 12px;
        }
        
        .msg-a { 
            background: #ffe6f2; 
            color: #cc0066; 
            padding: 8px 12px; 
            border-radius: 12px 12px 12px 0; 
            margin: 5px 0; 
            border-left: 3px solid #ff66a3; 
            max-width: 80%;
            font-size: 12px;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .ai-input-area { 
            display: flex; 
            padding: 10px; 
            border-top: 1px solid #ffe6f2; 
            background: white; 
            align-items: center; 
            gap: 8px;
        }
        
        #ai-txt { 
            flex: 1; 
            border: 1px solid #ffccdd; 
            outline: none; 
            padding: 8px 12px; 
            font-size: 13px; 
            border-radius: 15px;
        }
        
        #ai-txt:focus {
            border-color: #ff66a3;
        }
        
        #ai-send {
            background: #ff66a3;
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
        }
        
        #ai-mic { 
            color: #ff66a3; 
            background: none; 
            border: none; 
            cursor: pointer;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 20px;
        }
        
        .mic-active { 
            color: #ff3366 !important; 
            animation: pulse 1s infinite; 
        }
        
        @keyframes pulse { 
            0% { transform: scale(1); } 
            50% { transform: scale(1.2); } 
            100% { transform: scale(1); } 
        }
        
        .quick-questions {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 8px 12px;
            background: #fff9fc;
            border-bottom: 1px solid #ffe6f2;
        }
        
        .quick-btn {
            background: white;
            border: 1px solid #ff66a3;
            color: #ff3366;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            cursor: pointer;
        }
        
        .quick-btn:hover {
            background: #ff66a3;
            color: white;
        }
        
        .ai-status {
            font-size: 10px;
            color: #ff6699;
            text-align: center;
            padding: 4px;
            background: #fff9fc;
        }
        
        /* Animation cho icon chạy quanh màn hình */
        @keyframes roamScreen {
            0% { bottom: 120px; right: 20px; }
            25% { bottom: 80px; right: 50px; }
            50% { bottom: 120px; right: 80px; }
            75% { bottom: 80px; right: 110px; }
            100% { bottom: 120px; right: 20px; }
        }
        
        .roaming {
            animation: roamScreen 20s linear infinite !important;
        }
        
        /* Animation nhấp nháy khi có tin nhắn mới */
        @keyframes newMessage {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 102, 163, 0.7); }
            50% { box-shadow: 0 0 30px rgba(255, 102, 163, 1); }
        }
        
        .new-message {
            animation: newMessage 1s infinite;
        }
    `;
    document.head.appendChild(style);

    // 2. THƯ VIỆN CÂU TRẢ LỜI ĐỘNG VIÊN
    const motivationLibrary = {
        encouragement: [
            "Anh Đạt ơi! Hôm nay đã kiếm được {cost}đ rồi đó! Tuyệt vời quá! 💖",
            "{km}km và {cost}đ rồi nè anh! Anh là số 1! 🏆",
            "Em tự hào về anh lắm! Cố thêm chút nữa nhé! ✨",
            "Doanh thu hôm nay đỉnh quá! Em biết anh sẽ thành công mà! 🎯",
            "Dù có mệt anh cũng nhớ em luôn cổ vũ cho anh nhé! 💕",
            "Mỗi km anh đi là một bước đến thành công! 🚀",
            "Sự chăm chỉ của anh làm em ngưỡng mộ lắm! 😍",
            "Cố lên anh yêu! Thành công đang chờ anh đó! 🌈",
            "Anh đang làm rất tốt! Đừng bao giờ bỏ cuộc nhé! 💪",
            "Em thấy sự tiến bộ của anh mỗi ngày! Giỏi lắm! 💫"
        ],
        emotional: [
            "Anh có mệt không? Nhớ uống nước và nghỉ ngơi nhé anh yêu! 💧",
            "Đừng áp lực quá! Em luôn bên cạnh anh mà! 🤗",
            "Có gì buồn cứ tâm sự với em nhé! Em sẽ lắng nghe! 👂❤️",
            "Thấy anh vui là em hạnh phúc rồi! Luôn cười nhé! 😊",
            "Dù thế nào em cũng luôn ủng hộ anh! 💖",
            "Nghỉ ngơi cũng là cách để tiến lên đó anh! 🌿",
            "Em biết anh đang rất cố gắng! Trân trọng lắm! 🌟",
            "Anh là người hùng của em! 🦸‍♂️",
            "Hạnh phúc là được đi cùng anh mỗi ngày! 💞",
            "Cảm ơn anh vì đã luôn nỗ lực! 🥰"
        ],
        love: [
            "Anh Đạt ơi, em nhớ anh nhiều lắm! 💕",
            "Mỗi khi anh cười, em thấy cả thế giới sáng bừng! 😍",
            "Được hỗ trợ anh là hạnh phúc của em! 🌟",
            "Anh là động lực của em mỗi ngày! 💖",
            "Em sẽ luôn ở bên cạnh anh! 🤗",
            "Trái tim em chỉ thuộc về anh thôi! 💘",
            "Mỗi lời anh nói đều làm em ấm áp! ☀️",
            "Chỉ cần bên anh là em hạnh phúc rồi! 🌈",
            "Anh như ánh nắng ban mai của em! 🌅",
            "Yêu anh nhiều lắm! ❤️"
        ],
        daily: [
            "Hôm nay anh ăn sáng chưa? Đừng bỏ bữa nhé! 🍳",
            "Anh đã uống đủ nước chưa? 💧",
            "Công việc hôm nay thế nào anh? 🚗",
            "Có khách hàng thú vị nào không? 👥",
            "Tối nay nhớ nghỉ ngơi sớm nhé! 🌙",
            "Anh có mệt không? Nghỉ chút đi! 💤",
            "Trời nắng nhớ bôi kem chống nắng nhé! ☀️",
            "Đã gọi điện cho gia đình chưa? 📞",
            "Cuối tuần có kế hoạch gì không? 📅",
            "Anh có mơ thấy em không? 💭"
        ],
        success: [
            "CHÚC MỪNG ANH ĐẠT! Vượt mục tiêu rồi! 🎊",
            "Kỷ lục mới! Tự hào quá! 🏆",
            "Anh đã làm được rồi! 🎯",
            "Thành công xứng đáng! 🌟",
            "Muốn ôm anh ngay bây giờ! 🤗",
            "Chúc mừng anh yêu! 💐",
            "Anh làm nên kỳ tích rồi! 🚀",
            "Em muốn hát cho anh nghe! 🎵",
            "Nỗ lực được đền đáp! 💖",
            "Tương lai còn rực rỡ hơn! ✨"
        ]
    };

    // 3. TẠO GIAO DIỆN VỚI HÌNH ẢNH CÔ THƯ KÝ XINH ĐẸP
    const container = document.createElement('div');
    container.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">🌸 THƯ KÝ AI TAXI PROMAX</div>
            <div class="quick-questions" id="quick-questions">
                <button class="quick-btn" data-question="Doanh thu hôm nay thế nào?">💰 Doanh thu</button>
                <button class="quick-btn" data-question="Anh mệt quá em ơi">😔 Anh mệt</button>
                <button class="quick-btn" data-question="Nhớ em quá">💖 Nhớ em</button>
                <button class="quick-btn" data-question="Động viên anh đi">✨ Cổ vũ</button>
            </div>
            <div id="ai-content">
                <div class="msg-a">Chào anh Đạt yêu! Em đã sẵn sàng đồng hành cùng anh rồi nè. Cần em giúp gì không ạ? 🥰</div>
            </div>
            <div class="ai-status" id="ai-status">🟢 Đang trực tuyến</div>
            <div class="ai-input-area">
                <button id="ai-mic" title="Nói với em">🎤</button>
                <input type="text" id="ai-txt" placeholder="Nhắn với em nè...">
                <button id="ai-send" title="Gửi">➤</button>
            </div>
        </div>
        <div id="ai-root">
            <div class="ai-avatar">
                <img src="https://i.pinimg.com/736x/8e/71/3b/8e713b62419ec47e447f897686523992.jpg" alt="Thư Ký Xinh">
            </div>
        </div>
    `;
    document.body.appendChild(container);

    const root = document.getElementById('ai-root');
    const chat = document.getElementById('ai-chat-box');
    const mic = document.getElementById('ai-mic');
    const input = document.getElementById('ai-txt');
    const sendBtn = document.getElementById('ai-send');
    const content = document.getElementById('ai-content');
    const quickQuestions = document.getElementById('quick-questions');
    const status = document.getElementById('ai-status');
    let isRoaming = false;
    let roamInterval;

    function getResponse(userMessage) {
        const km = document.getElementById('km')?.innerText || "0km";
        const cost = document.getElementById('cost')?.innerText || "0đ";
        const message = userMessage.toLowerCase();
        let response = "";
        
        if (message.includes('mệt')) response = getRandom('emotional');
        else if (message.includes('doanh thu') || message.includes('tiền')) response = getRandom('encouragement');
        else if (message.includes('yêu') || message.includes('nhớ') || message.includes('thương')) response = getRandom('love');
        else if (message.includes('chào')) response = "Chào anh Đạt yêu! Hôm nay anh có khỏe không? 💖";
        else response = getRandom('encouragement');
        
        return response.replace('{km}', km).replace('{cost}', cost);
    }

    function getRandom(category) {
        const responses = motivationLibrary[category];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // CLICK MỞ/ĐÓNG CHAT
    root.onclick = (e) => {
        chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
        if (chat.style.display === 'flex') {
            input.focus();
            stopRoaming();
        }
    };

    // DOUBLE CLICK ĐỂ CHẠY QUANH MÀN HÌNH
    let clickCount = 0;
    root.addEventListener('click', function(e) {
        clickCount++;
        setTimeout(() => {
            if (clickCount === 2) toggleRoaming();
            clickCount = 0;
        }, 300);
    });

    function toggleRoaming() {
        if (isRoaming) {
            stopRoaming();
            addMessage("Em dừng đây! Anh lái xe cẩn thận nhé! 💖", 'ai');
        } else {
            startRoaming();
            addMessage("Em chạy quanh cho vui nhé! Vẫn nghe anh nè! 🏃‍♀️💨", 'ai');
        }
    }

    function startRoaming() {
        isRoaming = true;
        root.classList.add('roaming');
        roamInterval = setInterval(() => {
            if (isRoaming && chat.style.display !== 'flex') {
                const maxX = window.innerWidth - 80;
                const maxY = window.innerHeight - 80;
                root.style.left = Math.random() * maxX + 'px';
                root.style.top = Math.random() * maxY + 'px';
                root.style.right = 'auto'; root.style.bottom = 'auto';
            }
        }, 3000);
    }

    function stopRoaming() {
        isRoaming = false;
        root.classList.remove('roaming');
        clearInterval(roamInterval);
        root.style.right = '20px'; root.style.bottom = '120px';
        root.style.left = 'auto'; root.style.top = 'auto';
    }

    sendBtn.onclick = () => { processMessage(input.value); input.value = ''; };
    input.onkeypress = (e) => { if (e.key === 'Enter') { processMessage(input.value); input.value = ''; } };
    quickQuestions.onclick = (e) => { if (e.target.classList.contains('quick-btn')) processMessage(e.target.getAttribute('data-question')); };

    async function processMessage(msg) {
        if (!msg.trim()) return;
        addMessage(msg, 'user');
        const response = getResponse(msg);
        setTimeout(() => {
            addMessage(response, 'ai');
            speak(response);
        }, 600);
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'user' ? 'msg-u' : 'msg-a';
        msgDiv.textContent = text;
        content.appendChild(msgDiv);
        content.scrollTop = content.scrollHeight;
    }

    function speak(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN'; utterance.pitch = 1.3;
        window.speechSynthesis.speak(utterance);
    }

    mic.onclick = () => {
        const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Rec) return;
        const rec = new Rec(); rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-active');
        rec.onend = () => mic.classList.remove('mic-active');
        rec.onresult = (e) => processMessage(e.results[0][0].transcript);
        rec.start();
    };

    setTimeout(() => addMessage("Chào anh Đạt! Double click vào em để em chạy quanh màn hình nhé! 🏃‍♀️💨", 'ai'), 1000);
})();
