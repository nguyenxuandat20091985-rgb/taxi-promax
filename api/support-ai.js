export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = process.env.GROQ_API_KEY;
    if (!key) return res.status(500).json({ error: 'Chua cau hinh GROQ_API_KEY' });

    const { question, role, mode } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Thieu noi dung' });

    const KB = 'KIEN THUC TAXI PROMAX: ' +
        'Gia cuoc 15.000d/km (xe 4 cho), cuoc toi thieu 20.000d. ' +
        'Goi tai xe: LE 5k/1 ngay, PRO 49k/30 ngay, PROMAX 129k/90 ngay. Xe ghep 100k/thang. ' +
        'Thanh toan cuoc: tien mat cho tai xe; mua goi qua PayOS (QR/chuyen khoan). ' +
        'Loi GPS: vao Cai dat ung dung Chrome -> Quyen -> Vi tri -> Cho phep + bat Vi tri chinh xac. ' +
        'Dang ky tai xe: mo app tai xe, dien ho ten + SĐT. ' +
        'SOS: giu nut SOS de gui vi tri + ghi am 2 phut cho admin. ' +
        'Gioi thieu ban be: ma giam 10k. ' +
        'Lien he truc tiep: 0388724966 (Zalo/phone). ';

    let sys;
    if (mode === 'draft') {
        sys = 'Ban la tro ly cua ADMIN Taxi ProMax. Nhiem vu: soan LOI NHAN TIN tra loi khach hang/tai xe dua tren tin nhan duoc dan. ' +
              'Lich su, ngan gon duoi 100 tu, xuong than nhu nhan tin Zalo. ' + KB + 'Chi tra ve loi nhan, khong them ghi chu.';
    } else {
        sys = 'Ban la TONG DAI HO TRO 24/7 cua Taxi ProMax, noi chuyen voi ' + (role === 'driver' ? 'TAI XE' : 'KHACH HANG') + '. ' +
              'Tra loi tieng Viet than thien, ngan gon duoi 120 tu. ' + KB +
              'Neu cau hoi ngoai pham vi hoac khien nai phuc tap: khuyen goi/Zalo 0388724966.';
    }

    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [ { role: 'system', content: sys }, { role: 'user', content: question } ],
                max_tokens: 180, temperature: 0.4
            })
        });
        const d = await r.json();
        if (d.error) return res.status(500).json({ error: d.error.message });
        return res.status(200).json({ success: true, answer: (d && d.choices && d.choices[0] && d.choices[0].message) ? d.choices[0].message.content : 'Xin loi, vui long thu lai.' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}