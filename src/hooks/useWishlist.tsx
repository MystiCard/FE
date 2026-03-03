import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WishlistItem {
    id: number | string;
    name: string;
    price: number;
    image: string;
    rarity?: string;
}

interface WishlistContextType {
    items: WishlistItem[];
    addItem: (item: WishlistItem) => void;
    removeItem: (id: number | string) => void;
    isInWishlist: (id: number | string) => boolean;
    itemCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<WishlistItem[]>(() => {
        const saved = localStorage.getItem('wishlist');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(items));
    }, [items]);

    // Khi đăng nhập thành công, AuthContext dispatch 'wishlist-clear' → reset state
    useEffect(() => {
        const handler = () => setItems([]);
        window.addEventListener('wishlist-clear', handler);
        return () => window.removeEventListener('wishlist-clear', handler);
    }, []);

    const addItem = (item: WishlistItem) => {
        setItems(currentItems => {
            const exists = currentItems.find(i => String(i.id) === String(item.id));
            if (exists) return currentItems;
            return [...currentItems, item];
        });
    };

    const removeItem = (id: number | string) => {
        setItems(currentItems => currentItems.filter(item => String(item.id) !== String(id)));
    };

    const isInWishlist = (id: number | string) => {
        return items.some(item => String(item.id) === String(id));
    };

    const itemCount = items.length;

    return (
        <WishlistContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                isInWishlist,
                itemCount,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within WishlistProvider');
    }
    return context;
};
