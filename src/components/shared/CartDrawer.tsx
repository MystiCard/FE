import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { items, updateQuantity, removeItem, clearCart, total, itemCount } = useCart();

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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Shopping Cart</h2>
                                <p className="text-sm text-muted-foreground">{itemCount} items</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Your cart is empty</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="glass-card p-4 rounded-lg flex gap-4">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-20 h-28 object-cover rounded"
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
                                    {item.rarity && (
                                        <p className="text-xs text-muted-foreground mb-2">{item.rarity}</p>
                                    )}
                                    <div className="text-lg font-bold gradient-text mb-3">
                                        ${item.price.toFixed(2)}
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
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
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 border-t border-white/10 space-y-4">
                        <div className="flex items-center justify-between text-lg">
                            <span className="font-semibold">Total:</span>
                            <span className="text-2xl font-bold gradient-text">${total.toFixed(2)}</span>
                        </div>

                        <Button variant="premium" className="w-full" size="lg">
                            Proceed to Checkout
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full glass-card"
                            onClick={clearCart}
                        >
                            Clear Cart
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
};
