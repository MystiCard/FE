import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Package, Tag, Filter, X, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cardApi, categoryApi, listSellerApi, Card as CardType, Category } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

const formatRarity = (rarity: string) =>
    rarity
        ? rarity
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
        : '';

const rarityClass: Record<string, string> = {
    SECRET_RARE: 'bg-purple-500/20 text-purple-400',
    ULTRA_RARE: 'bg-yellow-500/20 text-yellow-400',
    SUPER_RARE: 'bg-orange-500/20 text-orange-400',
    RARE: 'bg-blue-500/20 text-blue-400',
    UNCOMMON: 'bg-green-500/20 text-green-400',
    COMMON: 'bg-gray-500/20 text-gray-400',
};

export const PostListingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { items: wishlistItems } = useWishlist();
    const [cards, setCards] = useState<CardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [apiWishlistIds, setApiWishlistIds] = useState<Set<string>>(new Set());
    const [wishlistIdsLoaded, setWishlistIdsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterRarity, setFilterRarity] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
    const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const wishlistCardIds = isAuthenticated
        ? apiWishlistIds
        : new Set(wishlistItems.map((i) => String(i.id)));

    useEffect(() => {
        if (!isAuthenticated) {
            setWishlistIdsLoaded(true);
            return;
        }
        const load = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 500);
                setApiWishlistIds(new Set((res.content ?? []).map((w) => w.cardId)));
            } catch {
                setApiWishlistIds(new Set());
            } finally {
                setWishlistIdsLoaded(true);
            }
        };
        load();
    }, [isAuthenticated]);

    useEffect(() => {
        loadCards();
        loadCategories();
    }, []);

    const loadCards = async () => {
        try {
            setIsLoading(true);
            const data = await cardApi.getAllCards();
            setCards(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách thẻ');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await categoryApi.getAllCategories();
            setCategories(data);
        } catch {
            // ignore
        }
    };

    const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'] as const;

    const filteredCards = useMemo(() => {
        // Chỉ được đăng bán thẻ đã có trong wishlist
        let list = cards.filter((c) => wishlistCardIds.has(c.cardId));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                c =>
                    c.name.toLowerCase().includes(q) ||
                    (c.categoryName && c.categoryName.toLowerCase().includes(q))
            );
        }

        if (filterCategory !== 'all') {
            const cat = categories.find(x => x.categoryId === filterCategory);
            if (cat) {
                const name = cat.categoryName?.toLowerCase();
                list = list.filter(c => c.categoryName?.toLowerCase() === name);
            }
        }

        if (filterRarity !== 'all') {
            list = list.filter(c => c.rarity === filterRarity);
        }

        if (sortBy === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'price-asc') {
            list.sort((a, b) => a.basePrice - b.basePrice);
        } else {
            list.sort((a, b) => b.basePrice - a.basePrice);
        }

        return list;
    }, [cards, wishlistCardIds, searchQuery, filterCategory, filterRarity, sortBy, categories]);

    const hasActiveFilters = searchQuery.trim() || filterCategory !== 'all' || filterRarity !== 'all';
    const clearFilters = () => {
        setSearchQuery('');
        setFilterCategory('all');
        setFilterRarity('all');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedCard) return;

        const priceNum = parseFloat(price.replace(/,/g, '.'));
        const qty = parseInt(quantity, 10);

        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setError('Nhập giá hợp lệ.');
            return;
        }
        if (!Number.isInteger(qty) || qty <= 0) {
            setError('Số lượng phải là số nguyên dương.');
            return;
        }

        setSubmitting(true);
        try {
            await listSellerApi.createListing(selectedCard.cardId, {
                price: priceNum,
                quantity: qty,
                description: description.trim() || undefined,
            });
            navigate('/marketplace');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Tạo listing thất bại. Thử lại sau.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        to="/marketplace"
                        className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Về Marketplace
                    </Link>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Đăng bán thẻ</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Heart className="h-4 w-4 text-pink-400" />
                        Chỉ được chọn thẻ đã có trong wishlist. Chọn thẻ và nhập giá, số lượng để đăng bán.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Browse cards */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Bộ lọc */}
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                    <Filter className="h-4 w-4" />
                                    Bộ lọc
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Tìm kiếm */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        Tìm kiếm
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Tên thẻ hoặc tên set..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Danh mục */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                            Danh mục
                                        </label>
                                        <select
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value)}
                                            className="w-full px-3 py-2.5 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                                        >
                                            <option value="all">Tất cả</option>
                                            {categories.map((c) => (
                                                <option key={c.categoryId} value={c.categoryId}>
                                                    {c.categoryName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Độ hiếm */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                            Độ hiếm
                                        </label>
                                        <select
                                            value={filterRarity}
                                            onChange={(e) => setFilterRarity(e.target.value)}
                                            className="w-full px-3 py-2.5 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                                        >
                                            <option value="all">Tất cả</option>
                                            {RARITIES.map((r) => (
                                                <option key={r} value={r}>
                                                    {formatRarity(r)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sắp xếp */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                            Sắp xếp
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'name' | 'price-asc' | 'price-desc')}
                                            className="w-full px-3 py-2.5 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                                        >
                                            <option value="name">Tên A → Z</option>
                                            <option value="price-asc">Giá thấp → cao</option>
                                            <option value="price-desc">Giá cao → thấp</option>
                                        </select>
                                    </div>

                                    {/* Xóa bộ lọc */}
                                    <div className="flex items-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            disabled={!hasActiveFilters}
                                            className="w-full gap-1.5 text-muted-foreground hover:text-white"
                                        >
                                            <X className="h-4 w-4" />
                                            Xóa bộ lọc
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Hiển thị <span className="font-medium text-white">{filteredCards.length}</span> thẻ
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card grid */}
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-pink-400" />
                                    Chọn thẻ trong wishlist để bán ({filteredCards.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(isLoading || (isAuthenticated && !wishlistIdsLoaded)) ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                                        <p className="text-sm text-muted-foreground">Đang tải thẻ...</p>
                                    </div>
                                ) : filteredCards.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        {wishlistCardIds.size === 0 ? (
                                            <>
                                                <Heart className="h-10 w-10 mx-auto mb-3 text-pink-400/50" />
                                                <p className="font-medium">Chưa có thẻ nào trong wishlist</p>
                                                <p className="text-sm mt-1">Thêm thẻ vào wishlist từ My Collection (Portfolio) trước khi đăng bán.</p>
                                                <Button variant="outline" className="mt-4" onClick={() => navigate('/portfolio')}>
                                                    Đến My Collection
                                                </Button>
                                            </>
                                        ) : (
                                            'Không có thẻ nào trong wishlist trùng bộ lọc.'
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">
                                        {filteredCards.map((card) => {
                                            const isSelected = selectedCard?.cardId === card.cardId;
                                            return (
                                                <button
                                                    key={card.cardId}
                                                    type="button"
                                                    onClick={() => setSelectedCard(card)}
                                                    className={`text-left rounded-xl overflow-hidden border-2 transition-all ${
                                                        isSelected
                                                            ? 'border-primary-500 ring-2 ring-primary-500/30'
                                                            : 'border-white/10 hover:border-white/30'
                                                    }`}
                                                >
                                                    <div className="aspect-[2.5/3.5] relative">
                                                        <img
                                                            src={card.imageUrl || PLACEHOLDER_IMG}
                                                            alt={card.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.src = PLACEHOLDER_IMG;
                                                            }}
                                                        />
                                                        <span
                                                            className={`absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                                rarityClass[card.rarity] || 'bg-gray-500/20'
                                                            }`}
                                                        >
                                                            {formatRarity(card.rarity)}
                                                        </span>
                                                    </div>
                                                    <div className="p-2 bg-black/40">
                                                        <p className="text-xs font-medium truncate">{card.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {card.categoryName || '—'} · ${card.basePrice.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Listing form */}
                    <div className="lg:col-span-1">
                        <Card className="glass-card-strong sticky top-24">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Tag className="h-4 w-4" />
                                    Thông tin listing
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!selectedCard ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">Chọn một thẻ bên trái để đăng bán</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Preview */}
                                        <div className="flex gap-4 p-3 rounded-lg bg-white/5">
                                            <img
                                                src={selectedCard.imageUrl || PLACEHOLDER_IMG}
                                                alt={selectedCard.name}
                                                className="w-20 h-28 object-cover rounded-lg shrink-0"
                                                onError={(e) => {
                                                    e.currentTarget.src = PLACEHOLDER_IMG;
                                                }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-sm line-clamp-2">
                                                    {selectedCard.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {selectedCard.categoryName || '—'}
                                                </p>
                                                <span
                                                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] ${
                                                        rarityClass[selectedCard.rarity] || 'bg-gray-500/20'
                                                    }`}
                                                >
                                                    {formatRarity(selectedCard.rarity)}
                                                </span>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Khoảng giá: ${selectedCard.minPrice.toFixed(2)} – $
                                                    {selectedCard.maxPrice.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                                {error}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Giá bán ($) *
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Số lượng *
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Mô tả (tùy chọn)
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Tình trạng, ghi chú..."
                                                rows={2}
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                type="submit"
                                                variant="premium"
                                                className="flex-1"
                                                disabled={submitting}
                                            >
                                                {submitting ? 'Đang đăng...' : 'Đăng bán'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => navigate('/marketplace')}
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};
