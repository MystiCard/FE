import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WishlistItem {
    id: number;
    name: string;
    price: number;
    image: string;
    rarity?: string;
}

interface WishlistContextType {
    items: WishlistItem[];
    addItem: (item: WishlistItem) => void;
    removeItem: (id: number) => void;
    isInWishlist: (id: number) => boolean;
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

    const addItem = (item: WishlistItem) => {
        setItems(currentItems => {
            const exists = currentItems.find(i => i.id === item.id);
            if (exists) return currentItems;
            return [...currentItems, item];
        });
    };

    const removeItem = (id: number) => {
        setItems(currentItems => currentItems.filter(item => item.id !== id));
    };

    const isInWishlist = (id: number) => {
        return items.some(item => item.id === id);
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
