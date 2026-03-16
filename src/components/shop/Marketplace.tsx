import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listSellerApi, ListingItem, categoryApi, Category, cardApi, CardSellResponse, getCardImageUrl, cartApi, CartRequest } from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { Heart, Loader2, Trash2, Star, ShoppingCart } from 'lucide-react';

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

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'];
export const Marketplace: React.FC = () => {
    const { toast } = useToast();
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElemests, setTotalElemests] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [min, setMin] = useState<number | "">("");
    const [max, setMax] = useState<number | "">("");
    const [sortBy, setSortBy] = useState('desc');
    const [rarity, setRarity] = useState<string | null>(null);
    // const [filterCategory, setFilterCategory] = useState<string>('all');
    // const [filterRarity, setFilterRarity] = useState<string>('all');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<CardSellResponse | null>(null);
    const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
    const [orderQuantity, setOrderQuantity] = useState<number>(1);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [paymentMethod] = useState<'WALLET'>('WALLET');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const { items: cartItems, addCard, setSelectedListing: setCartSelectedListing, updateQuantity: updateCartQuantity, removeCard: removeCartCard } = useMarketplaceCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { addItem: addToWishlistLocal, removeItem: removeFromWishlistLocal, isInWishlist } = useWishlist();
    const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
    const [wishlistLoadingCardId, setWishlistLoadingCardId] = useState<string | null>(null);
    const [sellCards, setSellCards] = useState([])
    const [listSeller, setListSeller] = useState<ListingItem[]>([])
    const [addCartOpen, setAddCartOpen] = useState(false);
    const [cartListing, setCartListing] = useState<ListingItem | null>(null);
    const [cartQuantity, setCartQuantity] = useState(1);

    useEffect(() => {
        loadListings();
    }, [currentPage, searchQuery, sortBy, min, max, rarity]);

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

    const loadListings = async () => {
        if (min !== "" && max === "") {
            toast({ title: "Lỗi bộ lọc", description: "Nhập Max trước khi nhập Min", variant: "warning" });
            return;
        }
        if (min !== "" && max !== "" && min > max) {
            toast({ title: "Lỗi bộ lọc", description: "Min phải nhỏ hơn Max", variant: "warning" });
            return;
        }
        try {
            setIsLoading(true);
            setError('');
            const res = await cardApi.getCardSelling(currentPage, pageSize, {
                keyword: searchQuery,
                rarity: rarity,
                min: min === "" ? 0 : min,
                max: max === "" ? 0 : max,
                sort: sortBy
            });
            console.log("Get sellig card", res);
            setTotalElemests(res.data.totalElements)
            setSellCards(res.data.content || []);
            setTotalPages(res.data.totalPages ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách đăng bán');
            setListings([]);
        } finally {
            setIsLoading(false);
        }
    };
    const handleAddCartApi = async (offer: ListingItem) => {
        try {
            const res = await cartApi.createCart({
                listSellerId: offer.listSellerId,
                quantity: 1
            });

            if (res.code === 1000) {
                toast({
                    title: "Thêm vào giỏ hàng",
                    description: "Thẻ đã được thêm vào giỏ hàng thành công",
                    variant: "success",
                });
            } else {
                toast({
                    title: "Thêm vào giỏ hàng thất bại",
                    description: res.message || "Có lỗi xảy ra",
                    variant: "error",
                });
            }

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Lỗi",
                description: err?.message || "Lỗi thêm giỏ hàng",
                variant: "error",
            });
        }
    };

    const toggleWishlistForCard = async (product: CardSellResponse, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        const cardId = product.cardResponse.cardId;
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
                    name: product.cardResponse.name,
                    price: product.cardResponse.basePrice,
                    image: product.cardResponse.imageUrl?.[0].imageUrl || PLACEHOLDER_IMG,
                    rarity: product.cardResponse.rarity,
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
    const addCardToCart = (product: CardSellResponse, offer: ListingItem) => {

        addCard({
            cardId: product.cardResponse.cardId,
            cardName: product.cardResponse.name,
            imageUrl: product.cardResponse.imageUrl?.[0].imageUrl,
            rarity: product.cardResponse.rarity,
            offers: [offer],
            quantity: 1,
            selectedListing: offer
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
                            cardId: selectedProduct!.cardResponse.cardId,
                            cardName: selectedProduct!.cardResponse.name,
                            imageUrl: selectedProduct!.cardResponse.imageUrl?.[0]?.imageUrl,
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

    // Tự động mở chi tiết thẻ khi đi từ thông báo giá: ?card={cardId}
    // useEffect(() => {
    //     const cardId = searchParams.get('card');
    //     if (!cardId || !products.length) return;
    //     const product = products.find((p) => p.cardId === cardId);
    //     if (!product) return;
    //     setSelectedProduct(product);
    //     const el = document.getElementById(`marketplace-card-${cardId}`);
    //     if (el) {
    //         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    //     }
    // }, [searchParams, products]);
    return (
        <div className="py-8">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Header giống Cardmarket: tiêu đề + search nổi bật */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-serif gradient-text">Sàn giao dịch</h1>
                        <p className="text-muted-foreground mt-1">
                            Mua thẻ từ người bán — mỗi thẻ có nhiều lời chào giá, chọn giá tốt nhất
                        </p>
                    </div>
                    <Link to="/post-listing">
                        <Button variant="premium" className="shadow-lg">
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Đăng bán
                        </Button>
                    </Link>
                </div>

                {/* Ô tìm kiếm lớn */}
                <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Tìm thẻ hoặc set (ví dụ: Pikachu, Ascended Heroes)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 glass-card-strong rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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

            <div className="space-y-6">
                {/* Thanh bộ lọc ngang */}
                <Card className="glass-card-strong">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Bộ lọc
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
                        <div className="w-full lg:max-w-xs">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Giá (đ)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    value={min}
                                    onChange={(e) => {

                                        setMin(e.target.value === "" ? "" : Number(e.target.value))
                                    }

                                    }
                                    className="w-full px-3 py-2 glass-card rounded-lg text-sm"
                                />
                                <span className="self-center text-muted-foreground">–</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={max}
                                    onChange={(e) => {
                                        setMax(e.target.value === "" ? "" : Number(e.target.value))
                                    }

                                    }
                                    className="w-full px-3 py-2 glass-card rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        {/* <div className="w-full lg:max-w-xs">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Set</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full px-3 py-2 glass-card rounded-lg text-sm appearance-none cursor-pointer bg-black/60"
                            >
                                <option value="all">Tất cả set</option>
                                {categories.map((c) => (
                                    <option key={c.categoryId} value={c.categoryId}>
                                        {c.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div> */}
                        <div className="w-full lg:max-w-xs">
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Độ hiếm</label>
                            <select
                                value={rarity ?? 'ALL'}
                                onChange={(e) =>
                                    setRarity(e.target.value === 'ALL' ? null : e.target.value)
                                }
                                className="w-full px-3 py-2 glass-card rounded-lg text-sm appearance-none cursor-pointer bg-black/60"
                            >
                                <option value="ALL">Tất cả</option>
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
                                className="w-full"
                                onClick={() => {
                                    setSearchQuery('');
                                    setMin('');
                                    setMax('');
                                    setRarity(null);
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Khu vực danh sách sản phẩm kiểu Cardmarket */}
            <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="text-sm text-muted-foreground">
                        {/* <span className="font-medium text-white">{totalElemests}</span> thẻ */}

                        {/* <span className="font-medium text-white">{filteredListings.length}</span> lời chào giá */}
                    </div>
                    {/* <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'price-asc' | 'price-desc' | 'name')}
                        className="px-3 py-2 glass-card rounded-lg text-sm bg-black/60"
                    >
                        <option value="asc">Giá thấp nhất trước</option>
                        <option value="desc">Giá cao nhất trước</option>
                    </select> */}
                </div>

                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Đang tải...</p>
                    </div>
                ) : sellCards.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {sellCards.map((s) => {
                            const inWishlist =
                                wishlistCardIds.has(s.cardResponse.cardId) || isInWishlist(s.cardResponse.cardId);

                            return (
                                <div
                                    key={s.cardResponse.cardId}
                                    id={`marketplace-card-${s.cardResponse.cardId}`}
                                    className="group relative rounded-2xl glass-card-strong border border-white/5 hover:border-primary-500/50 hover:shadow-lg cursor-pointer overflow-hidden flex flex-col"
                                    onClick={() =>
                                        setSelectedProduct(s)
                                    }
                                >
                                    <div className="relative aspect-[2.5/3.5] overflow-hidden bg-black/40">
                                        <img
                                            src={s.cardResponse.imageUrl?.[0]?.imageUrl || PLACEHOLDER_IMG}
                                            alt={s.cardResponse.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.currentTarget.src = PLACEHOLDER_IMG;
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleWishlistForCard(s, e);
                                            }}
                                            aria-label={
                                                inWishlist ? 'Bỏ khỏi wishlist' : 'Thêm vào wishlist'
                                            }
                                            disabled={wishlistLoadingCardId === s.cardResponse.cardId}
                                        >
                                            {wishlistLoadingCardId === s.cardResponse.cardId ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                            ) : (
                                                <Heart
                                                    className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-white'
                                                        }`}
                                                />
                                            )}
                                        </button>
                                    </div>
                                    <div className="p-2.5 flex-1 flex flex-col gap-1">
                                        <p className="text-xs md:text-sm font-semibold line-clamp-2">
                                            {s.cardResponse.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {s.cardResponse.categoryName || '—'} ·{' '}
                                            {formatRarity(s.cardResponse.rarity)}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between">
                                            <span className="text-base font-bold text-accent-400">
                                                {formatCurrencyVND(s.cardResponse.minPrice)}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                Còn {s.numberOfCard} thẻ
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {s.numberOfSeller} đề nghị
                                            </span>
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="premium"
                                                size="sm"
                                                className="flex-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProduct(s);
                                                }}
                                            >
                                                <ShoppingCart className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProduct(s);
                                                }}
                                            >
                                                Xem đề nghị
                                                <ChevronDown className="h-3 w-3" />
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
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Trước
                        </Button>

                        <span className="text-sm text-muted-foreground">
                            Trang {currentPage} / {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                        >
                            Sau <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>

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
                onAddCardToCart={(offer) => handleAddCartApi(offer)}
                formatRarity={formatRarity}
                rarityClass={rarityClass}
                placeholderImg={PLACEHOLDER_IMG}
            />

            {/* Modal chi tiết 1 offer */}
            <Dialog open={!!selectedListing} onOpenChange={(o) => !o && setSelectedListing(null)}>
                <DialogContent
                    className="!
            /* Tăng lên 95vw cho mobile để tận dụng không gian */
  max-w-none
  w-[90vw]
    max-h-[90vh]
    overflow-y-auto     /* Chỉ cho phép cuộn dọc */
    overflow-x-hidden   /* Chặn tuyệt đối cuộn ngang */
    glass-card-strong
    border-white/10
    p-4 md:p-6          /* Thêm padding linh hoạt */
  "
                >
                    {selectedListing && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-lg">Chi tiết đề nghị</DialogTitle>
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
                                                <Link to={`/seller/${selectedListing.sellerId}`} className="text-primary-400 hover:underline">
                                                    {selectedListing.sellerName || '—'}
                                                </Link>
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
            {/* <Dialog open={addCartOpen} onOpenChange={setAddCartOpen}>
                <DialogContent className="max-w-md glass-card-strong">
                    <DialogHeader>
                        <DialogTitle>Thêm vào giỏ</DialogTitle>
                        <DialogDescription>
                            Nhập số lượng muốn mua
                        </DialogDescription>
                    </DialogHeader>

                    {cartListing && (
                        <div className="space-y-4">
                            <div className="flex gap-3 items-center">
                                <img
                                    src={cartListing.imageUrl || PLACEHOLDER_IMG}
                                    className="w-16 h-20 rounded object-cover"
                                />

                                <div>
                                    <div className="font-medium">{cartListing.cardName}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Giá: {formatCurrencyVND(cartListing.price)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm">Số lượng</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={cartListing.quantity}
                                    value={cartQuantity}
                                    onChange={(e) =>
                                        setCartQuantity(
                                            Math.max(
                                                1,
                                                Math.min(Number(e.target.value), cartListing.quantity)
                                            )
                                        )
                                    }
                                    className="w-full mt-1 px-3 py-2 rounded bg-white/5 border border-white/10"
                                />
                            </div>

                            <Button
                                variant="premium"
                                className="w-full"
                                onClick={handleAddCartApi}
                            >
                                Thêm vào giỏ
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog> */}
        </div>
    );

};

type ListingOffersModalProps = {
    product: CardSellResponse | null;
    onClose: () => void;
    onSelectOffer: (offer: ListingItem) => void;
    onAddCardToCart: (offer: ListingItem) => void;
    formatRarity: (r: string) => string;
    rarityClass: Record<string, string>;
    placeholderImg: string;
};
function ListingOffersModal({
    product,
    onClose,
    onSelectOffer,
    onAddCardToCart,
    formatRarity,
    rarityClass,
    placeholderImg,
}: ListingOffersModalProps) {

    if (!product) return null;
    const [page, setPage] = useState(0);
    const pageSize = 5;
    const [totalPages, setTotalPages] = useState(0);
    const [listSeller, setListSeller] = useState<ListingItem[]>([]);
    useEffect(() => {
        if (product) {
            loadListSeller();
        }
    }, [page, product]);
    const loadListSeller = async () => {
        try {
            const res = await listSellerApi.getListingsByCardId(
                product.cardResponse.cardId,
                page,
                pageSize
            );

            setListSeller(res.content as ListingItem[]);
            setTotalPages(res.totalPages ?? 0);

        } catch (err) {
            console.error(err);
        }
    };
    return (
        <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
            <DialogContent
                className="
    max-w-none           /* Xóa bỏ cái 32rem (max-w-lg) mặc định */
    w-[90vw]
    max-w-[1000px]
    md:max-w-[700px]
    max-h-[90vh]
    overflow-y-auto
    glass-card-strong
    border-white/10
  "
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-4">

                        <img
                            src={product.cardResponse.imageUrl?.[0]?.imageUrl || placeholderImg}
                            alt={product.cardResponse.name}
                            className="w-20 h-28 object-cover rounded-lg shadow-lg"
                            onError={(e) => {
                                e.currentTarget.src = placeholderImg;
                            }}
                        />

                        <div className="text-left space-y-1">

                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${rarityClass[product.cardResponse.rarity] || 'bg-white/10'
                                        }`}
                                >
                                    {formatRarity(product.cardResponse.rarity)}
                                </span>

                                {product.cardResponse.categoryName && (
                                    <span className="text-xs text-muted-foreground">
                                        {product.cardResponse.categoryName}
                                    </span>
                                )}
                            </div>

                            <div className="text-2xl font-semibold">
                                {product.cardResponse.name}
                            </div>

                            {listSeller.length > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    Tổng {listSeller.length} đề nghị · {product.numberOfCard} bản có sẵn
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Hiện không còn đề nghị nào còn hàng
                                </div>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>


                {listSeller.length > 0 && (

                    <div className="mt-6">

                        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Danh sách người bán
                        </div>

                        <div className="rounded-lg border border-white/10">

                            <table className="w-full text-sm">

                                <thead className="bg-white/5 text-muted-foreground">

                                    <tr>
                                        <th className="px-4 py-2 text-left whitespace-nowrap">
                                            Người bán
                                        </th>

                                        <th className="px-4 py-2 text-right whitespace-nowrap">
                                            Giá
                                        </th>

                                        <th className="px-4 py-2 text-center whitespace-nowrap">
                                            Số lượng
                                        </th>

                                        <th className="px-4 py-2 text-right whitespace-nowrap">
                                            Thao tác
                                        </th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {listSeller.map((offer) => (

                                        <tr
                                            key={offer.listSellerId}
                                            className="border-t border-white/5"
                                        >

                                            <td className="px-4 py-2 text-sm text-muted-foreground">

                                                <Link to={`/seller/${offer.sellerId}`} className="text-primary-400 hover:underline">
                                                    {offer.sellerName || '—'}
                                                </Link>

                                                {(offer.sellerFeedbackCount != null && offer.sellerFeedbackCount > 0) && (

                                                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-400/90 text-xs">

                                                        <Star className="h-3 w-3 fill-amber-400 shrink-0" />

                                                        {Number(offer.sellerAverageRating ?? 0).toFixed(1)}

                                                        <span className="text-muted-foreground">
                                                            ({offer.sellerFeedbackCount} đánh giá)
                                                        </span>

                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-2 text-right font-semibold text-accent-400">
                                                {formatCurrencyVND(offer.price)}
                                            </td>

                                            <td className="px-4 py-2 text-center">
                                                {offer.quantity}
                                            </td>

                                            <td className="px-4 py-2 text-right flex gap-2 justify-end">

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAddCardToCart(offer);
                                                    }}
                                                >
                                                    Thêm thẻ vào giỏ
                                                </Button>

                                                <Button
                                                    variant="premium"
                                                    size="sm"
                                                    onClick={() => onSelectOffer(offer)}
                                                >
                                                    Xem chi tiết
                                                </Button>

                                            </td>

                                        </tr>
                                    ))}

                                </tbody>

                            </table>
                            <div className="flex justify-center gap-3 mt-3">

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Trước
                                </Button>

                                <span className="text-sm text-muted-foreground">
                                    Trang {page + 1} / {totalPages}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Sau
                                </Button>

                            </div>

                        </div>

                    </div>
                )}

                <Button
                    variant="ghost"
                    className="w-full mt-4"
                    onClick={onClose}
                >
                    Đóng
                </Button>

            </DialogContent>
        </Dialog>
    );
}
