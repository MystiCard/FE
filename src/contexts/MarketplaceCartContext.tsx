import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ListingItem } from '@/utils/api';

/** Mục giỏ theo thẻ: một thẻ, danh sách seller (offers), user chọn 1 seller và số lượng */
export interface CartItemByCard {
    cardId: string;
    cardName: string;
    imageUrl?: string;
    rarity: string;
    offers: ListingItem[];
    selectedListing: ListingItem | null;
    quantity: number;
}

interface MarketplaceCartContextType {
    items: CartItemByCard[];
    addCard: (item: Omit<CartItemByCard, 'selectedListing'> & { selectedListing?: ListingItem | null }) => void;
    setSelectedListing: (cardId: string, listing: ListingItem | null) => void;
    updateQuantity: (cardId: string, quantity: number) => void;
    removeCard: (cardId: string) => void;
    clearCart: () => void;
    itemCount: number;
}

const STORAGE_KEY = 'marketplace-cart-by-card';

const MarketplaceCartContext = createContext<MarketplaceCartContextType | undefined>(undefined);

export const MarketplaceCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItemByCard[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // ignore
        }
    }, [items]);

    const addCard = (payload: Omit<CartItemByCard, 'selectedListing'> & { selectedListing?: ListingItem | null }) => {
        const { selectedListing = null, ...rest } = payload;
        setItems((prev) => {
            const existing = prev.find((c) => c.cardId === payload.cardId);
            const activeOffers = payload.offers.filter((o) => (o.quantity ?? 0) > 0);
            if (existing) {
                return prev.map((c) =>
                    c.cardId === payload.cardId
                        ? {
                              ...c,
                              offers: activeOffers.length ? activeOffers : c.offers,
                              selectedListing:
                                  selectedListing ??
                                  (c.selectedListing && activeOffers.some((o) => o.listSellerId === c.selectedListing?.listSellerId)
                                      ? c.selectedListing
                                      : null),
                              quantity: c.quantity,
                          }
                        : c
                );
            }
            return [...prev, { ...rest, offers: activeOffers.length ? activeOffers : rest.offers, selectedListing, quantity: rest.quantity ?? 1 }];
        });
    };

    const setSelectedListing = (cardId: string, listing: ListingItem | null) => {
        setItems((prev) =>
            prev.map((c) => {
                if (c.cardId !== cardId) return c;
                const qty = listing ? Math.min(c.quantity, listing.quantity ?? 1) : 1;
                return { ...c, selectedListing: listing, quantity: qty };
            })
        );
    };

    const updateQuantity = (cardId: string, quantity: number) => {
        setItems((prev) =>
            prev.map((c) => {
                if (c.cardId !== cardId) return c;
                const maxQ = c.selectedListing?.quantity ?? 99;
                return { ...c, quantity: Math.max(1, Math.min(quantity, maxQ)) };
            })
        );
    };

    const removeCard = (cardId: string) => {
        setItems((prev) => prev.filter((c) => c.cardId !== cardId));
    };

    const clearCart = () => setItems([]);

    const itemCount = items.length;

    return (
        <MarketplaceCartContext.Provider
            value={{
                items,
                addCard,
                setSelectedListing,
                updateQuantity,
                removeCard,
                clearCart,
                itemCount,
            }}
        >
            {children}
        </MarketplaceCartContext.Provider>
    );
};

export const useMarketplaceCart = () => {
    const ctx = useContext(MarketplaceCartContext);
    if (!ctx) throw new Error('useMarketplaceCart must be used within MarketplaceCartProvider');
    return ctx;
};
