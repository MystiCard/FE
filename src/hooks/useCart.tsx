import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image: string;
    rarity?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        // Load from localStorage
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    // Save to localStorage whenever cart changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(items));
    }, [items]);

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

            return [...currentItems, { ...item, quantity: 1 }];
        });
    };

    const removeItem = (id: number) => {
        setItems(currentItems => currentItems.filter(item => item.id !== id));
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
    };

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                total,
                itemCount,
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
