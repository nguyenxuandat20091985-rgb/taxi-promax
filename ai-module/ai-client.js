<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>TAXI PROMAX - ADMIN PLATINUM V28</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap');
        :root { --primary: #00bfa5; --dark: #1a1a1a; --gold: #ffc107; --bg: #f4f7f6; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Lexend', sans-serif; overflow: hidden; background: var(--bg); }

        #map { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }

        /* HEADER & STATS */
        .admin-overlay { position: relative; z-index: 10; pointer-events: none; height: 100vh; width: 100%; }
        .header-top { position: absolute; top: 15px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: auto; }
        .badge { background: rgba(255,255,255,0.95); padding: 10px 15px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 11px; font-weight: 700; border: 1px solid #ddd; }
        .stats-panel { position: absolute; top: 70px; left: 10px; right: 10px; background: white; border-radius: 15px; display: flex; padding: 15px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); pointer-events: auto; }
        .stat-box { flex: 1; text-align: center; border-right: 1px solid #eee; }
        .stat-box:last-child { border-right: none; }
        .stat-label { font-size: 10px; color: #888; margin-bottom: 5px; }
        .stat-number { font-size: 20px; font-weight: 900; color: var(--dark); }

        /* AI ASSISTANT - SẠCH SẼ 100% */
        #ai-container { 
            position: fixed; bottom: 160px; right: 20px; z-index: 99999; 
            display: flex; flex-direction: column; align-items: flex-end; touch-action: none;
        }
        #ai-avatar { 
            width: 85px; height: 85px; border-radius: 50%; border: 4px solid #00ff88;
            background: #222 url('https://api.dicebear.com/7.x/bottts/svg?seed=Đạt') no-repeat center;
            background-size: cover; box-shadow: 0 0 25px rgba(0,255,136,0.6); cursor: grab;
            transition: transform 0.2s;
        }

        /* KHUNG CHAT */
        #chat-window { 
            width: 300px; background: white; border-radius: 20px; margin-bottom: 15px;
            display: none; flex-direction: column; border: 2px solid #00ff88; overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); pointer-events: auto;
        }
        .chat-header { background: #1a1a1a; color: #00ff88; padding: 12px; font-weight: 700; text-align: center; }
        #chat-logs { height: 200px; overflow-y: auto; padding: 15px; background: #f9f9f9; font-size: 13px; }
        .msg { margin-bottom: 8px; padding: 8px 12px; border-radius: 12px; max-width: 85%; }
        .msg-user { background: #1a1a1a; color: #00ff88; margin-left: auto; border-radius: 12px 12px 0 12px; }
        .msg-ai { background: #eee; color: #222; margin-right: auto; border-radius: 12px 12px 12px 0; }

        /* FOOTER & NÚT CÀI ĐẶT RỜI */
        .footer-menu { position: absolute; bottom: 0; left: 0; right: 0; background: white; padding: 15px 15px 30px; border-radius: 25px 25px 0 0; z-index: 20; pointer-events: auto; box-shadow: 0 -5px 20px rgba(0,0,0,0.1); }
        .btn-start { width: 100%; padding: 16px; border-radius: 16px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: 800; box-shadow: 0 4px 15px rgba(0,191,165,0.3); margin-bottom: 15px; }
        .nav-bar { display: flex; justify-content: space-around; align-items: center; }
        .nav-btn { border: none; background: none; color: #bbb; font-size: 10px; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
        .nav-btn.active { color: var(--primary); }
        .nav-icon { font-size: 20px; }
    </style>
</head>
<body>

    <div id="map"></div>

    <div class="admin-overlay">
        <div class="header-top">
            <div class="badge">🆔 ADMIN: ĐẠT</div>
            <div class="badge" style="color:var(--gold)">⭐ PLATINUM V28</div>
        </div>

        <div class="stats-panel">
            <div class="stat-box">
                <div class="stat-label">CƯỚC (VNĐ)</div>
                <div id="cost" class="stat-number">0</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">QUÃNG ĐƯỜNG</div>
                <div id="km" class="stat-number">0.00 KM</div>
            </div>
        </div>

        <div class="footer-menu">
            <button class="btn-start">BẮT ĐẦU CHUYẾN ĐI</button>
            <div class="nav-bar">
                <button class="nav-btn active">
                    <span class="nav-icon">🏠</span><span>CHỦ</span>
                </button>
                <button class="nav-btn" id="btn-set-wallpaper">
                    <span class="nav-icon">🖼️</span><span>HÌNH NỀN</span>
                </button>
                <button class="nav-btn">
                    <span class="nav-icon">👤</span><span>TÔI</span>
                </button>
            </div>
        </div>
    </div>

    <div id="ai-container">
        <div id="chat-window">
            <div class="chat-header">TRỢ LÝ TAXI PROMAX AI</div>
            <div id="chat-logs"></div>
            <div style="display:flex; padding:10px; border-top:1px solid #eee; background: white;">
                <input type="text" id="chat-input" style="flex:1; border:1px solid #ddd; border-radius:20px; padding:8px 12px;" placeholder="Lệnh cho em đi anh Đạt...">
                <button id="chat-send" style="background:none; border:none; font-size:20px;">🚀</button>
            </div>
        </div>
        <div id="ai-avatar" title="Kéo em đi đâu cũng được"></div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // --- KHỞI TẠO BẢN ĐỒ ---
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.0285, 105.8542], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // --- HỆ THỐNG AI & DI CHUYỂN ---
        (function(){
            const container = document.getElementById('ai-container'),
                  avatar = document.getElementById('ai-avatar'),
                  windowChat = document.getElementById('chat-window'),
                  logs = document.getElementById('chat-logs'),
                  input = document.getElementById('chat-input'),
                  send = document.getElementById('chat-send'),
                  btnSetWall = document.getElementById('btn-set-wallpaper');

            // 1. TÁCH BIỆT CÀI ĐẶT HÌNH NỀN (Nằm ở Menu Footer)
            const updateAvatar = () => {
                const img = localStorage.getItem('dat_admin_img');
                if(img) avatar.style.backgroundImage = `url('${img}')`;
            };
            updateAvatar();

            btnSetWall.onclick = () => {
                const link = prompt("Anh Đạt dán link ảnh Thư ký vào đây để đổi diện mạo nhé:", "");
                if(link) {
                    localStorage.setItem('dat_admin_img', link);
                    updateAvatar();
                }
            };

            // 2. LOGIC DI CHUYỂN MƯỢT MÀ (DRAG)
            let isMoving = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

            container.addEventListener("touchstart", (e) => {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
                isMoving = false; 
            }, {passive: true});

            container.addEventListener("touchmove", (e) => {
                isMoving = true;
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
                xOffset = currentX; yOffset = currentY;
                container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                e.preventDefault();
            }, {passive: false});

            // 3. MỞ CHAT (Khi nhấn vào Avatar)
            avatar.onclick = () => {
                if(!isMoving) {
                    windowChat.style.display = windowChat.style.display === 'flex' ? 'none' : 'flex';
                    if(windowChat.style.display === 'flex' && logs.innerHTML === "") {
                        addLog("Dạ em nghe đây anh Đạt! Hình nền trợ lý mới anh có ưng không ạ?", "ai");
                    }
                }
            };

            function addLog(txt, side) {
                const d = document.createElement('div');
                d.className = `msg msg-${side}`;
                d.innerText = txt;
                logs.appendChild(d);
                logs.scrollTop = logs.scrollHeight;
            }

            send.onclick = async () => {
                const val = input.value.trim(); if(!val) return;
                input.value = ""; addLog(val, "user");
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký của anh Đạt. Trả lời cực chuyến: ${val}` }] }] })
                    });
                    const data = await res.json();
                    addLog(data.candidates[0].content.parts[0].text, "ai");
                } catch { addLog("Em luôn ở đây phục vụ anh!", "ai"); }
            };
            input.addEventListener("keypress", (e) => { if(e.key === "Enter") send.click(); });
        })();
    </script>
</body>
</html>
