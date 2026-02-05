// js/payment.js - Module Payment & Packages
class PaymentManager {
    constructor(taxiSystem) {
        this.taxiSystem = taxiSystem;
        this.selectedPackage = null;
        this.pendingTransaction = null;
    }
    
    // ==================== PAYMENT INFO ====================
    async copyPaymentInfo() {
        try {
            if (!this.taxiSystem.selectedPackage) {
                this.taxiSystem.showError("Vui lòng chọn gói cước trước!");
                return;
            }
            
            const content = document.getElementById('qrContent').textContent;
            const bankInfo = `💳 THÔNG TIN CHUYỂN KHOẢN
🏦 Ngân hàng: BIDV
📱 Số tài khoản: 4430269669
👤 Chủ tài khoản: NGUYỄN XUÂN ĐẠT
💰 Số tiền: ${this.taxiSystem.selectedPackage.price.toLocaleString('vi-VN')}đ
📝 Nội dung: ${content}`;
            
            await navigator.clipboard.writeText(bankInfo);
            return true;
            
        } catch (error) {
            console.error('Copy payment info error:', error);
            this.taxiSystem.showError("Không thể sao chép: " + error.message);
            return false;
        }
    }
    
    // ==================== ZALO INTEGRATION ====================
    prepareZaloMessage() {
        try {
            if (!this.taxiSystem.selectedPackage) {
                throw new Error("Chưa chọn gói cước");
            }
            
            const transCode = document.getElementById('transactionCode').value.trim();
            if (!transCode) {
                throw new Error("Chưa có mã giao dịch");
            }
            
            const message = `[TAXI PROMAX - YÊU CẦU KÍCH HOẠT]
👤 Mã tài xế: ${this.taxiSystem.driverId}
📦 Gói cước: ${this.taxiSystem.selectedPackage.name}
💰 Số tiền: ${this.taxiSystem.selectedPackage.price.toLocaleString('vi-VN')}đ
🔢 Mã giao dịch: ${transCode}
📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}
⏰ Giờ: ${new Date().toLocaleTimeString('vi-VN')}`;
            
            // Cập nhật thông tin trong modal Zalo
            document.getElementById('zaloDriverId').textContent = this.taxiSystem.driverId;
            document.getElementById('zaloPackage').textContent = this.taxiSystem.selectedPackage.name;
            document.getElementById('zaloAmount').textContent = this.taxiSystem.selectedPackage.price.toLocaleString('vi-VN') + 'đ';
            document.getElementById('zaloTransCode').textContent = transCode;
            
            return message;
            
        } catch (error) {
            console.error('Prepare Zalo message error:', error);
            throw error;
        }
    }
    
    async copyZaloMessage() {
        try {
            const message = this.prepareZaloMessage();
            await navigator.clipboard.writeText(message);
            return true;
            
        } catch (error) {
            console.error('Copy Zalo message error:', error);
            this.taxiSystem.showError("Không thể tạo tin nhắn: " + error.message);
            return false;
        }
    }
    
    prepareSupportMessage() {
        const message = `[TAXI PROMAX - CẦN HỖ TRỢ]
👤 Mã tài xế: ${this.taxiSystem.driverId}
📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}
⏰ Giờ: ${new Date().toLocaleTimeString('vi-VN')}
❓ Vấn đề cần hỗ trợ: [Mô tả vấn đề của bạn]`;
        
        return message;
    }
    
    async copySupportMessage() {
        try {
            const message = this.prepareSupportMessage();
            await navigator.clipboard.writeText(message);
            return true;
        } catch (error) {
            console.error('Copy support message error:', error);
            this.taxiSystem.showError("Không thể tạo tin nhắn hỗ trợ: " + error.message);
            return false;
        }
    }
    
    // ==================== PAYMENT VERIFICATION ====================
    async verifyPayment(transactionCode) {
        try {
            if (!transactionCode) {
                throw new Error("Vui lòng nhập mã giao dịch");
            }
            
            if (!this.taxiSystem.selectedPackage) {
                throw new Error("Vui lòng chọn gói cước trước");
            }
            
            // Trong thực tế, đây sẽ là API call đến server
            // Hiện tại mô phỏng xác thực
            
            const isValid = await this.simulatePaymentVerification(transactionCode);
            
            if (isValid) {
                // Kích hoạt gói thành công
                const activatedPackage = this.taxiSystem.activatePackage(this.taxiSystem.selectedPackage);
                
                // Xóa pending transaction
                localStorage.removeItem('pending_transaction');
                this.pendingTransaction = null;
                
                return {
                    success: true,
                    package: activatedPackage,
                    message: "Kích hoạt gói thành công!"
                };
            } else {
                return {
                    success: false,
                    message: "Không tìm thấy giao dịch. Vui lòng kiểm tra lại mã hoặc đợi vài phút."
                };
            }
            
        } catch (error) {
            console.error('Payment verification error:', error);
            return {
                success: false,
                message: "Lỗi xác thực thanh toán: " + error.message
            };
        }
    }
    
    async simulatePaymentVerification(transactionCode) {
        // Mô phỏng xác thực thanh toán
        // Trong thực tế, đây sẽ là API call đến server
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // Giả lập 90% thành công cho demo
                const isSuccess = Math.random() > 0.1;
                
                // Kiểm tra mã giao dịch có format hợp lệ
                const isValidFormat = /^TAXI\d{10,}$/.test(transactionCode);
                
                resolve(isSuccess && isValidFormat);
            }, 1500);
        });
    }
    
    // ==================== TRANSACTION HISTORY ====================
    saveTransaction(transactionData) {
        try {
            let transactions = JSON.parse(localStorage.getItem('payment_transactions') || '[]');
            
            transactionData.timestamp = Date.now();
            transactionData.status = 'pending'; // pending, completed, failed
            
            transactions.unshift(transactionData);
            
            // Giới hạn lưu 50 giao dịch gần nhất
            if (transactions.length > 50) {
                transactions = transactions.slice(0, 50);
            }
            
            localStorage.setItem('payment_transactions', JSON.stringify(transactions));
            
            return transactionData;
            
        } catch (error) {
            console.error('Save transaction error:', error);
            return null;
        }
    }
    
    getTransactionHistory() {
        try {
            return JSON.parse(localStorage.getItem('payment_transactions') || '[]');
        } catch (error) {
            console.error('Get transaction history error:', error);
            return [];
        }
    }
    
    updateTransactionStatus(transactionId, status) {
        try {
            let transactions = JSON.parse(localStorage.getItem('payment_transactions') || '[]');
            
            const transaction = transactions.find(t => t.id === transactionId);
            if (transaction) {
                transaction.status = status;
                transaction.updated = Date.now();
                localStorage.setItem('payment_transactions', JSON.stringify(transactions));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Update transaction status error:', error);
            return false;
        }
    }
    
    // ==================== PACKAGE UTILITIES ====================
    getPackageInfo(packageId) {
        const packages = {
            'FREE_TRIAL': {
                name: 'GÓI DÙNG THỬ',
                price: 0,
                duration: 7, // days
                features: ['Tính cước cơ bản', 'Lưu 10 chuyến gần nhất']
            },
            'BASIC_1M': {
                name: 'BASIC 1 THÁNG',
                price: 19000,
                duration: 30,
                features: ['Tất cả tính năng Free', 'Chế độ Offline', 'Lưu 50 chuyến']
            },
            'PRO_1M': {
                name: 'PRO 1 THÁNG',
                price: 49000,
                duration: 30,
                features: ['Tất cả tính năng Basic', 'Real-time Map', 'Xuất PDF']
            },
            'VIP_1M': {
                name: 'VIP 1 THÁNG',
                price: 99000,
                duration: 30,
                features: ['Tất cả tính năng Pro', 'AI Voice Assistant', 'Cloud Backup']
            },
            'COMBO_PRO_3M': {
                name: 'PRO 3 THÁNG',
                price: 129000,
                duration: 90,
                features: ['3 tháng Pro', 'Quà tặng đặc biệt']
            },
            'COMBO_VIP_6M': {
                name: 'VIP 6 THÁNG',
                price: 499000,
                duration: 180,
                features: ['6 tháng VIP', 'AI cao cấp', 'Tặng bảo hiểm']
            },
            'LIFETIME': {
                name: 'VIP TRỌN ĐỜI',
                price: 1499000,
                duration: 365 * 25, // 25 năm
                features: ['Vĩnh viễn', 'Cập nhật miễn phí', 'Hỗ trợ trọn đời']
            }
        };
        
        return packages[packageId] || null;
    }
    
    calculateSavings(packageId) {
        const packageInfo = this.getPackageInfo(packageId);
        if (!packageInfo) return 0;
        
        // Tính tiết kiệm so với gói tháng
        switch(packageId) {
            case 'COMBO_PRO_3M':
                return (49000 * 3) - 129000; // Tiết kiệm 18,000đ
            case 'COMBO_VIP_6M':
                return (99000 * 6) - 499000; // Tiết kiệm 95,000đ
            default:
                return 0;
        }
    }
}