/*
 * Taxi Promax AI Registry
 * Một cổng đăng ký duy nhất cho các AI phía client.
 * Registry không tự chạy AI, chỉ giữ metadata và tham chiếu instance.
 */
(function (global) {
  'use strict';

  var registry = global.TaxiPromaxAIRegistry || (global.TaxiPromaxAIRegistry = {
    version: '1.0.0',
    items: Object.create(null),

    register: function (name, meta) {
      if (!name || typeof name !== 'string') return false;
      this.items[name] = Object.assign({ name: name, registeredAt: Date.now() }, meta || {});
      return true;
    },

    get: function (name) {
      return this.items[name] || null;
    },

    list: function () {
      return Object.keys(this.items).map(function (k) { return this.items[k]; }, this);
    },

    has: function (name) {
      return !!this.items[name];
    }
  });

  // Auto-register known modules if present
  try {
    if (global.PromaxCareAI) {
      registry.register('promax-care-ai', { instance: global.PromaxCareAI, role: 'care' });
    }
    if (global.AICopilotV4) {
      registry.register('ai-copilot-v4', { instance: global.AICopilotV4, role: 'copilot' });
    }
  } catch (e) {}

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = registry;
  }
})(typeof window !== 'undefined' ? window : globalThis);
