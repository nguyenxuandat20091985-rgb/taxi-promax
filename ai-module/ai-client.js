/**
 * HỆ THỐNG AI ĐỘC LẬP - KHÔNG XÂM LẤN GIAO DIỆN index.html
 * PHÁT TRIỂN RIÊNG CHO ANH NGUYỄN XUÂN ĐẠT
 */

(function() {
    // 1. TỰ TẠO LỚP GIAO DIỆN RIÊNG (Không động vào CSS gốc)
    const aiStyle = document.createElement('style');
    aiStyle.innerHTML = `
        #robot-floating-btn {
            position: fixed; bottom: 180px; right: 15px; width: 50px; height: 50px;
            background: #00bfa5; border-radius: 50%; z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; border: 2px solid white;
        }
        #robot-chat-box {
            position: fixed; bottom: 240px; right: 15px; left: 15px;
            background: white; border-radius: 15px; border: 2px solid #00bfa5;
            z-index: 9998; display: none; flex-direction: column;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;
        }
        .robot-header { background: #00bfa5; color: white; padding: 10px; font-weight: bold; text-align: center; font-size: 13px; }
        #robot-content { height: 120px; overflow-y: auto; padding: 10px; font-size: 13px; color: #333; }
        .robot-input-area { display: flex; border-top: 1px solid #eee; padding: 5px; background: #fafafa; }
        #robot-mic-btn { background: none; border: none; font-size: 20px; color: #00bfa5; padding: 0 10px; }
        .mic-talking { color: red !important; animation: blink 1s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(aiStyle);

    // 2. TỰ CHÈN NÚT ROBOT VÀO MÀN HÌNH
    const aiContainer = document.createElement('div');
    aiContainer.innerHTML = `
        <div id="robot-chat-box">
            <div class="robot-header">TRỢ LÝ AI TAXI PROMAX</div>
            <div id="robot-content">Dạ, em nghe đây anh Đạt!</div>
            <div class="robot-input-area">
                <button id="robot-mic-btn">🎤</button>
                <input type="text" id="robot-txt" placeholder="Nói hoặc hỏi gì đó..." style="flex:1; border:none; outline:none; background:none; font-size:12px;">
            </div>
        </div>
        <div id="robot-floating-btn">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" style="width:35px; height:35px;">
        </div>
    `;
    document.body.appendChild(aiContainer);

    // 3. LOGIC ĐIỀU KHIỂN ĐỘC LẬP
    const btn = document.getElementById('robot-floating-btn');
    const box = document.getElementById('robot-chat-box');
    const mic = document.getElementById('robot-mic-btn');
    const input = document.getElementById('robot-txt');
    const content = document.getElementById('robot-content');

    // Bấm robot để ẩn/hiện chat
    btn.onclick = () => { box.style.display = box.style.display === 'flex' ? 'none' : 'flex'; };

    // Xử lý giọng nói
    mic.onclick = () => {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech) return alert("Trình duyệt này không hỗ trợ Micro");
        const rec = new Speech();
        rec.lang = 'vi-VN';
        rec.onstart = () => mic.classList.add('mic-talking');
        rec.onend = () => mic.classList.remove('mic-talking');
        rec.onresult = (e) => {
            const voiceMsg = e.results[0][0].transcript;
            input.value = voiceMsg;
            callGemini(voiceMsg);
        };
        rec.start();
    };

    async function callGemini(msg) {
        content.innerHTML += `<div style="text-align:right; color:#888;">Anh Đạt: ${msg}</div>`;
        const km = document.getElementById('km')?.innerText || "0";
        const cost = document.getElementById('cost')?.innerText || "0";

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý AI taxi. Xe đi ${km}km, ${cost}đ. Trả lời cực ngắn gọn câu: ${msg}` }] }] })
            });
            const data = await response.json();
            const reply = data.candidates[0].content.parts[0].text;
            
            content.innerHTML += `<div style="color:#00bfa5;"><b>AI:</b> ${reply}</div>`;
            content.scrollTop = content.scrollHeight;

            // Đọc kết quả ra loa
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(reply);
            utter.lang = 'vi-VN';
            synth.speak(utter);
        } catch (e) {
            content.innerHTML += `<div>AI: Em vẫn đang nghe đây ạ!</div>`;
        }
    }
})();
