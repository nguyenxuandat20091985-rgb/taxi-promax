// js/payment.js - Module Thanh toán & Quản lý gói cước
class PaymentManager {
    constructor(taxiSystem) {
        this.taxiSystem = taxiSystem;
        this.selectedPackage = null;
    }
    
    // ==================== XỬ LÝ THÔNG TIN THANH TOÁN ====================
    
    async copyPaymentInfo() {
        try {
            const pkg = this.taxiSystem.selectedPackage;
            if (!pkg) {
                this.taxiSystem.showError("Vui lòng chọn một gói cước!");
                return;
            }
            
            // Lấy nội dung chuyển khoản từ UI (thường chứa mã DriverID + PackageID)
            const qrContent = document.getElementById('qrContent')?.textContent || `NAP ${this.taxiSystem.driverId}`;
            
            const bankInfo = `💳 THÔNG TIN CHUYỂN KHOẢN
🏦 Ngân hàng: BIDV
📱 Số tài khoản: 4430269669
👤 Chủ tài khoản: NGUYỄN XUÂN ĐẠT
💰 Số tiền: ${pkg.price.toLocaleString('vi-VN')}đ
📝 Nội dung: ${qrContent}`;
            
            await navigator.clipboard.writeText(bankInfo);
            // Thông báo thành công qua UIManager nếu có
            if(this.taxiSystem.ui) this.taxiSystem.ui.showSuccess("Đã sao chép thông tin chuyển khoản!");
            else alert("Đã sao chép thông tin chuyển khoản!");
            
            return true;
        } catch (error) {
            console.error('Lỗi copy:', error);
            return false;
        }
    }
    
    // ==================== TÍCH HỢP ZALO ====================

    prepareZaloMessage() {
        const pkg = this.taxiSystem.selectedPackage;
        const transCode = document.getElementById('transactionCode')?.value.trim() || "CHƯA_NHẬP";
        
        if (!pkg) throw new Error("Chưa chọn gói cước");

        return `[TAXI PROMAX - YÊU CẦU KÍCH HOẠT]
👤 Mã tài xế: ${this.taxiSystem.driverId}
📦 Gói cước: ${pkg.name}
💰 Số tiền: ${pkg.price.toLocaleString('vi-VN')}đ
🔢 Mã giao dịch: ${transCode}
⏰ Gửi lúc: ${new Date().toLocaleString('vi-VN')}`;
    }

    async sendToZalo() {
        try {
            const message = this.prepareZaloMessage();
            await navigator.clipboard.writeText(message);
            
            // Cập nhật giao diện modal Zalo trước khi chuyển hướng
            this.updateZaloModalUI();

            // Chuyển hướng đến Zalo (thay số điện thoại của anh vào đây)
            const adminZalo = "0944302696"; 
            setTimeout(() => {
                window.open(`https://zalo.me/${adminZalo}`, '_blank');
            }, 1000);
            
            return true;
        } catch (error) {
            this.taxiSystem.showError(error.message);
            return false;
        }
    }

    updateZaloModalUI() {
        const pkg = this.taxiSystem.selectedPackage;
        const transCode = document.getElementById('transactionCode')?.value || "---";
        
        const elements = {
            'zaloDriverId': this.taxiSystem.driverId,
            'zaloPackage': pkg?.name,
            'zaloAmount': pkg ? pkg.price.toLocaleString('vi-VN') + 'đ' : '',
            'zaloTransCode': transCode
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    }

    // ==================== XÁC THỰC (SIMULATOR) ====================

    async verifyPayment(transactionCode) {
        try {
            if (!transactionCode || transactionCode.length < 5) {
                throw new Error("Mã giao dịch không hợp lệ (tối thiểu 5 ký tự)");
            }

            // Giả lập gọi API kiểm tra ngân hàng
            return new Promise((resolve) => {
                setTimeout(() => {
                    // Logic: Nếu mã chứa "TAXI", tỷ lệ thành công cao để demo
                    const isSuccess = transactionCode.toUpperCase().includes("TAXI") || Math.random() > 0.3;
                    
                    if (isSuccess) {
                        const activatedPkg = this.taxiSystem.activatePackage(this.taxiSystem.selectedPackage);
                        this.saveTransaction(transactionCode, 'SUCCESS');
                        resolve({ success: true, message: "Kích hoạt thành công!", data: activatedPkg });
                    } else {
                        resolve({ success: false, message: "Mã giao dịch chưa được hệ thống ghi nhận." });
                    }
                }, 2000);
            });
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ==================== LỊCH SỬ GIAO DỊCH ====================

    saveTransaction(code, status) {
        const history = JSON.parse(localStorage.getItem('taxi_payment_history') || '[]');
        history.unshift({
            id: Date.now(),
            code: code,
            package: this.taxiSystem.selectedPackage?.name,
            amount: this.taxiSystem.selectedPackage?.price,
            status: status,
            date: new Date().toISOString()
        });
        localStorage.setItem('taxi_payment_history', JSON.stringify(history.slice(0, 20)));
    }

    // ==================== DANH SÁCH GÓI CƯỚC ====================

    static get PACKAGES() {
        return {
            'BASIC_1M': { id: 'BASIC_1M', name: 'BASIC 1 THÁNG', price: 19000, days: 30 },
            'PRO_1M':   { id: 'PRO_1M',   name: 'PRO 1 THÁNG',   price: 49000, days: 30 },
            'VIP_1M':   { id: 'VIP_1M',   name: 'VIP 1 THÁNG',   price: 99000, days: 30 },
            'LIFETIME': { id: 'LIFETIME', name: 'VIP TRỌN ĐỜI',  price: 1499000, days: 9999 }
        };
    }
}
