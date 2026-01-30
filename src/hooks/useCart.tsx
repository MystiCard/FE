import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
    rarity?: string;
}

interface Voucher {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
}

interface CartContextType {
    items: CartItem[];
    selectedItems: Set<number>;
    voucher: Voucher | null;
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    clearCart: () => void;
    toggleItemSelection: (id: number) => void;
    toggleSelectAll: () => void;
    applyVoucher: (code: string) => boolean;
    removeVoucher: () => void;
    total: number;
    subtotal: number;
    discountAmount: number;
    itemCount: number;
    selectedItemCount: number;
    isAllSelected: boolean;
}

// Hardcoded voucher codes
const VOUCHERS: Record<string, Voucher> = {
    'MYSTIC10': { code: 'MYSTIC10', type: 'percentage', value: 10 },
    'MYSTIC20': { code: 'MYSTIC20', type: 'percentage', value: 20 },
    'FREESHIP': { code: 'FREESHIP', type: 'fixed', value: 10 },
    'WELCOME50': { code: 'WELCOME50', type: 'fixed', value: 50 },
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    const [selectedItems, setSelectedItems] = useState<Set<number>>(() => {
        const saved = localStorage.getItem('cart-selected');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [voucher, setVoucher] = useState<Voucher | null>(() => {
        const saved = localStorage.getItem('cart-voucher');
        return saved ? JSON.parse(saved) : null;
    });

    // Save to localStorage whenever cart changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        localStorage.setItem('cart-selected', JSON.stringify(Array.from(selectedItems)));
    }, [selectedItems]);

    useEffect(() => {
        localStorage.setItem('cart-voucher', JSON.stringify(voucher));
    }, [voucher]);

    // Auto-select new items
    const addItem = (item: Omit<CartItem, 'quantity'>) => {
        setItems(currentItems => {
            const existingItem = currentItems.find(i => i.id === item.id);

            if (existingItem) {
                return currentItems.map(i =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }

            // Auto-select newly added item
            setSelectedItems(prev => new Set([...prev, item.id]));
            return [...currentItems, { ...item, quantity: 1 }];
        });
    };

    const removeItem = (id: number) => {
        setItems(currentItems => currentItems.filter(item => item.id !== id));
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id);
            return;
        }

        setItems(currentItems =>
            currentItems.map(item =>
                item.id === id ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
        setSelectedItems(new Set());
        setVoucher(null);
    };

    const toggleItemSelection = (id: number) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(item => item.id)));
        }
    };

    const applyVoucher = (code: string): boolean => {
        const upperCode = code.toUpperCase().trim();
        const foundVoucher = VOUCHERS[upperCode];

        if (foundVoucher) {
            setVoucher(foundVoucher);
            return true;
        }
        return false;
    };

    const removeVoucher = () => {
        setVoucher(null);
    };

    // Calculate subtotal only for selected items
    const subtotal = items
        .filter(item => selectedItems.has(item.id))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Calculate discount
    let discountAmount = 0;
    if (voucher && subtotal > 0) {
        if (voucher.type === 'percentage') {
            discountAmount = subtotal * (voucher.value / 100);
        } else {
            discountAmount = Math.min(voucher.value, subtotal);
        }
    }

    const total = Math.max(0, subtotal - discountAmount);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const selectedItemCount = items
        .filter(item => selectedItems.has(item.id))
        .reduce((sum, item) => sum + item.quantity, 0);
    const isAllSelected = items.length > 0 && selectedItems.size === items.length;

    return (
        <CartContext.Provider
            value={{
                items,
                selectedItems,
                voucher,
                addItem,
                removeItem,
                updateQuantity,
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
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
