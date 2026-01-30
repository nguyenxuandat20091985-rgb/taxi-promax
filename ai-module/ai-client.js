(function() {
    if (typeof AI_CONFIG === 'undefined' || !AI_CONFIG.active) return;

    fetch('ai-module/ai-ui.html').then(r => r.text()).then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        const root = document.getElementById('ai-root');
        makeDraggable(root);
        addMsg("AI", AI_CONFIG.welcomeMessage);
    });

    function makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const btn = document.getElementById('ai-btn');
        btn.onmousedown = dragStart;
        btn.ontouchstart = dragStart;

        function dragStart(e) {
            const isTouch = e.type === 'touchstart';
            pos3 = isTouch ? e.touches[0].clientX : e.clientX;
            pos4 = isTouch ? e.touches[0].clientY : e.clientY;
            document.onmouseup = dragEnd;
            document.onmousemove = dragMove;
            document.ontouchend = dragEnd;
            document.ontouchmove = dragMove;
        }

        function dragMove(e) {
            const cx = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const cy = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            pos1 = pos3 - cx; pos2 = pos4 - cy;
            pos3 = cx; pos4 = cy;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto"; el.style.right = "auto";
        }

        function dragEnd(e) {
            document.onmouseup = null; document.onmousemove = null;
            document.ontouchend = null; document.ontouchmove = null;
            // Nếu không di chuyển nhiều thì coi như là Click để mở chat
            if (Math.abs(pos1) < 2 && Math.abs(pos2) < 2) window.toggleAI();
        }
    }

    window.toggleAI = () => {
        const box = document.getElementById('ai-box');
        box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'flex' : 'none';
    };

    window.startVoice = () => {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech) return alert("Trình duyệt không hỗ trợ giọng nói");
        const rec = new Speech(); rec.lang = 'vi-VN'; rec.start();
        document.getElementById('ai-voice-btn').style.background = 'red';
        rec.onresult = (e) => {
            document.getElementById('ai-query').value = e.results[0][0].transcript;
            window.callAI();
            document.getElementById('ai-voice-btn').style.background = '#00bfa5';
        };
        rec.onerror = () => document.getElementById('ai-voice-btn').style.background = '#00bfa5';
    };

    window.callAI = async () => {
        const q = document.getElementById('ai-query');
        const text = q.value.trim();
        if (!text) return;
        addMsg("Bạn", text); q.value = "Đang xử lý...";
        try {
            const res = await fetch(`${AI_CONFIG.apiEndpoint}?key=${AI_CONFIG.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
            });
            const data = await res.json();
            const reply = data.candidates[0].content.parts[0].text;
            addMsg("AI", reply);
            const s = new SpeechSynthesisUtterance(reply); s.lang = 'vi-VN'; window.speechSynthesis.speak(s);
        } catch (e) { addMsg("AI", "Lỗi API rồi anh ơi!"); }
        q.value = "";
    };

    function addMsg(user, msg) {
        const list = document.getElementById('ai-msg-list');
        if (!list) return;
        const cls = user === "AI" ? "msg-ai" : "msg-user";
        list.innerHTML += `<div class="${cls}"><b>${user}:</b> ${msg}</div>`;
        list.scrollTop = list.scrollHeight;
    }
})();
