// UI-CONTROL.JS - QUẢN LÝ ID & GIAO DIỆN
const TX_ID = localStorage.getItem('tx_id') || 'PRO-' + Math.random().toString(36).substr(2, 5).toUpperCase();
localStorage.setItem('tx_id', TX_ID);
document.getElementById('idShow').innerText = "🆔 " + TX_ID;
document.getElementById('profileID').innerText = "Mã tài xế: " + TX_ID;

function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(tab === 'home') document.getElementById('homeControls').style.display = 'block';
    else {
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tab-' + tab).style.display = 'flex';
    }
}

function selectPack(price, name, el) {
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const content = `${TX_ID} NAP ${name}`;
    document.getElementById('qrContent').innerText = content;
    document.getElementById('qrImg').src = `https://img.vietqr.io/image/bidv-4430269669-compact2.png?amount=${price}&addInfo=${encodeURIComponent(content)}`;
}

function saveHistory(km, cost) {
    const list = document.getElementById('historyList');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = 'history-card';
    item.innerHTML = `<div><b>${time}</b><br><small>${km} KM</small></div><div style="color:var(--primary); font-weight:900;">${cost}đ</div>`;
    list.prepend(item);
}
