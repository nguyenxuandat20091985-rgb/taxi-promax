// Taxi Promax v5.1 - Payment Processing
const Payment = {
    generateQRCode: function(data, elementId, size = 200) {
        try {
            const element = document.getElementById(elementId);
            if (!element) return false;
            
            element.innerHTML = '';
            
            QRCode.toCanvas(element, data, {
                width: size,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            }, function(error) {
                if (error) {
                    element.innerHTML = '<p class="text-danger">Lỗi tạo QR code</p>';
                }
            });
            
            return true;
        } catch (error) {
            return false;
        }
    },
    
    generatePaymentData: function(amount, description, orderId = null) {
        const order = orderId || this.generateOrderId();
        const bankCode = '970422';
        
        const momoData = `2|99|123456789|TAXI PROMAX|${order}|${amount}|0|0|0|${description}`;
        
        const bankData = {
            bank: 'Vietcombank',
            account: '123456789',
            holder: 'TAXI PROMAX',
            amount: amount,
            content: order
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
    
    generateOrderId: function() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `TAXI-${timestamp.slice(-8)}-${random}`;
    },
    
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    }
};
