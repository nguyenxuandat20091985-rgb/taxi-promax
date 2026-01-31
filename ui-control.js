// UI-CONTROL.JS - PHÁT TRIỂN BỞI NGUYEN XUAN DAT
const TX_ID = localStorage.getItem('tx_id') || 'DAT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
localStorage.setItem('tx_id', TX_ID);
document.getElementById('idShow').innerText = "🆔 " + TX_ID;
document.getElementById('profileBox').innerText = "Mã tài xế: " + TX_ID;

// GIỮ MÀN HÌNH LUÔN SÁNG
async function keepScreenAlive() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (err) {}
}
keepScreenAlive();

function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(tab === 'home') document.getElementById('homeControls').style.display = 'block';
    else {
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tab-' + tab).style.display = 'flex';
        if(tab === 'vi') {
            const content = `${TX_ID} NAP VIP`;
            document.getElementById('qrContent').innerText = content;
            document.getElementById('qrImg').src = `https://img.vietqr.io/image/bidv-4430269669-compact2.png?amount=999000&addInfo=${content}`;
        }
    }
}

document.getElementById('rateInput').oninput = function() {
    document.getElementById('rateLabel').innerText = parseInt(this.value).toLocaleString();
};
