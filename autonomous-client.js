(function (global) {
    'use strict';
    var ENDPOINT = '/api/autonomous-core';
    function call(operation, payload, options) {
        options = options || {};
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeout = setTimeout(function () { if (controller) controller.abort(); }, Math.min(Math.max(Number(options.timeoutMs) || 9000, 3000), 20000));
        return fetch(options.endpoint || ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TaxiProMax' },
            signal: controller ? controller.signal : undefined,
            body: JSON.stringify(Object.assign({ operation: operation, role: options.role || 'customer' }, payload || {}))
        }).then(function (response) {
            return response.text().then(function (text) {
                var data = {};
                try { data = text ? JSON.parse(text) : {}; } catch (_) { throw new Error('Lõi tự trị trả về dữ liệu không hợp lệ'); }
                if (!response.ok || !data.success) throw new Error(data.error || 'Lõi tự trị tạm thời không khả dụng');
                return data;
            });
        }).finally(function () { clearTimeout(timeout); });
    }
    global.TaxiAutonomous = {
        call: call,
        knowledgeQuery: function (query, category, role) { return call('knowledge_query', { query: query, category: category || 'all', limit: 5 }, { role: role || 'customer' }); },
        fareQuote: function (payload, role) { return call('fare_quote', payload, { role: role || 'customer' }); },
        gpsCheck: function (payload) { return call('gps_check', payload, { role: 'driver' }); },
        allocationScore: function (payload) { return call('allocation_score', payload, { role: 'system' }); },
        hotspots: function (region, role) { return call('hotspots', { region: region || '' }, { role: role || 'driver' }); }
    };
})(window);
