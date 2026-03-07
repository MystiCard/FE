import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, Package, Tag, Filter, X, Star } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { cardApi, categoryApi, listSellerApi, Card as CardType, Category, ListingItem, getCardImageUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

const formatRarity = (rarity: string) =>
    rarity
        ? rarity
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
        : '';

const formatVND = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    return n.toLocaleString('vi-VN') + ' đ';
};

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
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const [cards, setCards] = useState<CardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
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
    const [myListings, setMyListings] = useState<ListingItem[]>([]);
    const [myListingsLoading, setMyListingsLoading] = useState(false);
    const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Nếu được chuyển từ lịch sử mở hộp bí ẩn: ?card={cardId}&fromBlindBox=1 → chỉ cho phép 1 thẻ
    const searchParams = new URLSearchParams(location.search);
    const preselectCardId = searchParams.get('card') || undefined;
    const fromBlindBox = searchParams.get('fromBlindBox') === '1';

    useEffect(() => {
        loadCards();
        loadCategories();
    }, []);

    const loadMyListings = async () => {
        if (!isAuthenticated) return;
        setMyListingsLoading(true);
        try {
            const res = await listSellerApi.getMyListings(0, 24);
            setMyListings(res.content ?? []);
        } catch {
            setMyListings([]);
        } finally {
            setMyListingsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) loadMyListings();
    }, [isAuthenticated]);

    const openListingDetail = (item: ListingItem) => {
        setSelectedListing(item);
        setEditPrice(String(item.price));
        setEditQuantity(String(item.quantity));
        setEditError('');
    };

    const handleSaveListing = async () => {
        if (!selectedListing) return;
        const priceNum = parseFloat(editPrice.replace(/\s/g, '').replace(/,/g, '.'));
        const qty = parseInt(editQuantity, 10);
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setEditError('Nhập giá hợp lệ.');
            return;
        }
        if (!Number.isInteger(qty) || qty < 0) {
            setEditError('Số lượng phải là số nguyên không âm.');
            return;
        }
        setEditSaving(true);
        setEditError('');
        try {
            await listSellerApi.updateMyListing(selectedListing.listSellerId, { price: priceNum, quantity: qty });
            await loadMyListings();
            setSelectedListing(null);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Không thể cập nhật bài đăng.');
        } finally {
            setEditSaving(false);
        }
    };

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

    // Tự động chọn thẻ nếu có query param ?card=...
    useEffect(() => {
        if (!preselectCardId || !cards.length) return;
        const card = cards.find((c) => c.cardId === preselectCardId);
        if (card) {
            setSelectedCard(card);
        }
    }, [preselectCardId, cards]);

    // Từ hộp bí ẩn: chỉ được đăng bán 1 thẻ
    useEffect(() => {
        if (fromBlindBox) setQuantity('1');
    }, [fromBlindBox]);

    const filteredCards = useMemo(() => {
        let list = [...cards];

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
    }, [cards, searchQuery, filterCategory, filterRarity, sortBy, categories]);

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

        const priceStr = price.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
        const priceNum = parseFloat(priceStr);
        const qty = fromBlindBox ? 1 : parseInt(quantity, 10);

        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setError('Nhập giá hợp lệ.');
            return;
        }
        if (!fromBlindBox && (!Number.isInteger(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0)) {
            setError('Số lượng phải là số nguyên dương.');
            return;
        }
        if (fromBlindBox && qty !== 1) {
            setError('Thẻ từ Hộp bí ẩn chỉ được đăng bán 1 thẻ.');
            return;
        }

        setSubmitting(true);
        try {
            await listSellerApi.createListing(selectedCard.cardId, {
                price: priceNum,
                quantity: qty,
                description: description.trim() || undefined,
            });
            await loadMyListings();
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
                        <Package className="h-4 w-4 text-primary-400" />
                        Chọn thẻ trong hệ thống và nhập giá, số lượng để đăng bán.
                    </p>
                </div>

                {/* Bài đăng bán của tôi */}
                {isAuthenticated && (
                    <Card className="glass-card-strong mb-6">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Tag className="h-4 w-4 text-primary-400" />
                                Bài đăng bán của tôi
                                {myListings.length > 0 && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({myListings.length} tin)
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {myListingsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : myListings.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">Bạn chưa có bài đăng bán nào.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[220px] overflow-y-auto">
                                    {myListings.map((item) => {
                                        const soldOut = item.quantity <= 0;
                                        return (
                                            <button
                                                key={item.listSellerId}
                                                type="button"
                                                onClick={() => openListingDetail(item)}
                                                className="text-left rounded-xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-colors relative"
                                            >
                                                <div className="aspect-[2.5/3.5] relative">
                                                    <img
                                                        src={item.imageUrl || PLACEHOLDER_IMG}
                                                        alt={item.cardName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = PLACEHOLDER_IMG;
                                                        }}
                                                    />
                                                    {soldOut && (
                                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                            <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/90 text-white uppercase">
                                                                Hết hàng
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!soldOut && (
                                                        <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-500/80 text-center">
                                                            SL: {item.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-2 bg-black/40">
                                                    <p className="text-xs font-medium truncate">{item.cardName}</p>
                                                    <p className="text-xs font-semibold text-yellow-400">
                                                        {formatVND(item.price)}
                                                    </p>
                                                    {(item.sellerFeedbackCount != null && item.sellerFeedbackCount > 0) && (
                                                        <p className="text-[10px] text-amber-400/90 mt-0.5 flex items-center gap-0.5 flex-wrap">
                                                            <Star className="h-3 w-3 fill-amber-400 shrink-0" />
                                                            <span>{Number(item.sellerAverageRating ?? 0).toFixed(1)}</span>
                                                            {item.sellerFeedbackCount != null && item.sellerFeedbackCount > 0 && (
                                                                <span className="text-muted-foreground">({item.sellerFeedbackCount} đánh giá)</span>
                                                            )}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">Xem / Chỉnh sửa</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

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
                                    <Package className="h-4 w-4 text-primary-400" />
                                    Chọn thẻ để đăng bán ({filteredCards.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                                        <p className="text-sm text-muted-foreground">Đang tải danh sách thẻ...</p>
                                    </div>
                                ) : filteredCards.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Package className="h-10 w-10 mx-auto mb-3 text-primary-400/50" />
                                        <p className="font-medium">Không có thẻ nào trùng bộ lọc</p>
                                        <p className="text-sm mt-1">Thử đổi điều kiện tìm kiếm hoặc danh mục.</p>
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
                                                            src={getCardImageUrl(card) || PLACEHOLDER_IMG}
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
                                                            {card.categoryName || '—'} · {formatVND(card.basePrice)}
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
                                                src={getCardImageUrl(selectedCard) || PLACEHOLDER_IMG}
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
                                                    Khoảng giá: {formatVND(selectedCard.minPrice)} – {formatVND(selectedCard.maxPrice)}
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
                                                Giá bán (VNĐ) *
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="50 000"
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Số lượng * {fromBlindBox && <span className="text-muted-foreground font-normal">(từ Hộp bí ẩn: chỉ 1 thẻ)</span>}
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={fromBlindBox ? 1 : undefined}
                                                value={fromBlindBox ? '1' : quantity}
                                                onChange={(e) => !fromBlindBox && setQuantity(e.target.value)}
                                                readOnly={fromBlindBox}
                                                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-70"
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

                {/* Modal chi tiết + chỉnh sửa bài đăng */}
                <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
                    <DialogContent className="max-w-md">
                        {selectedListing && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-primary-400" />
                                        Chi tiết bài đăng
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-2">
                                    <div className="flex gap-4 p-3 rounded-lg bg-white/5">
                                        <img
                                            src={selectedListing.imageUrl || PLACEHOLDER_IMG}
                                            alt={selectedListing.cardName}
                                            className="w-24 h-32 object-cover rounded-lg shrink-0"
                                            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold line-clamp-2">{selectedListing.cardName}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {selectedListing.categoryName || '—'} · {formatRarity(selectedListing.rarity)}
                                            </p>
                                            {selectedListing.quantity <= 0 && (
                                                <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold bg-red-500/90 text-white">
                                                    Hết hàng
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Giá bán (VNĐ)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                                placeholder="50 000"
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Số lượng</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                        {editError && (
                                            <p className="text-sm text-red-400">{editError}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            disabled={editSaving}
                                            onClick={handleSaveListing}
                                        >
                                            {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setSelectedListing(null)}>
                                            Đóng
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};
