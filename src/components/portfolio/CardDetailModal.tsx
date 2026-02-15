import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Layers, Heart, Loader2 } from 'lucide-react';
import { Card as CardType, Category, cardApi } from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80';

interface CardDetailModalProps {
    card: CardType | null;
    category: Category | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, category, isOpen, onClose }) => {
    const { isAuthenticated } = useAuth();
    const { addItem: addToWishlistLocal, removeItem: removeFromWishlistLocal, isInWishlist } = useWishlist();
    const [inWishlist, setInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    useEffect(() => {
        if (!card?.cardId || !isOpen) return;
        if (!isAuthenticated) {
            setInWishlist(isInWishlist(card.cardId));
            return;
        }
        const check = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 100);
                const found = (res.content ?? []).some((w) => w.cardId === card.cardId);
                setInWishlist(found);
            } catch {
                setInWishlist(isInWishlist(card.cardId));
            }
        };
        check();
    }, [card?.cardId, isOpen, isAuthenticated, isInWishlist]);

    if (!card) return null;

    const toggleWishlist = async () => {
        setWishlistLoading(true);
        if (inWishlist) {
            removeFromWishlistLocal(card.cardId);
            setInWishlist(false);
            if (isAuthenticated) {
                try {
                    await cardApi.removeFromWishlistByCardId(card.cardId);
                    window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
                } catch {
                    // Đã bỏ khỏi wishlist trên máy
                }
            }
        } else {
            addToWishlistLocal({
                id: card.cardId,
                name: card.name,
                price: card.basePrice,
                image: card.imageUrl || PLACEHOLDER_IMG,
                rarity: card.rarity,
            });
            setInWishlist(true);
            if (isAuthenticated) {
                try {
                    await cardApi.addToWishlist(card.cardId);
                    window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
                } catch {
                    // Đã thêm vào wishlist trên máy
                }
            }
        }
        setWishlistLoading(false);
    };

    const formatRarity = (rarity: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card-strong border-white/10 text-white backdrop-blur-xl">
                <DialogHeader>
                    <span className="px-2 py-0.5 rounded bg-white/10 uppercase font-bold tracking-wider text-[10px]">
                        {formatRarity(card.rarity)}
                    </span>
                    <DialogTitle className="text-3xl font-serif gradient-text">{card.name}</DialogTitle>
                    <DialogDescription className="text-muted-foreground flex items-center gap-2">
                        {category?.categoryName && (
                            <>
                                <Layers className="h-4 w-4" />
                                {category.categoryName}
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="flex justify-center">
                        <div className="relative group w-full max-w-sm">
                            <img
                                src={card.imageUrl || PLACEHOLDER_IMG}
                                alt={card.name}
                                className="w-full h-auto rounded-xl shadow-2xl object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = PLACEHOLDER_IMG;
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-black/20 border-white/10">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-accent-400" />
                                    Giá
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Gốc</p>
                                        <p className="font-bold text-accent-400">${card.basePrice.toFixed(2)}</p>
                                    </div>
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Thấp nhất</p>
                                        <p className="font-bold">${card.minPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Cao nhất</p>
                                        <p className="font-bold">${card.maxPrice.toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {card.description && (
                            <div className="p-3 rounded-lg bg-white/5">
                                <span className="text-xs text-muted-foreground block mb-1">Mô tả</span>
                                <span className="text-sm whitespace-pre-wrap">{card.description}</span>
                            </div>
                        )}

                        {category?.description && (
                            <div className="p-3 rounded-lg bg-white/5">
                                <span className="text-xs text-muted-foreground block mb-1">Danh mục</span>
                                <span className="font-medium">{category.categoryName}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        variant={inWishlist ? 'outline' : 'premium'}
                        onClick={toggleWishlist}
                        className="gap-2"
                        disabled={wishlistLoading}
                    >
                        {wishlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />}
                        {inWishlist ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
