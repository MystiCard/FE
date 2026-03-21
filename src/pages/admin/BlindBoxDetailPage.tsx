import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Grid, Percent, ShoppingBag } from 'lucide-react';
import { blindBoxApi, BlindBox, BlindBoxCardInBox, BlindBoxProbability, getCardImageUrl, cardApi, Card as CardType } from '@/api';
import { ADMIN_API_PAGE_SIZE } from './adminApiPageSize';

const formatCurrencyVND = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString('vi-VN') + ' VND';
};

export const AdminBlindBoxDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [box, setBox] = useState<BlindBox | null>(null);
    const [cards, setCards] = useState<BlindBoxCardInBox[]>([]);
    const [probabilities, setProbabilities] = useState<BlindBoxProbability[]>([]);
    const [availableCards, setAvailableCards] = useState<CardType[]>([]);
    const [page, setPage] = useState(0); // 0-based theo BE
    const [cardsTotalPages, setCardsTotalPages] = useState(1);
    const [cardsTotalElements, setCardsTotalElements] = useState(0);
    const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'opened'>('all');
    const [rarityFilter, setRarityFilter] = useState<string>('all');
    const pageSize = ADMIN_API_PAGE_SIZE;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        (async () => {
            try {
                const [b, c, p, all] = await Promise.all([
                    blindBoxApi.getBlindBoxById(id),
                    blindBoxApi.getBlindBoxCards(id, page, pageSize).catch(() => ({
                        content: [],
                        totalPages: 1,
                        totalElements: 0,
                        size: pageSize,
                        number: page,
                        last: true,
                    })),
                    blindBoxApi.getBlindBoxProbabilities(id).catch(() => []),
                    cardApi.getAllCards().catch(() => []),
                ]);
                setBox(b);
                const list = Array.isArray(c?.content) ? c.content : [];
                setCards(list);
                setCardsTotalPages(Math.max(1, Number(c?.totalPages ?? 1)));
                setCardsTotalElements(Number(c?.totalElements ?? list.length));
                setProbabilities(Array.isArray(p) ? p : []);
                setAvailableCards(Array.isArray(all) ? all : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không tải được chi tiết hộp bí ẩn');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id, page]);

    if (isLoading) {
        return (
            <div className="py-16 text-center text-muted-foreground">
                Đang tải chi tiết hộp bí ẩn...
            </div>
        );
    }

    if (!box) {
        return (
            <div className="space-y-4">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}
                <p className="text-muted-foreground">Không tìm thấy hộp bí ẩn.</p>
                <Button asChild variant="outline">
                    <Link to="/admin/blind-boxes">Quay lại danh sách</Link>
                </Button>
            </div>
        );
    }

    const getBoxPrice = (b: BlindBox): number => {
        const p = b?.drawPrice;
        if (p == null) return 0;
        const n = typeof p === 'string' ? parseFloat(p as any) : Number(p);
        return Number.isFinite(n) ? n : 0;
    };

    const getAllBoxPrice = (b: BlindBox): number => {
        const p = b?.allBoxPrice;
        if (p == null) return 0;
        const n = typeof p === 'string' ? parseFloat(p as any) : Number(p);
        return Number.isFinite(n) ? n : 0;
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'COMMON': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
            case 'UNCOMMON': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'RARE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'ULTRA_RARE': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'SUPER_RARE': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'SECRET_RARE': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-muted-foreground bg-white/5 border-white/10';
        }
    };

    const filteredByStatus = (cards ?? []).filter((c) => {
        if (statusFilter === 'in') return c.status === true;
        if (statusFilter === 'opened') return c.status === false;
        return true;
    });

    const filteredCards = filteredByStatus.filter((c) => {
        if (rarityFilter === 'all') return true;
        return (c.rarity || '').toUpperCase() === rarityFilter.toUpperCase();
    });

    const totalCards = cardsTotalElements;
    const totalPages = Math.max(1, cardsTotalPages);
    const currentPage = Math.min(page, totalPages - 1);
    const pagedCards = filteredCards;

    const buildPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 0; i < totalPages; i++) pages.push(i);
            return pages;
        }
        pages.push(0);
        const left = Math.max(1, currentPage - 1);
        const right = Math.min(totalPages - 2, currentPage + 1);
        if (left > 1) pages.push('ellipsis');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 2) pages.push('ellipsis');
        pages.push(totalPages - 1);
        return pages;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ShoppingBag className="h-8 w-8 text-primary-400" />
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold font-serif gradient-text">
                            {box.name}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Chi tiết hộp bí ẩn
                        </p>
                    </div>
                </div>
                <Button asChild variant="outline">
                    <Link to="/admin/blind-boxes">Quay lại danh sách</Link>
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="glass-card-strong lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Thông tin hộp</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {box.imageUrl && (
                            <div className="w-full">
                                <div className="rounded-xl overflow-hidden bg-black/30 border border-white/10 inline-block">
                                    <img
                                        src={box.imageUrl}
                                        alt={box.name}
                                        className="block max-h-[280px] w-auto object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex-1 space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {box.description || 'Chưa có mô tả.'}
                            </p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Giá mở / lần</span>
                                    <span className="font-mono font-bold text-accent-400">
                                        {formatCurrencyVND(getBoxPrice(box))}
                                    </span>
                                </div>
                                {getAllBoxPrice(box) > 0 && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Tổng giá trị hộp</span>
                                        <span className="font-mono text-primary-300">
                                            {formatCurrencyVND(getAllBoxPrice(box))}
                                        </span>
                                    </div>
                                )}
                                {box.blindBoxStatus && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Trạng thái</span>
                                        <span className="font-medium">{box.blindBoxStatus}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground">
                                    Bộ lọc thẻ trong hộp
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value as 'all' | 'in' | 'opened');
                                            setPage(0);
                                        }}
                                        className="h-8 px-3 rounded-full bg-black/40 border border-white/10 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                                    >
                                        <option value="all">Tất cả trạng thái</option>
                                        <option value="in">Còn trong hộp</option>
                                        <option value="opened">Đã mở khỏi hộp</option>
                                    </select>
                                    <select
                                        value={rarityFilter}
                                        onChange={(e) => {
                                            setRarityFilter(e.target.value);
                                            setPage(0);
                                        }}
                                        className="h-8 px-3 rounded-full bg-black/40 border border-white/10 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                                    >
                                        <option value="all">Tất cả độ hiếm</option>
                                        <option value="COMMON">Common</option>
                                        <option value="UNCOMMON">Uncommon</option>
                                        <option value="RARE">Rare</option>
                                        <option value="ULTRA_RARE">Ultra Rare</option>
                                        <option value="SUPER_RARE">Super Rare</option>
                                        <option value="SECRET_RARE">Secret Rare</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    {probabilities.length > 0 && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Percent className="h-4 w-4" /> Tỷ lệ độ hiếm
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {probabilities.map((prob, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl border ${getRarityColor(prob.rarity)} flex flex-col items-center text-center`}
                                        >
                                            <span className="text-xs font-bold opacity-70 mb-1">{prob.rarity}</span>
                                            <span className="text-2xl font-black">
                                                {(Number(prob.probability ?? 0)).toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="glass-card-strong">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                    <Grid className="h-4 w-4" /> Thẻ trong hộp
                                </span>
                                {totalCards > 0 && (
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                        Trang {currentPage + 1}/{totalPages} · {totalCards} thẻ
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-3 flex justify-between">
                                <span>
                                    {(cards ?? []).filter(c => c.status).length} còn trong hộp · {(cards ?? []).filter(c => c.status === false).length} đã mở
                                </span>
                                {totalCards > 0 && (
                                    <span>
                                        Đang xem {pagedCards.length} / {totalCards} thẻ
                                    </span>
                                )}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {pagedCards.map((card, idx) => {
                                    const matchedCard = availableCards.find(c => c.cardId === (card.cardId || card.cardResponse?.cardId));
                                    const imageSrc =
                                        getCardImageUrl(card.cardResponse || card) ||
                                        (matchedCard ? getCardImageUrl(matchedCard) : '') ||
                                        'https://via.placeholder.com/150?text=Card';

                                    return (
                                        <div
                                            key={card.cardId || card.blindBoxCardId || `card-${idx}`}
                                            className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/40"
                                        >
                                            {card.status === false && (
                                                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wide">
                                                    Đã mở
                                                </div>
                                            )}
                                            <div className="aspect-[2/3]">
                                                <img
                                                    src={imageSrc}
                                                    alt={card.name || matchedCard?.name || ''}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                            <div className="p-2 bg-black/60 border-t border-white/10">
                                                <p className="text-xs font-bold text-white truncate">
                                                    {card.cardResponse?.name || card.name || matchedCard?.name || '—'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {card.cardResponse?.rarity || card.rarity || matchedCard?.rarity || '—'}
                                                </p>
                                                <p className="text-[10px] text-emerald-300">
                                                    Giá: {formatCurrencyVND(Number(card.cardResponse?.basePrice ?? card.basePrice ?? matchedCard?.basePrice ?? 0))}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full px-3 h-8 text-xs"
                                        disabled={currentPage <= 0}
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    >
                                        ‹
                                    </Button>
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                                        {buildPageNumbers().map((item, idx) =>
                                            item === 'ellipsis' ? (
                                                <span
                                                    key={`e-${idx}`}
                                                    className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground"
                                                >
                                                    ...
                                                </span>
                                            ) : (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => setPage(item)}
                                                    className={`w-7 h-7 rounded-full text-[11px] font-medium border transition-colors ${
                                                        item === currentPage
                                                            ? 'bg-primary-500 text-white border-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                                                            : 'border-white/10 text-muted-foreground hover:bg-white/10'
                                                    }`}
                                                >
                                                    {item + 1}
                                                </button>
                                            )
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full px-3 h-8 text-xs"
                                        disabled={currentPage >= totalPages - 1}
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                    >
                                        ›
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

