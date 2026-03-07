import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Layers, Heart, Loader2 } from 'lucide-react';
import { Card as CardType, Category, cardApi, getCardImageUrl } from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';

/** Modal nhỏ nhập giá mong muốn khi thêm wishlist */
function ExpectPriceModal({
    isOpen,
    onClose,
    cardName,
    onSubmit,
    loading,
}: {
    isOpen: boolean;
    onClose: () => void;
    cardName: string;
    onSubmit: (expectPrice: number | undefined) => void;
    loading: boolean;
}) {
    const [value, setValue] = useState<string>('');
    React.useEffect(() => {
        if (isOpen) setValue('');
    }, [isOpen]);
    const handleSubmit = () => {
        const num = value.trim() ? Number(value.trim()) : undefined;
        if (num !== undefined && (Number.isNaN(num) || num < 0)) return;
        onSubmit(num);
        setValue('');
        onClose();
    };
    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm glass-card-strong border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-lg">Thêm vào wishlist</DialogTitle>
                    <DialogDescription>
                        Nhập giá mong muốn (VNĐ) cho thẻ <strong>{cardName}</strong>. Khi có người bán dưới giá này, bạn sẽ được thông báo.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                    <input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="Ví dụ: 50000 (để trống = không đặt giá)"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                onSubmit(undefined);
                                onClose();
                            }}
                        >
                            Bỏ qua (vẫn thêm wishlist)
                        </Button>
                        <Button variant="premium" onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Thêm wishlist'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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
    const [showExpectPriceModal, setShowExpectPriceModal] = useState(false);

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

    const handleAddWishlistWithPrice = async (expectPrice?: number) => {
        if (!card) return;
        setWishlistLoading(true);
        setShowExpectPriceModal(false);
        addToWishlistLocal({
            id: card.cardId,
            name: card.name,
            price: card.basePrice,
            image: getCardImageUrl(card) || PLACEHOLDER_IMG,
            rarity: card.rarity,
        });
        setInWishlist(true);

        if (isAuthenticated) {
            try {
                await cardApi.addToWishlist(card.cardId, expectPrice);
                window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
            } catch {
                setInWishlist(false);
                removeFromWishlistLocal(card.cardId);
            }
        }
        setWishlistLoading(false);
    };

    const toggleWishlist = async () => {
        if (!card) return;
        // Nếu đã trong wishlist -> xoá
        if (inWishlist) {
            setWishlistLoading(true);
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
            setWishlistLoading(false);
        } else {
            // Chưa có trong wishlist -> mở modal nhập giá mong muốn
            setShowExpectPriceModal(true);
        }
    };

    const formatRarity = (rarity: string) =>
        rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

    return (
    <>
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

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] gap-8 mt-4">
                    <div className="flex justify-center">
                        <div className="relative group w-full max-w-sm">
                            <img
                                src={getCardImageUrl(card) || PLACEHOLDER_IMG}
                                alt={card.name}
                                className="w-full h-auto rounded-xl shadow-2xl object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = PLACEHOLDER_IMG;
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-black/20 border-white/10 min-w-0">
                            <CardContent className="p-4 md:p-5">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-accent-400" />
                                    Giá tham khảo (VNĐ)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Gốc</p>
                                        <p className="text-sm font-semibold text-accent-400 whitespace-nowrap">
                                            {Number(card.basePrice).toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Thấp nhất</p>
                                        <p className="text-sm font-semibold whitespace-nowrap">
                                            {Number(card.minPrice).toLocaleString('vi-VN')} đ
                                        </p>
                                    </div>
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Cao nhất</p>
                                        <p className="text-sm font-semibold whitespace-nowrap">
                                            {Number(card.maxPrice).toLocaleString('vi-VN')} đ
                                        </p>
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
        <ExpectPriceModal
            isOpen={showExpectPriceModal}
            onClose={() => setShowExpectPriceModal(false)}
            cardName={card.name}
            onSubmit={handleAddWishlistWithPrice}
            loading={wishlistLoading}
        />
    </>
    );
};
