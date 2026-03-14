import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Package, Tag, Filter, X, ImagePlus } from 'lucide-react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { cardApi, categoryApi, listSellerApi, Card as CardType, Category, getCardImageUrl } from '@/utils/api';
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
    const [imageSearching, setImageSearching] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { page: pageParam } = useParams<{ page?: string }>();
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
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [searchImage, setSearchImage] = useState<File | null>(null);
    // Quản lý listing chi tiết được chuyển sang trang /my-listings

    // Flow "Card not in system": chuyển qua trang gửi yêu cầu (Seller -> Admin)
    const requestSent = new URLSearchParams(location.search).get('requestSent') === '1';

    const initialPageFromUrl = (() => {
        const raw = pageParam ? parseInt(pageParam, 10) : 1;
        if (!Number.isFinite(raw) || raw <= 1) return 0;
        return raw - 1;
    })();

    // Phân trang & sort phía BE cho danh sách thẻ hệ thống
    const [cardPage, setCardPage] = useState(initialPageFromUrl);
    // Hiển thị tối đa 8 thẻ mỗi trang trong danh sách chọn thẻ
    const [cardPageSize] = useState(8);
    const [cardTotalPages, setCardTotalPages] = useState(0);

    // Nếu được chuyển từ lịch sử mở hộp bí ẩn: ?card={cardId}&fromBlindBox=1 → chỉ cho phép 1 thẻ
    const searchParams = new URLSearchParams(location.search);
    const preselectCardId = searchParams.get('card') || undefined;
    const fromBlindBox = searchParams.get('fromBlindBox') === '1';
    const handleSearchByImage = async (file: File) => {
        try {
            setImageSearching(true);
            setError('');
            setSearchImage(file);
            const data = await cardApi.searchCardByImage(file);
            console.log("Data search image ", data);

            if (data.success) {
                setCards(data.data || []);
                setCardTotalPages(1);
                setCardPage(0);
            } else {
                setError("Không tìm thấy thẻ từ hình ảnh");
            }
        } catch (err) {
            setError("Search image thất bại");
        } finally {
            setImageSearching(false);
        }
    };
    const loadCards = async (pageOverride?: number) => {
        try {
            setIsLoading(true);
            const pageIndex = pageOverride ?? cardPage;
            // sort ở BE: asc/desc theo basePrice; sortBy 'name' xử lý FE
            const sortForApi: 'asc' | 'desc' = sortBy === 'price-desc' ? 'desc' : 'asc';
            const res = await cardApi.searchCards(pageIndex, cardPageSize, searchQuery, sortForApi);
            setCards(res.content ?? []);
            setCardTotalPages(res.totalPages ?? 0);
            setCardPage(res.number ?? pageIndex);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách thẻ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Luôn load danh sách thẻ để seller có gì đó để chọn,
        // đồng thời hỗ trợ case preselect/fromBlindBox & page trên URL.
        loadCards(initialPageFromUrl);
        loadCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery,initialPageFromUrl]);

    const loadCategories = async () => {
        try {
            const data = await categoryApi.getAllCategories();
            setCategories(data);
        } catch {
            // ignore
        }
    };

    const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'] as const;

    // Gợi ý giá theo khoảng min/max của thẻ (không chặn submit, chỉ cảnh báo mềm)
    let priceSoftWarning: string | null = null;
    let priceSoftWarningClass = 'text-xs mt-1 text-amber-300';
    if (selectedCard && price.trim()) {
        const priceStr = price.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
        const num = parseFloat(priceStr);
        if (Number.isFinite(num) && num > 0) {
            if (typeof selectedCard.minPrice === 'number' && num < selectedCard.minPrice) {
                priceSoftWarning =
                    'Giá thấp hơn khoảng tham khảo. Bạn vẫn có thể đăng, nhưng nên cân nhắc để không bán rẻ hơn thị trường.';
            } else if (typeof selectedCard.maxPrice === 'number' && num > selectedCard.maxPrice) {
                priceSoftWarning =
                    'Giá cao hơn khoảng tham khảo. Bạn vẫn có thể đăng, nhưng giá cao có thể khó bán.';
            }
        }
    }

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

    // Reload thẻ khi thay đổi search hoặc sort (luôn gọi BE, keyword có thể rỗng)
    useEffect(() => {
        loadCards(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, sortBy]);

    // Những set thực sự có card (để lọc dropdown)
    const categoryNamesWithCards = useMemo(() => {
        const set = new Set<string>();
        for (const card of cards) {
            if (card.categoryName) {
                set.add(card.categoryName.toLowerCase());
            }
        }
        return set;
    }, [cards]);

    const filteredCards = useMemo(() => {
        let list = [...cards];

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
                <div className="mb-4 md:mb-6">
                    <Link
                        to="/marketplace"
                        className="inline-flex items-center text-primary-400 hover:text-primary-300 text-xs md:text-sm mb-3"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Về Marketplace
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold font-serif gradient-text">Đăng bán thẻ</h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-primary-400" />
                        Nhập/tìm thẻ bạn muốn bán. Nếu thẻ chưa có trong hệ thống, gửi yêu cầu để Admin thêm rồi quay lại đăng bán.
                    </p>
                </div>

                {requestSent && (
                    <div className="mb-6 p-3 rounded-lg border border-green-500/20 bg-green-500/10 text-green-200 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span>
                            Đã gửi yêu cầu thêm thẻ. Sau khi Admin duyệt, thẻ sẽ xuất hiện trong danh sách để bạn đăng bán.
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-green-500/40 text-green-200 hover:text-white"
                            onClick={() => navigate('/my-card-requests')}
                        >
                            Xem danh sách yêu cầu
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Left: Browse cards */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Bộ lọc */}
                        <Card className="glass-card-strong">
                            <CardHeader className="py-2 pb-1.5 md:py-2 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 text-muted-foreground">
                                    <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Bộ lọc
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 md:space-y-4">
                                {/* Tìm kiếm */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        Tìm kiếm
                                    </label>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Tên thẻ hoặc tên set..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-3.5 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>
                                    {/* Search bằng hình ảnh */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                            Tìm bằng hình ảnh
                                        </label>
                                        <div className="flex items-center gap-4 mt-2">

                                            {/* Upload button */}
                                            <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 glass-card rounded-lg text-sm hover:bg-white/5 border border-dashed border-white/20">
                                                <ImagePlus className="h-4 w-4 text-primary-400" />
                                                <span>{imageSearching ? "Đang tìm..." : "Upload ảnh"}</span>

                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleSearchByImage(file);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>

                                            {/* Preview */}
                                            {searchImage && (
                                                <div className="relative group">
                                                    <img
                                                        src={URL.createObjectURL(searchImage)}
                                                        alt="search preview"
                                                        className="w-20 h-28 object-cover rounded-lg border border-white/20 shadow-md transition-transform group-hover:scale-105"
                                                    />

                                                    {/* remove button */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>{ setSearchImage(null);setSearchQuery(' '); }}
                                                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                    {/* Danh mục */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                                            Danh mục
                                        </label>
                                        <select
                                            value={filterCategory}
                                            onChange={(e) => setFilterCategory(e.target.value)}
                                            className="w-full px-2.5 py-2 glass-card rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                                        >
                                            <option value="all">Tất cả</option>
                                            {categories
                                                .filter((c) =>
                                                    c.categoryName
                                                        ? categoryNamesWithCards.has(c.categoryName.toLowerCase())
                                                        : false,
                                                )
                                                .map((c) => (
                                                    <option key={c.categoryId} value={c.categoryId}>
                                                        {c.categoryName}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Độ hiếm */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                                            Độ hiếm
                                        </label>
                                        <select
                                            value={filterRarity}
                                            onChange={(e) => setFilterRarity(e.target.value)}
                                            className="w-full px-2.5 py-2 glass-card rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
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
                                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                                            Sắp xếp
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as 'name' | 'price-asc' | 'price-desc')}
                                            className="w-full px-2.5 py-2 glass-card rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
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
                                            className="w-full gap-1.5 text-[11px] md:text-xs text-muted-foreground hover:text-white"
                                        >
                                            <X className="h-4 w-4" />
                                            Xóa bộ lọc
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground flex items-center justify-between gap-2">
                                    <span>
                                        Hiển thị <span className="font-medium text-white">{filteredCards.length}</span> thẻ
                                    </span>
                                    {cardTotalPages > 1 && (
                                        <span>
                                            Trang{' '}
                                            <span className="font-medium text-white">
                                                {cardPage + 1}/{cardTotalPages}
                                            </span>
                                        </span>
                                    )}
                                </p>

                                {filteredCards.length === 0 && searchQuery.trim() && (
                                    <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/5">
                                        <p className="text-sm text-muted-foreground">
                                            Không thấy thẻ trong hệ thống theo từ khóa hiện tại.
                                        </p>
                                        <div className="mt-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigate(`/sell/request-card?q=${encodeURIComponent(searchQuery.trim())}`)}
                                            >
                                                Gửi yêu cầu thêm thẻ (Admin duyệt)
                                            </Button>
                                        </div>
                                    </div>
                                )}
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
                                                    className={`text-left rounded-xl overflow-hidden border-2 transition-all ${isSelected
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
                                                            className={`absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${rarityClass[card.rarity] || 'bg-gray-500/20'
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

                        {cardTotalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="px-2 py-1 h-7"
                                        disabled={cardPage <= 0 || isLoading}
                                        onClick={() => {
                                            const next = Math.max(0, cardPage - 1);
                                            const search = location.search || '';
                                            setCardPage(next);
                                            loadCards(next);
                                            navigate(`/post-listing/${next + 1}${search}`, { replace: true });
                                        }}
                                    >
                                        Trang trước
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {(() => {
                                            const pages: (number | 'ellipsis')[] = [];
                                            const total = cardTotalPages;
                                            const current = cardPage;

                                            const pushPage = (p: number) => {
                                                if (p >= 0 && p < total) pages.push(p);
                                            };

                                            pushPage(0);

                                            const start = Math.max(1, current - 1);
                                            const end = Math.min(total - 2, current + 1);

                                            if (start > 1) pages.push('ellipsis');
                                            for (let p = start; p <= end; p++) {
                                                pushPage(p);
                                            }
                                            if (end < total - 2) pages.push('ellipsis');

                                            if (total > 1) pushPage(total - 1);

                                            return pages.map((p, idx) =>
                                                p === 'ellipsis' ? (
                                                    <span
                                                        key={`e-${idx}`}
                                                        className="px-1 text-muted-foreground"
                                                    >
                                                        …
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => {
                                                            const search = location.search || '';
                                                            setCardPage(p);
                                                            loadCards(p);
                                                            navigate(`/post-listing/${p + 1}${search}`, { replace: true });
                                                        }}
                                                        className={`min-w-[24px] px-1.5 py-1 rounded border ${p === cardPage
                                                            ? 'bg-primary-500 text-white border-primary-500'
                                                            : 'bg-transparent text-muted-foreground border-white/10 hover:border-primary-400 hover:text-white'
                                                            }`}
                                                        disabled={isLoading}
                                                    >
                                                        {p + 1}
                                                    </button>
                                                ),
                                            );
                                        })()}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="px-2 py-1 h-7"
                                    disabled={cardPage >= cardTotalPages - 1 || isLoading}
                                    onClick={() => {
                                        const next = Math.min(cardTotalPages - 1, cardPage + 1);
                                        const search = location.search || '';
                                        setCardPage(next);
                                        loadCards(next);
                                        navigate(`/post-listing/${next + 1}${search}`, { replace: true });
                                    }}
                                >
                                    Trang sau
                                </Button>
                            </div>
                        )}
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
                                                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] ${rarityClass[selectedCard.rarity] || 'bg-gray-500/20'
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
                                            {priceSoftWarning && (
                                                <p className={priceSoftWarningClass}>
                                                    {priceSoftWarning}
                                                </p>
                                            )}
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
                                                Lưu ý
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Hệ thống hiện chỉ nhận <span className="font-medium text-white">giá</span> và <span className="font-medium text-white">số lượng</span> khi đăng bán.
                                            </p>
                                        </div>

                                        <div className="flex gap-2 pt-3">
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
