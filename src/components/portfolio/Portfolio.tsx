import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BarChart3, MoreVertical, Heart } from 'lucide-react';
import { categoryApi, Category, Card as CardType, cardApi } from '@/utils/api';
import { getCategoryImage } from '@/utils/categoryImages';
import { SetDetail } from './SetDetail';
import { CardDetailModal } from './CardDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';

type ViewState = 'CATEGORIES' | 'CARDS';

type CardStat = { count: number; totalValue: number; cardIds: string[] };

function getSetAbbrev(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
    return name.slice(0, 3).toUpperCase();
}

export const Portfolio: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { items: wishlistItems } = useWishlist();
    const [view, setView] = useState<ViewState>('CATEGORIES');
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cardStats, setCardStats] = useState<Record<string, CardStat>>({});
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [apiWishlistIds, setApiWishlistIds] = useState<Set<string>>(new Set());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

    const wishlistCardIds = isAuthenticated
        ? apiWishlistIds
        : new Set(wishlistItems.map((i) => String(i.id)));

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        const load = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 500);
                setApiWishlistIds(new Set((res.content ?? []).map((w) => w.cardId)));
            } catch {
                setApiWishlistIds(new Set());
            }
        };
        load();
        const onUpdated = () => load();
        window.addEventListener('wishlist-api-updated', onUpdated);
        return () => window.removeEventListener('wishlist-api-updated', onUpdated);
    }, [isAuthenticated]);

    useEffect(() => {
        if (categories.length === 0) return;
        const loadStats = async () => {
            const entries = await Promise.all(
                categories.map(async (c) => {
                    try {
                        const cards = await categoryApi.getCardsByCategoryId(c.categoryId);
                        const totalValue = cards.reduce((sum, card) => sum + (card.basePrice ?? 0), 0);
                        const cardIds = cards.map((card) => card.cardId);
                        return [c.categoryId, { count: cards.length, totalValue, cardIds }] as const;
                    } catch {
                        return [c.categoryId, { count: 0, totalValue: 0, cardIds: [] as string[] }] as const;
                    }
                })
            );
            setCardStats(Object.fromEntries(entries));
        };
        loadStats();
    }, [categories]);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await categoryApi.getAllCategories();
            setCategories(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCategoryClick = (category: Category) => {
        setSelectedCategory(category);
        setView('CARDS');
    };

    const handleBackToCategories = () => {
        setView('CATEGORIES');
        setSelectedCategory(null);
    };

    const handleCardClick = (card: CardType) => {
        setSelectedCard(card);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedCard(null), 300);
    };

    const getCategoryLogo = (c: Category) => c.imageUrl || getCategoryImage(c.categoryName);

    return (
        <div className="min-h-screen">
            {view === 'CATEGORIES' && (
                <div className="py-8 ">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold font-serif gradient-text mb-2">Bộ sưu tập</h1>
                        <p className="text-muted-foreground">Chọn danh mục để xem thẻ</p>
                    </div>

                    {isLoading && categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <Loader2 className="h-8 w-8 text-primary-400 animate-spin mb-4" />
                            <p className="text-muted-foreground">Đang tải danh mục...</p>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Chưa có danh mục nào. Thêm danh mục từ trang Admin.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {categories.map((category) => {
                                const stats = cardStats[category.categoryId];
                                const total = stats?.count ?? 0;
                                const cardIds = stats?.cardIds ?? [];
                                const inWishlist = cardIds.filter((id) => wishlistCardIds.has(id)).length;
                                const pct = total > 0 ? Math.round((inWishlist / total) * 100) : 0;
                                const value = stats?.totalValue ?? 0;
                                const abbrev = getSetAbbrev(category.categoryName);
                                return (
                                    <Card
                                        key={category.categoryId}
                                        onClick={() => handleCategoryClick(category)}
                                        className="glass-card cursor-pointer group overflow-hidden border-white/10 hover:border-primary-500/30 transition-colors"
                                    >
                                        <CardContent className="p-0">
                                            <div className="p-4 pb-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="shrink-0 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-bold">
                                                        {abbrev}
                                                    </span>
                                                    <h3 className="font-bold text-primary-400 truncate">
                                                        {category.categoryName} {abbrev}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 px-4 pb-4">
                                                <div className="w-32 h-40 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-lg flex items-center justify-center">
                                                    <img
                                                        src={getCategoryLogo(category)}
                                                        alt={category.categoryName}
                                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=128&q=80';
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
                                                    <p className="text-xs text-amber-700/90 dark:text-amber-400/90">—</p>
                                                    <p className="text-lg font-bold text-primary-400">
                                                        {value > 0 ? `${(value / 1000).toFixed(0)}K đ` : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-4 pb-4 pt-0 flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                                        <Heart className="h-3.5 w-3.5 text-pink-400" />
                                                        Wishlist: {inWishlist}/{total}
                                                    </span>
                                                    <span className="text-muted-foreground">{pct}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleCategoryClick(category); }}
                                                        className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-primary-400"
                                                        aria-label="Thống kê"
                                                    >
                                                        <BarChart3 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground"
                                                        aria-label="Menu"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {view === 'CARDS' && selectedCategory && (
                <SetDetail
                    category={selectedCategory}
                    onBack={handleBackToCategories}
                    onCardClick={handleCardClick}
                />
            )}

            <CardDetailModal
                card={selectedCard}
                category={selectedCategory}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};
