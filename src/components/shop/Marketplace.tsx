import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Search,
    Filter,
    PlusCircle,
    ChevronLeft,
    ChevronRight,
    Package,
    DollarSign,
    ChevronDown,
    Users,
    ShoppingCart,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listSellerApi, ListingItem, categoryApi, Category, cardApi } from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { Heart, Loader2, Trash2, Star } from 'lucide-react';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80';

const formatRarity = (rarity: string) =>
    rarity
        ? String(rarity)
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
        : '';

const formatCurrencyVND = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const abs = Math.abs(safe);

    // Nếu >= 1 triệu thì hiển thị dạng 1M, 1.5M, ...
    if (abs >= 1_000_000) {
        return (safe / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }

    // Còn lại hiển thị số bình thường
    return safe.toLocaleString('vi-VN') + ' đ';
};

const rarityClass: Record<string, string> = {
    SECRET_RARE: 'bg-purple-500/20 text-purple-400',
    ULTRA_RARE: 'bg-yellow-500/20 text-yellow-400',
    SUPER_RARE: 'bg-orange-500/20 text-orange-400',
    RARE: 'bg-blue-500/20 text-blue-400',
    UNCOMMON: 'bg-green-500/20 text-green-400',
    COMMON: 'bg-gray-500/20 text-gray-400',
};

// Badge màu theo rarity (giống HomePage NewArrivals)
const getRarityBadgeClasses = (rarity: string) => {
    const r = String(rarity || '').toLowerCase();
    if (r.includes('secret')) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900';
    if (r.includes('ultra')) return 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white';
    if (r.includes('rare')) return 'bg-gradient-to-r from-sky-500 to-blue-500 text-white';
    if (r.includes('uncommon')) return 'bg-emerald-500/90 text-white';
    if (r.includes('common')) return 'bg-slate-200 text-slate-900';
    return 'bg-slate-300 text-slate-900';
};

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'];

/** Nhóm listing theo cardId → mỗi thẻ một dòng, nhiều offer bên dưới (kiểu Cardmarket) */
type CardProduct = {
    cardId: string;
    cardName: string;
    imageUrl?: string;
    categoryName?: string;
    rarity: string;
    basePrice: number;
    offers: ListingItem[];
};

function groupListingsByCard(listings: ListingItem[]): CardProduct[] {
    const byCard = new Map<string, ListingItem[]>();
    for (const item of listings) {
        const list = byCard.get(item.cardId) || [];
        list.push(item);
        byCard.set(item.cardId, list);
    }
    return Array.from(byCard.entries()).map(([cardId, offers]) => {
        const first = offers[0];
        return {
            cardId,
            cardName: first.cardName,
            imageUrl: first.imageUrl,
            categoryName: first.categoryName,
            rarity: first.rarity,
            basePrice: first.basePrice,
            offers: offers.sort((a, b) => a.price - b.price),
        };
    });
}

export const Marketplace: React.FC = () => {
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [_totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    // Hiển thị tối đa 10 sản phẩm mỗi trang
    const [pageSize] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 5_000_000]);
    const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name'>('price-asc');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterRarity, setFilterRarity] = useState<string>('all');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<CardProduct | null>(null);
    const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
    const [orderQuantity, setOrderQuantity] = useState<number>(1);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [paymentMethod] = useState<'WALLET'>('WALLET');
    const [cartOpen, setCartOpen] = useState(false);
    const { items: cartItems, addCard, setSelectedListing: setCartSelectedListing, updateQuantity: updateCartQuantity, removeCard: removeCartCard } = useMarketplaceCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { addItem: addToWishlistLocal, removeItem: removeFromWishlistLocal, isInWishlist } = useWishlist();
    const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
    const [wishlistLoadingCardId, setWishlistLoadingCardId] = useState<string | null>(null);

    useEffect(() => {
        loadListings(currentPage);
    }, [currentPage]);

    // Mở giỏ hàng khi vào trang với ?openCart=1 (vd: từ icon giỏ trên header)
    useEffect(() => {
        if (searchParams.get('openCart') === '1') {
            setCartOpen(true);
            setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
                p.delete('openCart');
                return p;
            }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await categoryApi.getAllCategories();
                setCategories(data);
            } catch {
                setCategories([]);
            }
        };
        load();
    }, []);

    // Load danh sách card trong wishlist từ BE (khi đã đăng nhập)
    useEffect(() => {
        if (!isAuthenticated) {
            setWishlistCardIds(new Set());
            return;
        }
        const loadWishlist = async () => {
            try {
                const res = await cardApi.getUserWishlist(0, 500);
                const ids = new Set((res.content ?? []).map((w) => w.cardId));
                setWishlistCardIds(ids);
            } catch {
                setWishlistCardIds(new Set());
            }
        };
        loadWishlist();
    }, [isAuthenticated]);

    const loadListings = async (page: number) => {
        try {
            setIsLoading(true);
            setError('');
            const data = await listSellerApi.getListings(page, pageSize);
            setListings(data.content || []);
            setTotalElements(data.totalElements ?? 0);
            setTotalPages(data.totalPages ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách đăng bán');
            setListings([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Chỉ những set thực sự có listing mới cho vào dropdown
    const categoryNamesWithListings = useMemo(() => {
        const set = new Set<string>();
        for (const item of listings) {
            if (item.categoryName) {
                set.add(item.categoryName.toLowerCase());
            }
        }
        return set;
    }, [listings]);

    const filteredListings = useMemo(() => {
        let list = [...listings];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (item) =>
                    item.cardName.toLowerCase().includes(q) ||
                    (item.categoryName && item.categoryName.toLowerCase().includes(q)),
            );
        }
        list = list.filter(
            (item) => item.price >= priceRange[0] && item.price <= priceRange[1],
        );
        if (filterCategory !== 'all') {
            const cat = categories.find((c) => c.categoryId === filterCategory);
            if (cat?.categoryName) {
                const name = cat.categoryName.toLowerCase();
                list = list.filter((item) => item.categoryName?.toLowerCase() === name);
            }
        }
        if (filterRarity !== 'all') list = list.filter((item) => item.rarity === filterRarity);

        // Chỉ giữ lại các offer còn hàng (quantity >= 1)
        list = list.filter((item) => item.quantity && item.quantity > 0);

        if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
        else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
        else list.sort((a, b) => a.cardName.localeCompare(b.cardName));
        return list;
    }, [listings, searchQuery, priceRange, sortBy, filterCategory, filterRarity, categories]);

    const toggleWishlistForCard = async (product: CardProduct, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        const cardId = product.cardId;
        const inList = wishlistCardIds.has(cardId) || isInWishlist(cardId);
        setWishlistLoadingCardId(cardId);
        try {
            if (inList) {
                removeFromWishlistLocal(cardId);
                setWishlistCardIds((prev) => {
                    const next = new Set(prev);
                    next.delete(cardId);
                    return next;
                });
                if (isAuthenticated) {
                    try {
                        await cardApi.removeFromWishlistByCardId(cardId);
                        window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
                    } catch {
                        // ignore, đã cập nhật local
                    }
                }
            } else {
                addToWishlistLocal({
                    id: cardId,
                    name: product.cardName,
                    price: product.basePrice,
                    image: product.imageUrl || PLACEHOLDER_IMG,
                    rarity: product.rarity,
                });
                setWishlistCardIds((prev) => new Set(prev).add(cardId));
                if (isAuthenticated) {
                    try {
                        await cardApi.addToWishlist(cardId);
                        window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
                    } catch {
                        // ignore, đã cập nhật local
                    }
                }
            }
        } finally {
            setWishlistLoadingCardId(null);
        }
    };

    /** Thêm thẻ vào giỏ (cả thẻ với list seller); trong giỏ user chọn seller và số lượng */
    const addCardToCart = (product: CardProduct, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const activeOffers = product.offers.filter((o) => (o.quantity ?? 0) > 0);
        if (activeOffers.length === 0) return;
        addCard({
            cardId: product.cardId,
            cardName: product.cardName,
            imageUrl: product.imageUrl,
            rarity: product.rarity,
            offers: activeOffers,
            quantity: 1,
        });
        setCartOpen(true);
    };

    const handleCheckoutCart = async () => {
        const readyItems = cartItems.filter((c) => c.selectedListing != null);
        if (!readyItems.length) {
            setOrderError('Vui lòng chọn người bán cho từng thẻ trong giỏ trước khi thanh toán.');
            return;
        }
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setOrderError(null);
        setOrderLoading(true);
        try {
            const checkoutItems = readyItems.map((c) => {
                const listing = c.selectedListing!;
                const quantity = Math.max(1, Math.min(c.quantity, listing.quantity ?? 1));
                return {
                    listSellerId: listing.listSellerId,
                    quantity,
                    cardId: c.cardId,
                    cardName: c.cardName,
                    imageUrl: c.imageUrl,
                    sellerId: listing.sellerId,
                    sellerName: listing.sellerName,
                    unitPrice: listing.price,
                };
            });

            // Chuyển sang trang checkout để user xem phí ship + đổi địa chỉ trước khi thanh toán (giống Shopee).
            setCartOpen(false);
            navigate('/marketplace/checkout', {
                state: {
                    items: checkoutItems,
                    paymentMethod,
                    fromCart: true,
                },
            });
        } finally {
            setOrderLoading(false);
        }
    };
    const handleBuyNow = async () => {
        if (!selectedListing) return;
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setOrderError(null);
        setOrderLoading(true);
        try {
            const safeQuantity = Math.max(
                1,
                Math.min(orderQuantity || 1, selectedListing.quantity ?? 1),
            );

            // Chuyển sang trang checkout để user xem phí ship + đổi địa chỉ trước khi thanh toán.
            setSelectedListing(null);
            setSelectedProduct(null);
            setOrderQuantity(1);
            navigate('/marketplace/checkout', {
                state: {
                    items: [
                        {
                            listSellerId: selectedListing.listSellerId,
                            quantity: safeQuantity,
                            cardId: selectedProduct!.cardId,
                            cardName: selectedProduct!.cardName,
                            imageUrl: selectedProduct!.imageUrl,
                            sellerId: selectedListing.sellerId,
                            sellerName: selectedListing.sellerName,
                            unitPrice: selectedListing.price,
                        },
                    ],
                    paymentMethod,
                    fromCart: false,
                },
            });
        } catch (e) {
            setOrderError(
                e instanceof Error ? e.message : 'Đặt mua thất bại. Vui lòng thử lại.',
            );
        } finally {
            setOrderLoading(false);
        }
    };

    const products = useMemo(() => {
        const grouped = groupListingsByCard(filteredListings);
        if (sortBy === 'name') grouped.sort((a, b) => a.cardName.localeCompare(b.cardName));
        else if (sortBy === 'price-asc') grouped.sort((a, b) => a.offers[0].price - b.offers[0].price);
        else if (sortBy === 'price-desc') grouped.sort((a, b) => b.offers[0].price - a.offers[0].price);
        return grouped;
    }, [filteredListings, sortBy]);

    // Tự động mở chi tiết thẻ khi đi từ thông báo giá: ?card={cardId}
    useEffect(() => {
        const cardId = searchParams.get('card');
        if (!cardId || !products.length) return;
        const product = products.find((p) => p.cardId === cardId);
        if (!product) return;
        setSelectedProduct(product);
        const el = document.getElementById(`marketplace-card-${cardId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [searchParams, products]);

    return (
        <div className="py-4 md:py-6">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Header giống Cardmarket: tiêu đề + search nổi bật */}
            <div className="mb-4 md:mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif gradient-text">Sàn giao dịch</h1>
                        <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                            Mua thẻ từ người bán — mỗi thẻ có nhiều lời chào giá, chọn giá tốt nhất
                        </p>
                    </div>
                    <Link to="/post-listing">
                        <Button variant="premium" className="shadow-lg px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
                            <PlusCircle className="w-4 h-4 mr-1.5 md:mr-2" />
                            Đăng bán
                        </Button>
                    </Link>
                </div>

                {/* Ô tìm kiếm lớn */}
                <div className="relative max-w-lg md:max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Tìm thẻ hoặc set (ví dụ: Pikachu, Ascended Heroes)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 glass-card-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                </div>
            </div>

            {/* Nút nổi mở giỏ hàng */}
            {cartItems.length > 0 && (
                <div className="fixed bottom-6 right-6 z-40">
                    <Button
                        variant="premium"
                        className="shadow-lg flex items-center gap-2"
                        onClick={() => setCartOpen(true)}
                    >
                        <Package className="h-4 w-4" />
                        Giỏ hàng ({cartItems.length})
                    </Button>
                </div>
            )}

            <div className="space-y-2.5 md:space-y-3">
                {/* Thanh bộ lọc ngang */}
                <Card className="glass-card-strong">
                    <CardHeader className="py-1.5 pb-1 md:py-2 md:pb-1.5">
                        <CardTitle className="text-[11px] md:text-xs flex items-center gap-1.5 md:gap-2">
                            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Bộ lọc
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-1.5 flex flex-col lg:flex-row lg:items-end gap-2 lg:gap-2.5">
                        <div className="w-full lg:max-w-[11rem]">
                            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Giá (đ)</label>
                            <div className="flex gap-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={priceRange[0]}
                                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                    className="w-full px-2 py-1 glass-card rounded-md text-[11px]"
                                />
                                <span className="self-center text-[10px] text-muted-foreground">–</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                    className="w-full px-2 py-1 glass-card rounded-md text-[11px]"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:max-w-[11rem]">
                            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Set</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full px-2 py-1 glass-card rounded-md text-[11px] appearance-none cursor-pointer bg-black/60"
                            >
                                <option value="all">Tất cả set</option>
                                {categories
                                    .filter((c) =>
                                        c.categoryName
                                            ? categoryNamesWithListings.has(c.categoryName.toLowerCase())
                                            : false,
                                    )
                                    .map((c) => (
                                        <option key={c.categoryId} value={c.categoryId}>
                                            {c.categoryName}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="w-full lg:max-w-[11rem]">
                            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Độ hiếm</label>
                            <select
                                value={filterRarity}
                                onChange={(e) => setFilterRarity(e.target.value)}
                                className="w-full px-2 py-1 glass-card rounded-md text-[11px] appearance-none cursor-pointer bg-black/60"
                            >
                                <option value="all">Tất cả</option>
                                {RARITIES.map((r) => (
                                    <option key={r} value={r}>
                                        {formatRarity(r)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full lg:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full px-2 py-0.5 text-[10px] md:text-[11px] h-7 md:h-8"
                                onClick={() => {
                                    setSearchQuery('');
                                    setPriceRange([0, 5000]);
                                    setFilterCategory('all');
                                    setFilterRarity('all');
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Khu vực danh sách sản phẩm kiểu Cardmarket */}
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-white">{products.length}</span> thẻ
                            <span className="mx-1">·</span>
                            <span className="font-medium text-white">{filteredListings.length}</span> lời chào giá
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'price-asc' | 'price-desc' | 'name')}
                            className="px-3 py-2 glass-card rounded-lg text-sm bg-black/60"
                        >
                            <option value="name">Tên A → Z</option>
                            <option value="price-asc">Giá thấp nhất trước</option>
                            <option value="price-desc">Giá cao nhất trước</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Đang tải...</p>
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-1.5 md:gap-2">
                            {products.map((product) => {
                                const prices = product.offers.map((o) => o.price);
                                const quantities = product.offers.map((o) => o.quantity ?? 0);
                                const minPrice = prices.length ? Math.min(...prices) : product.basePrice;
                                const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
                                const inWishlist =
                                    wishlistCardIds.has(product.cardId) || isInWishlist(product.cardId);

                                return (
                                    <div
                                        key={product.cardId}
                                        id={`marketplace-card-${product.cardId}`}
                                        className="group relative rounded-xl glass-card-strong border border-white/5 hover:border-primary-500/50 hover:shadow-lg cursor-pointer overflow-hidden flex flex-col"
                                        onClick={() => setSelectedProduct(product)}
                                    >
                                        {/* Rarity badge giống HomePage */}
                                        <div className="absolute top-1 right-1 z-10">
                                            <div
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md border border-white/40 ${getRarityBadgeClasses(
                                                    product.rarity,
                                                )}`}
                                            >
                                                {formatRarity(product.rarity)}
                                            </div>
                                        </div>

                                        <div className="relative aspect-[5/7] overflow-hidden bg-black/40 rounded-lg md:rounded-xl">
                                            <img
                                                src={product.imageUrl || PLACEHOLDER_IMG}
                                                alt={product.cardName}
                                                className="w-[88%] h-[88%] object-cover mx-auto my-[6%] rounded-md md:rounded-lg group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.currentTarget.src = PLACEHOLDER_IMG;
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleWishlistForCard(product, e);
                                                }}
                                                aria-label={
                                                    inWishlist ? 'Bỏ khỏi wishlist' : 'Thêm vào wishlist'
                                                }
                                                disabled={wishlistLoadingCardId === product.cardId}
                                            >
                                                {wishlistLoadingCardId === product.cardId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                ) : (
                                                    <Heart
                                                        className={`h-4 w-4 ${
                                                            inWishlist ? 'fill-red-500 text-red-500' : 'text-white'
                                                        }`}
                                                    />
                                                )}
                                            </button>
                                        </div>
                                        <div className="p-1 md:p-1.5 flex-1 flex flex-col gap-0.5">
                                            <p className="text-[9px] md:text-[10px] font-semibold line-clamp-2">
                                                {product.cardName}
                                            </p>
                                            <p className="text-[8px] md:text-[9px] text-muted-foreground">
                                                {product.categoryName || '—'}
                                            </p>
                                            <div className="mt-0.5 flex items-center justify-between">
                                                <span className="text-[11px] md:text-xs font-bold text-accent-400">
                                                    {formatCurrencyVND(minPrice)}
                                                </span>
                                                <span className="text-[8px] md:text-[9px] text-muted-foreground">
                                                    Còn {totalQuantity} thẻ
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[8px] md:text-[9px] text-muted-foreground mt-0.5">
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {product.offers.length} đề nghị
                                                </span>
                                            </div>
                                            <div className="mt-0.5 flex gap-1.5 items-center">
                                                <Button
                                                    type="button"
                                                    variant="premium"
                                                    size="sm"
                                                    className="w-6 h-6 md:w-7 md:h-7 p-0 flex items-center justify-center"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addCardToCart(product, e);
                                                    }}
                                                    aria-label="Thêm vào giỏ"
                                                >
                                                    <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 gap-0.5 h-6 md:h-7 text-[8px] md:text-[9px]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProduct(product);
                                                    }}
                                                >
                                                    Xem đề nghị
                                                    <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <Card className="glass-card-strong">
                            <CardContent className="py-16 text-center">
                                <Package className="h-14 w-14 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground font-medium">Chưa có thẻ nào được đăng bán</p>
                                <p className="text-sm text-muted-foreground mt-1">Thử đổi bộ lọc hoặc đăng bán thẻ của bạn</p>
                                <Link to="/post-listing">
                                    <Button variant="premium" className="mt-4">
                                        Đăng bán ngay
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Trang {currentPage + 1} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                            >
                                Sau <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal danh sách offer của 1 thẻ (kiểu Cardmarket) */}
            <ListingOffersModal
                product={selectedProduct}
                onClose={() => {
                    setSelectedProduct(null);
                    setSelectedListing(null);
                }}
                onSelectOffer={(offer) => {
                    setSelectedListing(offer);
                    setSelectedProduct(null);
                }}
                onAddCardToCart={(product) => addCardToCart(product)}
                formatRarity={formatRarity}
                rarityClass={rarityClass}
                placeholderImg={PLACEHOLDER_IMG}
            />

            {/* Modal chi tiết 1 offer */}
            <Dialog open={!!selectedListing} onOpenChange={(o) => !o && setSelectedListing(null)}>
                <DialogContent className="max-w-md glass-card-strong border-white/10">
                    {selectedListing && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg">Chi tiết đề nghị</DialogTitle>
                                <DialogDescription>
                                    Xem người bán, giá và số lượng trước khi checkout.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-4 mt-4">
                                <img
                                    src={selectedListing.imageUrl || PLACEHOLDER_IMG}
                                    alt={selectedListing.cardName}
                                    className="w-24 h-32 object-cover rounded-lg shrink-0"
                                    onError={(e) => {
                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                    }}
                                />
                                <div className="space-y-2 flex-1">
                                    <div className="font-medium">{selectedListing.cardName}</div>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedListing.categoryName || '—'} · {formatRarity(selectedListing.rarity)}
                                    </p>
                                    <div className="pt-2 border-t border-white/10">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Giá bán</span>
                                            <span className="font-bold text-accent-400">{formatCurrencyVND(selectedListing.price)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Số lượng</span>
                                            <span>{selectedListing.quantity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Người bán</span>
                                            <span>
                                                {selectedListing.sellerName || '—'}
                                                {(selectedListing.sellerFeedbackCount != null && selectedListing.sellerFeedbackCount > 0) && (
                                                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-400/90">
                                                        <Star className="h-3 w-3 fill-amber-400 shrink-0" />
                                                        {Number(selectedListing.sellerAverageRating ?? 0).toFixed(1)}
                                                        <span className="text-muted-foreground">({selectedListing.sellerFeedbackCount} đánh giá)</span>
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Giá gốc thẻ</span>
                                            <span>{formatCurrencyVND(selectedListing.basePrice)}</span>
                                        </div>
                                    </div>
                                    {orderError && (
                                        <p className="text-xs text-red-400 mt-2">{orderError}</p>
                                    )}
                                    <div className="pt-3 border-t border-white/10 space-y-2">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-muted-foreground">Số lượng mua</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={selectedListing.quantity}
                                                value={orderQuantity}
                                                onChange={(e) =>
                                                    setOrderQuantity(
                                                        Number.isNaN(Number(e.target.value))
                                                            ? 1
                                                            : Number(e.target.value),
                                                    )
                                                }
                                                className="w-24 px-2 py-1 rounded bg-white/5 border border-white/10 text-right text-sm"
                                            />
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="flex-1 px-3 py-2 rounded border border-yellow-400 bg-yellow-500/10 text-yellow-200">
                                                Ví MystiCard
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Địa chỉ và số điện thoại sẽ dùng thông tin trong mục Hồ sơ của bạn.
                                            Nếu cần thay đổi, hãy cập nhật Hồ sơ trước khi mua.
                                        </p>
                                        <Button
                                            variant="premium"
                                            className="w-full"
                                            disabled={orderLoading}
                                            onClick={handleBuyNow}
                                        >
                                            {orderLoading ? 'Đang đặt mua...' : 'Mua ngay'}
                                        </Button>
                                    </div>
                                    <Button variant="ghost" className="w-full mt-2" onClick={() => setSelectedListing(null)}>
                                        Đóng
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Giỏ hàng: mỗi thẻ chọn 1 seller + số lượng */}
            <Dialog open={cartOpen} onOpenChange={(o) => setCartOpen(o)}>
                <DialogContent className="max-w-xl glass-card-strong border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Giỏ hàng sàn giao dịch</DialogTitle>
                        <DialogDescription>
                            Chọn người bán cho từng thẻ rồi chuyển sang checkout để tính phí ship.
                        </DialogDescription>
                    </DialogHeader>
                    {cartItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-4">
                            Giỏ hàng đang trống. Thêm thẻ từ Sàn giao dịch, sau đó chọn người bán cho từng thẻ.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-4 text-sm">
                            {cartItems.map((item) => (
                                <div key={item.cardId} className="p-3 rounded-lg border border-white/10 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={item.imageUrl || PLACEHOLDER_IMG}
                                            alt={item.cardName}
                                            className="w-12 h-16 object-cover rounded shrink-0"
                                            onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMG; }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium line-clamp-1">{item.cardName}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">Chọn người bán</div>
                                            <select
                                                value={item.selectedListing?.listSellerId ?? ''}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const offer = item.offers.find((o) => o.listSellerId === id) ?? null;
                                                    setCartSelectedListing(item.cardId, offer);
                                                }}
                                                className="mt-1 w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-xs"
                                            >
                                                <option value="">-- Chọn seller --</option>
                                                {item.offers.map((o) => (
                                                    <option key={o.listSellerId} value={o.listSellerId}>
                                                        {o.sellerName || 'Seller'}
                                                        {(o.sellerFeedbackCount != null && o.sellerFeedbackCount > 0)
                                                            ? ` · ⭐ ${Number(o.sellerAverageRating ?? 0).toFixed(1)} (${o.sellerFeedbackCount})`
                                                            : ''}
                                                        {' · '}{formatCurrencyVND(o.price)} · SL: {o.quantity}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-muted-foreground">SL:</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={item.selectedListing?.quantity ?? 1}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const v = Math.max(1, Math.min(Number(e.target.value) || 1, item.selectedListing?.quantity ?? 1));
                                                    updateCartQuantity(item.cardId, v);
                                                }}
                                                className="w-14 px-2 py-1 rounded bg-white/5 border border-white/10 text-center text-xs"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:text-red-300 shrink-0"
                                            onClick={() => removeCartCard(item.cardId)}
                                            aria-label="Xóa khỏi giỏ"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {item.selectedListing && (
                                        <div className="text-xs text-muted-foreground pl-[3.25rem]">
                                            Tạm tính: {formatCurrencyVND(item.selectedListing.price * item.quantity)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="pt-2 border-t border-white/10 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tổng tiền hàng (đã chọn seller)</span>
                                    <span className="font-semibold">
                                        {formatCurrencyVND(
                                            cartItems
                                                .filter((i) => i.selectedListing != null)
                                                .reduce((sum, i) => sum + i.selectedListing!.price * i.quantity, 0),
                                        )}
                                    </span>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="flex-1 px-3 py-2 rounded border border-yellow-400 bg-yellow-500/10 text-yellow-200">
                                        Ví MystiCard
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Phí ship được tính riêng cho từng người bán sau khi tạo đơn, tương tự như khi mua 1 offer.
                                </p>
                                {cartItems.some((c) => !c.selectedListing) && (
                                    <p className="text-xs text-amber-400">Chọn người bán cho tất cả thẻ trước khi thanh toán.</p>
                                )}
                                <Button
                                    variant="premium"
                                    className="w-full"
                                    disabled={orderLoading || cartItems.some((c) => !c.selectedListing)}
                                    onClick={handleCheckoutCart}
                                >
                                    {orderLoading ? 'Đang thanh toán...' : 'Thanh toán giỏ hàng'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    type="button"
                                    onClick={() => setCartOpen(false)}
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

function ListingOffersModal({
    product,
    onClose,
    onSelectOffer,
    onAddCardToCart,
    formatRarity,
    rarityClass: _rarityClass,
    placeholderImg,
}: {
    product: CardProduct | null;
    onClose: () => void;
    onSelectOffer: (offer: ListingItem) => void;
    onAddCardToCart: (product: CardProduct) => void;
    formatRarity: (r: string) => string;
    rarityClass: Record<string, string>;
    placeholderImg: string;
}) {
    const open = !!product;

    if (!product) {
        return null;
    }

    const activeOffers = product.offers.filter((o) => (o.quantity ?? 0) > 0);

    const prices = activeOffers.map((o) => o.price);
    const quantities = activeOffers.map((o) => o.quantity);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length
        ? prices.reduce((sum, p) => sum + p, 0) / prices.length
        : 0;
    const totalQuantity = quantities.reduce((sum, q) => sum + (q ?? 0), 0);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="w-[98vw] max-w-[1600px] glass-card-strong border-white/10">
                <DialogHeader>
                    <DialogTitle>
                        {/* Layout 1: chia 3 cột như mô tả */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                            {/* Cột 1: Ảnh (phóng to và căn giữa) */}
                            <div className="flex items-center justify-center h-full">
                                <img
                                    src={product.imageUrl || placeholderImg}
                                    alt={product.cardName}
                                    className="w-32 h-44 md:w-40 md:h-56 object-cover rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.6)]"
                                    onError={(e) => {
                                        e.currentTarget.src = placeholderImg;
                                    }}
                                />
                            </div>

                            {/* Cột 2: Set, tên card, rarity + giá min/max/TB */}
                            <div className="space-y-2 text-left h-full flex flex-col justify-between">
                                <div>
                                    <div className="text-xs text-muted-foreground"></div>
                                    <div className="text-sm md:text-base font-medium"> Set:
                                        {product.categoryName || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground"></div>
                                    <div className="text-lg md:text-xl font-semibold"> Card:
                                        {product.cardName}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">R</div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/10 text-[11px] uppercase tracking-wider">
                                        {formatRarity(product.rarity)}
                                    </span>
                                </div>

                                    <div>
                                        <div className="text-[11px] text-muted-foreground">Giá min</div>
                                        <div className="text-sm md:text-base font-bold text-accent-400"> 
                                            {formatCurrencyVND(minPrice)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-muted-foreground">Giá max</div>
                                        <div className="text-sm md:text-base font-bold">
                                            {formatCurrencyVND(maxPrice)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-muted-foreground">Giá TB</div>
                                        <div className="text-sm md:text-base font-bold">
                                            {formatCurrencyVND(avgPrice)}
                                        </div>
                                    </div>
                                
                            </div>

                            {/* Cột 3: placeholder bản đồ xu hướng */}
                            <div className="w-full h-full flex">
                                <div className="h-full w-full rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/5 flex items-center justify-center text-[11px] md:text-xs text-muted-foreground">
                                    Trend chart (coming soon)
                                </div>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {activeOffers.length > 0 && (
                    <div className="mt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Danh sách người bán
                        </div>
                        <div className="rounded-lg border border-white/10 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                                <thead className="bg-white/5 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left whitespace-nowrap">Người bán</th>
                                        <th className="px-4 py-2 text-left whitespace-nowrap">Giá</th>
                                        <th className="px-4 py-2 text-right whitespace-nowrap">Số lượng / Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeOffers.map((offer) => (
                                        <tr key={offer.listSellerId} className="border-t border-white/5">
                                            {/* Cột 1: tên seller */}
                                            <td className="px-4 py-2 text-sm text-muted-foreground">
                                                {offer.sellerName || '—'}
                                            </td>
                                            {/* Cột 2: giá */}
                                            <td className="px-4 py-2 text-left font-semibold text-accent-400">
                                                {formatCurrencyVND(offer.price)}
                                            </td>
                                            {/* Cột 3: số lượng + icon */}
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                                <div className="flex items-right justify-right gap-3">
                                                    <span className="text-sm">
                                                        SL:{' '}
                                                        <span className="font-semibold">
                                                            {offer.quantity}
                                                        </span>
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAddCardToCart(product);
                                                            }}
                                                            aria-label="Thêm vào giỏ hàng"
                                                        >
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="premium"
                                                            size="icon"
                                                            onClick={() => onSelectOffer(offer)}
                                                            aria-label="Xem chi tiết đề nghị"
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Button variant="ghost" className="w-full mt-4" onClick={onClose}>
                    Đóng
                </Button>
            </DialogContent>
        </Dialog>
    );
}
