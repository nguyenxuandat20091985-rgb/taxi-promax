// js/payment.js - Module thanh toán Taxi ProMax
class TaxiPayment {
    constructor() {
        this.bankInfo = {
            bank: 'BIDV',
            accountNumber: '4430269669',
            accountName: 'NGUYỄN XUÂN ĐẠT',
            branch: 'Chi nhánh Hà Nội'
        };
        
        this.paymentMethods = [
            { id: 'cash', name: 'Tiền mặt', icon: 'money-bill-wave' },
            { id: 'bank', name: 'Chuyển khoản', icon: 'university' },
            { id: 'momo', name: 'Ví MoMo', icon: 'mobile-alt' },
            { id: 'zalopay', name: 'ZaloPay', icon: 'bolt' }
        ];
        
        this.paymentHistory = [];
        this.qrCodeCache = {};
        
        this.init();
    }
    
    async init() {
        console.log('💰 Khởi động module thanh toán Taxi ProMax...');
        
        // Load lịch sử thanh toán
        this.loadPaymentHistory();
        
        // Khởi tạo UI
        this.initUI();
        
        console.log('✅ Module thanh toán đã sẵn sàng');
    }
    
    // Tạo mã QR VietQR
    async generateVietQR(amount, description = '', customerId = '') {
        const template = `00020101021238570010A00000072701230006970422011044302696690208QRIBFTTA53037045405${amount}5802VN6210${this.formatDescription(description, customerId)}6304`;
        
        // Tính checksum
        const checksum = this.calculateCRC16(template);
        const qrData = template + checksum;
        
        // Cache QR code
        const cacheKey = `${amount}-${description}`;
        this.qrCodeCache[cacheKey] = qrData;
        
        return {
            qrData: qrData,
            bankInfo: this.bankInfo,
            amount: amount,
            description: description,
            customerId: customerId
        };
    }
    
    // Format description cho QR
    formatDescription(description, customerId) {
        let desc = '';
        if (customerId) {
            desc += `KH${customerId}`;
        }
        if (description) {
            if (desc) desc += '_';
            desc += description.substring(0, 20);
        }
        
        // Đảm bảo độ dài 10 ký tự
        while (desc.length < 10) {
            desc += 'X';
        }
        
        return desc.substring(0, 10);
    }
    
    // Tính CRC16 cho QR code
    calculateCRC16(data) {
        const polynomial = 0x1021;
        let crc = 0xFFFF;
        
        for (let i = 0; i < data.length; i++) {
            crc ^= data.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ polynomial;
                } else {
                    crc = crc << 1;
                }
            }
        }
        
        crc = crc & 0xFFFF;
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }
    
    // Tạo QR code bằng QRCode.js (fallback)
    generateQRCode(elementId, qrData, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Xóa QR cũ
        element.innerHTML = '';
        
        // Kích thước QR
        const size = options.size || 200;
        const color = options.color || '#000000';
        const bgColor = options.bgColor || '#ffffff';
        
        // Sử dụng thư viện QRCode nếu có
        if (typeof QRCode !== 'undefined') {
            new QRCode(element, {
                text: qrData,
                width: size,
                height: size,
                colorDark: color,
                colorLight: bgColor,
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            // Fallback: Hiển thị thông tin text
            element.innerHTML = `
                <div class="qr-fallback">
                    <div class="qr-info">
                        <h4><i class="fas fa-qrcode"></i> Thông tin thanh toán</h4>
                        <p><strong>Ngân hàng:</strong> ${this.bankInfo.bank}</p>
                        <p><strong>Số tài khoản:</strong> ${this.bankInfo.accountNumber}</p>
                        <p><strong>Chủ tài khoản:</strong> ${this.bankInfo.accountName}</p>
                        <p><strong>Số tiền:</strong> ${options.amount ? options.amount.toLocaleString('vi-VN') + 'đ' : '--'}</p>
                        <p><strong>Nội dung:</strong> ${options.description || '--'}</p>
                    </div>
                    <p class="qr-note"><i class="fas fa-info-circle"></i> Quét QR code bằng app ngân hàng</p>
                </div>
            `;
        }
    }
    
    // Xử lý thanh toán
    async processPayment(tripId, amount, method, customerInfo = {}) {
        const paymentId = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        const payment = {
            id: paymentId,
            tripId: tripId,
            amount: amount,
            method: method,
            customerInfo: customerInfo,
            timestamp: new Date(),
            status: 'pending',
            reference: ''
        };
        
        console.log('💳 Xử lý thanh toán:', payment);
        
        // Thêm vào lịch sử
        this.paymentHistory.push(payment);
        
        // Xử lý theo phương thức
        let result;
        switch (method) {
            case 'bank':
                result = await this.processBankTransfer(payment);
                break;
            case 'cash':
                result = await this.processCashPayment(payment);
                break;
            case 'momo':
                result = await this.processMomoPayment(payment);
                break;
            case 'zalopay':
                result = await this.processZaloPayment(payment);
                break;
            default:
                result = { success: false, message: 'Phương thức thanh toán không hợp lệ' };
        }
        
        // Cập nhật trạng thái
        payment.status = result.success ? 'completed' : 'failed';
        payment.reference = result.reference || '';
        payment.completedAt = new Date();
        
        // Lưu lịch sử
        this.savePaymentHistory();
        
        // Cập nhật UI
        this.updatePaymentUI(payment);
        
        return {
            ...payment,
            result: result
        };
    }
    
    // Xử lý chuyển khoản ngân hàng
    async processBankTransfer(payment) {
        try {
            // Tạo QR code
            const qrInfo = await this.generateVietQR(
                payment.amount,
                `TaxiProMax ${payment.tripId}`,
                payment.customerInfo.id || ''
            );
            
            // Hiển thị QR code
            this.showQRCodeModal(qrInfo, payment);
            
            return {
                success: true,
                message: 'Đã tạo QR code chuyển khoản',
                reference: `BANK-${Date.now()}`,
                qrInfo: qrInfo
            };
        } catch (error) {
            console.error('❌ Lỗi chuyển khoản:', error);
            return {
                success: false,
                message: 'Lỗi tạo QR code: ' + error.message
            };
        }
    }
    
    // Xử lý thanh toán tiền mặt
    async processCashPayment(payment) {
        // Mô phỏng delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            success: true,
            message: 'Thanh toán tiền mặt thành công',
            reference: `CASH-${Date.now()}`
        };
    }
    
    // Xử lý thanh toán MoMo
    async processMomoPayment(payment) {
        // Mô phỏng API MoMo
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Giả lập thành công 80%
        const success = Math.random() > 0.2;
        
        if (success) {
            return {
                success: true,
                message: 'Thanh toán MoMo thành công',
                reference: `MOMO-${Date.now()}`,
                deepLink: `momo://payment?amount=${payment.amount}&reference=${payment.tripId}`
            };
        } else {
            return {
                success: false,
                message: 'Thanh toán MoMo thất bại. Vui lòng thử lại.'
            };
        }
    }
    
    // Xử lý thanh toán ZaloPay
    async processZaloPayment(payment) {
        // Mô phỏng API ZaloPay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Giả lập thành công 85%
        const success = Math.random() > 0.15;
        
        if (success) {
            return {
                success: true,
                message: 'Thanh toán ZaloPay thành công',
                reference: `ZALO-${Date.now()}`,
                deepLink: `zalopay://payment?amount=${payment.amount}&order=${payment.tripId}`
            };
        } else {
            return {
                success: false,
                message: 'Thanh toán ZaloPay thất bại. Vui lòng thử lại.'
            };
        }
    }
    
    // Hiển thị modal QR code
    showQRCodeModal(qrInfo, payment) {
        const modalHTML = `
            <div class="qr-modal">
                <div class="qr-header">
                    <h3><i class="fas fa-qrcode"></i> Thanh toán qua VietQR</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="qr-body">
                    <div class="qr-code-container" id="qr-code-display">
                        <!-- QR code sẽ được tạo ở đây -->
                    </div>
                    
                    <div class="bank-info">
                        <h4><i class="fas fa-university"></i> Thông tin ngân hàng</h4>
                        <table>
                            <tr>
                                <td><strong>Ngân hàng:</strong></td>
                                <td>${this.bankInfo.bank}</td>
                            </tr>
                            <tr>
                                <td><strong>Số tài khoản:</strong></td>
                                <td class="account-number">${this.bankInfo.accountNumber}</td>
                            </tr>
                            <tr>
                                <td><strong>Chủ tài khoản:</strong></td>
                                <td>${this.bankInfo.accountName}</td>
                            </tr>
                            <tr>
                                <td><strong>Chi nhánh:</strong></td>
                                <td>${this.bankInfo.branch}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="payment-details">
                        <h4><i class="fas fa-receipt"></i> Chi tiết thanh toán</h4>
                        <table>
                            <tr>
                                <td><strong>Số tiền:</strong></td>
                                <td class="amount">${payment.amount.toLocaleString('vi-VN')}đ</td>
                            </tr>
                            <tr>
                                <td><strong>Mã chuyến:</strong></td>
                                <td>${payment.tripId}</td>
                            </tr>
                            <tr>
                                <td><strong>Nội dung:</strong></td>
                                <td>TaxiProMax ${payment.tripId}</td>
                            </tr>
                            <tr>
                                <td><strong>Thời gian:</strong></td>
                                <td>${new Date().toLocaleString('vi-VN')}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="instructions">
                        <h5><i class="fas fa-info-circle"></i> Hướng dẫn thanh toán:</h5>
                        <ol>
                            <li>Mở app ngân hàng trên điện thoại</li>
                            <li>Chọn tính năng "Quét mã QR"</li>
                            <li>Quét mã QR bên trên</li>
                            <li>Kiểm tra thông tin và xác nhận thanh toán</li>
                            <li>Giữ lại biên lai điện tử</li>
                        </ol>
                    </div>
                </div>
                <div class="qr-footer">
                    <button class="btn-copy-bank" onclick="copyToClipboard('${this.bankInfo.accountNumber}')">
                        <i class="fas fa-copy"></i> Copy số tài khoản
                    </button>
                    <button class="btn-print-qr" onclick="printQR()">
                        <i class="fas fa-print"></i> In QR code
                    </button>
                    <button class="btn-close-qr">
                        <i class="fas fa-check"></i> Đã thanh toán
                    </button>
                </div>
            </div>
        `;
        
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'qr-modal-container';
        modal.innerHTML = modalHTML;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        modal.querySelector('.qr-modal').style.cssText = `
            background: white;
            border-radius: 15px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 15px 40px rgba(0,0,0,0.5);
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(modal);
        
        // Tạo QR code
        setTimeout(() => {
            this.generateQRCode('qr-code-display', qrInfo.qrData, {
                size: 200,
                amount: payment.amount,
                description: `TaxiProMax ${payment.tripId}`
            });
        }, 100);
        
        // Xử lý sự kiện đóng modal
        const closeBtn = modal.querySelector('.close-modal');
        const closeQrBtn = modal.querySelector('.btn-close-qr');
        
        const closeModal = () => {
            modal.remove();
            
            // Kiểm tra thanh toán (trong thực tế sẽ kiểm tra từ server)
            setTimeout(() => {
                if (window.taxiOperation && payment.tripId) {
                    // Tự động xác nhận thanh toán sau 3 giây (demo)
                    this.confirmPayment(payment.id);
                }
            }, 3000);
        };
        
        closeBtn.onclick = closeModal;
        closeQrBtn.onclick = closeModal;
        
        // Thêm phím ESC để đóng
        const escHandler = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', escHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Lưu lại modal để có thể đóng sau
        this.currentQRModal = modal;
    }
    
    // Xác nhận thanh toán
    confirmPayment(paymentId) {
        const payment = this.paymentHistory.find(p => p.id === paymentId);
        if (payment && payment.status === 'pending') {
            payment.status = 'completed';
            payment.completedAt = new Date();
            
            this.savePaymentHistory();
            this.showNotification(`Đã xác nhận thanh toán ${paymentId}`, 'success');
            
            // Cập nhật UI
            this.updatePaymentUI(payment);
            
            return true;
        }
        return false;
    }
    
    // Lưu lịch sử thanh toán
    savePaymentHistory() {
        try {
            localStorage.setItem('taxi_payment_history', JSON.stringify(this.paymentHistory));
        } catch (error) {
            console.error('❌ Lỗi lưu lịch sử thanh toán:', error);
        }
    }
    
    // Load lịch sử thanh toán
    loadPaymentHistory() {
        try {
            const savedHistory = localStorage.getItem('taxi_payment_history');
            if (savedHistory) {
                this.paymentHistory = JSON.parse(savedHistory);
                console.log('💰 Đã load lịch sử thanh toán:', this.paymentHistory.length, 'giao dịch');
            }
        } catch (error) {
            console.error('❌ Lỗi load lịch sử thanh toán:', error);
        }
    }
    
    // Khởi tạo UI
    initUI() {
        this.createPaymentUI();
    }
    
    // Tạo UI thanh toán
    createPaymentUI() {
        const paymentHTML = `
            <div class="payment-panel" id="payment-panel">
                <h3><i class="fas fa-credit-card"></i> Hệ thống thanh toán</h3>
                
                <div class="payment-methods">
                    <h4><i class="fas fa-wallet"></i> Phương thức thanh toán</h4>
                    <div class="methods-grid">
                        ${this.paymentMethods.map(method => `
                            <div class="method-card" data-method="${method.id}" onclick="taxiPayment.selectMethod('${method.id}')">
                                <div class="method-icon">
                                    <i class="fas fa-${method.icon}"></i>
                                </div>
                                <div class="method-name">${method.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="payment-form hidden" id="payment-form">
                    <h4>Thanh toán chuyến đi</h4>
                    <form id="process-payment-form">
                        <div class="form-group">
                            <label>Mã chuyến đi:</label>
                            <input type="text" id="payment-tripId" placeholder="Nhập mã chuyến đi" required>
                        </div>
                        <div class="form-group">
                            <label>Số tiền (VNĐ):</label>
                            <input type="number" id="payment-amount" placeholder="Nhập số tiền" required min="1000" step="1000">
                        </div>
                        <div class="form-group">
                            <label>Thông tin khách hàng:</label>
                            <input type="text" id="payment-customer" placeholder="Tên hoặc số điện thoại">
                        </div>
                        <div class="form-group">
                            <label>Ghi chú:</label>
                            <textarea id="payment-note" placeholder="Ghi chú thanh toán" rows="2"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-process-payment">
                                <i class="fas fa-check"></i> Xác nhận thanh toán
                            </button>
                            <button type="button" class="btn-cancel-payment" onclick="taxiPayment.cancelPayment()">
                                <i class="fas fa-times"></i> Hủy
                            </button>
                        </div>
                    </form>
                </div>
                
                <div class="payment-history">
                    <h4><i class="fas fa-history"></i> Lịch sử thanh toán gần đây</h4>
                    <div class="history-list" id="payment-history-list">
                        <!-- Hiển thị bằng JS -->
                    </div>
                </div>
            </div>
        `;
        
        // Thêm vào trang nếu chưa có
        if (!document.getElementById('payment-panel')) {
            const container = document.querySelector('.main-content');
            if (container) {
                const div = document.createElement('div');
                div.innerHTML = paymentHTML;
                container.appendChild(div);
            }
        }
        
        // Thêm event listener
        setTimeout(() => {
            const form = document.getElementById('process-payment-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.processPaymentFromForm();
                });
            }
            
            // Load lịch sử
            this.renderPaymentHistory();
        }, 100);
    }
    
    // Chọn phương thức thanh toán
    selectMethod(methodId) {
        // Cập nhật UI
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-method="${methodId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Hiển thị form
        document.getElementById('payment-form').classList.remove('hidden');
        
        // Tự động điền thông tin nếu có chuyến đi đang hoạt động
        if (window.taxiOperation && window.taxiOperation.currentTrip) {
            const trip = window.taxiOperation.currentTrip;
            document.getElementById('payment-tripId').value = trip.id;
            
            if (trip.fare) {
                document.getElementById('payment-amount').value = trip.fare.total;
            }
        }
        
        this.selectedMethod = methodId;
        console.log('✅ Đã chọn phương thức:', methodId);
    }
    
    // Xử lý thanh toán từ form
    async processPaymentFromForm() {
        const tripId = document.getElementById('payment-tripId').value;
        const amount = parseInt(document.getElementById('payment-amount').value);
        const customer = document.getElementById('payment-customer').value;
        const note = document.getElementById('payment-note').value;
        
        if (!tripId || !amount || !this.selectedMethod) {
            this.showNotification('Vui lòng điền đầy đủ thông tin!', 'warning');
            return;
        }
        
        const customerInfo = {
            name: customer || 'Khách vãng lai',
            note: note
        };
        
        // Xử lý thanh toán
        const result = await this.processPayment(tripId, amount, this.selectedMethod, customerInfo);
        
        // Reset form
        document.getElementById('process-payment-form').reset();
        document.getElementById('payment-form').classList.add('hidden');
        
        // Cập nhật lịch sử
        this.renderPaymentHistory();
        
        // Hiển thị kết quả
        if (result.result.success) {
            this.showNotification(`Thanh toán thành công! Mã: ${result.id}`, 'success');
        } else {
            this.showNotification(`Thanh toán thất bại: ${result.result.message}`, 'error');
        }
    }
    
    // Hủy thanh toán
    cancelPayment() {
        document.getElementById('payment-form').classList.add('hidden');
        document.getElementById('process-payment-form').reset();
        
        document.querySelectorAll('.method-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.selectedMethod = null;
    }
    
    // Render lịch sử thanh toán
    renderPaymentHistory() {
        const container = document.getElementById('payment-history-list');
        if (!container) return;
        
        // Sắp xếp theo thời gian mới nhất
        const recentPayments = [...this.paymentHistory]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        if (recentPayments.length === 0) {
            container.innerHTML = '<p class="no-history">Chưa có giao dịch nào</p>';
            return;
        }
        
        container.innerHTML = recentPayments.map(payment => `
            <div class="history-item ${payment.status}">
                <div class="history-header">
                    <span class="payment-id">${payment.id}</span>
                    <span class="payment-status ${payment.status}">${this.getStatusText(payment.status)}</span>
                </div>
                <div class="history-body">
                    <p><strong>Chuyến:</strong> ${payment.tripId}</p>
                    <p><strong>Số tiền:</strong> ${payment.amount.toLocaleString('vi-VN')}đ</p>
                    <p><strong>Phương thức:</strong> ${this.getMethodText(payment.method)}</p>
                    <p><strong>Thời gian:</strong> ${new Date(payment.timestamp).toLocaleString('vi-VN')}</p>
                </div>
                ${payment.reference ? `<div class="history-footer"><small>Mã tham chiếu: ${payment.reference}</small></div>` : ''}
            </div>
        `).join('');
    }
    
    // Cập nhật UI thanh toán
    updatePaymentUI(payment) {
        // Cập nhật lịch sử
        this.renderPaymentHistory();
        
        // Hiển thị thông báo
        if (payment.status === 'completed') {
            this.showNotification(`Đã xác nhận thanh toán ${payment.id}`, 'success');
        }
    }
    
    // Hiển thị thông báo
    showNotification(message, type = 'info') {
        if (window.taxiSecurity && window.taxiSecurity.showNotification) {
            window.taxiSecurity.showNotification(message, type);
        } else {
            alert(message);
        }
    }
    
    // Helper methods
    getStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'completed': 'Hoàn thành',
            'failed': 'Thất bại'
        };
        return statusMap[status] || status;
    }
    
    getMethodText(method) {
        const methodMap = {
            'cash': 'Tiền mặt',
            'bank': 'Chuyển khoản',
            'momo': 'MoMo',
            'zalopay': 'ZaloPay'
        };
        return methodMap[method] || method;
    }
    
    // API public
    getPaymentMethods() {
        return this.paymentMethods;
    }
    
    getPaymentHistory() {
        return this.paymentHistory;
    }
    
    generateBankQR(amount, description, customerId) {
        return this.generateVietQR(amount, description, customerId);
    }
}

// Khởi tạo toàn cục
window.taxiPayment = new TaxiPayment();

// Helper functions toàn cục
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        if (window.taxiPayment) {
            window.taxiPayment.showNotification('Đã copy số tài khoản!', 'success');
        }
    }).catch(err => {
        console.error('❌ Lỗi copy:', err);
    });
}

function printQR() {
    window.print();
}