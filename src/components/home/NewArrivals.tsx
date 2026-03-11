import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { Link, useNavigate } from 'react-router-dom';
import { listSellerApi, ListingItem } from '@/utils/api';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80';

const formatRarity = (rarity: string) =>
    rarity
        ? String(rarity)
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
        : '';

export const NewArrivals: React.FC = () => {
    const { addItem: addToWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await listSellerApi.getListings(0, 8);
                const list = (res.content || []).filter((item) => item.quantity > 0);
                setListings(list);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được sản phẩm');
                setListings([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {listings.map((item, index) => (
                        <Card
                            key={item.listSellerId}
                            className="group overflow-hidden"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="relative aspect-[3/4] overflow-hidden">
                                <img
                                    src={item.imageUrl || PLACEHOLDER_IMG}
                                    alt={item.cardName}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    onError={(e) => {
                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                    }}
                                />
                                <div className="absolute top-2 right-2">
                                    <div className="glass-card-strong px-2 py-1 rounded-full text-xs font-medium">
                                        {formatRarity(item.rarity)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        addToWishlist({
                                            id: item.cardId,
                                            name: item.cardName,
                                            price: item.price,
                                            image: item.imageUrl || '',
                                            rarity: item.rarity,
                                        });
                                    }}
                                    className="absolute top-2 left-2 p-2 glass-card-strong rounded-full hover:bg-white/20"
                                >
                                    <Heart
                                        className={`h-4 w-4 ${isInWishlist(item.cardId) ? 'fill-red-500 text-red-500' : ''}`}
                                    />
                                </button>
                            </div>

                            <CardContent className="p-3">
                                <h3 className="font-semibold text-sm md:text-base mb-1 line-clamp-2">{item.cardName}</h3>
                                <p className="text-xs md:text-sm text-muted-foreground mb-1">
                                    {item.categoryName || 'Thẻ sưu tầm'} · SL: {item.quantity}
                                </p>
                                {(item.minPrice != null && item.maxPrice != null) && (
                                    <p className="text-[11px] md:text-xs text-muted-foreground mb-1">
                                        Giới hạn giá: {Number(item.minPrice).toLocaleString('vi-VN')} – {Number(item.maxPrice).toLocaleString('vi-VN')} đ
                                    </p>
                                )}
                                <p className="text-[11px] md:text-xs text-muted-foreground mb-2">
                                    Sàn giao dịch · Seller: <span className="font-medium text-white/90">{item.sellerName || '—'}</span>
                                    {(item.sellerFeedbackCount != null && item.sellerFeedbackCount > 0) && (
                                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-400/90">
                                            <Star className="h-3 w-3 fill-amber-400 shrink-0" />
                                            {Number(item.sellerAverageRating ?? 0).toFixed(1)}
                                            <span className="text-muted-foreground">({item.sellerFeedbackCount} đánh giá)</span>
                                        </span>
                                    )}
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm md:text-base font-bold gradient-text">
                                        {Number(item.price).toLocaleString('vi-VN')} đ
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="premium"
                                        onClick={() => navigate('/marketplace')}
                                    >
                                        Xem trên sàn
                                    </Button>
                                </div>

                                <div className="flex items-center mt-3 text-xs text-muted-foreground">
                                    <Star className="h-3 w-3 fill-accent-500 text-accent-500 mr-1" />
                                    <span>Sàn giao dịch</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
};
