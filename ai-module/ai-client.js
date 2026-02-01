<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>TAXI PROMAX - ADMIN SUPREME V29</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap');
        :root { --primary: #00bfa5; --dark: #1a1a1a; --gold: #ffc107; --bg: #f4f7f6; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Lexend', sans-serif; overflow: hidden; background: var(--bg); }

        /* LỚP 1: BẢN ĐỒ */
        #map { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }

        /* LỚP 2: GIAO DIỆN ADMIN */
        .admin-overlay { position: relative; z-index: 10; pointer-events: none; height: 100vh; width: 100%; }
        .header-top { position: absolute; top: 15px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: auto; }
        .badge { background: rgba(255,255,255,0.95); padding: 10px 15px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-size: 11px; font-weight: 700; border: 1px solid #ddd; }
        
        .stats-panel { position: absolute; top: 70px; left: 10px; right: 10px; background: white; border-radius: 15px; display: flex; padding: 15px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); pointer-events: auto; }
        .stat-box { flex: 1; text-align: center; border-right: 1px solid #eee; }
        .stat-box:last-child { border-right: none; }
        .stat-number { font-size: 20px; font-weight: 900; color: var(--dark); }

        /* LỚP 3: AI ASSISTANT (TÁCH BIỆT CÀI ĐẶT) */
        #ai-container { 
            position: fixed; bottom: 160px; right: 20px; z-index: 9999; 
            display: flex; flex-direction: column; align-items: flex-end; touch-action: none;
            will-change: transform;
        }
        #ai-avatar { 
            width: 80px; height: 80px; border-radius: 50%; border: 4px solid #00ff88;
            background: #222 url('https://api.dicebear.com/7.x/bottts/svg?seed=Felix') no-repeat center;
            background-size: cover; box-shadow: 0 0 20px rgba(0,255,136,0.5); cursor: grab;
        }

        /* KHUNG CHAT */
        #chat-window { 
            width: 300px; background: white; border-radius: 20px; margin-bottom: 12px;
            display: none; flex-direction: column; border: 2px solid #00ff88; overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); pointer-events: auto;
        }
        .chat-header { background: #1a1a1a; color: #00ff88; padding: 12px; font-weight: 700; text-align: center; font-size: 13px; }
        #chat-logs { height: 180px; overflow-y: auto; padding: 15px; background: #f9f9f9; }
        .msg { margin-bottom: 8px; padding: 8px 12px; border-radius: 12px; font-size: 13px; max-width: 85%; }
        .msg-ai { background: #eee; color: #222; margin-right: auto; }
        .msg-user { background: #1a1a1a; color: #00ff88; margin-left: auto; }

        /* FOOTER & NÚT CÀI ĐẶT */
        .footer-menu { position: absolute; bottom: 0; left: 0; right: 0; background: white; padding: 15px 15px 30px; border-radius: 25px 25px 0 0; z-index: 20; pointer-events: auto; box-shadow: 0 -5px 20px rgba(0,0,0,0.1); }
        .btn-start { width: 100%; padding: 16px; border-radius: 16px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: 800; margin-bottom: 15px; }
        .nav-bar { display: flex; justify-content: space-around; }
        .nav-btn { border: none; background: none; color: #bbb; font-size: 10px; font-weight: 700; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .nav-btn.active { color: var(--primary); }
    </style>
</head>
<body>

    <div id="map"></div>

    <div class="admin-overlay">
        <div class="header-top">
            <div class="badge">🆔 ADMIN: ĐẠT</div>
            <div class="badge" style="color:var(--gold)">⭐ PLATINUM V29</div>
        </div>
        <div class="stats-panel">
            <div class="stat-box"><div>CƯỚC</div><div class="stat-number">0</div></div>
            <div class="stat-box"><div>KM</div><div class="stat-number">0.00</div></div>
        </div>
        <div class="footer-menu">
            <button class="btn-start">BẮT ĐẦU CHUYẾN ĐI</button>
            <div class="nav-bar">
                <button class="nav-btn active"><span>🏠</span><span>TRANG CHỦ</span></button>
                <button class="nav-btn" id="config-bg"><span>🖼️</span><span>HÌNH NỀN</span></button>
                <button class="nav-btn"><span>👤</span><span>TÔI</span></button>
            </div>
        </div>
    </div>

    <div id="ai-container">
        <div id="chat-window">
            <div class="chat-header">THƯ KÝ TAXI PROMAX</div>
            <div id="chat-logs"></div>
            <div style="display:flex; padding:8px; border-top:1px solid #eee;">
                <input type="text" id="chat-input" style="flex:1; border:1px solid #ddd; border-radius:20px; padding:8px 12px;" placeholder="Lệnh đi anh Đạt...">
                <button id="chat-send" style="background:none; border:none; font-size:20px;">🚀</button>
            </div>
        </div>
        <div id="ai-avatar"></div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // 1. KHỞI TẠO MAP
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.0285, 105.8542], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // 2. HỆ THỐNG AI TẬP TRUNG
        (function(){
            const container = document.getElementById('ai-container'),
                  avatar = document.getElementById('ai-avatar'),
                  win = document.getElementById('chat-window'),
                  logs = document.getElementById('chat-logs'),
                  input = document.getElementById('chat-input'),
                  send = document.getElementById('chat-send'),
                  btnConfig = document.getElementById('config-bg');

            // Cập nhật ảnh (Không dính vào avatar)
            const refreshImg = () => {
                const img = localStorage.getItem('admin_ai_img');
                if(img) avatar.style.backgroundImage = `url('${img}')`;
            };
            refreshImg();

            btnConfig.onclick = () => {
                const link = prompt("Dán link ảnh Thư ký cho anh Đạt:", "");
                if(link) { localStorage.setItem('admin_ai_img', link); refreshImg(); }
            };

            // DI CHUYỂN (DRAG) - ĐÃ FIX KHÔNG BỊ KHỰNG
            let isDragging = false, startX, startY, xOffset = 0, yOffset = 0;

            container.ontouchstart = (e) => {
                startX = e.touches[0].clientX - xOffset;
                startY = e.touches[0].clientY - yOffset;
                isDragging = false;
            };

            container.ontouchmove = (e) => {
                isDragging = true;
                xOffset = e.touches[0].clientX - startX;
                yOffset = e.touches[0].clientY - startY;
                container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
                e.preventDefault();
            };

            avatar.onclick = () => {
                if(!isDragging) {
                    win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
                    if(win.style.display === 'flex' && logs.innerHTML === "") addMsg("Dạ em đã sẵn sàng phục vụ anh Đạt!", "ai");
                }
            };

            function addMsg(t, s) {
                const d = document.createElement('div'); d.className = `msg msg-${s}`;
                d.innerText = t; logs.appendChild(d); logs.scrollTop = 9999;
            }

            send.onclick = async () => {
                const m = input.value.trim(); if(!m) return;
                input.value = ""; addMsg(m, "user");
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký anh Đạt: ${m}` }] }] })
                    });
                    const data = await res.json();
                    addMsg(data.candidates[0].content.parts[0].text, "ai");
                } catch { addMsg("Em nghe đây anh!", "ai"); }
            };
        })();
    </script>
</body>
</html>
