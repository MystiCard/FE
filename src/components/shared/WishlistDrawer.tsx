import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart, Trash2, Loader2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cardApi, getCardImageUrl } from '@/utils/api';
import type { WishlistItem, WishlistPriceAlert } from '@/utils/api';
import type { Card as CardType } from '@/utils/api';
import { toast } from '@/components/ui/use-toast';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

interface WishlistDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({ isOpen, onClose }) => {
    const [rows, setRows] = useState<{ item: WishlistItem; card: CardType | null }[]>([]);
    const [alerts, setAlerts] = useState<WishlistPriceAlert[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            try {
                const [res, alertsRes] = await Promise.all([
                    cardApi.getUserWishlist(0, 50),
                    cardApi.getWishlistPriceAlerts().catch(() => []),
                ]);
                const list = res.content ?? [];
                setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
                const withCards = await Promise.all(
                    list.map(async (item) => {
                        const resolvedCardId = item.cardId ?? item.cardResponse?.cardId;
                        try {
                            if (!resolvedCardId) return { item, card: null as CardType | null };
                            const card = await cardApi.getCardById(resolvedCardId);
                            return { item, card };
                        } catch {
                            return { item, card: null as CardType | null };
                        }
                    })
                );
                setRows(withCards);
            } catch {
                setRows([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen]);

    const handleRemove = async (wishListId: string, cardId: string) => {
        try {
            await cardApi.removeFromWishlist(wishListId);
            setRows((prev) => prev.filter((r) => r.item.wishListId !== wishListId));
            window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
        } catch {
            toast({ title: 'Không thể xóa', description: 'Không xóa được khỏi wishlist.', variant: 'error' });
        }
    };

    const formatRarity = (rarity?: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const totalValue = rows.reduce((sum, r) => sum + (r.card?.basePrice ?? 0), 0);
    const itemCount = rows.length;

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden
            />

            <div
                className="fixed right-0 top-0 h-full w-full max-w-md glass-card-strong border-l border-white/20 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
                role="dialog"
                aria-label="Danh sách yêu thích"
            >
                <div className="p-6 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-300 flex items-center justify-center shadow-lg">
                                <Heart className="h-6 w-6 text-white fill-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold gradient-text">Danh sách yêu thích</h2>
                                <p className="text-sm text-muted-foreground">
                                    {itemCount} {itemCount === 1 ? 'mục' : 'mục'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Đóng"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 text-primary-400 animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Đang tải danh sách yêu thích...</p>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Heart className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground font-medium">Chưa có mục nào</p>
                            <p className="text-sm text-muted-foreground mt-1 text-center">
                                Thêm thẻ từ Bộ sưu tập hoặc Hộp bí ẩn vào danh sách yêu thích
                            </p>
                            <Button variant="outline" className="mt-6" onClick={onClose}>
                                Đóng
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rows.map(({ item, card }) => {
                                const cardId = item.cardId ?? item.cardResponse?.cardId;
                                return (
                                <Card
                                    key={item.wishListId}
                                    className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex gap-4 p-3">
                                        <div className="relative w-16 h-[88px] shrink-0 rounded-lg overflow-hidden bg-white/5 aspect-[2.5/3.5]">
                                            <img
                                                src={getCardImageUrl(card) || PLACEHOLDER_IMG}
                                                alt={card?.name || 'Thẻ'}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = PLACEHOLDER_IMG;
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                                                {card?.name || 'Thẻ'}
                                            </h3>
                                            {card?.rarity && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatRarity(card.rarity)}
                                                </p>
                                            )}
                                            {item.expectPrice != null && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Giá mong muốn: {(item.expectPrice ?? 0).toLocaleString('vi-VN')} đ
                                                </p>
                                            )}
                                            <p className="text-base font-bold text-accent-400 mt-1">
                                                {(card?.basePrice ?? 0).toLocaleString('vi-VN')} đ
                                            </p>
                                            {(() => {
                                                const alert = alerts.find((a) => a.wishListId === item.wishListId);
                                                const count = alert?.matchingListings?.length ?? 0;
                                                return count > 0 ? (
                                                    <Link
                                                        to={cardId ? `/marketplace?card=${cardId}` : '/marketplace'}
                                                        onClick={onClose}
                                                        className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium"
                                                    >
                                                        <Bell className="h-3 w-3" />
                                                        Có {count} tin bán ≤ giá mong muốn — Xem sàn
                                                    </Link>
                                                ) : null;
                                            })()}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Link
                                                    to="/portfolio"
                                                    onClick={onClose}
                                                    className="text-xs text-primary-400 hover:underline"
                                                >
                                                    Xem trong Bộ sưu tập
                                                </Link>
                                                <Link
                                                    to="/marketplace"
                                                    onClick={onClose}
                                                    className="text-xs text-primary-400 hover:underline"
                                                >
                                                    Sàn giao dịch
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => cardId && handleRemove(item.wishListId, cardId)}
                                                    className="ml-auto p-1.5 hover:bg-red-500/20 rounded-md text-red-400 transition-colors"
                                                    aria-label="Xóa khỏi wishlist"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )})}
                        </div>
                    )}
                </div>

                {rows.length > 0 && (
                    <div className="p-4 border-t border-white/10 shrink-0 bg-black/20">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">Tổng giá trị</span>
                            <span className="text-lg font-bold text-accent-400">
                                {totalValue.toLocaleString('vi-VN')} đ
                            </span>
                        </div>
                        <Button variant="ghost" className="w-full" onClick={onClose}>
                            Đóng
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
};
