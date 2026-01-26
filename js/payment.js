        element.innerHTML = '';
        
        // Generate QR code
        QRCode.toCanvas(element, data, {
            width: size,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error('QR Code generation error:', error);
                element.innerHTML = '<p class="text-danger">Lỗi tạo QR code</p>';
            }
        });
        
        return true;
    } catch (error) {
        console.error('QR Code error:', error);
        return false;
    }
},

// Generate payment data for MoMo/ZaloPay
generatePaymentData: function(amount, description, orderId = null) {
    const order = orderId || this.generateOrderId();
    const bankCode = '970422'; // Vietcombank
    
    // Format for MoMo QR
    const momoData = `2|99|${CONFIG.PAYMENT.BANK_ACCOUNT}|TAXI PROMAX|${order}|${amount}|0|0|0|${description}`;
    
    // Format for bank transfer
    const bankData = {
        bank: CONFIG.PAYMENT.BANK_NAME,
        account: CONFIG.PAYMENT.BANK_ACCOUNT,
        holder: CONFIG.PAYMENT.ACCOUNT_HOLDER,
        amount: amount,
        content: order,
        description: description
    };
    
    return {
        orderId: order,
        amount: amount,
        description: description,
        qrData: momoData,
        bankData: bankData,
        timestamp: new Date().toISOString()
    };
},

// Generate unique order ID
generateOrderId: function() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `TAXI-${timestamp.slice(-8)}-${random}`;
},

// Process payment
processPayment: function(paymentData, method = 'qr') {
    return new Promise((resolve, reject) => {
        // Simulate payment processing
        setTimeout(() => {
            // In real app, this would communicate with payment gateway
            const success = Math.random() > 0.1; // 90% success rate for demo
            
            if (success) {
                // Save payment record
                this.savePaymentRecord({
                    ...paymentData,
                    method: method,
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    transactionId: 'TX-' + Date.now()
                });
                
                resolve({
                    success: true,
                    transactionId: 'TX-' + Date.now(),
                    orderId: paymentData.orderId,
                    amount: paymentData.amount,
                    message: 'Thanh toán thành công'
                });
            } else {
                reject({
                    success: false,
                    error: 'PAYMENT_FAILED',
                    message: 'Thanh toán thất bại. Vui lòng thử lại.'
                });
            }
        }, 2000);
    });
},

// Save payment record
savePaymentRecord: function(paymentRecord) {
    try {
        const payments = Storage.load('payment_history', true) || [];
        payments.push(paymentRecord);
        Storage.save('payment_history', payments, true);
        
        // Update statistics
        Storage.saveStatistic('revenue', paymentRecord.amount);
        
        return true;
    } catch (error) {
        console.error('Save payment error:', error);
        return false;
    }
},

// Get payment history
getPaymentHistory: function(limit = 50) {
    try {
        const payments = Storage.load('payment_history', true) || [];
        return payments.slice(0, limit).reverse(); // Newest first
    } catch (error) {
        console.error('Get payment history error:', error);
        return [];
    }
},

// Format payment method
formatPaymentMethod: function(method) {
    const methods = {
        'momo': 'Ví MoMo',
        'zalo': 'Ví ZaloPay',
        'bank': 'Chuyển khoản',
        'cash': 'Tiền mặt',
        'qr': 'QR Code'
    };
    
    return methods[method] || method;
},

// Format payment status
formatPaymentStatus: function(status) {
    const statusMap = {
        'pending': '<span class="badge bg-warning">Chờ thanh toán</span>',
        'completed': '<span class="badge bg-success">Thành công</span>',
        'failed': '<span class="badge bg-danger">Thất bại</span>',
        'cancelled': '<span class="badge bg-secondary">Đã hủy</span>'
    };
    
    return statusMap[status] || status;
},

// Create payment link
createPaymentLink: function(amount, description, packageType = null) {
    const orderId = this.generateOrderId();
    const encodedDescription = encodeURIComponent(description);
    
    let url = `payment.html?amount=${amount}&description=${encodedDescription}&order=${orderId}`;
    
    if (packageType) {
        url += `&package=${packageType}`;
    }
    
    return url;
},

// Verify payment
verifyPayment: function(orderId) {
    // In real app, this would check with payment gateway
    const payments = Storage.load('payment_history', true) || [];
    const payment = payments.find(p => p.orderId === orderId);
    
    if (!payment) {
        return { verified: false, message: 'Không tìm thấy giao dịch' };
    }
    
    return {
        verified: payment.status === 'completed',
        payment: payment,
        message: payment.status === 'completed' ? 'Đã xác nhận thanh toán' : 'Chưa thanh toán'
    };
},

// Generate payment summary for display
generatePaymentSummary: function(paymentData) {
    return {
        amount: Pricing.formatCurrency(paymentData.amount),
        orderId: paymentData.orderId,
        description: paymentData.description,
        timestamp: new Date(paymentData.timestamp).toLocaleString('vi-VN'),
        qrInstructions: `
            1. Mở ứng dụng ngân hàng hoặc ví điện tử
            2. Chọn "Quét mã QR"
            3. Quét mã bên cạnh
            4. Kiểm tra số tiền: ${Pricing.formatCurrency(paymentData.amount)}
            5. Nhập nội dung: ${paymentData.orderId}
            6. Xác nhận thanh toán
        `,
        bankInstructions: `
            Chuyển khoản qua ngân hàng:
            - Ngân hàng: ${CONFIG.PAYMENT.BANK_NAME}
            - Số tài khoản: ${CONFIG.PAYMENT.BANK_ACCOUNT}
            - Chủ tài khoản: ${CONFIG.PAYMENT.ACCOUNT_HOLDER}
            - Số tiền: ${Pricing.formatCurrency(paymentData.amount)}
            - Nội dung: ${paymentData.orderId}
        `
    };
},

// Handle payment callback (for redirect back from payment page)
handlePaymentCallback: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    const status = urlParams.get('status');
    
    if (orderId && status === 'success') {
        // Verify the payment
        const verification = this.verifyPayment(orderId);
        
        if (verification.verified) {
            // Payment successful
            this.showPaymentResult(true, verification.payment);
            return true;
        }
    }
    
    return false;
},

// Show payment result
showPaymentResult: function(success, paymentData = null) {
    // This would typically show a modal or update UI
    console.log('Payment result:', success, paymentData);
    
    if (success && paymentData) {
        // Activate license if this was a package payment
        if (paymentData.description.includes('gói') || paymentData.package) {
            const packageType = paymentData.package || 'BASIC';
            const licenseKey = Security.generateLicense(packageType);
            Security.activateLicense(licenseKey);
            
            // Update package manager
            PackageManager.init();
        }
    }
}
