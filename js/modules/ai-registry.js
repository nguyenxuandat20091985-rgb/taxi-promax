/*
 * Taxi Promax AI Registry
 * Một cổng đăng ký duy nhất cho các AI phía client.
 * Registry không chứa API key và không gọi model; nó chỉ chặn nạp trùng,
 * công bố capability và hỗ trợ kiểm tra tình trạng module.
 */
(function (window) {
  'use strict';
  if (window.PromaxAIRegistry) return;

  var entries = Object.create(null);

  function normalize(name) {
    return String(name || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  }

  function claim(name, meta) {
    var key = normalize(name);
    if (!key) return false;
    if (entries[key]) return false;
    entries[key] = Object.assign({ name: key, registeredAt: Date.now() }, meta || {});
    return true;
  }

  function release(name) {
    var key = normalize(name);
    if (!key || !entries[key]) return false;
    delete entries[key];
    return true;
  }

  function has(name) {
    return Boolean(entries[normalize(name)]);
  }

  function get(name) {
    var item = entries[normalize(name)];
    return item ? Object.assign({}, item) : null;
  }

  function list() {
    return Object.keys(entries).map(function (key) { return Object.assign({}, entries[key]); });
  }

  function register(name, api, meta) {
    if (!claim(name, meta)) return false;
    var item = entries[normalize(name)];
    item.api = api || null;
    return true;
  }

  window.PromaxAIRegistry = Object.freeze({
    claim: claim,
    register: register,
    release: release,
    has: has,
    get: get,
    list: list,
    version: '1.0.0'
  });
})(window);
