import React, { useEffect, useMemo, useState } from 'react';
import { cardApi, listSellerApi, getCardImageUrl, ListingItem } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

/** Modal sơ đồ biến động giá: đường lên/xuống từ giá gốc → giá thị trường */
function PriceChartModal({
    item,
    onClose,
}: {
    item: TrendItem | null;
    onClose: () => void;
}) {
    if (!item) return null;
    const base = item.basePrice;
    const market = item.marketAvg ?? item.basePrice;
    const minP = Math.min(base, market);
    const maxP = Math.max(base, market);
    const range = maxP - minP || 1;
    const padding = range * 0.15;
    const chartMin = minP - padding;
    const chartMax = maxP + padding;
    const chartRange = chartMax - chartMin;

    const w = 320;
    const h = 200;
    const pad = { left: 8, right: 8, top: 8, bottom: 28 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const y = (price: number) =>
        pad.top + chartH - ((price - chartMin) / chartRange) * chartH;
    const x0 = pad.left;
    const x1 = pad.left + chartW;

    const y0 = y(base);
    const y1 = y(market);
    const isUp = market > base;
    const lineColor = isUp ? '#22c55e' : '#ef4444'; // green up, red down

    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg glass-card-strong border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <img
                            src={item.imageUrl || PLACEHOLDER_IMG}
                            alt={item.cardName}
                            className="w-12 h-16 rounded object-cover"
                            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                        />
                        <span>{item.cardName}</span>
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground mb-2">Sơ đồ biến động: Giá gốc → Giá thị trường (VNĐ)</p>
                <div className="rounded-lg bg-white/5 p-3">
                    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="min-h-[200px]" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={isUp ? '#16a34a' : '#dc2626'} />
                                <stop offset="100%" stopColor={isUp ? '#22c55e' : '#f87171'} />
                            </linearGradient>
                        </defs>
                        {/* Đường biến động */}
                        <path
                            d={`M ${x0} ${y0} L ${x1} ${y1}`}
                            fill="none"
                            stroke="url(#lineGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Điểm gốc */}
                        <circle cx={x0} cy={y0} r="6" fill="rgb(59 130 246)" stroke="white" strokeWidth="2" />
                        {/* Điểm thị trường */}
                        <circle cx={x1} cy={y1} r="6" fill={lineColor} stroke="white" strokeWidth="2" />
                    </svg>
                    <div className="flex justify-between text-xs mt-1 px-1">
                        <span className="text-blue-400">
                            Gốc: {base.toLocaleString('vi-VN')} đ
                        </span>
                        <span className={isUp ? 'text-green-400' : 'text-red-400'}>
                            Thị trường: {Math.round(market).toLocaleString('vi-VN')} đ
                            {item.diffPercent != null && (
                                <span className="ml-1">
                                    ({item.diffPercent > 0 ? '+' : ''}{item.diffPercent.toFixed(1)}%)
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface TrendItem {
    cardId: string;
    cardName: string;
    imageUrl?: string;
    basePrice: number;
    marketMin: number | null;
    marketMax: number | null;
    marketAvg: number | null;
    diffPercent: number | null;
}

export const TrendsPage: React.FC = () => {
    const [trends, setTrends] = useState<TrendItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const cards = await cardApi.getAllCards();
                const items: TrendItem[] = [];

                await Promise.all(
                    cards.map(async (card) => {
                        try {
                            const res = await listSellerApi.getListingsByCardId(card.cardId, 0, 50);
                            const listings = (res.content || []) as ListingItem[];
                            const active = listings.filter((l) => l.status === 'ON' || l.status === 'AVAILABLE');
                            if (!active.length) return;

                            const prices = active.map((l) => l.price);
                            const marketMin = Math.min(...prices);
                            const marketMax = Math.max(...prices);
                            const marketAvg = prices.reduce((s, p) => s + p, 0) / prices.length;
                            const base = Number(card.basePrice || 0);
                            const diffPercent =
                                base > 0 ? ((marketAvg - base) / base) * 100 : null;

                            items.push({
                                cardId: card.cardId,
                                cardName: card.name,
                                imageUrl: getCardImageUrl(card) || PLACEHOLDER_IMG,
                                basePrice: base,
                                marketMin,
                                marketMax,
                                marketAvg,
                                diffPercent,
                            });
                        } catch {
                            // ignore cards without listings
                        }
                    })
                );

                setTrends(
                    items
                        .filter((t) => t.diffPercent !== null)
                        .sort((a, b) => (b.diffPercent ?? 0) - (a.diffPercent ?? 0))
                        .slice(0, 30)
                );
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được dữ liệu xu hướng');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const topRising = useMemo(
        () => trends.filter((t) => (t.diffPercent ?? 0) > 0).slice(0, 10),
        [trends]
    );
    const topFalling = useMemo(
        () => trends.filter((t) => (t.diffPercent ?? 0) < 0).slice(0, 10),
        [trends]
    );

    return (
        <div className="space-y-8 py-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-2 font-serif gradient-text">Xu hướng thị trường</h1>
                <p className="text-muted-foreground">
                    So sánh giá hệ thống (base price) với giá đang bán của seller để tìm thẻ tăng/giảm mạnh.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                </div>
            ) : error ? (
                <div className="text-center text-red-400 py-12">{error}</div>
            ) : trends.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                    Chưa có dữ liệu listing để tính xu hướng.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="glass-card-strong p-4">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-400">
                            <TrendingUp className="h-5 w-5" />
                            Thẻ tăng giá mạnh
                        </h2>
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {topRising.map((t) => (
                                <div
                                    key={t.cardId}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedTrend(t)}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTrend(t)}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={t.imageUrl || PLACEHOLDER_IMG}
                                            alt={t.cardName}
                                            className="w-10 h-14 rounded object-cover bg-white/5 shrink-0"
                                            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">{t.cardName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Hệ thống: {t.basePrice.toLocaleString('vi-VN')} đ •
                                                Seller TB: {Math.round(t.marketAvg ?? 0).toLocaleString('vi-VN')} đ
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-green-400">
                                        +{t.diffPercent?.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="glass-card-strong p-4">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-400">
                            <TrendingDown className="h-5 w-5" />
                            Thẻ giảm giá mạnh
                        </h2>
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {topFalling.map((t) => (
                                <div
                                    key={t.cardId}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedTrend(t)}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTrend(t)}
                                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={t.imageUrl || PLACEHOLDER_IMG}
                                            alt={t.cardName}
                                            className="w-10 h-14 rounded object-cover bg-white/5 shrink-0"
                                            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">{t.cardName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Hệ thống: {t.basePrice.toLocaleString('vi-VN')} đ •
                                                Seller TB: {Math.round(t.marketAvg ?? 0).toLocaleString('vi-VN')} đ
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-red-400">
                                        {t.diffPercent?.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
            <PriceChartModal item={selectedTrend} onClose={() => setSelectedTrend(null)} />
        </div>
    );
};
