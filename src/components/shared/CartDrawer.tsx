import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
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

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md glass-card-strong border-l border-white/20 z-50 flex flex-col animate-slide-down shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Giỏ hàng</h2>
                                <p className="text-sm text-muted-foreground">{itemCount} sản phẩm</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Select All Checkbox */}
                    {items.length > 0 && (
                        <div className="flex items-center gap-3 p-3 glass-card rounded-lg">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-primary-500 checked:border-primary-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium">
                                Chọn tất cả ({items.length})
                            </span>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Giỏ hàng trống</p>
                            <p className="text-sm text-muted-foreground mt-2">Thêm sản phẩm để bắt đầu mua sắm</p>
                        </div>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedItems.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`glass-card p-4 rounded-lg transition-all ${isSelected ? 'ring-2 ring-primary-500/50 bg-primary-500/5' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* Checkbox */}
                                        <div className="flex items-start pt-1">
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
                                            className="w-20 h-28 object-cover rounded flex-shrink-0"
                                        />

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold mb-1 line-clamp-2 text-sm">
                                                {item.name}
                                            </h3>
                                            {item.rarity && (
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {item.rarity}
                                                </p>
                                            )}
                                            <div className="text-lg font-bold gradient-text mb-3">
                                                ${item.price.toFixed(2)}
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-8 text-center font-medium text-sm">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-md transition-colors text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-white/10 bg-background/95 backdrop-blur">
                        {/* Voucher Section */}
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="h-4 w-4 text-accent-500" />
                                <span className="text-sm font-medium">Mã giảm giá</span>
                            </div>

                            {!voucher ? (
                                <div className="space-y-2">
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
                                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                        <Button
                                            onClick={handleApplyVoucher}
                                            variant="outline"
                                            size="sm"
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
                                <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-sm font-medium text-green-500">
                                                {voucher.code}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Giảm {voucher.type === 'percentage' ? `${voucher.value}%` : `$${voucher.value}`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRemoveVoucher}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Price Breakdown */}
                        <div className="p-4 space-y-3">
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Tạm tính ({selectedItemCount} sản phẩm):</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex items-center justify-between text-green-500">
                                        <span>Giảm giá:</span>
                                        <span>-${discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-white/10" />

                            <div className="flex items-center justify-between text-lg">
                                <span className="font-semibold">Tổng cộng:</span>
                                <span className="text-2xl font-bold gradient-text">
                                    ${total.toFixed(2)}
                                </span>
                            </div>

                            <Button
                                variant="premium"
                                className="w-full"
                                size="lg"
                                disabled={selectedItemCount === 0}
                            >
                                Thanh toán ({selectedItemCount})
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full glass-card"
                                onClick={clearCart}
                            >
                                Xóa giỏ hàng
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
