// Taxi Promax v5.1 - Payment System
const PaymentSystem = {
    // Payment configuration
    config: {
        ZALOPAY: {
            name: 'ZaloPay',
            account: '0987654321',
            qrTemplate: 'https://qr.zalopay.vn/TPVNTaxiPromax',
            format: '2|99|{account}|TAXI PROMAX|{order}|{amount}|0|0|0|{description}'
        },
        BIDV: {
            name: 'Ngân hàng BIDV',
            account: '4430269669',
            holder: 'NGUYỄN XUÂN ĐẠT',
            branch: 'Chi nhánh Hà Nội',
            qrTemplate: 'https://img.vietqr.io/image/BIDV-4430269669-compact2.jpg'
        },
        MOMO: {
            name: 'Ví MoMo',
            account: '0987654321',
            qrTemplate: 'https://qr.momo.vn/TPVNTaxiPromax'
        }
    },
    
    // Initialize payment system
    init: function() {
        console.log('Payment System initialized');
        
        // Load saved payment methods
        this.loadSavedMethods();
        
        // Setup event listeners
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        // Payment method selection
        document.getElementById('payment-method')?.addEventListener('change', (e) => {
            this.updatePaymentDetails(e.target.value);
        });
        
        // Generate payment button
        document.getElementById('btn-generate-payment')?.addEventListener('click', () => {
            this.generatePayment();
        });
        
        // Package duration selection
        document.querySelectorAll('input[name="package-duration"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updatePackagePrice();
            });
        });
    },
    
    // Generate payment
    generatePayment: function() {
        const method = document.getElementById('payment-method').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const packageType = document.getElementById('payment-package').value;
        const duration = document.querySelector('input[name="package-duration"]:checked')?.value || 'monthly';
        
        if (!amount || amount <= 0) {
            this.showMessage('Vui lòng nhập số tiền hợp lệ', 'danger');
            return;
        }
        
        // Generate order ID
        const orderId = this.generateOrderId();
        
        // Create payment data
        const paymentData = {
            orderId: orderId,
            amount: amount,
            package: packageType,
            duration: duration,
            method: method,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };
        
        // Update UI
        this.updatePaymentDisplay(paymentData);
        
        // Generate QR code
        this.generateQRCode(paymentData, method);
        
        // Save payment record
        this.savePaymentRecord(paymentData);
        
        this.showMessage(`Đã tạo yêu cầu thanh toán #${orderId}`, 'success');
    },
    
    // Update payment details based on method
    updatePaymentDetails: function(method) {
        const detailsDiv = document.getElementById('payment-details');
        if (!detailsDiv) return;
        
        const config = this.config[method] || this.config.BIDV;
        
        let html = '';
        
        switch(method) {
            case 'ZALOPAY':
                html = `
                    <div class="alert alert-info">
                        <h6><i class="fab fa-zalo"></i> Hướng dẫn thanh toán ZaloPay:</h6>
                        <ol class="small">
                            <li>Mở ứng dụng <strong>ZaloPay</strong> trên điện thoại</li>
                            <li>Chọn <strong>"Quét mã"</strong> hoặc "Thanh toán"</li>
                            <li>Quét mã QR bên cạnh</li>
                            <li>Kiểm tra số tiền và thông tin</li>
                            <li>Xác nhận thanh toán</li>
                            <li>Giữ lại mã giao dịch để đối chiếu</li>
                        </ol>
                        <p class="mb-0"><strong>Số điện thoại:</strong> ${config.account}</p>
                    </div>
                `;
                break;
                
            case 'BIDV':
                html = `
                    <div class="alert alert-success">
                        <h6><i class="fas fa-university"></i> Thông tin chuyển khoản BIDV:</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Ngân hàng:</th>
                                <td><strong>BIDV</strong> (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)</td>
                            </tr>
                            <tr>
                                <th>Số tài khoản:</th>
                                <td><strong class="text-danger">${config.account}</strong></td>
                            </tr>
                            <tr>
                                <th>Chủ tài khoản:</th>
                                <td><strong>${config.holder}</strong></td>
                            </tr>
                            <tr>
                                <th>Chi nhánh:</th>
                                <td>${config.branch}</td>
                            </tr>
                            <tr>
                                <th>Nội dung CK:</th>
                                <td><code id="payment-content">TAXI-{ORDER_ID}</code></td>
                            </tr>
                        </table>
                        <p class="small text-muted mb-0">Sau khi chuyển khoản, vui lòng nhấn "Tôi đã thanh toán"</p>
                    </div>
                `;
                break;
                
            case 'MOMO':
                html = `
                    <div class="alert alert-pink">
                        <h6><i class="fas fa-wallet"></i> Hướng dẫn thanh toán MoMo:</h6>
                        <ol class="small">
                            <li>Mở ứng dụng <strong>MoMo</strong></li>
                            <li>Chọn <strong>"Quét mã QR"</strong></li>
                            <li>Quét mã QR bên cạnh</li>
                            <li>Nhập số tiền chính xác</li>
                            <li>Thêm nội dung: <code>TAXI-{ORDER_ID}</code></li>
                            <li>Xác nhận thanh toán</li>
                        </ol>
                        <p class="mb-0"><strong>Số điện thoại:</strong> ${config.account}</p>
                    </div>
                `;
                break;
        }
        
        detailsDiv.innerHTML = html;
    },
    
    // Generate QR Code
    generateQRCode: function(paymentData, method) {
        const qrElement = document.getElementById('qrcode');
        if (!qrElement) return;
        
        qrElement.innerHTML = '';
        
        let qrData = '';
        const config = this.config[method] || this.config.BIDV;
        
        switch(method) {
            case 'ZALOPAY':
                qrData = `2|99|${config.account}|TAXI PROMAX|${paymentData.orderId}|${paymentData.amount}|0|0|0|Thanh toan goi ${paymentData.package}`;
                break;
                
            case 'BIDV':
                // QR code for bank transfer (using Vietnam QR code standard)
                qrData = this.generateVietQR({
                    bank: 'BIDV',
                    account: config.account,
                    amount: paymentData.amount,
                    content: paymentData.orderId,
                    holder: config.holder
                });
                break;
                
            case 'MOMO':
                qrData = `2|99|${config.account}|TAXI PROMAX|${paymentData.orderId}|${paymentData.amount}|0|0|0|Taxi Promax`;
                break;
                
            default:
                qrData = `${config.name}|${config.account}|${paymentData.amount}|${paymentData.orderId}`;
        }
        
        // Generate QR code
        QRCode.toCanvas(qrElement, qrData, {
            width: 250,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
        }, function(error) {
            if (error) {
                qrElement.innerHTML = `
                    <div class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                        <p>Lỗi tạo QR code</p>
                    </div>
                `;
            }
        });
        
        // Update payment content
        const contentElement = document.getElementById('payment-content');
        if (contentElement) {
            contentElement.textContent = paymentData.orderId;
        }
    },
    
    // Generate Vietnam QR Code standard
    generateVietQR: function(data) {
        // Simplified VietQR format
        return `00020101021238570010A000000727012400069704220113${data.account}0208QRIBFTTA53037045404${data.amount}5802VN62100812${data.content}6304`;
    },
    
    // Update payment display
    updatePaymentDisplay: function(paymentData) {
        // Update order info
        document.getElementById('payment-order-id').textContent = paymentData.orderId;
        document.getElementById('payment-amount-display').textContent = 
            this.formatCurrency(paymentData.amount);
        document.getElementById('payment-package-display').textContent = 
            paymentData.package.toUpperCase();
        document.getElementById('payment-duration-display').textContent = 
            this.getDurationText(paymentData.duration);
        
        // Show payment info
        document.getElementById('payment-info').innerHTML = `
            <div class="alert alert-light">
                <p class="mb-1"><strong>Mã đơn hàng:</strong> ${paymentData.orderId}</p>
                <p class="mb-1"><strong>Số tiền:</strong> ${this.formatCurrency(paymentData.amount)}</p>
                <p class="mb-1"><strong>Gói:</strong> ${paymentData.package.toUpperCase()} - ${this.getDurationText(paymentData.duration)}</p>
                <p class="mb-0"><strong>Thời gian:</strong> ${new Date(paymentData.timestamp).toLocaleString('vi-VN')}</p>
            </div>
        `;
    },
    
    // Generate unique order ID
    generateOrderId: function() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `TAXI-${timestamp.slice(-8)}-${random}`;
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Get duration text
    getDurationText: function(duration) {
        const texts = {
            'monthly': 'Hàng tháng',
            'yearly': 'Hàng năm',
            'lifetime': 'Trọn đời'
        };
        return texts[duration] || duration;
    },
    
    // Update package price based on selection
    updatePackagePrice: function() {
        const packageType = document.getElementById('payment-package').value;
        const duration = document.querySelector('input[name="package-duration"]:checked')?.value || 'monthly';
        const pkg = CONFIG.PACKAGES[packageType.toUpperCase()];
        
        if (pkg && pkg.pricing[duration]) {
            const amount = pkg.pricing[duration];
            document.getElementById('payment-amount').value = amount;
            
            // Update display
            document.getElementById('amount-display').textContent = this.formatCurrency(amount);
        }
    },
    
    // Save payment record
    savePaymentRecord: function(paymentData) {
        try {
            const payments = JSON.parse(localStorage.getItem('payment_history') || '[]');
            payments.push(paymentData);
            localStorage.setItem('payment_history', JSON.stringify(payments));
            return true;
        } catch (error) {
            console.error('Save payment error:', error);
            return false;
        }
    },
    
    // Load saved payment methods
    loadSavedMethods: function() {
        // Check for saved preferences
        const savedMethod = localStorage.getItem('preferred_payment_method') || 'BIDV';
        const select = document.getElementById('payment-method');
        if (select) {
            select.value = savedMethod;
            this.updatePaymentDetails(savedMethod);
        }
    },
    
    // Verify payment (simulated)
    verifyPayment: function(orderId) {
        return new Promise((resolve) => {
            // Simulate API call
            setTimeout(() => {
                const success = Math.random() > 0.2; // 80% success rate
                resolve({
                    verified: success,
                    message: success ? 'Thanh toán thành công' : 'Chưa nhận được thanh toán',
                    transactionId: success ? 'TX-' + Date.now() : null
                });
            }, 2000);
        });
    },
    
    // Process payment callback
    processPaymentCallback: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order');
        const status = urlParams.get('status');
        
        if (orderId && status === 'success') {
            // Show success message
            document.getElementById('payment-process').style.display = 'none';
            document.getElementById('payment-success').style.display = 'block';
            
            // Activate license
            this.activateLicenseFromPayment(orderId);
            
            return true;
        }
        
        return false;
    },
    
    // Activate license from payment
    activateLicenseFromPayment: async function(orderId) {
        try {
            // Get payment data
            const payments = JSON.parse(localStorage.getItem('payment_history') || '[]');
            const payment = payments.find(p => p.orderId === orderId);
            
            if (!payment) return;
            
            // Create license
            const licenseData = {
                key: 'ACTIVATED-' + orderId,
                package: payment.package.toUpperCase(),
                duration: payment.duration,
                amount: payment.amount,
                activated: new Date().toISOString(),
                expires: this.calculateExpiryDate(payment.duration),
                transactionId: 'TX-' + Date.now(),
                paymentMethod: payment.method
            };
            
            // Save license
            localStorage.setItem('taxi_license', JSON.stringify(licenseData));
            
            // Update package manager
            PackageManager.init();
            
            // Show success
            this.showMessage(`Kích hoạt thành công gói ${payment.package.toUpperCase()}!`, 'success');
            
        } catch (error) {
            console.error('License activation error:', error);
        }
    },
    
    // Calculate expiry date
    calculateExpiryDate: function(duration) {
        const now = new Date();
        switch(duration) {
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
            case 'yearly':
                return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
            case 'lifetime':
                return new Date(now.setFullYear(now.getFullYear() + 100)).toISOString();
            default:
                return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
        }
    },
    
    // Show message
    showMessage: function(message, type = 'info') {
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        document.getElementById('messageModalBody').innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;
        modal.show();
    }
};

// Add payment modals to HTML
document.addEventListener('DOMContentLoaded', function() {
    // Add message modal
    if (!document.getElementById('messageModal')) {
        const modalHtml = `
            <div class="modal fade" id="messageModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Thông báo</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="messageModalBody"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // Initialize payment system
    PaymentSystem.init();
});
