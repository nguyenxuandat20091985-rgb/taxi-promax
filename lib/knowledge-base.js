const KNOWLEDGE_BASE = Object.freeze({
    version: '1.0.0',
    effectiveFrom: '2026-08-22',
    farePolicies: [
        { id: 'hn-standard', region: 'Hà Nội', service: 'taxi_standard', baseFare: 12000, includedKm: 1, perKm: 14500, perMinute: 450, minimumFare: 30000, currency: 'VND' },
        { id: 'hcm-standard', region: 'TP. Hồ Chí Minh', service: 'taxi_standard', baseFare: 12000, includedKm: 1, perKm: 15000, perMinute: 500, minimumFare: 30000, currency: 'VND' },
        { id: 'danang-standard', region: 'Đà Nẵng', service: 'taxi_standard', baseFare: 10000, includedKm: 1, perKm: 13000, perMinute: 400, minimumFare: 25000, currency: 'VND' },
        { id: 'national-default', region: 'default', service: 'taxi_standard', baseFare: 10000, includedKm: 1, perKm: 14000, perMinute: 450, minimumFare: 25000, currency: 'VND' }
    ],
    driverRules: [
        { id: 'safety-check', title: 'Kiểm tra an toàn trước ca', keywords: ['an toàn', 'checklist', 'trước ca'], content: 'Tài xế cần kiểm tra phanh, lốp, đèn, dây an toàn, giấy tờ và mức pin/nhiên liệu trước khi bật trạng thái sẵn sàng.' },
        { id: 'trip-integrity', title: 'Toàn vẹn chuyến đi', keywords: ['nhận chuyến', 'hủy chuyến', 'trạng thái'], content: 'Chỉ nhận chuyến đang chờ; cập nhật đúng các mốc đã nhận, đã đón, đang chạy và hoàn thành; không tự sửa giá hoặc trạng thái ngoài luồng.' },
        { id: 'customer-conduct', title: 'Ứng xử với khách hàng', keywords: ['khách hàng', 'ứng xử', 'khiếu nại'], content: 'Giữ thái độ lịch sự, không tự ý thu thêm tiền ngoài bảng giá, và chuyển sự cố sang bộ phận hỗ trợ thay vì tranh cãi.' },
        { id: 'gps-integrity', title: 'Tính toàn vẹn GPS', keywords: ['gps', 'vị trí', 'định vị'], content: 'Thiết bị phải bật định vị; không sử dụng ứng dụng giả vị trí; khi tín hiệu bất thường cần dừng cập nhật và yêu cầu xác minh.' }
    ],
    incidentGuides: [
        { id: 'payment-mismatch', title: 'Sai lệch thanh toán', keywords: ['thanh toán', 'sai giá', 'tiền'], steps: ['Giữ nguyên mã chuyến và mã giao dịch.', 'Không tạo giao dịch bù thủ công.', 'Gửi yêu cầu đối soát kèm ảnh/chứng từ.', 'Chờ hệ thống xác nhận hoàn tiền hoặc điều chỉnh.'] },
        { id: 'lost-item', title: 'Khách để quên đồ', keywords: ['mất đồ', 'bỏ quên', 'đồ đạc'], steps: ['Bảo quản vật dụng.', 'Ghi nhận mã chuyến và thời gian.', 'Báo hỗ trợ trong ứng dụng.', 'Không tự công khai thông tin cá nhân của khách.'] },
        { id: 'safety-emergency', title: 'Sự cố an toàn/SOS', keywords: ['sos', 'khẩn cấp', 'tai nạn', 'an toàn'], steps: ['Bấm SOS trong ứng dụng nếu an toàn để thao tác.', 'Gọi số khẩn cấp địa phương khi có nguy hiểm tức thời.', 'Giữ nguyên bằng chứng và vị trí.', 'Không tự xóa log hoặc audio sự cố.'] },
        { id: 'gps-anomaly', title: 'GPS bất thường', keywords: ['gps', 'nhảy vị trí', 'teleport'], steps: ['Kiểm tra quyền định vị và tín hiệu mạng.', 'Không tiếp tục gửi vị trí sai.', 'Ghi nhận điểm cuối hợp lệ.', 'Yêu cầu xác minh trước khi tiếp tục chuyến.'] }
    ],
    hotspots: [
        { id: 'airport-noi-bai', region: 'Hà Nội', name: 'Sân bay Nội Bài', keywords: ['nội bài', 'sân bay', 'airport'], weight: 1.25, note: 'Nhu cầu thường tăng theo khung giờ bay; cần tuân thủ khu vực đón trả được phép.' },
        { id: 'airport-tan-son-nhat', region: 'TP. Hồ Chí Minh', name: 'Sân bay Tân Sơn Nhất', keywords: ['tân sơn nhất', 'sân bay', 'airport'], weight: 1.3, note: 'Có thể phát sinh ùn tắc cục bộ; ưu tiên ETA thực tế thay vì khoảng cách đường chim bay.' },
        { id: 'hanoi-old-quarter', region: 'Hà Nội', name: 'Phố cổ Hà Nội', keywords: ['phố cổ', 'hoàn kiếm'], weight: 1.15, note: 'Đường hẹp và hạn chế dừng đỗ; cần chọn điểm đón hợp lệ.' },
        { id: 'hcm-district-1', region: 'TP. Hồ Chí Minh', name: 'Quận 1', keywords: ['quận 1', 'trung tâm'], weight: 1.2, note: 'Nhu cầu cao theo giờ cao điểm và sự kiện; cần tính thêm thời gian chờ.' },
        { id: 'danang-beach', region: 'Đà Nẵng', name: 'Khu vực ven biển Đà Nẵng', keywords: ['ven biển', 'mỹ khê', 'đà nẵng'], weight: 1.1, note: 'Nhu cầu biến động theo mùa du lịch và thời tiết.' }
    ]
});

function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

function tokens(value) {
    return normalize(value).split(/[^a-z0-9]+/).filter(token => token.length > 1);
}

function scoreMatch(queryTokens, item) {
    const haystack = normalize([item.title, item.name, item.region, item.content, item.note, ...(item.keywords || [])].join(' '));
    return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? (haystack.startsWith(token) ? 3 : 1) : 0), 0);
}

export function queryKnowledge(query, { category = 'all', limit = 5 } = {}) {
    const queryTokens = tokens(query);
    if (!queryTokens.length) return [];
    const groups = category === 'all' ? ['driverRules', 'incidentGuides', 'hotspots', 'farePolicies'] : [category];
    return groups.flatMap(group => (KNOWLEDGE_BASE[group] || []).map(item => ({ category: group, item, score: scoreMatch(queryTokens, item) })))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(Math.max(Number(limit) || 5, 1), 10));
}

export function getFarePolicy(region = 'default', service = 'taxi_standard') {
    const normalizedRegion = normalize(region);
    return KNOWLEDGE_BASE.farePolicies.find(policy => normalize(policy.region) === normalizedRegion && policy.service === service)
        || KNOWLEDGE_BASE.farePolicies.find(policy => policy.region === 'default' && policy.service === service);
}

export function getHotspots(region) {
    const normalizedRegion = normalize(region);
    return KNOWLEDGE_BASE.hotspots.filter(hotspot => !region || normalize(hotspot.region) === normalizedRegion);
}

export function getKnowledgeBaseMeta() {
    return { version: KNOWLEDGE_BASE.version, effectiveFrom: KNOWLEDGE_BASE.effectiveFrom };
}

export { KNOWLEDGE_BASE };
