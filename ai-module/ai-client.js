<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>TAXI PROMAX - ADMIN SUPREME V26 FULL</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&display=swap');
        :root { --primary: #00bfa5; --dark: #002d26; --gold: #ffc107; --danger: #ff5252; --bg: #f8faf9; --glass: rgba(255, 255, 255, 0.95); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Lexend', sans-serif; overflow: hidden; background: var(--bg); position: fixed; width: 100%; }
        
        /* MAP */
        #map { height: 100vh; width: 100vw; z-index: 1; filter: contrast(1.05) saturate(1.1); } 

        /* HEADER & STATS */
        .header { position: fixed; top: env(safe-area-inset-top, 10px); left: 10px; right: 10px; display: flex; justify-content: space-between; z-index: 1000; pointer-events: none; }
        .badge { pointer-events: auto; background: var(--glass); padding: 8px 15px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-size: 11px; font-weight: 800; color: var(--dark); border: 1px solid white; } 
        .stats-bar { position: fixed; top: calc(env(safe-area-inset-top, 10px) + 45px); left: 10px; right: 10px; background: var(--glass); border-radius: 15px; display: flex; padding: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); z-index: 1000; border: 1px solid white; }
        .stat-item { flex: 1; text-align: center; }
        .stat-value { font-size: 22px; font-weight: 900; color: var(--dark); }

        /* AI V26 SUPREME - DI CHUYỂN MƯỢT */
        #ai-wrapper { 
            position: fixed; bottom: 140px; right: 15px; z-index: 99999; 
            display: flex; flex-direction: column; align-items: flex-end; 
            touch-action: none; will-change: transform;
        }
        #ai-root { 
            width: 85px; height: 85px; border-radius: 50%; 
            background: var(--primary) url('https://cdn-icons-png.flaticon.com/512/4712/4712109.png') no-repeat center;
            background-size: cover; border: 4px solid #00ff88;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.6); cursor: pointer; position: relative;
        }
        #admin-upload { position: absolute; top: -5px; left: -5px; background: #1a1a1a; color: #00ff88; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid #00ff88; z-index: 10; cursor: pointer; }
        
        #ai-chat-box { 
            width: 320px; max-width: 85vw; background: white; border-radius: 25px; 
            margin-bottom: 12px; display: none; flex-direction: column; 
            border: 2px solid #00ff88; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.3); 
        }
        .ai-header { background: #1a1a1a; color: #00ff88; padding: 15px; text-align: center; font-weight: 700; }
        #ai-content { max-height: 250px; min-height: 100px; overflow-y: auto; padding: 15px; background: #f9f9f9; }
        .msg-u { background: #1a1a1a; color: #00ff88; padding: 8px 12px; border-radius: 12px 12px 0 12px; margin: 5px 0 5px auto; width: fit-content; max-width: 85%; font-size: 13px; }
        .msg-a { background: #eee; color: #222; padding: 8px 12px; border-radius: 12px 12px 12px 0; margin: 5px 0; width: fit-content; max-width: 85%; font-size: 13px; }

        /* FOOTER */
        .footer-panel { position: fixed; bottom: 0; left: 0; right: 0; background: white; z-index: 2000; border-radius: 25px 25px 0 0; padding: 15px; box-shadow: 0 -10px 30px rgba(0,0,0,0.08); }
        .btn-main { width: 100%; padding: 15px; border-radius: 15px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: 900; }
    </style>
</head>
<body>
    <div class="header">
        <div class="badge">🆔 ADMIN: ĐẠT</div>
        <div class="badge" style="color:var(--gold)">⭐ ADMIN SUPREME</div>
    </div>
    <div class="stats-bar">
        <div class="stat-item" style="border-right: 1px solid #eee;"><div>CƯỚC</div><div id="cost" class="stat-value">0</div></div>
        <div class="stat-item"><div>KM</div><div id="km" class="stat-value">0.00</div></div>
    </div>

    <div id="map"></div>

    <div id="ai-wrapper">
        <div id="ai-chat-box">
            <div class="ai-header">TAXI PROMAX AI V26</div>
            <div id="ai-content"></div>
            <div style="display:flex; padding:10px; border-top:1px solid #eee; gap:5px; background: white;">
                <input type="text" id="ai-txt" style="flex:1; border:1px solid #ddd; border-radius:20px; padding:8px 15px;" placeholder="Lệnh đi anh Đạt...">
                <button id="ai-send" style="background:none; border:none; font-size:22px;">🚀</button>
            </div>
        </div>
        <div id="ai-root"><div id="admin-upload">⚙️</div></div>
    </div>

    <div class="footer-panel">
        <button class="btn-main">BẮT ĐẦU CHUYẾN ĐI</button>
        <div style="display:flex; justify-content:space-around; margin-top:12px; font-size:11px; font-weight:bold; color:#bdc3c7;">
            <span>🏠 Trang chủ</span><span>💰 Ví tiền</span><span>👤 Tôi</span>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // BẢN ĐỒ
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.0285, 105.8542], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // AI LOGIC
        (function(){
            const wrapper = document.getElementById('ai-wrapper'), root = document.getElementById('ai-root'), 
                  chat = document.getElementById('ai-chat-box'), adminBtn = document.getElementById('admin-upload'),
                  content = document.getElementById('ai-content'), txtInput = document.getElementById('ai-txt'), sendBtn = document.getElementById('ai-send');

            const savedImg = localStorage.getItem('taxi_ai_img');
            if(savedImg) root.style.backgroundImage = `url('${savedImg}')`;

            adminBtn.onclick = (e) => {
                e.stopPropagation();
                const link = prompt("Dán link ảnh online (Imgur/FB):", savedImg || "");
                if(link) { root.style.backgroundImage = `url('${link}')`; localStorage.setItem('taxi_ai_img', link); }
            };

            // DI CHUYỂN FIX 100%
            let posX = 0, posY = 0, startX = 0, startY = 0, isDragging = false;
            wrapper.addEventListener('touchstart', (e) => {
                isDragging = false;
                startX = e.touches[0].clientX - posX; startY = e.touches[0].clientY - posY;
            }, {passive: true});

            wrapper.addEventListener('touchmove', (e) => {
                isDragging = true;
                posX = e.touches[0].clientX - startX; posY = e.touches[0].clientY - startY;
                wrapper.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
                e.preventDefault();
            }, {passive: false});

            root.onclick = () => {
                if (!isDragging) {
                    chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
                    if (chat.style.display === 'flex' && content.innerHTML === "") addMsg("Thư ký Taxi Promax phục vụ anh Đạt!", "ai");
                }
            };

            function addMsg(t, s) {
                const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a';
                d.textContent = t; content.appendChild(d); content.scrollTop = 9999;
            }

            sendBtn.onclick = async () => {
                const m = txtInput.value.trim(); if(!m) return;
                txtInput.value = ''; addMsg(m, 'user');
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là thư ký của anh Đạt: ${m}` }] }] })
                    });
                    const data = await res.json();
                    addMsg(data.candidates[0].content.parts[0].text, 'ai');
                } catch { addMsg("Em nghe đây anh Đạt!", 'ai'); }
            };
        })();
    </script>
</body>
</html>
