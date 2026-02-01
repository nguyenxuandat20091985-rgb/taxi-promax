<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/744/744465.png">
    <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/744/744465.png"> 

    <title>TAXI PROMAX - ADMIN SUPREME</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        :root { --primary: #00bfa5; --dark: #002d26; --gold: #ffc107; --danger: #ff5252; --bg: #f8faf9; --glass: rgba(255, 255, 255, 0.95); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        
        body, html { margin: 0; padding: 0; height: 100%; font-family: 'Segoe UI', Roboto, sans-serif; overflow: hidden; background: var(--bg); position: fixed; width: 100%; }

        #map { height: 100vh; width: 100vw; z-index: 1; filter: contrast(1.05) saturate(1.1); } 

        .header { position: fixed; top: env(safe-area-inset-top, 10px); left: 10px; right: 10px; display: flex; justify-content: space-between; z-index: 1000; pointer-events: none; }
        .badge { pointer-events: auto; background: var(--glass); padding: 8px 15px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-size: 11px; font-weight: 800; color: var(--dark); border: 1px solid white; } 

        .stats-bar { position: fixed; top: calc(env(safe-area-inset-top, 10px) + 45px); left: 10px; right: 10px; background: var(--glass); border-radius: 15px; display: flex; padding: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); z-index: 1000; border: 1px solid white; }
        .stat-item { flex: 1; text-align: center; }
        .stat-label { font-size: 9px; color: #7f8c8d; font-weight: 800; text-transform: uppercase; }
        .stat-value { font-size: 22px; font-weight: 900; color: var(--dark); margin-top: 2px; } 

        .footer-panel { position: fixed; bottom: 0; left: 0; right: 0; background: white; z-index: 2000; border-radius: 25px 25px 0 0; box-shadow: 0 -10px 30px rgba(0,0,0,0.08); padding: 15px 15px calc(env(safe-area-inset-bottom, 5px) + 5px); }

        .nav-grid { display: flex; justify-content: space-around; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; }
        .nav-item { border: none; background: none; color: #bdc3c7; font-size: 10px; font-weight: 700; text-align: center; flex: 1; }
        .nav-item.active { color: var(--primary); }
        
        .tab-content { position: fixed; top: 0; left: 0; width: 100%; height: calc(100% - 115px); background: #fdfdfd; z-index: 1500; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 30px; }
        .p-header { background: var(--primary); color: white; padding: 25px 20px; text-align: center; border-bottom-left-radius: 25px; border-bottom-right-radius: 25px; } 
        .btn-main { width: 100%; padding: 15px; border-radius: 15px; border: none; background: var(--primary); color: white; font-size: 18px; font-weight: 900; }

        /* --- AI CHUẨN ĐÃ FIX --- */
        #ai-wrapper { position: fixed; bottom: 130px; right: 15px; z-index: 999999; display: flex; flex-direction: column; align-items: flex-end; touch-action: none; }
        #ai-root { 
            width: 80px; height: 80px; border-radius: 50%; 
            background: #000 url('https://raw.githubusercontent.com/nguyenxuandat20091985-rgb/taxi-promax/main/CC_20260130_193050.png') no-repeat center; 
            background-size: cover; border: 3px solid #00f2ff; box-shadow: 0 0 15px rgba(0, 242, 255, 0.7); 
            cursor: pointer; 
        }
        #ai-chat-box { width: 300px; max-width: 80vw; background: #fff; border-radius: 20px; margin-bottom: 12px; display: none; flex-direction: column; border: 1px solid #00f2ff; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .ai-header { background: #00d1d1; color: white; padding: 12px; text-align: center; font-weight: 600; }
        #ai-content { max-height: 250px; min-height: 100px; overflow-y: auto; padding: 15px; background: #f0fbfc; }
        .msg-a { background: #fff; padding: 8px 12px; border-radius: 15px 15px 15px 0; margin: 5px 0; border: 1px solid #e0f7f7; font-size: 13px; max-width: 85%; }
        .msg-u { background: #00d1d1; color: white; padding: 8px 12px; border-radius: 15px 15px 0 15px; margin: 5px 0 5px auto; font-size: 13px; max-width: 85%; }

        .admin-gear { position: absolute; right: 0; top: -55px; background: var(--dark); color: white; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; border: 2px solid white; }
    </style>
</head>
<body> 

    <div id="map"></div> 

    <div class="header">
        <div class="badge">🆔 ADMIN: ĐẠT</div>
        <div class="badge" style="color:var(--gold)">⭐ GÓI: ADMIN</div>
    </div> 

    <div class="stats-bar">
        <div class="stat-item" style="border-right: 1px solid #eee;"><div class="stat-label">CƯỚC (VNĐ)</div><div id="cost" class="stat-value">0</div></div>
        <div class="stat-item"><div class="stat-label">KM</div><div id="km" class="stat-value">0.00</div></div>
    </div> 

    <div id="tab-toi" class="tab-content">
        <div class="p-header">CÀI ĐẶT HỆ THỐNG</div>
        <div style="padding:20px;"><button class="btn-main" id="change-ai-img">🖼️ ĐỔI HÌNH TRỢ LÝ</button></div>
    </div> 

    <div class="footer-panel">
        <div id="homeControls" style="position: relative;">
            <div class="admin-gear" onclick="showTab('toi', this)">⚙️</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; font-weight:800;">
                <span>GIÁ/KM</span><span id="rateLabel">15,000đ</span>
            </div>
            <input type="range" min="10000" max="50000" value="15000" oninput="document.getElementById('rateLabel').innerText=this.value+'đ'">
            <button class="btn-main">BẮT ĐẦU CHUYẾN ĐI</button>
        </div> 
        <div class="nav-grid">
            <button class="nav-item active" onclick="showTab('home', this)">🏠Trang chủ</button>
            <button class="nav-item" onclick="showTab('toi', this)">👤Tôi</button>
        </div>
    </div> 

    <div id="ai-wrapper">
        <div id="ai-chat-box">
            <div class="ai-header">🌿 TRỢ LÝ TAXI PROMAX AI</div>
            <div id="ai-content"></div>
            <div style="display:flex; padding:10px; border-top:1px solid #eee;">
                <input type="text" id="ai-txt" style="flex:1; border:1px solid #ddd; border-radius:20px; padding:8px 15px;" placeholder="Lệnh đi anh Đạt...">
                <button id="ai-send" style="background:none; border:none; font-size:22px; color:#00d1d1;">🚀</button>
            </div>
        </div>
        <div id="ai-root"></div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.0285, 105.8542], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        function showTab(id, el) {
            document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            if(id !== 'home') document.getElementById('tab-'+id).style.display = 'flex';
            el.classList.add('active');
        }

        (function(){
            const wrap = document.getElementById('ai-wrapper'), root = document.getElementById('ai-root'), 
                  chat = document.getElementById('ai-chat-box'), content = document.getElementById('ai-content'),
                  input = document.getElementById('ai-txt'), send = document.getElementById('ai-send'),
                  btnChange = document.getElementById('change-ai-img');

            const saved = localStorage.getItem('dat_admin_ava');
            if(saved) root.style.backgroundImage = `url('${saved}')`;

            btnChange.onclick = () => {
                const link = prompt("Dán link ảnh online mới:");
                if(link) { localStorage.setItem('dat_admin_ava', link); root.style.backgroundImage = `url('${link}')`; }
            };

            let isDragging = false, posX = 0, posY = 0, startX, startY;
            wrap.ontouchstart = (e) => { startX = e.touches[0].clientX - posX; startY = e.touches[0].clientY - posY; isDragging = false; };
            wrap.ontouchmove = (e) => { isDragging = true; posX = e.touches[0].clientX - startX; posY = e.touches[0].clientY - startY; wrap.style.transform = `translate3d(${posX}px, ${posY}px, 0)`; e.preventDefault(); };

            root.onclick = () => {
                if(!isDragging) {
                    chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
                    if(chat.style.display === 'flex' && content.innerHTML === "") addMsg("Chào anh Đạt! Em đã online rồi đây. ✨", 'ai');
                }
            };

            function addMsg(t, s) { const d = document.createElement('div'); d.className = s === 'user' ? 'msg-u' : 'msg-a'; d.textContent = t; content.appendChild(d); content.scrollTop = 9999; }

            send.onclick = async () => {
                const m = input.value.trim(); if(!m) return;
                input.value = ''; addMsg(m, 'user');
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBYIpmslXFTkETW7cfiPeLJ0oPcgMJUn2g`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: `Bạn là trợ lý anh Đạt: ${m}` }] }] })
                    });
                    const data = await res.json();
                    addMsg(data.candidates[0].content.parts[0].text, 'ai');
                } catch { addMsg("Em nghe đây anh!", 'ai'); }
            };
        })();
    </script>
</body>
</html>
