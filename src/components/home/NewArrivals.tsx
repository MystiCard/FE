import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Heart, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cardApi, listSellerApi, ListingItem } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80';

const formatRarity = (rarity: string) =>
    rarity
        ? String(rarity)
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
        : '';

const formatPriceShort = (value: number) => {
    if (!Number.isFinite(value)) return '—';
    const abs = Math.abs(value);

    // Chỉ rút gọn thành M khi >= 1 triệu
    if (abs >= 1_000_000) {
        return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }

    // Còn lại hiển thị dạng số bình thường (1.000; 10.000; 500.000; ...)
    return value.toLocaleString('vi-VN');
};

const getRarityClasses = (rarity: string) => {
    const r = String(rarity || '').toLowerCase();

    if (r.includes('secret')) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900';
    if (r.includes('ultra')) return 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white';
    if (r.includes('rare')) return 'bg-gradient-to-r from-sky-500 to-blue-500 text-white';
    if (r.includes('uncommon')) return 'bg-emerald-500/90 text-white';
    if (r.includes('common')) return 'bg-slate-200 text-slate-900';

    return 'bg-slate-300 text-slate-900';
};

export const NewArrivals: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isAuthenticated) {
            setWishlistCardIds(new Set());
            return;
        }
        const loadWishlist = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 500);
                const ids = new Set((res.content ?? []).map((w) => w.cardId ?? w.cardResponse?.cardId).filter(Boolean) as string[]);
                setWishlistCardIds(ids);
            } catch {
                setWishlistCardIds(new Set());
            }
        };
        loadWishlist();
    }, [isAuthenticated]);

    const toggleWishlist = async (item: ListingItem) => {
        const cardId = item.cardId;
        const inWishlist = wishlistCardIds.has(cardId);
        try {
            if (inWishlist) {
                await cardApi.removeFromWishlistByCardId(cardId);
                setWishlistCardIds((prev) => {
                    const next = new Set(prev);
                    next.delete(cardId);
                    return next;
                });
            } else {
                await cardApi.addToWishlist(cardId, Number(item.price ?? 0));
                setWishlistCardIds((prev) => new Set(prev).add(cardId));
            }
            window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await listSellerApi.getListings(page, 12);
                const list = (res.content || []).filter((item) => item.quantity > 0);
                setListings(list);
                setTotalPages(res.totalPages || 1);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được sản phẩm');
                setListings([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [page]);

    return (
        <section className="py-16">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-4xl font-bold mb-2 font-serif">Sản phẩm mới · Sàn giao dịch</h2>
                    <p className="text-muted-foreground">Thẻ đang bán trên Sàn giao dịch</p>
                </div>
                <Link to="/marketplace">
                    <Button variant="outline" className="glass-card hover:bg-white/20">
                        Xem sàn giao dịch
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="overflow-hidden animate-pulse">
                            <div className="aspect-[3/4] bg-white/10" />
                            <CardContent className="p-3 space-y-2">
                                <div className="h-5 bg-white/10 rounded w-3/4" />
                                <div className="h-4 bg-white/10 rounded w-1/2" />
                                <div className="h-8 bg-white/10 rounded w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 text-muted-foreground">{error}</div>
            ) : listings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Chưa có thẻ nào đăng bán</div>
            ) : (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3">
                    {listings.map((item, index) => (
                        <Card
                            key={item.listSellerId}
                            className="group relative overflow-hidden bg-background border border-border shadow-sm hover:shadow-md transition-shadow"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Rarity badge at top-right of card */}
                            <div className="absolute top-1 right-1 z-10">
                                <div
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md border border-white/40 ${getRarityClasses(
                                        item.rarity
                                    )}`}
                                >
                                    {formatRarity(item.rarity)}
                                </div>
                            </div>

                            <div className="p-2.5 md:p-3 flex flex-col">
                                <div className="relative aspect-[5/7] overflow-hidden rounded-xl mb-1.5 bg-background">
                                    <img
                                        src={item.imageUrl || PLACEHOLDER_IMG}
                                        alt={item.cardName}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                        onError={(e) => {
                                            e.currentTarget.src = PLACEHOLDER_IMG;
                                        }}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleWishlist(item);
                                        }}
                                        className="absolute top-2 left-2 p-2 glass-card-strong rounded-full hover:bg-white/20"
                                    >
                                        <Heart
                                            className={`h-4 w-4 ${wishlistCardIds.has(item.cardId) ? 'fill-red-500 text-red-500' : ''}`}
                                        />
                                    </button>
                                </div>

                                <CardContent className="p-0 text-left -ml-3">
                                    {/* Name */}
                                    <h3 className="font-semibold text-xs md:text-sm mb-1.5 line-clamp-2">
                                        {item.cardName}
                                    </h3>
                                    {/* Set name */}
                                    <p className="text-[11px] md:text-xs text-muted-foreground">
                                        {item.categoryName || 'Thẻ sưu tầm'}
                                    </p>
                                    {/* SL xuống hàng riêng */}
                                    <p className="text-[11px] md:text-xs text-muted-foreground mb-1">
                                        SL: {item.quantity}
                                    </p>
                                    {/* Min ~ Max */}
                                    {item.minPrice != null && item.maxPrice != null && (
                                        <p className="text-[10px] md:text-[11px] text-muted-foreground mb-2">
                                            {formatPriceShort(Number(item.minPrice))} ~{' '}
                                            {formatPriceShort(Number(item.maxPrice))}
                                        </p>
                                    )}

                                    {/* Current price */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs md:text-sm font-semibold gradient-text">
                                            {formatPriceShort(Number(item.price))}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="premium"
                                            className="h-6 w-6 md:h-7 md:w-7 p-0 flex items-center justify-center"
                                            onClick={() => navigate('/marketplace')}
                                            aria-label="Thêm / xem chi tiết trên sàn"
                                        >
                                            <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={page === 0 || loading}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                        Trước
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Trang {page + 1} / {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={page + 1 >= totalPages || loading}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                        Sau
                    </Button>
                </div>
                </>
            )}
        </section>
    );
};
