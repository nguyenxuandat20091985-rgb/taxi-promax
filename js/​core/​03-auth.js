// ============================================================
// 03-auth.js - Đăng ký / Đăng nhập / Quên mật khẩu
// ============================================================
'use strict';

function persistDriverSession(session) {
  const safe = { ...(session || {}) };
  delete safe.passwordHash; delete safe.documents; delete safe.wallet;
  localStorage.setItem('driverInfo', JSON.stringify(safe));
}

async function doRegister() {
  const fullname = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const cccd = document.getElementById('regCccd').value.trim();
  const plate = document.getElementById('regPlate').value.trim();
  const carModel = document.getElementById('regCarModel').value.trim();
  const fuelType = document.querySelector('input[name="fuelType"]:checked')?.value || 'xang';
  const carClass = document.querySelector('input[name="carClass"]:checked')?.value || '4_seats';
  const errorEl = document.getElementById('regError');
  errorEl.style.display = 'none';

  if (!fullname || fullname.length < 2) { errorEl.textContent = '⚠️ Vui lòng nhập họ tên'; errorEl.style.display = 'block'; return; }
  if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
  if (!password || password.length < 6) { errorEl.textContent = '⚠️ Mật khẩu phải có ít nhất 6 ký tự'; errorEl.style.display = 'block'; return; }
  if (!/^[0-9]{9,12}$/.test(cccd)) { errorEl.textContent = '⚠️ CCCD/CMND phải 9-12 số'; errorEl.style.display = 'block'; return; }
  if (!plate) { errorEl.textContent = '⚠️ Vui lòng nhập biển số xe'; errorEl.style.display = 'block'; return; }
  if (!carModel) { errorEl.textContent = '⚠️ Vui lòng nhập dòng xe'; errorEl.style.display = 'block'; return; }

  const btn = document.getElementById('btnRegister');
  btn.disabled = true;
  try {
    const snapshot = await db.ref('drivers').once('value');
    const allDrivers = snapshot.val() || {};
    if (Object.values(allDrivers).some(d => d.phone === phone)) {
      errorEl.textContent = '⚠️ Số điện thoại đã đăng ký!'; errorEl.style.display = 'block'; return;
    }
    const uid = 'DRV_' + Date.now().toString(36).toUpperCase();
    const newDriver = {
      uid, name: fullname, phone, passwordHash: hashPassword(password + phone),
      cccd, plate, carModel, fuelType, carClass,
      status: 'offline', createdAt: Date.now(), totalRides: 0, rating: 5.0
    };
    await db.ref('drivers/' + uid).set(newDriver);
    driverInfo = { uid, name: fullname, phone, plate, carModel, fuelType, carClass };
    persistDriverSession(driverInfo);
    document.getElementById('authScreen').style.display = 'none';
    showToast('✅ Đăng ký thành công! Chào ' + fullname);
    setTimeout(initApp, 300);
  } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
  finally { btn.disabled = false; }
}

async function doLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
  if (!password) { errorEl.textContent = '⚠️ Vui lòng nhập mật khẩu'; errorEl.style.display = 'block'; return; }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  try {
    const snapshot = await db.ref('drivers').once('value');
    const allDrivers = snapshot.val() || {};
    let driver = null, uid = null;
    for (const [key, val] of Object.entries(allDrivers)) {
      if (val.phone === phone) { driver = val; uid = key; break; }
    }
    if (!driver) { errorEl.textContent = '⚠️ Số điện thoại chưa đăng ký!'; errorEl.style.display = 'block'; return; }
    const expectedHash = hashPassword(password + phone);
    if (driver.passwordHash && driver.passwordHash !== expectedHash) {
      errorEl.textContent = '⚠️ Sai mật khẩu!'; errorEl.style.display = 'block'; return;
    }
    if (!driver.passwordHash) await db.ref('drivers/' + uid).update({ passwordHash: expectedHash });

    driverInfo = {
      uid: driver.uid || uid, name: driver.name, phone: driver.phone,
      plate: driver.plate, carModel: driver.carModel,
      fuelType: driver.fuelType, carClass: driver.carClass || '4_seats'
    };
    persistDriverSession(driverInfo);
    document.getElementById('authScreen').style.display = 'none';
    showToast('✅ Đăng nhập thành công! Chào ' + driver.name);
    setTimeout(initApp, 300);
  } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
  finally { btn.disabled = false; }
}

function toggleAuth() {
  const reg = document.getElementById('stepRegister'), log = document.getElementById('stepLogin'), toggle = document.getElementById('btnToggle');
  if (reg.style.display !== 'none') {
    reg.style.display = 'none'; log.style.display = 'block';
    toggle.textContent = 'Chưa có tài khoản? Đăng ký';
  } else {
    reg.style.display = 'block'; log.style.display = 'none';
    toggle.textContent = 'Đã có tài khoản? Đăng nhập';
  }
}

async function doForgotPassword() {
  const phone = prompt('🔑 NHẬP SỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ:');
  if (!phone) return;
  const phoneTrim = phone.trim();
  try {
    const snap = await db.ref('drivers').once('value');
    let uid = null, user = null;
    snap.forEach(c => {
      const v = c.val();
      if (v && String(v.phone) === phoneTrim) { uid = c.key; user = v; }
    });
    if (!user) { alert('❌ Không tìm thấy tài xế với SĐT: ' + phoneTrim); return; }
    let verified = false;
    if (user.cccd) {
      const cccd = prompt('🪪 NHẬP SỐ CCCD/CMND:');
      if (cccd && cccd.trim() === String(user.cccd).trim()) verified = true;
    }
    if (!verified && user.plate) {
      const plate = prompt('🚗 NHẬP BIỂN SỐ XE:');
      if (plate && plate.trim().toLowerCase() === String(user.plate).trim().toLowerCase()) verified = true;
    }
    if (!verified) { alert('❌ Xác minh thất bại!'); return; }
    const newPass = prompt('🔒 NHẬP MẬT KHẨU MỚI (tối thiểu 6 ký tự):');
    if (!newPass || newPass.length < 6) { alert('❌ Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    await db.ref('drivers/' + uid).update({ passwordHash: hashPassword(newPass + phoneTrim) });
    alert('✅ ĐẶT LẠI MẬT KHẨU THÀNH CÔNG!');
  } catch (e) { alert('❌ Lỗi: ' + e.message); }
}

console.log('✅ 03-auth.js loaded');