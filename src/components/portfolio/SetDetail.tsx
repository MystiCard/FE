import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';
import { categoryApi, Category, Card as CardType, cardApi } from '@/utils/api';
import { getCategoryImage } from '@/utils/categoryImages';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

interface SetDetailProps {
    category: Category;
    onBack: () => void;
    onCardClick: (card: CardType) => void;
}

export const SetDetail: React.FC<SetDetailProps> = ({ category, onBack, onCardClick }) => {
    const { isAuthenticated } = useAuth();
    const [cards, setCards] = useState<CardType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
    const { addItem: addToWishlistLocal, removeItem: removeFromWishlistLocal, isInWishlist } = useWishlist();

    useEffect(() => {
        if (!isAuthenticated) {
            setWishlistCardIds(new Set());
            return;
        }
        const load = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 500);
                const ids = new Set((res.content ?? []).map((w) => w.cardId));
                setWishlistCardIds(ids);
            } catch {
                setWishlistCardIds(new Set());
            }
        };
        load();
    }, [isAuthenticated]);

    useEffect(() => {
        const loadCards = async () => {
            setIsLoading(true);
            try {
                const data = await categoryApi.getCardsByCategoryId(category.categoryId);
                setCards(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCards();
    }, [category.categoryId]);

    const formatRarity = (rarity: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const logo = category.imageUrl || getCategoryImage(category.categoryName);

    const inWishlistCount = cards.filter(
        (c) => wishlistCardIds.has(c.cardId) || isInWishlist(c.cardId)
    ).length;
    const totalCards = cards.length;
    const wishlistPercent = totalCards > 0 ? Math.round((inWishlistCount / totalCards) * 100) : 0;

    return (
        <div className="py-8 ">
            <div className="mb-8">
                <Button variant="ghost" onClick={onBack} className="mb-4 pl-0 hover:bg-transparent hover:text-primary-400">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại danh mục
                </Button>
                <div className="flex items-center gap-4">
                    <img
                        src={logo}
                        alt={category.categoryName}
                        className="h-12 w-auto object-contain rounded-lg bg-white/5"
                        onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_IMG;
                        }}
                    />
                    <div>
                        <h1 className="text-3xl font-bold font-serif gradient-text">{category.categoryName}</h1>
                        <p className="text-muted-foreground">{cards.length} thẻ</p>
                    </div>
                </div>
            </div>

            {!isLoading && totalCards > 0 && (
                <div className="mb-6 p-4 rounded-xl glass-card border border-white/10">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-pink-400" />
                            <span className="text-sm font-medium text-muted-foreground">Wishlist set này</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-pink-400">
                                {inWishlistCount} / {totalCards}
                            </span>
                            <span className="text-sm text-muted-foreground">thẻ</span>
                            <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-400 text-sm font-semibold">
                                {wishlistPercent}%
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-300"
                            style={{ width: `${wishlistPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
                </div>
            ) : cards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Chưa có thẻ nào trong danh mục này.</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {cards.map((card) => (
                        <Card
                            key={card.cardId}
                            onClick={() => onCardClick(card)}
                            className="glass-card cursor-pointer group overflow-hidden border-0 bg-transparent"
                        >
                            <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-xl">
                                <img
                                    src={card.imageUrl || PLACEHOLDER_IMG}
                                    alt={card.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const inList = wishlistCardIds.has(card.cardId) || isInWishlist(card.cardId);
                                        if (inList) {
                                            removeFromWishlistLocal(card.cardId);
                                            setWishlistCardIds((prev) => {
                                                const next = new Set(prev);
                                                next.delete(card.cardId);
                                                return next;
                                            });
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
                                            setWishlistCardIds((prev) => new Set(prev).add(card.cardId));
                                            if (isAuthenticated) {
                                                try {
                                                    await cardApi.addToWishlist(card.cardId);
                                                    window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
                                                } catch {
                                                    // Đã thêm vào wishlist trên máy
                                                }
                                            }
                                        }
                                    }}
                                    className="absolute top-2 right-2 p-2 rounded-full glass-card-strong hover:bg-white/20 z-10"
                                >
                                    <Heart className={`h-4 w-4 ${(wishlistCardIds.has(card.cardId) || isInWishlist(card.cardId)) ? 'fill-red-500 text-red-500' : ''}`} />
                                </button>
                            </div>
                            <div className="p-3 text-center">
                                <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {formatRarity(card.rarity)} • ${card.basePrice.toFixed(2)}
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
