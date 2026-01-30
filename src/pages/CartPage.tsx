import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, Tag, CheckCircle2, XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        items,
        selectedItems,
        voucher,
        updateQuantity,
        removeItem,
        clearCart,
        toggleItemSelection,
        toggleSelectAll,
        applyVoucher,
        removeVoucher,
        total,
        subtotal,
        discountAmount,
        itemCount,
        selectedItemCount,
        isAllSelected,
    } = useCart();

    const [voucherInput, setVoucherInput] = useState('');
    const [voucherError, setVoucherError] = useState('');

    const handleApplyVoucher = () => {
        if (!voucherInput.trim()) {
            setVoucherError('Vui lòng nhập mã giảm giá');
            return;
        }

        const success = applyVoucher(voucherInput);
        if (success) {
            setVoucherInput('');
            setVoucherError('');
        } else {
            setVoucherError('Mã giảm giá không hợp lệ');
        }
    };

    const handleRemoveVoucher = () => {
        removeVoucher();
        setVoucherError('');
    };

    // Empty cart state
    if (items.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3 font-serif">Giỏ hàng trống</h2>
                    <p className="text-muted-foreground mb-6">
                        Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản phẩm tuyệt vời của chúng tôi!
                    </p>
                    <Button
                        variant="premium"
                        size="lg"
                        onClick={() => navigate('/products')}
                        className="gap-2"
                    >
                        <ShoppingBag className="h-5 w-5" />
                        Tiếp tục mua sắm
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Tiếp tục mua sắm</span>
                </button>
                <h1 className="text-4xl font-bold font-serif">Giỏ hàng của bạn</h1>
                <p className="text-muted-foreground mt-2">{itemCount} sản phẩm</p>
            </div>

            {/* Select All Bar */}
            <div className="glass-card p-4 rounded-lg mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-primary-500 checked:border-primary-500 cursor-pointer"
                    />
                    <span className="font-medium">
                        Chọn tất cả ({items.length} sản phẩm)
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                    Xóa tất cả
                </Button>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Product List */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => {
                        const isSelected = selectedItems.has(item.id);
                        return (
                            <div
                                key={item.id}
                                className={`glass-card p-6 rounded-lg transition-all ${isSelected ? 'ring-2 ring-primary-500/50 bg-primary-500/5' : ''
                                    }`}
                            >
                                <div className="flex gap-4">
                                    {/* Checkbox */}
                                    <div className="flex items-start pt-2">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleItemSelection(item.id)}
                                            className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-primary-500 checked:border-primary-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Image */}
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-24 h-32 object-cover rounded flex-shrink-0"
                                    />

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                                            {item.name}
                                        </h3>
                                        {item.rarity && (
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {item.rarity}
                                            </p>
                                        )}
                                        <div className="text-2xl font-bold gradient-text mb-4">
                                            ${item.price.toFixed(2)}
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="w-12 text-center font-medium">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-md transition-colors text-red-400 flex items-center gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="text-sm">Xóa</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column - Order Summary (Sticky) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        {/* Voucher Card */}
                        <div className="glass-card p-6 rounded-lg">
                            <div className="flex items-center gap-2 mb-4">
                                <Tag className="h-5 w-5 text-accent-500" />
                                <h3 className="font-semibold">Mã giảm giá</h3>
                            </div>

                            {!voucher ? (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nhập mã giảm giá"
                                            value={voucherInput}
                                            onChange={(e) => {
                                                setVoucherInput(e.target.value.toUpperCase());
                                                setVoucherError('');
                                            }}
                                            onKeyPress={(e) => e.key === 'Enter' && handleApplyVoucher()}
                                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                        <Button
                                            onClick={handleApplyVoucher}
                                            variant="outline"
                                            className="glass-card"
                                        >
                                            Áp dụng
                                        </Button>
                                    </div>
                                    {voucherError && (
                                        <div className="flex items-center gap-2 text-xs text-red-400">
                                            <XCircle className="h-3 w-3" />
                                            <span>{voucherError}</span>
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        Mã khả dụng: MYSTIC10, MYSTIC20, FREESHIP, WELCOME50
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        <div>
                                            <p className="font-medium text-green-500">
                                                {voucher.code}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Giảm {voucher.type === 'percentage' ? `${voucher.value}%` : `$${voucher.value}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRemoveVoucher}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Order Summary Card */}
                        <div className="glass-card p-6 rounded-lg">
                            <h3 className="font-semibold text-lg mb-4">Tổng đơn hàng</h3>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Tạm tính ({selectedItemCount} sản phẩm)</span>
                                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex items-center justify-between text-green-500">
                                        <span>Giảm giá</span>
                                        <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-white/10 my-4" />

                            <div className="flex items-center justify-between text-xl mb-6">
                                <span className="font-bold">Tổng cộng</span>
                                <span className="text-2xl font-bold gradient-text">
                                    ${total.toFixed(2)}
                                </span>
                            </div>

                            <Button
                                variant="premium"
                                className="w-full"
                                size="lg"
                                disabled={selectedItemCount === 0}
                                onClick={() => navigate('/checkout')}
                            >
                                Thanh toán ({selectedItemCount})
                            </Button>

                            {selectedItemCount === 0 && (
                                <p className="text-xs text-center text-muted-foreground mt-3">
                                    Vui lòng chọn ít nhất 1 sản phẩm
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
