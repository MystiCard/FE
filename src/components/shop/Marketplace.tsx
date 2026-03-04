import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Link, useNavigate } from 'react-router-dom';
import { listSellerApi, ListingItem, categoryApi, Category, cardApi, userApi, orderApi, transactionApi } from '@/utils/api';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Loader2 } from 'lucide-react';

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
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(24);
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
    const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'MOMO'>('WALLET');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [cartItems, setCartItems] = useState<{ listing: ListingItem; quantity: number }[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { addItem: addToWishlistLocal, removeItem: removeFromWishlistLocal, isInWishlist } = useWishlist();
    const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
    const [wishlistLoadingCardId, setWishlistLoadingCardId] = useState<string | null>(null);

    useEffect(() => {
        loadListings(currentPage);
    }, [currentPage]);

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

    const addToCart = (offer: ListingItem, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setCartItems((prev) => {
            const existing = prev.find((c) => c.listing.listSellerId === offer.listSellerId);
            if (existing) {
                const nextQty = Math.min(existing.quantity + 1, offer.quantity);
                return prev.map((c) =>
                    c.listing.listSellerId === offer.listSellerId ? { ...c, quantity: nextQty } : c,
                );
            }
            return [...prev, { listing: offer, quantity: 1 }];
        });
        setCartOpen(true);
    };

    const handleCheckoutCart = async () => {
        if (!cartItems.length) return;
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setOrderError(null);
        setOrderLoading(true);
        try {
            const profile = await userApi.getMyProfile();
            if (!profile.address || !profile.phone) {
                setOrderError('Vui lòng cập nhật địa chỉ và số điện thoại trong Hồ sơ trước khi mua.');
                return;
            }

            const toDistrictId = profile.districtId ? Number(profile.districtId) : 3695;
            const toWardId = profile.wardId ? Number(profile.wardId) : 90752;

            const orderItemsList = cartItems.map((c) => ({
                listSellerId: c.listing.listSellerId,
                quantity: Math.max(1, Math.min(c.quantity, c.listing.quantity)),
            }));

            const order = await orderApi.createOrder({
                buyerAddress: profile.address,
                buyerPhone: profile.phone,
                toDistrictId,
                toWardId,
                orderItemsList,
            });

            const totalShipFee =
                order.orderItems?.reduce((sum, oi) => sum + (oi.shipfee ?? 0), 0) ?? 0;
            const totalItems =
                order.orderItems?.reduce(
                    (sum, oi) =>
                        sum +
                        oi.orderDetailResponseList.reduce(
                            (s, d) => s + d.quantity * d.price,
                            0,
                        ),
                    0,
                ) ?? 0;

            if (paymentMethod === 'WALLET') {
                await transactionApi.payOrderWithWallet(order.orderId);
                window.dispatchEvent(new CustomEvent('wallet-updated'));
                alert(
                    [
                        'Đã đặt mua & thanh toán các thẻ trong giỏ bằng Ví MystiCard.',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng thanh toán: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            } else {
                alert(
                    [
                        'Đã tạo đơn mua cho các thẻ trong giỏ (thanh toán MoMo sẽ được bổ sung sau).',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng tiền đơn: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            }

            setCartItems([]);
            setCartOpen(false);
            navigate('/orders');
        } catch (e) {
            setOrderError(
                e instanceof Error ? e.message : 'Thanh toán giỏ hàng thất bại. Vui lòng thử lại.',
            );
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
            const profile = await userApi.getMyProfile();
            if (!profile.address || !profile.phone) {
                setOrderError('Vui lòng cập nhật địa chỉ và số điện thoại trong Hồ sơ trước khi mua.');
                return;
            }

            const toDistrictId = profile.districtId ? Number(profile.districtId) : 3695;
            const toWardId = profile.wardId ? Number(profile.wardId) : 90752;
            const safeQuantity = Math.max(
                1,
                Math.min(orderQuantity || 1, selectedListing.quantity ?? 1),
            );

            const order = await orderApi.createOrder({
                buyerAddress: profile.address,
                buyerPhone: profile.phone,
                toDistrictId,
                toWardId,
                orderItemsList: [
                    {
                        listSellerId: selectedListing.listSellerId,
                        quantity: safeQuantity,
                    },
                ],
            });

            // Tính tổng tiền hàng và phí ship từ order trả về
            const totalShipFee =
                order.orderItems?.reduce((sum, oi) => sum + (oi.shipfee ?? 0), 0) ?? 0;
            const totalItems =
                order.orderItems?.reduce(
                    (sum, oi) =>
                        sum +
                        oi.orderDetailResponseList.reduce(
                            (s, d) => s + d.quantity * d.price,
                            0,
                        ),
                    0,
                ) ?? 0;

            if (paymentMethod === 'WALLET') {
                // Thanh toán đơn bằng ví
                await transactionApi.payOrderWithWallet(order.orderId);
                window.dispatchEvent(new CustomEvent('wallet-updated'));
                alert(
                    [
                        'Đặt mua & thanh toán bằng Ví MystiCard thành công.',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng thanh toán: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            } else {
                // Chưa tích hợp MoMo cho đơn marketplace: chỉ hiển thị thông tin
                alert(
                    [
                        'Đã tạo đơn mua thẻ (thanh toán qua MoMo sẽ được bổ sung sau).',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship (tính theo từng người bán): ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng tiền đơn: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            }

            setSelectedListing(null);
            setSelectedProduct(null);
            setOrderQuantity(1);
            navigate('/orders');
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar bộ lọc */}
                <div className="lg:col-span-1">
                    <Card className="glass-card-strong sticky top-24">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Bộ lọc
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Giá (đ)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={priceRange[0]}
                                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm"
                                    />
                                    <span className="self-center text-muted-foreground">–</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <div>
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
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Độ hiếm</label>
                                <select
                                    value={filterRarity}
                                    onChange={(e) => setFilterRarity(e.target.value)}
                                    className="w-full px-3 py-2 glass-card rounded-lg text-sm appearance-none cursor-pointer bg-black/60"
                                >
                                    <option value="all">Tất cả</option>
                                    {RARITIES.map((r) => (
                                        <option key={r} value={r}>
                                            {formatRarity(r)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    setSearchQuery('');
                                    setPriceRange([0, 5000]);
                                    setFilterCategory('all');
                                    setFilterRarity('all');
                                }}
                            >
                                Xóa bộ lọc
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Khu vực danh sách sản phẩm kiểu Cardmarket */}
                <div className="lg:col-span-3">
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
                        <Card className="glass-card-strong overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-xs text-muted-foreground uppercase tracking-wider">
                                            <th className="p-4 font-medium">Sản phẩm</th>
                                            <th className="p-4 font-medium text-center w-24">Số đề nghị</th>
                                            <th className="p-4 font-medium text-right w-28">Từ</th>
                                            <th className="p-4 w-32" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product) => {
                                            const minPrice = Math.min(...product.offers.map(o => o.price));
                                            const isExpanded = expandedCardId === product.cardId;
                                            return (
                                                <React.Fragment key={product.cardId}>
                                                    <tr
                                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                                        onClick={() => setExpandedCardId(isExpanded ? null : product.cardId)}
                                                    >
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-4">
                                                                <img
                                                                    src={product.imageUrl || PLACEHOLDER_IMG}
                                                                    alt={product.cardName}
                                                                    className="w-12 h-16 object-cover rounded-lg shrink-0"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                                                    }}
                                                                />
                                                                <div>
                                                                    <div className="font-medium">{product.cardName}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {product.categoryName || '—'} · {formatRarity(product.rarity)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="inline-flex items-center gap-1 text-sm">
                                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                                {product.offers.length}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <span className="font-semibold text-accent-400">
                                                                {formatCurrencyVND(minPrice)}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="gap-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedProduct(product);
                                                                    }}
                                                                >
                                                                    Xem đề nghị
                                                                    <ChevronDown className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="rounded-full"
                                                                    onClick={(e) => toggleWishlistForCard(product, e)}
                                                                    disabled={wishlistLoadingCardId === product.cardId}
                                                                    aria-label={
                                                                        wishlistCardIds.has(product.cardId) || isInWishlist(product.cardId)
                                                                            ? 'Bỏ khỏi wishlist'
                                                                            : 'Thêm vào wishlist'
                                                                    }
                                                                >
                                                                    {wishlistLoadingCardId === product.cardId ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Heart
                                                                            className={`h-4 w-4 ${
                                                                                wishlistCardIds.has(product.cardId) || isInWishlist(product.cardId)
                                                                                    ? 'fill-red-500 text-red-500'
                                                                                    : ''
                                                                            }`}
                                                                        />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Hàng mở rộng: bảng offer bên dưới thẻ */}
                                                    {isExpanded && (
                                                        <tr className="bg-white/5">
                                                            <td colSpan={4} className="p-4">
                                                                <div className="pl-16 pr-4">
                                                                    <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                                                        {product.offers.length} đề nghị
                                                                    </div>
                                                                    <table className="w-full text-sm">
                                                                        <thead>
                                                                            <tr className="text-muted-foreground text-left">
                                                                                <th className="pb-2 font-medium">Giá</th>
                                                                                <th className="pb-2 font-medium">Số lượng</th>
                                                                                <th className="pb-2 font-medium">Người bán</th>
                                                                                <th className="pb-2 font-medium text-right">Thao tác</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {product.offers.map((offer) => (
                                                                                <tr key={offer.listSellerId} className="border-t border-white/5">
                                                                                    <td className="py-2 font-medium text-accent-400">
                                                                                        {formatCurrencyVND(offer.price)}
                                                                                    </td>
                                                                                    <td className="py-2">{offer.quantity}</td>
                                                                                    <td className="py-2 text-muted-foreground">
                                                                                        {offer.sellerName || '—'}
                                                                                    </td>
                                                                                    <td className="py-2 text-right">
                                                                                        <Button
                                                                                            variant="premium"
                                                                                            size="sm"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setSelectedProduct(product);
                                                                                                setSelectedListing(offer);
                                                                                            }}
                                                                                        >
                                                                                            Xem chi tiết
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
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
                onAddToCart={(offer) => addToCart(offer)}
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
                                            <span>{selectedListing.sellerName || '—'}</span>
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
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('WALLET')}
                                                className={`flex-1 px-3 py-2 rounded border ${
                                                    paymentMethod === 'WALLET'
                                                        ? 'border-yellow-400 bg-yellow-500/10 text-yellow-200'
                                                        : 'border-white/10 text-muted-foreground hover:border-yellow-400'
                                                }`}
                                            >
                                                Ví MystiCard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('MOMO')}
                                                className={`flex-1 px-3 py-2 rounded border ${
                                                    paymentMethod === 'MOMO'
                                                        ? 'border-pink-400 bg-pink-500/10 text-pink-200'
                                                        : 'border-white/10 text-muted-foreground hover:border-pink-400'
                                                }`}
                                            >
                                                MoMo
                                            </button>
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

            {/* Giỏ hàng nhiều offer */}
            <Dialog open={cartOpen} onOpenChange={(o) => setCartOpen(o)}>
                <DialogContent className="max-w-lg glass-card-strong border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Giỏ hàng sàn giao dịch</DialogTitle>
                    </DialogHeader>
                    {cartItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-4">
                            Giỏ hàng đang trống. Hãy thêm thẻ từ Sàn giao dịch.
                        </p>
                    ) : (
                        <div className="mt-4 space-y-3 text-sm">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-2 py-1">Thẻ</th>
                                        <th className="text-right px-2 py-1">Giá</th>
                                        <th className="text-center px-2 py-1">SL</th>
                                        <th className="text-right px-2 py-1">Tạm tính</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.map((item) => (
                                        <tr key={item.listing.listSellerId} className="border-t border-white/5">
                                            <td className="px-2 py-1">
                                                <div className="line-clamp-2">{item.listing.cardName}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {item.listing.sellerName || '—'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                                {formatCurrencyVND(item.listing.price)}
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={item.listing.quantity}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const v = Number(e.target.value) || 1;
                                                        setCartItems((prev) =>
                                                            prev.map((c) =>
                                                                c.listing.listSellerId === item.listing.listSellerId
                                                                    ? {
                                                                          ...c,
                                                                          quantity: Math.max(
                                                                              1,
                                                                              Math.min(v, item.listing.quantity),
                                                                          ),
                                                                      }
                                                                    : c,
                                                            ),
                                                        );
                                                    }}
                                                    className="w-16 px-2 py-1 rounded bg-white/5 border border-white/10 text-center text-xs"
                                                />
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                                {formatCurrencyVND(item.listing.price * item.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="pt-2 border-t border-white/10 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tổng tiền hàng</span>
                                    <span className="font-semibold">
                                        {formatCurrencyVND(
                                            cartItems.reduce(
                                                (sum, i) => sum + i.listing.price * i.quantity,
                                                0,
                                            ),
                                        )}
                                    </span>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('WALLET')}
                                        className={`flex-1 px-3 py-2 rounded border ${
                                            paymentMethod === 'WALLET'
                                                ? 'border-yellow-400 bg-yellow-500/10 text-yellow-200'
                                                : 'border-white/10 text-muted-foreground hover:border-yellow-400'
                                        }`}
                                    >
                                        Ví MystiCard
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('MOMO')}
                                        className={`flex-1 px-3 py-2 rounded border ${
                                            paymentMethod === 'MOMO'
                                                ? 'border-pink-400 bg-pink-500/10 text-pink-200'
                                                : 'border-white/10 text-muted-foreground hover:border-pink-400'
                                        }`}
                                    >
                                        MoMo
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Phí ship được tính riêng cho từng người bán sau khi tạo đơn, tương tự như khi mua 1 offer.
                                </p>
                                <Button
                                    variant="premium"
                                    className="w-full"
                                    disabled={orderLoading}
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
    onAddToCart,
    formatRarity,
    rarityClass,
    placeholderImg,
}: {
    product: CardProduct | null;
    onClose: () => void;
    onSelectOffer: (offer: ListingItem) => void;
    onAddToCart: (offer: ListingItem) => void;
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card-strong border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-4">
                        <img
                            src={product.imageUrl || placeholderImg}
                            alt={product.cardName}
                            className="w-20 h-28 object-cover rounded-lg shadow-lg"
                            onError={(e) => {
                                e.currentTarget.src = placeholderImg;
                            }}
                        />
                        <div className="text-left space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] uppercase tracking-wider">
                                    {formatRarity(product.rarity)}
                                </span>
                                {product.categoryName && (
                                    <span className="text-xs text-muted-foreground">{product.categoryName}</span>
                                )}
                            </div>
                            <div className="text-2xl font-semibold">{product.cardName}</div>
                            {activeOffers.length > 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    Tổng {activeOffers.length} đề nghị · {totalQuantity} bản có sẵn
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Hiện không còn đề nghị nào còn hàng
                                </div>
                            )}
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Giá thấp nhất
                        </div>
                        <div className="text-lg font-bold text-accent-400">{formatCurrencyVND(minPrice)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Giá trung bình
                        </div>
                        <div className="text-lg font-bold">{formatCurrencyVND(avgPrice)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Giá cao nhất
                        </div>
                        <div className="text-lg font-bold">{formatCurrencyVND(maxPrice)}</div>
                    </div>
                </div>

                {activeOffers.length > 0 && (
                    <div className="mt-6">
                        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Danh sách người bán
                        </div>
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-white/5 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Người bán</th>
                                        <th className="px-4 py-2 text-right">Giá</th>
                                        <th className="px-4 py-2 text-center">Số lượng</th>
                                        <th className="px-4 py-2 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeOffers.map((offer) => (
                                        <tr key={offer.listSellerId} className="border-t border-white/5">
                                            <td className="px-4 py-2 text-sm text-muted-foreground">
                                                {offer.sellerName || '—'}
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
                                                        onAddToCart(offer);
                                                    }}
                                                >
                                                    Thêm vào giỏ
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
