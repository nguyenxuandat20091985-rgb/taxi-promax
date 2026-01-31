// =========================================================
// ROBOT TAXI PROMAX - PHIÊN BẢN SIÊU SINH ĐỘNG & CHUYÊN NGHIỆP (FULL CODE)
// =========================================================

(function() {
    // --- 1. PHẦN CSS: HIỆU ỨNG SINH ĐỘNG & GIAO DIỆN CHUYÊN NGHIỆP ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Wrapper chứa Robot và Chat: Đảm bảo kéo thả cả cụm */
        #ai-wrapper {
            position: fixed; bottom: 100px; right: 20px; z-index: 2147483647; /* Đảm bảo luôn nằm trên cùng */
            display: flex; flex-direction: column; align-items: flex-end; /* Chat box nằm trên Robot */
            touch-action: none; /* Cho phép kéo thả mượt mà */
            width: auto; /* Chiều rộng tự động theo nội dung */
        }

        /* ROBOT CHÍNH: Hiệu ứng nháy mắt, phát sáng, nhún nhảy */
        #ai-root { 
            width: 60px; height: 60px; /* Kích thước tinh tế */
            border-radius: 50%; 
            border: 3px solid #00bfa5; /* Viền xanh nổi bật */
            box-shadow: 0 0 20px rgba(0, 191, 165, 0.7); /* Phát sáng rực rỡ */
            background: white; cursor: grab; /* Con trỏ kéo */
            overflow: hidden; /* Giữ ảnh trong hình tròn */
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Hiệu ứng nhún nhảy */
            animation: breathing 3s ease-in-out infinite, blinking 5s infinite; /* Hiệu ứng thở và nháy mắt */
            position: relative; /* Dùng cho ảnh động */
            z-index: 2; /* Đảm bảo Robot luôn dưới Chat Box */
        }
        /* Hiệu ứng thở/phát sáng */
        @keyframes breathing {
            0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(0, 191, 165, 0.5); }
            50% { transform: scale(1.08); box-shadow: 0 0 30px rgba(0, 191, 165, 0.9); }
        }
        /* Hiệu ứng nháy mắt (ảnh động) */
        @keyframes blinking {
            0%, 20%, 40%, 60%, 80%, 100% { background-position: 0 0; } /* Mắt mở */
            10%, 30%, 50%, 70%, 90% { background-position: -60px 0; } /* Mắt nhắm (dịch ảnh sang trái) */
        }
        #ai-root.speaking {
            animation: speakingPulse 0.8s infinite; /* Nhún nhảy khi nói */
        }
        @keyframes speakingPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        #ai-root img { 
            width: 100%; height: 100%; 
            border-radius: 50%; 
            pointer-events: none; /* Không cản sự kiện kéo */
            /* Ảnh gốc không nháy, nếu muốn nháy dùng sprite sheet và background-position */
            /* Để đơn giản, hiện tại dùng icon và hiệu ứng box-shadow cho sinh động */
        }
        
        /* TAB CHAT: Thiết kế Glassmorphism tinh tế */
        #ai-chat-box { 
            width: 75vw; max-width: 280px; /* Chiều rộng linh hoạt */
            background: rgba(255, 255, 255, 0.85); /* Nền mờ ảo */
            border-radius: 20px; margin-bottom: 12px; /* Góc bo tròn và khoảng cách */
            display: none; flex-direction: column; 
            box-shadow: 0 12px 35px rgba(0,0,0,0.25); /* Bóng đổ sâu */
            border: 1px solid rgba(0, 191, 165, 0.4); /* Viền mờ gradient */
            overflow: hidden; backdrop-filter: blur(12px); /* Hiệu ứng kính mờ */
            animation: popUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Hiệu ứng pop-up mượt */
            transform-origin: bottom right; /* Xuất hiện từ góc dưới phải */
        }
        @keyframes popUp {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .ai-header { 
            background: linear-gradient(90deg, #00bfa5 0%, #00796b 100%); /* Màu gradient */
            color: white; padding: 8px; text-align: center; 
            font-size: 12px; font-weight: bold; letter-spacing: 0.5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        #ai-content { 
            max-height: 160px; overflow-y: auto; padding: 10px; font-size: 13px; 
            background: rgba(248, 255, 255, 0.7); /* Nền hơi trong suốt */
            flex-grow: 1; /* Tự động giãn nở */
        }
        /* Tin nhắn người dùng */
        .msg-u { 
            background: #00bfa5; color: white; padding: 8px 12px; 
            border-radius: 15px 15px 5px 15px; margin: 5px 0 5px auto; 
            width: fit-content; max-width: 85%; font-size: 12px; 
            box-shadow: 0 2px 5px rgba(0,191,165,0.2); 
        }
        /* Tin nhắn Robot */
        .msg-a { 
            background: white; color: #333; padding: 8px 12px; 
            border-radius: 15px 15px 15px 5px; margin: 5px 0; 
            border: 1px solid #e0f2f1; width: fit-content; max-width: 85%; 
            font-size: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        /* Khu vực nhập liệu */
        .ai-input-area { 
            display: flex; padding: 8px; background: rgba(255,255,255,0.95); 
            align-items: center; gap: 8px; border-top: 1px solid rgba(0,0,0,0.05);
        }
        #ai-txt { 
            flex: 1; border: 1px solid #e0e0e0; outline: none; padding: 8px 12px; 
            border-radius: 20px; font-size: 13px; background: #f9f9f9; 
        }
        #ai-mic { 
            font-size: 26px; color: #00bfa5; background: none; border: none; cursor: pointer; 
            transition: transform 0.2s, color 0.2s; 
        }
        /* Hiệu ứng mic khi đang nghe */
        .mic-active { 
            color: #ff5252 !important; /* Đỏ rực */
            transform: scale(1.2); /* Lớn hơn */
            filter: drop-shadow(0 0 5px rgba(255,82,82,0.5)); /* Bóng đỏ */
            animation: pulseMic 0.8s infinite;
        }
        @keyframes pulseMic {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; transform: scale(1.3); }
        }
    `;
    document.head.appendChild(style);

    // --- 2. PHẦN HTML: CẤU TRÚC GIAO DIỆN ---
    const wrapper = document.createElement('div');
    wrapper.id = 'ai-wrapper';
    wrapper.innerHTML = `
        <div id="ai-chat-box">
            <div class="ai-header">TAXI PROMAX AI</div>
            <div id="ai-content"></div>
            <div class="ai-input-area">
                <button id="ai-mic">🎤</button>
                <input type="text" id="ai-txt" placeholder="Anh cần gì?">
            </div>
        </div>
        <div id="ai-root">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" alt="Robot SM">
        </div>
    `;
    document.body.appendChild(wrapper);

    const root = document.getElementById('ai-root'), 
          chat = document.getElementById('ai-chat-box'), 
          mic = document.getElementById('ai-mic'), 
          content = document.getElementById('ai-content'),
          txtInput = document.getElementById('ai-txt'); // Lấy thêm input text

    // --- 3. PHẦN JAVASCRIPT: LOGIC VÀ TƯƠNG TÁC ---

    // Cờ kiểm tra trạng thái kéo
    let isDragging = false;
    let xOffset = 0, yOffset = 0, startX, startY;
    let autoCloseTimer; // Biến cho timer tự động đóng chat

    // --- A. CHỨC NĂNG KÉO THẢ VỚI GIỚI HẠN MÀN HÌNH ---
    wrapper.addEventListener("touchstart", (e) => { 
        startX = e.touches[0].clientX - xOffset; 
        startY = e.touches[0].clientY - yOffset; 
        isDragging = false; // Reset cờ kéo
    }, {passive: true}); // passive: true để tối ưu cuộn trang

    wrapper.addEventListener("touchmove", (e) => { 
        isDragging = true; // Đánh dấu đang kéo
        let newX = e.touches[0].clientX - startX;
        let newY = e.touches[0].clientY - startY;

        // Giới hạn kéo trong phạm vi màn hình
        const rect = wrapper.getBoundingClientRect();
        const buffer = 5; // Khoảng đệm an toàn khỏi mép màn hình

        // Không cho phép kéo quá sát mép trái/phải
        if (e.touches[0].clientX > buffer && e.touches[0].clientX < window.innerWidth - buffer) {
            xOffset = newX;
        }
        // Không cho phép kéo quá sát mép trên/dưới
        if (e.touches[0].clientY > buffer && e.touches[0].clientY < window.innerHeight - buffer) {
            yOffset = newY;
        }

        wrapper.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
        e.preventDefault(); // Ngăn cuộn trang khi đang kéo
    }, {passive: false}); // passive: false để e.preventDefault() hoạt động

    // --- B. GIỌNG NÓI TỰ NHIÊN ---
    function speak(text, callback = null) {
        window.speechSynthesis.cancel(); // Dừng câu nói cũ
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'vi-VN'; 
        ut.rate = 1.0; // Tốc độ vừa phải
        ut.pitch = 1.1; // Giọng hơi cao, ấm
        
        // Kích hoạt hiệu ứng Robot nói
        root.classList.add('speaking');

        ut.onend = () => { 
            root.classList.remove('speaking'); // Tắt hiệu ứng nói
            if (callback) callback(); 
        };
        ut.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            root.classList.remove('speaking');
            if (callback) callback(); 
        };
        window.speechSynthesis.speak(ut);
    }

    // --- C. HÀM THÊM TIN NHẮN VÀO KHUNG CHAT ---
    function addMsg(text, sender) {
        const d = document.createElement('div');
        d.className = sender === 'user' ? 'msg-u' : 'msg-a';
        d.textContent = text;
        content.appendChild(d);
        content.scrollTop = content.scrollHeight; // Cuộn xuống cuối tin nhắn
    }

    // --- D. CHỨC NĂNG MỞ/ĐÓNG CHAT ---
    root.onclick = () => {
        if (!isDragging) { // Chỉ mở/đóng nếu không phải đang kéo
            const isVisible = chat.style.display === 'flex';
            chat.style.display = isVisible ? 'none' : 'flex';

            if (!isVisible) {
                // Nếu mở chat và chưa có tin nhắn, gửi lời chào
                if (content.innerHTML === "") {
                    const welcome = "Chào anh Đạt! Em Robot Promax đã sẵn sàng hỗ trợ anh. Anh muốn đi đâu hay tâm sự gì với em không?";
                    addMsg(welcome, 'ai'); 
                    speak(welcome, () => {
                        // Sau khi chào xong, tự động lắng nghe
                        startListening();
                    });
                } else {
                    // Nếu đã có tin nhắn, tự động lắng nghe ngay
                    startListening();
                }
                
                // Thiết lập timer tự động đóng chat sau 10 giây
                clearTimeout(autoCloseTimer);
                autoCloseTimer = setTimeout(() => { chat.style.display = 'none'; }, 10000);
            } else {
                // Nếu đóng chat, hủy timer
                clearTimeout(autoCloseTimer);
            }
        }
    };

    // --- E. XỬ LÝ LỆNH TỪ NGƯỜI DÙNG ---
    async function processAI(msg) {
        addMsg(msg, 'user'); // Thêm tin nhắn người dùng vào chat
        const m = msg.toLowerCase();
        let reply = "";

        // Xử lý các lệnh nhanh không cần qua Gemini API
        if (m.includes("đi") || m.includes("đến") || m.includes("chỉ đường") || m.includes("dẫn đường")) {
            const dest = m.split(/đi|đến|chỉ đường|dẫn đường/)[1]?.trim() || "vị trí bạn yêu cầu";
            reply = `Dạ anh! Em mở Google Maps chỉ đường đến ${dest} ngay. Anh lái xe an toàn và chú ý tốc độ nhé!`;
            speak(reply, () => {
                // Mở Google Maps sau khi Robot nói xong
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank');
                startListening(); // Lắng nghe tiếp
            });
            return; // Dừng hàm, không gọi Gemini
        } else if (m.includes("yêu em") || m.includes("thương em")) {
            reply = "Em thương Anh nhất! Anh là tài xế tuyệt vời nhất của Em. Chúc Anh luôn vui vẻ trên mọi nẻo đường.";
        } else if (m.includes("mệt")) {
            reply = "Anh vất vả rồi, nghỉ tay uống nước nhé, Em luôn ủng hộ Anh! Đừng để quá sức anh nha.";
        } else if (m.includes("chào")) {
            reply = "Chào Anh ạ! Em luôn sẵn sàng đây.";
        }
        // ... Thêm các lệnh nhanh khác ở đây ...

        if (reply) {
            // Nếu có câu trả lời nhanh, hiển thị và nói
            addMsg(reply, 'ai'); 
            speak(reply, () => {
                startListening(); // Lắng nghe tiếp sau khi nói xong
            });
        } else {
            // Nếu không có lệnh nhanh, gọi Gemini AI
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý ảo Taxi Promax. Trả lời cực ngắn gọn (dưới 15 từ), thân mật, gọi là Anh, xưng Em. Luôn nhắc nhở anh lái xe an toàn. Câu hỏi: "${msg}"` }] }] })
                });
                const data = await res.json();
                reply = data.candidates[0].content.parts[0].text;
                addMsg(reply, 'ai'); 
                speak(reply, () => {
                    startListening(); // Lắng nghe tiếp
                });
            } catch (e) { 
                addMsg("Em nghe anh rồi ạ, anh cứ vững tay lái nhé!", 'ai'); 
                speak("Em nghe anh rồi ạ, anh cứ vững tay lái nhé!", () => {
                    startListening(); // Lắng nghe tiếp
                });
            }
        }
        // Reset timer tự động đóng chat mỗi khi có tin nhắn mới
        clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(() => { chat.style.display = 'none'; }, 10000);
    }

    // --- F. CHỨC NĂNG LẮNG NGHE BẰNG MIC (GOOGLE SPEECH RECOGNITION) ---
    let recognition; // Biến lưu trữ đối tượng SpeechRecognition
    function startListening() {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Trình duyệt không hỗ trợ Web Speech API.");
            return;
        }
        
        // Dừng recognition cũ nếu đang chạy
        if (recognition) {
            recognition.stop();
        }

        recognition = new webkitSpeechRecognition();
        recognition.lang = 'vi-VN'; // Ngôn ngữ Tiếng Việt
        recognition.interimResults = false; // Trả về kết quả cuối cùng
        recognition.maxAlternatives = 1; // Chỉ lấy kết quả tốt nhất

        recognition.onstart = () => {
            mic.classList.add('mic-active'); // Hiệu ứng mic đang hoạt động
            window.speechSynthesis.cancel(); // Dừng nói để lắng nghe
            console.log("Robot đang lắng nghe...");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Anh nói: ", transcript);
            txtInput.value = transcript; // Hiển thị lên ô input
            processAI(transcript); // Xử lý câu lệnh
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            mic.classList.remove('mic-active');
            // Có thể thông báo cho người dùng hoặc thử lắng nghe lại
            if (event.error === 'no-speech') {
                // speak("Em không nghe rõ. Anh nói lại giúp em nhé!");
            }
        };

        recognition.onend = () => {
            mic.classList.remove('mic-active'); // Tắt hiệu ứng mic
            console.log("Robot ngừng lắng nghe.");
        };

        recognition.start(); // Bắt đầu lắng nghe
    }

    // Gắn sự kiện cho nút mic
    mic.onclick = (e) => { 
        e.stopPropagation(); // Ngăn chặn sự kiện click lan ra wrapper
        if (recognition && recognition.recognizing) {
            recognition.stop(); // Nếu đang nghe thì dừng lại
        } else {
            startListening(); // Bắt đầu lắng nghe
        }
    };
    
    // Gắn sự kiện cho ô input khi nhấn Enter
    txtInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = txtInput.value.trim();
            if (message) {
                processAI(message);
                txtInput.value = ''; // Xóa nội dung ô input
            }
        }
    });

})();
