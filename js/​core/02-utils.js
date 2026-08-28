// ============================================================
// 02-utils.js - Hàm tiện ích
// ============================================================
'use strict';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function hashPassword(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36) + '_' + str.length;
}

function showToast(msg) {
  const toast = document.getElementById('txToast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'vi-VN';
    window.speechSynthesis.speak(msg);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function showConfirmDialog(message, onConfirm) {
  const dialog = document.getElementById('confirmDialog');
  document.getElementById('confirmMessage').innerText = message;
  const confirmBtn = document.getElementById('confirmOkBtn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.onclick = () => { dialog.style.display = 'none'; onConfirm(); };
  document.querySelector('.btn-cancel').onclick = () => { dialog.style.display = 'none'; };
  dialog.style.display = 'flex';
}

function closeConfirmDialog() {
  document.getElementById('confirmDialog').style.display = 'none';
}

function showGapNotice() {
  const notice = document.getElementById('gapNotice');
  if (notice) { notice.classList.add('show'); setTimeout(() => notice.classList.remove('show'), 3000); }
}

async function requestRoadDistance(p1, p2) {
  const url = `https://router.project-osrm.org/route/v1/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?overview=false`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) return data.routes[0].distance / 1000;
  } catch (error) { console.warn('[OSRM] Lỗi:', error); }
  return haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
}

console.log('✅ 02-utils.js loaded');