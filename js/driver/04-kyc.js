// Extracted from index.html; load order is intentionally preserved.
(function(){
    var ADMIN_PHONE = '0388724966';
    var kycData = { front: null, back: null, license: null, selfie: null };

    /* ===== CSS ===== */
    var css = document.createElement('style');
    css.textContent =
        '.kyc-overlay{position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;}' +
        '.kyc-overlay.show{display:flex;}' +
        '.kyc-sheet{background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:20px;}' +
        '.kyc-head{background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;}' +
        '.kyc-body{padding:16px;}' +
        '.kyc-status{border-radius:14px;padding:12px 14px;font-size:13px;font-weight:700;margin-bottom:14px;}' +
        '.kyc-status.pending{background:#fff7e6;color:#b45309;border:1px solid #fcd34d;}' +
        '.kyc-status.approved{background:#e8f9ee;color:#15803d;border:1px solid #86efac;}' +
        '.kyc-status.rejected{background:#fdecec;color:#b91c1c;border:1px solid #fca5a5;}' +
        '.kyc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
        '.kyc-slot{border:2px dashed #cbd5e1;border-radius:14px;padding:10px;text-align:center;cursor:pointer;background:#f8fafc;}' +
        '.kyc-slot.done{border-style:solid;border-color:#00bfa5;background:#e8f8f5;}' +
        '.kyc-thumb{width:100%;height:90px;border-radius:10px;background-color:#e2e8f0;background-position:center;background-size:cover;background-repeat:no-repeat;margin-bottom:6px;}' +
        '.kyc-label{font-size:11px;font-weight:700;color:#475569;}' +
        '.kyc-slot input{display:none;}' +
        '.kyc-submit{width:100%;margin-top:14px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;}' +
        '.kyc-submit:disabled{opacity:.5;}' +
        '.kyc-admin-card{border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:12px;}' +
        '.kyc-admin-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0;}' +
        '.kyc-admin-thumbs div{height:64px;border-radius:8px;background-color:#e2e8f0;background-position:center;background-size:cover;cursor:pointer;}' +
        '.kyc-admin-actions{display:flex;gap:8px;}' +
        '.kyc-admin-actions button{flex:1;padding:10px;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;}' +
        '.kyc-viewer{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:16000;display:none;align-items:center;justify-content:center;}' +
        '.kyc-viewer.show{display:flex;}' +
        '.kyc-viewer img{max-width:94%;max-height:90%;border-radius:8px;}';
    document.head.appendChild(css);

    /* ===== Nén ảnh trước khi upload ===== */
    function compressImage(file, cb) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var scale = Math.min(1, 800 / Math.max(img.width, img.height));
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                cb(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /* ===== Xem ảnh phóng to ===== */
    function makeViewer() {
        if (document.getElementById('kycViewer')) return;
        var v = document.createElement('div');
        v.id = 'kycViewer'; v.className = 'kyc-viewer';
        v.innerHTML = '<img src="">';
        v.onclick = function() { v.classList.remove('show'); };
        document.body.appendChild(v);
    }
    function viewImage(src) {
        makeViewer();
        var v = document.getElementById('kycViewer');
        v.querySelector('img').src = src;
        v.classList.add('show');
    }

    /* ===== MODAL tài xế gửi hồ sơ ===== */
    function buildKYCModal() {
        if (document.getElementById('kycModal')) return;
        var m = document.createElement('div');
        m.id = 'kycModal'; m.className = 'kyc-overlay';
        m.innerHTML =
            '<div class="kyc-sheet">' +
            '<div class="kyc-head"><b>🔐 Xác thực tài xế</b><button onclick="document.getElementById(\'kycModal\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div class="kyc-body">' +
            '<div id="kycStatusBox"></div>' +
            '<div class="kyc-grid">' +
            slotHtml('front', '🪪 CCCD — mặt trước', 'environment') +
            slotHtml('back', '🪪 CCCD — mặt sau', 'environment') +
            slotHtml('license', '🚗 Bằng lái xe', 'environment') +
            slotHtml('selfie', '🤳 Ảnh chân dung', 'user') +
            '</div>' +
            '<button id="kycSubmitBtn" class="kyc-submit">📤 Gửi hồ sơ xét duyệt</button>' +
            '</div></div>';
        document.body.appendChild(m);

        ['front','back','license','selfie'].forEach(function(key) {
            document.getElementById('kycInput_' + key).onchange = function() {
                var f = this.files && this.files[0];
                if (!f) return;
                if (!/^image\/(jpeg|png|webp)$/i.test(f.type) || f.size > 8 * 1024 * 1024) {
                    if (typeof showToast === 'function') showToast('❌ Chỉ nhận ảnh JPG/PNG/WebP tối đa 8MB');
                    this.value = '';
                    return;
                }
                compressImage(f, function(b64) {
                    kycData[key] = b64;
                    var slot = document.getElementById('kycSlot_' + key);
                    slot.classList.add('done');
                    slot.querySelector('.kyc-thumb').style.backgroundImage = 'url(' + b64 + ')';
                });
            };
        });
        document.getElementById('kycSubmitBtn').onclick = submitKYC;
    }
    function slotHtml(key, label, capture) {
        return '<div class="kyc-slot" id="kycSlot_' + key + '" onclick="document.getElementById(\'kycInput_' + key + '\').click()">' +
            '<div class="kyc-thumb"></div><div class="kyc-label">' + label + '</div>' +
            '<input type="file" accept="image/*" capture="' + capture + '" id="kycInput_' + key + '"></div>';
    }

    function openKYC() {
        buildKYCModal();
        document.getElementById('kycModal').classList.add('show');
        loadKYCStatus();
    }
    window.openKYC = openKYC;

    function loadKYCStatus() {
        if (!window.driverInfo || !driverInfo.uid) return;
        db.ref('drivers/' + driverInfo.uid + '/documents').once('value').then(function(snap) {
            var box = document.getElementById('kycStatusBox');
            if (!snap.exists()) { box.innerHTML = '<div class="kyc-status pending">📋 Bạn chưa gửi hồ sơ xác thực. Hãy chụp đủ 4 ảnh bên dưới.</div>'; return; }
            var d = snap.val();
            if (d.status === 'approved') box.innerHTML = '<div class="kyc-status approved">✅ Tài khoản đã xác thực — tăng uy tín nhận đơn!</div>';
            else if (d.status === 'rejected') box.innerHTML = '<div class="kyc-status rejected">❌ Hồ sơ bị từ chối' + (d.rejectReason ? ': ' + d.rejectReason : '') + ' — chụp lại và gửi lại.</div>';
            else box.innerHTML = '<div class="kyc-status pending">⏳ Hồ sơ đang chờ duyệt...</div>';
            // nạp lại ảnh đã gửi
            ['front','back','license','selfie'].forEach(function(key) {
                if (d[key]) {
                    kycData[key] = d[key];
                    var slot = document.getElementById('kycSlot_' + key);
                    slot.classList.add('done');
                    slot.querySelector('.kyc-thumb').style.backgroundImage = 'url(' + d[key] + ')';
                }
            });
        });
    }

    function submitKYC() {
        if (!window.driverInfo || !driverInfo.uid) return;
        if (!kycData.front || !kycData.back || !kycData.license || !kycData.selfie) {
            if (typeof showToast === 'function') showToast('❌ Chụp đủ 4 ảnh trước khi gửi');
            return;
        }
        var btn = document.getElementById('kycSubmitBtn');
        btn.disabled = true; btn.textContent = '⏳ Đang gửi...';
        db.ref('drivers/' + driverInfo.uid + '/documents').set({
            front: kycData.front, back: kycData.back,
            license: kycData.license, selfie: kycData.selfie,
            status: 'pending', submittedAt: Date.now(),
            name: driverInfo.name, phone: driverInfo.phone
        }).then(function() {
            btn.disabled = false; btn.textContent = '📤 Gửi hồ sơ xét duyệt';
            if (typeof showToast === 'function') showToast('✅ Đã gửi hồ sơ! Chờ admin duyệt.');
            loadKYCStatus();
        }).catch(function(e) {
            btn.disabled = false; btn.textContent = '📤 Gửi hồ sơ xét duyệt';
            if (typeof showToast === 'function') showToast('❌ Lỗi: ' + e.message);
        });
    }

    /* ===== MODAL admin duyệt hồ sơ ===== */
    function openKYCAdmin() {
        if (!window.driverInfo || String(driverInfo.phone) !== ADMIN_PHONE) {
            if (typeof showToast === 'function') showToast('⛔ Chỉ admin mới dùng tính năng này');
            return;
        }
        if (!document.getElementById('kycAdminModal')) {
            var m = document.createElement('div');
            m.id = 'kycAdminModal'; m.className = 'kyc-overlay';
            m.innerHTML =
                '<div class="kyc-sheet"><div class="kyc-head"><b>🛡️ Duyệt hồ sơ tài xế</b>' +
                '<button onclick="document.getElementById(\'kycAdminModal\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
                '<div class="kyc-body" id="kycAdminList"></div></div>';
            document.body.appendChild(m);
        }
        document.getElementById('kycAdminModal').classList.add('show');
        loadPendingList();
    }
    window.openKYCAdmin = openKYCAdmin;

    function loadPendingList() {
        var box = document.getElementById('kycAdminList');
        box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">Đang tải...</div>';
        db.ref('drivers').once('value').then(function(snap) {
            var html = '';
            if (snap.exists()) {
                snap.forEach(function(c) {
                    var d = c.val();
                    if (d && d.documents && d.documents.status === 'pending') {
                        html +=
                            '<div class="kyc-admin-card">' +
                            '<div style="font-weight:800;font-size:14px;">👤 ' + (d.name || '---') + '</div>' +
                            '<div style="font-size:12px;color:#64748b;">📞 ' + (d.phone || '---') + ' · ' + new Date(d.documents.submittedAt || Date.now()).toLocaleString('vi-VN') + '</div>' +
                            '<div class="kyc-admin-thumbs">' +
                            ['front','back','license','selfie'].map(function(k) {
                                return '<div style="background-image:url(' + (d.documents[k] || '') + ')" onclick="viewImage(\'' + k + '_' + c.key + '\')"></div>';
                            }).join('') +
                            '</div>' +
                            '<div class="kyc-admin-actions">' +
                            '<button style="background:#00bfa5;color:#fff;" onclick="kycDecide(\'' + c.key + '\',true)">✅ Duyệt</button>' +
                            '<button style="background:#ef5350;color:#fff;" onclick="kycDecide(\'' + c.key + '\',false)">❌ Từ chối</button>' +
                            '</div></div>';
                        // lưu ảnh tạm để viewer
                        window['kycCache_' + c.key] = d.documents;
                    }
                });
            }
            box.innerHTML = html || '<div style="text-align:center;padding:30px;color:#94a3b8;">🎉 Không có hồ sơ chờ duyệt</div>';
            // sửa onclick thumbnail dùng cache
            box.querySelectorAll('.kyc-admin-thumbs div').forEach(function(el, idx) {});
        });
    }
    // viewer cho admin: dùng dữ liệu cache
    window.viewImage = function(ref) {
        var parts = ref.split('_');
        var key = parts[0], uid = parts.slice(1).join('_');
        var cache = window['kycCache_' + uid];
        if (cache && cache[key]) {
            makeViewer();
            var v = document.getElementById('kycViewer');
            v.querySelector('img').src = cache[key];
            v.classList.add('show');
        }
    };
    window.kycDecide = function(uid, approve) {
        var reason = '';
        if (!approve) {
            reason = prompt('Lý do từ chối (tài xế sẽ nhìn thấy):') || 'Hồ sơ chưa rõ, chụp lại';
        }
        db.ref('drivers/' + uid + '/documents').update({
            status: approve ? 'approved' : 'rejected',
            decidedAt: Date.now(),
            rejectReason: approve ? null : reason
        }).then(function() {
            if (typeof showToast === 'function') showToast(approve ? '✅ Đã duyệt' : '❌ Đã từ chối');
            loadPendingList();
        });
    };

    /* ===== Thêm mục menu + badge xác thực ===== */
    function addKYCMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.kycAdded || !window.driverInfo) return;
        menu.dataset.kycAdded = '1';
        var logout = null;
        for (var i = 0; i < menu.children.length; i++) {
            if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
        }
        function mk(icon, label, fn) {
            var d = document.createElement('div');
            d.className = 'sidebar-item';
            d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">' + icon + '</span><span>' + label + '</span>';
            d.onclick = fn;
            return d;
        }
        var items = [mk('🔐', 'Xác thực tài xế', openKYC)];
        if (String(driverInfo.phone) === ADMIN_PHONE) items.push(mk('🛡️', 'Duyệt hồ sơ', openKYCAdmin));
        items.forEach(function(it) { if (logout) menu.insertBefore(it, logout); else menu.appendChild(it); });
    }

    /* ===== Badge ✅ khi đã xác thực ===== */
    function updateVerifiedBadge() {
        if (!window.driverInfo || !driverInfo.uid) return;
        db.ref('drivers/' + driverInfo.uid + '/documents/status').on('value', function(snap) {
            var nameEl = document.getElementById('sidebarName');
            if (nameEl && snap.val() === 'approved' && nameEl.innerText.indexOf('✅') === -1) {
                nameEl.innerText = nameEl.innerText + ' ✅';
            }
        });
    }

    function boot() { addKYCMenu(); updateVerifiedBadge(); setInterval(addKYCMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
