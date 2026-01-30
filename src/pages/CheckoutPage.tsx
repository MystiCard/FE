import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Truck, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { items, selectedItems, voucher, subtotal, discountAmount, total, selectedItemCount, clearCart } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    // Get only selected items
    const selectedProducts = items.filter(item => selectedItems.has(item.id));

    // Redirect if no items selected
    React.useEffect(() => {
        if (selectedItemCount === 0) {
            navigate('/cart');
        }
    }, [selectedItemCount, navigate]);

    const handlePlaceOrder = async () => {
        setIsProcessing(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsProcessing(false);
        setOrderSuccess(true);

        // Clear cart after 2 seconds and redirect
        setTimeout(() => {
            clearCart();
            navigate('/');
        }, 3000);
    };

    if (orderSuccess) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3 font-serif">Đặt hàng thành công!</h2>
                    <p className="text-muted-foreground mb-6">
                        Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Đang chuyển về trang chủ...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/cart')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Quay lại giỏ hàng</span>
                </button>
                <h1 className="text-4xl font-bold font-serif">Thanh toán</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Checkout Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Shipping Address */}
                    <div className="glass-card p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <MapPin className="h-5 w-5 text-primary-500" />
                            <h3 className="text-xl font-semibold">Địa chỉ giao hàng</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Họ và tên</label>
                                <input
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                                <input
                                    type="tel"
                                    placeholder="0123456789"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Địa chỉ</label>
                                <textarea
                                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="glass-card p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="h-5 w-5 text-primary-500" />
                            <h3 className="text-xl font-semibold">Phương thức thanh toán</h3>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-4 glass-card rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                <input
                                    type="radio"
                                    name="payment"
                                    defaultChecked
                                    className="w-5 h-5"
                                />
                                <div className="flex-1">
                                    <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                                    <p className="text-sm text-muted-foreground">Thanh toán bằng tiền mặt khi nhận hàng</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-4 glass-card rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                <input
                                    type="radio"
                                    name="payment"
                                    className="w-5 h-5"
                                />
                                <div className="flex-1">
                                    <p className="font-medium">Thẻ tín dụng/Ghi nợ</p>
                                    <p className="text-sm text-muted-foreground">Visa, Mastercard, JCB</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-4 glass-card rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                <input
                                    type="radio"
                                    name="payment"
                                    className="w-5 h-5"
                                />
                                <div className="flex-1">
                                    <p className="font-medium">Ví điện tử</p>
                                    <p className="text-sm text-muted-foreground">MoMo, ZaloPay, VNPay</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Shipping Method */}
                    <div className="glass-card p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <Truck className="h-5 w-5 text-primary-500" />
                            <h3 className="text-xl font-semibold">Phương thức vận chuyển</h3>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-4 glass-card rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="shipping"
                                        defaultChecked
                                        className="w-5 h-5"
                                    />
                                    <div>
                                        <p className="font-medium">Giao hàng tiêu chuẩn</p>
                                        <p className="text-sm text-muted-foreground">3-5 ngày làm việc</p>
                                    </div>
                                </div>
                                <span className="font-medium">Miễn phí</span>
                            </label>
                            <label className="flex items-center justify-between p-4 glass-card rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="shipping"
                                        className="w-5 h-5"
                                    />
                                    <div>
                                        <p className="font-medium">Giao hàng nhanh</p>
                                        <p className="text-sm text-muted-foreground">1-2 ngày làm việc</p>
                                    </div>
                                </div>
                                <span className="font-medium">$10.00</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 glass-card p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-4">Đơn hàng ({selectedItemCount} sản phẩm)</h3>

                        {/* Products */}
                        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                            {selectedProducts.map((item) => (
                                <div key={item.id} className="flex gap-3">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-16 h-20 object-cover rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
                                        <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                                        <p className="text-sm font-bold gradient-text">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-white/10 my-4" />

                        {/* Voucher */}
                        {voucher && (
                            <div className="mb-4 p-3 glass-card rounded-lg">
                                <div className="flex items-center gap-2 text-green-500">
                                    <Tag className="h-4 w-4" />
                                    <span className="text-sm font-medium">{voucher.code}</span>
                                </div>
                            </div>
                        )}

                        {/* Price Breakdown */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tạm tính</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-500">
                                    <span>Giảm giá</span>
                                    <span>-${discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Phí vận chuyển</span>
                                <span>Miễn phí</span>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 my-4" />

                        <div className="flex justify-between text-xl mb-6">
                            <span className="font-bold">Tổng cộng</span>
                            <span className="text-2xl font-bold gradient-text">
                                ${total.toFixed(2)}
                            </span>
                        </div>

                        <Button
                            variant="premium"
                            className="w-full"
                            size="lg"
                            onClick={handlePlaceOrder}
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Đang xử lý...' : 'Đặt hàng'}
                        </Button>

                        <div className="mt-4 p-3 glass-card rounded-lg">
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <p>
                                    Bằng việc tiến hành đặt hàng, bạn đồng ý với{' '}
                                    <a href="#" className="text-primary-400 hover:underline">
                                        Điều khoản dịch vụ
                                    </a>
                                    {' '}và{' '}
                                    <a href="#" className="text-primary-400 hover:underline">
                                        Chính sách bảo mật
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
