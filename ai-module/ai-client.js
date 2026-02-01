<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>TAXI PROMAX - ADMIN SUPREME V26</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap');
        :root { --primary: #00bfa5; --dark: #002d26; --gold: #ffc107; --danger: #ff5252; --bg: #f8faf9; --glass: rgba(255, 255, 255, 0.95); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Lexend', sans-serif; overflow: hidden; background: var(--bg); position: fixed; width: 100%; }
        #map { height: 100vh; width: 100vw; z-index: 1; filter: contrast(1.05) saturate(1.1); } 

        /* TAI THỎ & STATS */
        .header { position: fixed; top: env(safe-area-inset-top, 10px); left: 10px; right: 10px; display: flex; justify-content: space-between; z-index: 1000; pointer-events: none; }
        .badge { pointer-events: auto; background: var(--glass); padding: 8px 15px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-size: 11px; font-weight: 800; color: var(--dark); border: 1px solid white; } 
        .stats-bar { position: fixed; top: calc(env(safe-area-inset-top, 10px) + 45px); left: 10px; right: 10px; background: var(--glass); border-radius: 15px; display: flex; padding: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); z-index: 1000; border: 1px solid white; }
        .stat-item { flex: 1; text-align: center; }
        .stat-value { font-size: 22px; font-weight: 900; color: var(--dark); }

        /* FOOTER */
        .footer-panel { position: fixed; bottom: 0; left: 0; right: 0; background: white; z-index: 2000; border-radius: 25px 25px 0 0; box-shadow: 0 -10px 30px rgba(0,0,0,0.08); padding: 15px 15px calc(env(safe-area-inset-bottom, 5px) + 5px); }
        .btn-main { width: 100%; padding: 15px; border-radius: 15px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: 900; box-shadow: 0 4px 15px rgba(0,191,165,0.3); width: 100%; }
        .nav-grid { display: flex; justify-content: space-around; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; }
        .nav-item { border: none; background: none; color: #bdc3c7; font-size: 10px; font-weight: 700; flex: 1; text-align: center; }
        .nav-item.active { color: var(--primary); }

        /* AI V26 SUPREME */
        #ai-wrapper { position: fixed; bottom: 125px; right: 15px; z-index: 999999; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; }
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: #222 url('https://i.ibb.co/0jXq0M3n/angel.jpg') no-repeat center;
            background-size: cover; border: 4px solid #00ff88;
            box-shadow: 0 0 15px #00ff88; cursor: pointer; position: relative;
            animation: floating 3s infinite ease-in-out, neonPulse 2s infinite;
        }
        @keyframes neonPulse { 0%, 100% { border-color: #00ff88; box-shadow: 0 0 15px #00ff88; } 50% { border-color: #00dbff; box-shadow: 0 0 25px #00dbff; } }
        @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        
        #admin-upload { position: absolute; top: -5px; left: -5px; background: #1a1a1a; color: #00ff88; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1px solid #00ff88; z-index: 10; cursor: pointer; }
        
        #ai-chat-box { width: 320px; max-width: 85vw; background: white; border-radius: 25px; margin-bottom: 12px; display: none; flex-direction: column; border: 2px solid #00ff88; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.3); }
        .ai-header { background: #1a1a1a; color: #00ff88; padding: 15px; text-align: center; font-weight: 700; border-bottom: 1px solid #333; }
        #ai-content { max-height: 250px; min-height: 100px; overflow-y: auto; padding: 15px; background: #f9f9f9; }
        .msg-u { background: #1a1a1a; color: #00ff88; padding: 8px 12px; border-radius: 12px 12px 0 12px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; font-size: 13px; }
        .msg-a { background: #fff; color: #222; padding: 8px 12px; border-radius: 12px 12px 12px 0; margin: 5px 0; width: fit-content; max-width: 85%; font-size: 13px; border: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="header">
        <div class="badge">🆔 ADMIN: ĐẠT</div>
        <div class="badge" style="color:var(--gold)">⭐ PLATINUM V26</div>
    </div>
    
    <div class="stats-bar">
        <div class="stat-item" style="border-right: 1px solid #eee;"><div>CƯỚC</div><div id="cost" class="stat-value">0</div></div>
        <div class="stat-item"><div>KM</div><div id="km" class="stat-value">0.00</div></div>
    </div>

    <div id="map"></div>

    <div id="ai-wrapper">
        <div id="ai-chat-box">
            <div class="ai-header">TAXI PROMAX SUPREME AI</div>
            <div id="ai-content"></div>
            <div style="display:flex; padding:10px; border-top:1px solid #eee; gap:5px; background: #fff;">
                <input type="text" id="ai-txt" style="flex:1; border:1px solid #ddd; border-radius:20px; padding:8px 15px;" placeholder="Lệnh cho em đi anh...">
                <button id="ai-send" style="background:none; border:none; font-size:22px;">🚀</button>
            </div>
        </div>
        <div id="ai-root"><div id="admin-upload" title="Đồng bộ ảnh">⚙️</div></div>
    </div>

    <div class="footer-panel">
        <button class="btn-main">BẮT ĐẦU CHUYẾN ĐI</button>
        <div class="nav-grid">
            <button class="nav-item active" onclick="location.reload()">🏠 Chủ</button>
            <button class="nav-item" onclick="alert('Ví Tiền')">💰 Ví</button>
            <button class="nav-item" onclick="alert('Cài đặt Admin')">👤 Tôi</button>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // --- 1. KHỞI TẠO BẢN ĐỒ ---
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.0285, 105.8542], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // --- 2. HỆ THỐNG ĐỒNG BỘ ẢNH VÀ AI ---
        (function(){
            // --- CẤU HÌNH ĐỒNG BỘ CHO ANH ĐẠT ---
            const HỆ_THỐNG_ẢNH_ĐỒNG_BỘ = 'https://i.ibb.co/0jXq0M3n/angel.jpg'; // Dán link ảnh online vào đây

            const root = document.getElementById('ai-root'), chat = document.getElementById('ai-chat-box'), 
                  content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), 
                  sendBtn = document.getElementById('ai-send'), adminBtn = document.getElementById('admin-upload'), 
                  wrapper = document.getElementById('ai-wrapper');

            // Load ảnh từ bộ nhớ hoặc link đồng bộ
            const savedImg = localStorage.getItem('taxi_ai_img') || HỆ_THỐNG_ẢNH_ĐỒNG_BỘ;
            root.style.backgroundImage = `url('${savedImg}')`;

            // Admin thay ảnh bằng LINK ONLINE để đồng bộ với khách
            adminBtn.onclick = (e) => { 
                e.stopPropagation(); 
                const link = prompt("Anh Đạt dán link ảnh Thư ký mới vào đây (Imgur, FB...):", savedImg);
                if(link) {
                    localStorage.setItem('taxi_ai_img', link);
                    root.style.backgroundImage = `url('${link}')`;
                    alert("Đã cập nhật! Anh nhớ dán link này vào code bản Khách hàng nhé.");
                }
            };

            // Logic Di chuyển (Drag)
            let curX = 0, curY = 0, startX = 0, startY = 0, drag = false;
            wrapper.ontouchstart = (e) => { drag = false; startX = e.touches[0].clientX - curX; startY = e.touches[0].clientY - curY; };
            wrapper.ontouchmove = (e) => { drag = true; curX = e.touches[0].clientX - startX; curY = e.touches[0].clientY - startY; wrapper.style.transform = `translate(${curX}px, ${curY}px)`; e.preventDefault(); };

            function addMsg(t, s) { 
                const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; 
                d.textContent = t; content.appendChild(d); content.scrollTop = 9999; 
            }

            root.onclick = () => { 
                if(!drag) {
                    const isOpening = chat.style.display !== 'flex';
                    chat.style.display = isOpening ? 'flex' : 'none';
                    if(isOpening && content.innerHTML === "") addMsg("Thư ký Taxi Promax nghe lệnh anh Đạt! Diện mạo của em hôm nay anh thấy thế nào?", "ai");
                }
            };

            sendBtn.onclick = async () => {
                const m = txtInput.value.trim(); if(!m) return;
                txtInput.value = ''; addMsg(m, 'user');
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký Taxi Promax. Gọi anh xưng em. Trả lời cực chuyến, ngọt ngào cho anh Đạt: ${m}` }] }] })
                    });
                    const data = await res.json();
                    addMsg(data.candidates[0].content.parts[0].text, 'ai');
                } catch { addMsg("Lệnh của anh em đã rõ!", "ai"); }
            };
            txtInput.onkeypress = (e) => { if(e.key === 'Enter') sendBtn.click(); };
        })();
    </script>
</body>
</html>
