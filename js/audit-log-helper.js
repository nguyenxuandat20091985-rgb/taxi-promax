/**
 * Taxi ProMax — Audit log helper (browser / admin panel)
 * Ghi vào node audit_logs (Rules: chỉ admin đọc/ghi).
 *
 * Yêu cầu: Firebase Database đã init (global.firebase.database hoặc global.db).
 */
(function (global) {
  'use strict';

  function getDb() {
    if (global.db) return global.db;
    if (global.firebase && global.firebase.database) return global.firebase.database();
    throw new Error('Firebase Database chưa được khởi tạo');
  }

  /**
   * @param {object} opts
   * @param {string} opts.action - e.g. 'approve_kyc', 'set_claims'
   * @param {string} [opts.targetType] - 'driver' | 'customer' | 'order' | ...
   * @param {string} [opts.targetId]
   * @param {object} [opts.meta]
   * @param {string} [opts.adminPhone]
   */
  function writeAuditLog(opts) {
    opts = opts || {};
    var action = String(opts.action || '').slice(0, 80);
    if (!action) return Promise.reject(new Error('action is required'));

    var db = getDb();
    var ref = db.ref('audit_logs').push();
    var payload = {
      action: action,
      targetType: opts.targetType ? String(opts.targetType).slice(0, 40) : null,
      targetId: opts.targetId ? String(opts.targetId).slice(0, 120) : null,
      meta: opts.meta && typeof opts.meta === 'object' ? opts.meta : null,
      adminPhone: opts.adminPhone ? String(opts.adminPhone).slice(0, 40) : null,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    return ref.set(payload).then(function () {
      return { id: ref.key, payload: payload };
    });
  }

  global.PromaxAudit = {
    write: writeAuditLog
  };
})(typeof window !== 'undefined' ? window : globalThis);
