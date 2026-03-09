import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, Trash2, Bell, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
    cardApi,
    getCardImageUrl,
    type WishlistItem,
    type WishlistPriceAlert,
    type Card as CardType,
} from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

export const WishlistPage: React.FC = () => {
    const navigate = useNavigate();
    const { removeItem: removeFromWishlistLocal } = useWishlist();
    const [rows, setRows] = useState<{ item: WishlistItem; card: CardType | null }[]>([]);
    const [alerts, setAlerts] = useState<WishlistPriceAlert[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [res, alertsRes] = await Promise.all([
                    cardApi.getUserWishlist(0, 100),
                    cardApi.getWishlistPriceAlerts().catch(() => []),
                ]);
                const list = res.content ?? [];
                setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
                const withCards = await Promise.all(
                    list.map(async (item) => {
                        try {
                            const card = await cardApi.getCardById(item.cardId);
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
    }, []);

    const handleRemove = async (wishListId: string, cardId: string) => {
        try {
            await cardApi.removeFromWishlist(wishListId);
            removeFromWishlistLocal(cardId);
            setRows((prev) => prev.filter((r) => r.item.wishListId !== wishListId));
            window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
        } catch {
            alert('Không thể xóa khỏi wishlist');
        }
    };

    const formatRarity = (rarity?: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    const totalValue = rows.reduce((sum, r) => sum + (r.card?.basePrice ?? 0), 0);
    const itemCount = rows.length;

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-400"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Quay lại
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-300 flex items-center justify-center shadow-lg">
                            <Heart className="h-5 w-5 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Danh sách yêu thích</h1>
                            <p className="text-sm text-muted-foreground">
                                {itemCount} mục · Tổng giá trị khoảng {totalValue.toLocaleString('vi-VN')} đ
                            </p>
                        </div>
                    </div>
                    <div className="flex-1" />
                </div>

                <Card className="glass-card-strong">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Quản lý các thẻ bạn đã thêm vào wishlist. Khi có tin bán với giá ≤ giá mong muốn, bạn sẽ được thông báo ở biểu tượng chuông.
                        </p>
                        <Link to="/portfolio">
                            <Button variant="outline" size="sm">
                                Xem Bộ sưu tập
                            </Button>
                        </Link>
                    </div>

                    <div className="p-4">
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
                                    Thêm thẻ từ Bộ sưu tập hoặc Hộp bí ẩn vào danh sách yêu thích để theo dõi giá.
                                </p>
                                <Link to="/portfolio">
                                    <Button variant="premium" className="mt-6">
                                        Đến Bộ sưu tập
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rows.map(({ item, card }) => (
                                    <Card
                                        key={item.wishListId}
                                        className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/wishlist/${item.cardId}`)}
                                    >
                                        <div className="flex flex-col sm:flex-row gap-4 p-3 items-start sm:items-center">
                                            <div className="relative w-20 h-[112px] shrink-0 rounded-lg overflow-hidden bg-white/5 aspect-[2.5/3.5]">
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
                                                <h3 className="font-semibold text-sm md:text-base line-clamp-2 leading-tight">
                                                    {card?.name || 'Thẻ'}
                                                </h3>
                                                {card?.rarity && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {formatRarity(card.rarity)}
                                                    </p>
                                                )}
                                                {item.expectPrice != null && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Giá mong muốn:{' '}
                                                        {(item.expectPrice ?? 0).toLocaleString('vi-VN')} đ
                                                    </p>
                                                )}
                                                <p className="text-sm md:text-base font-bold text-accent-400 mt-1">
                                                    {(card?.basePrice ?? 0).toLocaleString('vi-VN')} đ
                                                </p>
                                                {(() => {
                                                    const alert = alerts.find((a) => a.wishListId === item.wishListId);
                                                    const count = alert?.matchingListings?.length ?? 0;
                                                    return count > 0 ? (
                                                        <Link
                                                            to={`/marketplace?card=${item.cardId}`}
                                                            className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium"
                                                        >
                                                            <Bell className="h-3 w-3" />
                                                            Có {count} tin bán ≤ giá mong muốn — Xem sàn
                                                        </Link>
                                                    ) : null;
                                                })()}
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <Link
                                                        to="/portfolio"
                                                        className="text-xs text-primary-400 hover:underline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        Xem trong Bộ sưu tập
                                                    </Link>
                                                    <Link
                                                        to="/marketplace"
                                                        className="text-xs text-primary-400 hover:underline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        Sàn giao dịch
                                                    </Link>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(item.wishListId, item.cardId)}
                                                className="ml-auto p-1.5 hover:bg-red-500/20 rounded-md text-red-400 transition-colors"
                                                aria-label="Xóa khỏi wishlist"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClickCapture={(e) => e.stopPropagation()}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

