import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, Users, Heart } from 'lucide-react';
import {
    cardApi,
    listSellerApi,
    getCardImageUrl,
    type Card as CardType,
    type WishlistItem,
    type ListingItem,
} from '@/utils/api';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80';

export const WishlistDetailPage: React.FC = () => {
    const { cardId } = useParams<{ cardId: string }>();
    const navigate = useNavigate();
    const [card, setCard] = useState<CardType | null>(null);
    const [wishlistItem, setWishlistItem] = useState<WishlistItem | null>(null);
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!cardId) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [cardRes, wishlistRes, listingsPage] = await Promise.all([
                    cardApi.getCardById(cardId),
                    cardApi.getUserWishlist(0, 200),
                    listSellerApi.getListingsByCardId(cardId, 0, 50),
                ]);
                setCard(cardRes);
                const item = (wishlistRes.content ?? []).find((w) => w.cardId === cardId) ?? null;
                setWishlistItem(item);
                const sells = (listingsPage.content ?? []) as unknown as ListingItem[];
                setListings(sells);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được dữ liệu yêu thích.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [cardId]);

    const priceHistory = useMemo(() => {
        if (!card) return [];
        const base = Number(card.basePrice ?? 0);
        const min = Number(card.minPrice ?? base);
        const max = Number(card.maxPrice ?? base);
        const high = Math.max(base, min, max);
        const low = Math.min(base, min, max);
        if (!high || high === low) {
            return [
                { label: 'Hiện tại', value: base || 0 },
            ];
        }
        const points = [] as { label: string; value: number }[];
        const steps = 10;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const value = max - (max - min) * t * 0.7 + base * 0.3 * (1 - t);
            points.push({ label: `T-${steps - 1 - i}`, value });
        }
        points[steps - 1] = { label: 'Hôm nay', value: base };
        return points;
    }, [card]);

    const formatRarity = (rarity?: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang tải chi tiết wishlist...</p>
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-md text-center space-y-3">
                    <p className="text-lg font-semibold text-red-400">Không tìm thấy thẻ.</p>
                    {error && <p className="text-sm text-muted-foreground">{error}</p>}
                    <Button variant="outline" onClick={() => navigate('/wishlist')}>
                        Quay lại danh sách yêu thích
                    </Button>
                </div>
            </div>
        );
    }

    const chartWidth = 420;
    const chartHeight = 180;
    const values = priceHistory.map((p) => p.value);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const span = Math.max(maxValue - minValue, 1);

    const svgPoints = priceHistory
        .map((p, idx) => {
            const x = (idx / Math.max(priceHistory.length - 1, 1)) * (chartWidth - 40) + 20;
            const norm = (p.value - minValue) / span;
            const y = chartHeight - 20 - norm * (chartHeight - 40);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/wishlist')}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-400"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Danh sách yêu thích
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-300 flex items-center justify-center shadow-lg">
                            <Heart className="h-5 w-5 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                                {card.name}
                            </h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Wishlist · Giá mong muốn:{' '}
                                {wishlistItem?.expectPrice != null
                                    ? wishlistItem.expectPrice.toLocaleString('vi-VN') + ' đ'
                                    : '—'}
                            </p>
                        </div>
                    </div>
                    <div className="flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-6">
                    <div className="space-y-4">
                        <Card className="glass-card-strong">
                            <CardContent className="p-4 flex justify-center">
                                <div className="relative w-full max-w-sm">
                                    <img
                                        src={getCardImageUrl(card) || PLACEHOLDER_IMG}
                                        alt={card.name}
                                        className="w-full h-auto rounded-xl shadow-2xl object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = PLACEHOLDER_IMG;
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card className="glass-card-strong">
                            <CardContent className="p-4 md:p-5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-accent-400" />
                                        Biểu đồ giá tham khảo
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        Đơn vị: VNĐ (ước lượng từ giá gốc / min / max)
                                    </span>
                                </div>
                                <div className="w-full overflow-x-auto">
                                    {priceHistory.length <= 1 ? (
                                        <p className="text-xs text-muted-foreground py-4">
                                            Chưa có đủ dữ liệu để vẽ biểu đồ. Giá hiện tại:{' '}
                                            {Number(card.basePrice ?? 0).toLocaleString('vi-VN')} đ
                                        </p>
                                    ) : (
                                        <svg
                                            width={chartWidth}
                                            height={chartHeight}
                                            className="max-w-full bg-black/20 rounded-lg border border-white/10"
                                        >
                                            <defs>
                                                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#facc15" stopOpacity="0.8" />
                                                    <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
                                                </linearGradient>
                                            </defs>
                                            <polyline
                                                fill="none"
                                                stroke="#facc15"
                                                strokeWidth="2"
                                                points={svgPoints}
                                            />
                                            <polyline
                                                fill="url(#priceGradient)"
                                                stroke="none"
                                                points={
                                                    `20,${chartHeight - 20} ` +
                                                    svgPoints +
                                                    ` ${chartWidth - 20},${chartHeight - 20}`
                                                }
                                            />
                                            <line
                                                x1={20}
                                                y1={chartHeight - 20}
                                                x2={chartWidth - 10}
                                                y2={chartHeight - 20}
                                                stroke="rgba(255,255,255,0.2)"
                                                strokeWidth={1}
                                            />
                                            <line
                                                x1={30}
                                                y1={10}
                                                x2={30}
                                                y2={chartHeight - 20}
                                                stroke="rgba(255,255,255,0.15)"
                                                strokeWidth={1}
                                            />
                                        </svg>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card-strong">
                            <CardContent className="p-4 md:p-5 space-y-3">
                                <h2 className="text-sm font-semibold">Chi tiết thẻ</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Tên thẻ</p>
                                        <p className="font-medium">{card.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Độ hiếm</p>
                                        <p className="font-medium">
                                            {formatRarity(card.rarity)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Danh mục</p>
                                        <p className="font-medium">{card.categoryName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Giá gốc</p>
                                        <p className="font-medium text-accent-400">
                                            {Number(card.basePrice ?? 0).toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Giá thấp nhất</p>
                                        <p className="font-medium">
                                            {Number(card.minPrice ?? 0).toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Giá cao nhất</p>
                                        <p className="font-medium">
                                            {Number(card.maxPrice ?? 0).toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                </div>
                                {card.description && (
                                    <div className="pt-2 border-t border-white/10">
                                        <p className="text-xs text-muted-foreground mb-1">Mô tả</p>
                                        <p className="text-sm whitespace-pre-wrap">
                                            {card.description}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="glass-card-strong">
                            <CardContent className="p-4 md:p-5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Danh sách người bán
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        {listings.length} đề nghị
                                    </span>
                                </div>
                                {listings.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Hiện chưa có ai đăng bán thẻ này trên sàn giao dịch.
                                    </p>
                                ) : (
                                    <div className="rounded-lg border border-white/10 overflow-hidden">
                                        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] bg-white/5 text-xs text-muted-foreground px-3 py-2">
                                            <span>Người bán</span>
                                            <span className="text-right">Giá</span>
                                            <span className="text-right">Số lượng</span>
                                        </div>
                                        <div className="divide-y divide-white/10 max-h-64 overflow-y-auto">
                                            {listings.map((ls) => (
                                                <div
                                                    key={ls.listSellerId}
                                                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] px-3 py-2 text-xs md:text-sm items-center bg-black/20"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">
                                                            {ls.sellerName || 'Người bán'}
                                                        </p>
                                                    </div>
                                                    <div className="md:text-right font-semibold text-amber-300 mt-1 md:mt-0">
                                                        {ls.price.toLocaleString('vi-VN')} đ
                                                    </div>
                                                    <div className="md:text-right text-muted-foreground mt-1 md:mt-0">
                                                        SL: {ls.quantity}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-3 py-2 border-t border-white/10 flex justify-end">
                                            <Link to={`/marketplace?card=${card.cardId}`}>
                                                <Button variant="outline" size="sm">
                                                    Xem trên Sàn giao dịch
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

