import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    User, Edit, Share2, Award, TrendingUp,
    Settings, Image as ImageIcon, CreditCard,
    Briefcase, Activity, Heart, Trash2, Package, Star
} from 'lucide-react';
import { userApi, UserProfile, transactionApi, cardApi, listSellerApi, ListingItem, ListSellerResponse, UpdateProfileRequest, WishlistItem, Card as CardType, feedbackApi, FeedbackResponse, getFullImageUrl } from '@/utils/api';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AddressSelect } from '@/components/shared/AddressSelect';
import { useWishlist } from '@/hooks/useWishlist';
import { toast } from '@/components/ui/use-toast';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

export const Profile: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { removeItem: removeFromWishlistLocal } = useWishlist();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [stats, setStats] = useState({ listingsCount: 0, wishlistCount: 0, transactionsCount: 0 });
    const [listings, setListings] = useState<ListingItem[]>([]);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [listingsPage, setListingsPage] = useState(1);
    const [listingsTotalPages, setListingsTotalPages] = useState(0);
    const [listingsTotalElements, setListingsTotalElements] = useState(0);
    const [wishlistRows, setWishlistRows] = useState<{ item: WishlistItem; card: CardType | null }[]>([]);
    const [wishlistTotal, setWishlistTotal] = useState(0);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [editForm, setEditForm] = useState<UpdateProfileRequest>({ name: '', email: '' });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Feedback
    const [feedbackList, setFeedbackList] = useState<FeedbackResponse[]>([]);
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
    const [feedbackTotalElements, setFeedbackTotalElements] = useState(0);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackAvgRating, setFeedbackAvgRating] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Check for payment callback parameters
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const amount = params.get('amount');
        const message = params.get('message');

        if (paymentStatus === 'success') {
            toast({
                title: 'Nạp tiền thành công',
                description: `Số tiền: ${Number(amount).toLocaleString('vi-VN')} đ`,
                variant: 'success',
            });
            // Reload profile to get updated balance
            fetchProfile();
            // Clean URL
            window.history.replaceState({}, '', '/profile');
        } else if (paymentStatus === 'failed') {
            toast({ title: 'Nạp tiền thất bại', description: message || 'Vui lòng thử lại', variant: 'error' });
            window.history.replaceState({}, '', '/profile');
        } else if (paymentStatus === 'error') {
            toast({ title: 'Lỗi xác thực', description: message || 'Vui lòng liên hệ hỗ trợ', variant: 'error' });
            window.history.replaceState({}, '', '/profile');
        }
    }, []);

    // Fetch user profile
    const fetchProfile = async () => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        try {
            const data = await userApi.getMyProfile();
            setProfile(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được hồ sơ');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch stats (listings, wishlist, transactions) - wishlist từ API backend
    const fetchStats = async () => {
        if (!isAuthenticated || !profile?.userId) return;
        try {
            const [listingsRes, wishlistRes, transactionsRes] = await Promise.all([
                listSellerApi.getSellerListings(profile.userId, 1, 1),
                cardApi.getUserWishlist(0, 1),
                transactionApi.getMyTransactions(undefined, 0, 1),
            ]);
            setStats({
                listingsCount: listingsRes.totalElements ?? 0,
                wishlistCount: wishlistRes.totalElements ?? 0,
                transactionsCount: transactionsRes.totalElements ?? 0,
            });
        } catch {
            setStats({ listingsCount: 0, wishlistCount: 0, transactionsCount: 0 });
        }
    };

    useEffect(() => {
        fetchProfile();

        const handler = () => {
            fetchProfile();
            fetchStats();
        };
        window.addEventListener('wallet-updated', handler);
        return () => window.removeEventListener('wallet-updated', handler);
    }, [isAuthenticated]);

    useEffect(() => {
        if (profile?.userId) fetchStats();
    }, [profile?.userId]);

    const fetchWishlist = async () => {
        if (!isAuthenticated) return;
        setWishlistLoading(true);
        try {
            const res = await cardApi.getUserWishlist(0, 8);
            setWishlistTotal(res.totalElements ?? 0);
            const rows = await Promise.all(
                (res.content ?? []).map(async (item) => {
                    try {
                        const card = await cardApi.getCardById(item.cardId);
                        return { item, card };
                    } catch {
                        return { item, card: null as CardType | null };
                    }
                })
            );
            setWishlistRows(rows);
        } catch {
            setWishlistRows([]);
            setWishlistTotal(0);
        } finally {
            setWishlistLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.userId) fetchWishlist();
    }, [profile?.userId]);

    const handleRemoveFromWishlist = async (wishListId: string, cardId: string) => {
        try {
            await cardApi.removeFromWishlist(wishListId);
            removeFromWishlistLocal(cardId);
            window.dispatchEvent(new CustomEvent('wishlist-api-updated'));
            fetchStats();
            fetchWishlist();
        } catch {
            toast({ title: 'Không thể xóa', description: 'Không xóa được khỏi wishlist.', variant: 'error' });
        }
    };

    const fetchListings = async (page: number = 1) => {
        if (!isAuthenticated || !profile?.userId) return;
        setListingsLoading(true);
        try {
            const res = await listSellerApi.getSellerListings(profile.userId, page, 8);
            const content: ListingItem[] = (res.content ?? []).map((item: ListSellerResponse) => ({
                listSellerId: item.listSellerId,
                price: item.price,
                quantity: item.quantity,
                status: 'ON',
                sellerId: item.sellerResponse?.userId ?? '',
                sellerName: item.sellerResponse?.name,
                cardId: item.cardResponse?.cardId ?? '',
                cardName: item.cardResponse?.name ?? 'Thẻ',
                imageUrl: (item.cardResponse?.imageUrl as any)?.[0]?.imageUrl || '',
                categoryName: item.cardResponse?.categoryName,
                rarity: item.cardResponse?.rarity ?? 'COMMON',
                basePrice: item.cardResponse?.basePrice ?? 0,
                minPrice: item.cardResponse?.minPrice,
                maxPrice: item.cardResponse?.maxPrice,
            }));
            setListings(content);
            setListingsTotalPages(res.totalPages ?? 0);
            setListingsTotalElements(res.totalElements ?? 0);
        } catch {
            setListings([]);
        } finally {
            setListingsLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.userId) fetchListings(1);
    }, [profile?.userId]);

    const fetchFeedback = async (page: number) => {
        if (!profile?.userId) return;
        setFeedbackLoading(true);
        try {
            const res = await feedbackApi.getByUser(profile.userId, page, 5);
            setFeedbackList(res.content ?? []);
            setFeedbackTotalPages(res.totalPages ?? 0);
            setFeedbackTotalElements(res.totalElements ?? 0);

            if (page === 1 && (res.content ?? []).length > 0) {
                const sum = (res.content ?? []).reduce((s, f) => s + (f.rating ?? 0), 0);
                setFeedbackAvgRating(res.totalElements > 0 ? sum / (res.content ?? []).length : 0);
            }
        } catch {
            setFeedbackList([]);
        } finally {
            setFeedbackLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.userId) fetchFeedback(1);
    }, [profile?.userId]);

    const openEditProfile = () => {
        if (!profile) return;
        setEditForm({
            name: profile.name ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
            address: profile.address ?? '',
            gender: (profile.gender as 'MALE' | 'FEMALE') || undefined,
            // Giữ lại districtId / wardId hiện tại để gửi lên BE, tránh bị null
            districtId: (profile as any).districtId,
            wardId: (profile as any).wardId,
        });
        setAvatarFile(null);
        setAvatarPreview(null);
        setShowEditProfileModal(true);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        if (!profile?.userId) return;
        if (!editForm.name?.trim()) {
            toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập tên hiển thị.', variant: 'warning' });
            return;
        }
        if (!editForm.email?.trim()) {
            toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập email.', variant: 'warning' });
            return;
        }
        setIsSavingProfile(true);
        try {
            const payload: UpdateProfileRequest = {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                phone: editForm.phone?.trim() || '',
                address: editForm.address?.trim() || '',
                gender: editForm.gender,
                districtId: editForm.districtId,
                wardId: editForm.wardId,
            };
            if (editForm.password?.trim()) payload.password = editForm.password.trim();
            const updated = await userApi.updateProfile(profile.userId, payload, avatarFile ?? undefined);
            setProfile(updated);
            setShowEditProfileModal(false);
        } catch (err) {
            toast({ title: 'Cập nhật thất bại', description: err instanceof Error ? err.message : 'Vui lòng thử lại.', variant: 'error' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleTopUp = () => {
        setShowDepositModal(true);
    };

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) {
            toast({ title: 'Số tiền không hợp lệ', description: 'Vui lòng nhập số tiền lớn hơn 0.', variant: 'warning' });
            return;
        }

        if (!profile?.userId) {
            toast({ title: 'Lỗi', description: 'Không tìm thấy thông tin người dùng.', variant: 'error' });
            return;
        }

        setIsProcessing(true);
        try {
            console.log('Sending deposit request:', {
                userId: profile.userId,
                amount: Number(depositAmount),
                provider: 'MOMO'
            });

            const paymentUrl = await transactionApi.deposit({
                userId: profile.userId,
                amount: Number(depositAmount),
                provider: 'MOMO', // Backend only supports MoMo for now
            });

            console.log('Received payment URL:', paymentUrl);

            // Check if paymentUrl is valid
            if (!paymentUrl || paymentUrl === 'undefined' || !paymentUrl.startsWith('http')) {
                throw new Error('Invalid payment URL received from server');
            }

            // Redirect to MoMo payment gateway
            window.location.href = paymentUrl;
        } catch (err) {
            console.error('Deposit error:', err);
            toast({ title: 'Nạp tiền thất bại', description: err instanceof Error ? err.message : 'Vui lòng thử lại.', variant: 'error' });
            setIsProcessing(false);
        }
    };

    const handleViewTransactions = () => {
        navigate('/wallet');
    };

    const totalValue = profile?.walletResponse?.balance ?? 0;
    const [activeTab, setActiveTab] = useState<'stats' | 'feedback'>('stats');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <div className="text-xl">Đang tải hồ sơ...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error}</div>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl">Vui lòng đăng nhập để xem hồ sơ</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* 1. Header Section */}
            <div className="relative mb-8">
                {/* Cover Image */}
                <div className="h-48 md:h-64 rounded-b-3xl relative group">
                    <div className="absolute inset-0 bg-transparent" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Edit Cover
                    </Button>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-4 -mt-16 relative flex flex-col md:flex-row items-end md:items-center gap-6">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-[#0B0112] bg-[#1a0a2e] flex items-center justify-center overflow-hidden">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-primary-400">
                                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                        <button
                                type="button"
                                onClick={openEditProfile}
                                className="absolute bottom-2 right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-[#0B0112] flex items-center justify-center hover:bg-blue-600 transition-colors"
                                aria-label="Chỉnh sửa ảnh đại diện"
                            >
                                <Edit className="w-3 h-3 text-white" />
                            </button>
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                            {feedbackTotalElements > 0 && (
                                <span className="flex items-center gap-1 text-sm text-yellow-400">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    {feedbackAvgRating.toFixed(1)}
                                    <span className="text-muted-foreground">({feedbackTotalElements})</span>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={openEditProfile}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                aria-label="Chỉnh sửa profile"
                            >
                                <Edit className="w-4 h-4 text-muted-foreground hover:text-white" />
                            </button>
                            <Award className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-primary-400 font-medium">@{profile.email?.split('@')[0]}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        {profile.phone && (
                            <p className="text-sm text-muted-foreground">📱 {profile.phone}</p>
                        )}
                        {profile.address && (
                            <p className="text-sm text-muted-foreground">📍 {profile.address}</p>
                        )}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Button variant="outline" className="glass-card">
                            <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button variant="premium" onClick={() => navigate('/settings')}>
                            <Settings className="w-4 h-4 mr-2" /> Settings
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* 2. Stats Bar (API) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/5 border border-white/10 rounded-xl shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-xs font-bold text-[#FFF9C4] uppercase tracking-wider mb-1">Đang bán</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.listingsCount}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border border-white/10 rounded-xl shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-xs font-bold text-[#E1F5FE] uppercase tracking-wider mb-1">Wishlist</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.wishlistCount}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border border-white/10 rounded-xl shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-xs font-bold text-[#E8F5E9] uppercase tracking-wider mb-1">Giao dịch</div>
                            <div className="text-2xl font-bold text-green-400">{stats.transactionsCount}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/5 border border-white/10 rounded-xl shadow-none">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="text-xs font-bold text-[#FFEBEE] uppercase tracking-wider mb-1">Số dư ví</div>
                            <div className="text-2xl font-bold text-red-400">{totalValue.toLocaleString('vi-VN')} đ</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Action Bar */}
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                    <button className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 ">
                        <User className="w-4 h-4" /> Xem trang cá nhân
                    </button>
                    <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 ">
                        <Edit className="w-4 h-4" /> Edit Background
                    </button>
                </div>

                {/* 4. Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`py-2 text-sm font-medium rounded-md ${activeTab === 'stats'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`py-2 text-sm font-medium rounded-md ${activeTab === 'feedback'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Đánh giá ({feedbackTotalElements})
                    </button>
                </div>

                {/* ===== Tab: Stats ===== */}
                {activeTab === 'stats' && (
                <>

                {/* 5. Wallet Section */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-green-400">
                        <CreditCard className="w-5 h-5" />
                        Ví của tôi
                    </h3>
                    <Card className="glass-card p-6 relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Số dư khả dụng</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-4xl font-bold text-green-400">
                                            {(profile?.walletResponse?.balance || 0).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-xl text-muted-foreground">đ</span>
                                    </div>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CreditCard className="w-8 h-8 text-green-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleTopUp}
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Nạp tiền
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-green-500/30 hover:bg-green-500/10"
                                    onClick={handleViewTransactions}
                                >
                                    <Activity className="w-4 h-4 mr-2" />
                                    Lịch sử
                                </Button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-muted-foreground text-center">
                                    Sử dụng ví để mua thẻ, mở hộp bí ẩn và giao dịch trên marketplace
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 6. Tổng quan (API) */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-yellow-400">
                        <Briefcase className="w-5 h-5" />
                        Tổng quan
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <Card className="bg-transparent border-none shadow-none cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/post-listing')}>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">{stats.listingsCount}</div>
                                <div className="text-xs text-muted-foreground">Đang bán</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/portfolio')}>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">{stats.wishlistCount}</div>
                                <div className="text-xs text-muted-foreground">Wishlist</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/wallet')}>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">{stats.transactionsCount}</div>
                                <div className="text-xs text-muted-foreground">Giao dịch</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/wallet')}>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-red-400">{totalValue.toLocaleString('vi-VN')} đ</div>
                                <div className="text-xs text-muted-foreground">Số dư ví</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Đang bán - tin đăng của tôi */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-[#FFF9C4]">
                        <Package className="w-5 h-5" />
                        Đang bán
                        {listingsTotalElements > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">({listingsTotalElements} tin)</span>
                        )}
                    </h3>
                    {listingsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="rounded-full h-10 w-10 border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
                        </div>
                    ) : listings.length === 0 ? (
                        <Card className="glass-card p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-yellow-400" />
                            </div>
                            <p className="text-muted-foreground">Chưa có tin đăng bán</p>
                            <p className="text-sm text-muted-foreground mt-1">Đăng thẻ lên Marketplace để bán</p>
                            <Button variant="outline" className="mt-4" onClick={() => navigate('/post-listing')}>
                                Đăng bán
                            </Button>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {listings.map((item) => (
                                    <Card
                                        key={item.listSellerId}
                                        className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <Link to="/marketplace" className="block">
                                            <div className="relative aspect-[2.5/3.5] rounded-t-lg overflow-hidden bg-white/5">
                                                <img
                                                    src={item.imageUrl || PLACEHOLDER_IMG}
                                                    alt={item.cardName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                                    }}
                                                />
                                            </div>
                                            <CardContent className="p-3">
                                                <h4 className="font-semibold text-sm line-clamp-2">{item.cardName}</h4>
                                                <p className="text-sm font-bold text-yellow-400 mt-1">
                                                    {Number(item.price).toLocaleString('vi-VN')} đ
                                                </p>
                                                <p className="text-xs text-muted-foreground">SL: {item.quantity}</p>
                                                {(item.sellerFeedbackCount != null && item.sellerFeedbackCount > 0) && (
                                                    <p className="text-xs text-amber-400/90 mt-0.5 flex items-center gap-0.5">
                                                        <Star className="h-3 w-3 fill-amber-400 shrink-0" />
                                                        {Number(item.sellerAverageRating ?? 0).toFixed(1)}
                                                        <span className="text-muted-foreground">({item.sellerFeedbackCount} đánh giá)</span>
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Link>
                                    </Card>
                                ))}
                            </div>
                            {listingsTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-6">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={listingsPage <= 1}
                                        onClick={() => {
                                            const p = listingsPage - 1;
                                            setListingsPage(p);
                                            fetchListings(p);
                                        }}
                                    >
                                        ‹
                                    </Button>
                                    {Array.from({ length: listingsTotalPages }, (_, i) => i + 1).map((p) => (
                                        <Button
                                            key={p}
                                            size="sm"
                                            variant={p === listingsPage ? 'default' : 'outline'}
                                            className={p === listingsPage ? 'bg-primary-500' : ''}
                                            onClick={() => {
                                                setListingsPage(p);
                                                fetchListings(p);
                                            }}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={listingsPage >= listingsTotalPages}
                                        onClick={() => {
                                            const p = listingsPage + 1;
                                            setListingsPage(p);
                                            fetchListings(p);
                                        }}
                                    >
                                        ›
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Wishlist Section - từ API backend */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-pink-400">
                        <Heart className="w-5 h-5" />
                        Wishlist của tôi
                        {wishlistTotal > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">({wishlistTotal} thẻ)</span>
                        )}
                    </h3>
                    {wishlistLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="rounded-full h-10 w-10 border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
                        </div>
                    ) : wishlistRows.length === 0 ? (
                        <Card className="glass-card p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-pink-400" />
                            </div>
                            <p className="text-muted-foreground">Chưa có thẻ nào trong wishlist</p>
                            <p className="text-sm text-muted-foreground mt-1">Thêm thẻ yêu thích từ Hộp bí ẩn hoặc Bộ sưu tập</p>
                            <Button variant="outline" className="mt-4" onClick={() => navigate('/mystery-box')}>
                                Đến Hộp bí ẩn
                            </Button>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {wishlistRows.map(({ item, card }) => (
                                    <Card
                                        key={item.wishListId}
                                        className="relative overflow-hidden border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                                    >
                                        <Link to={card ? `/portfolio?card=${card.cardId}` : '/portfolio'} className="block">
                                            <div className="relative aspect-[2.5/3.5] rounded-t-lg overflow-hidden bg-white/5">
                                                <img
                                                    src={(card?.imageUrl as any)?.[0]?.imageUrl || PLACEHOLDER_IMG}
                                                    alt={card?.name || 'Thẻ'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                                    }}
                                                />
                                            </div>
                                            <CardContent className="p-3">
                                                <h4 className="font-semibold text-sm line-clamp-2">{card?.name || 'Thẻ'}</h4>
                                                {item.expectPrice != null && (
                                                    <p className="text-xs text-pink-400 mt-1">
                                                        Mong muốn: {Number(item.expectPrice).toLocaleString('vi-VN')} đ
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Link>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-full bg-black/50 hover:bg-red-500/20 text-red-400"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleRemoveFromWishlist(item.wishListId, item.cardId);
                                                }}
                                                aria-label="Xóa khỏi wishlist"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {wishlistTotal > 8 && (
                                <div className="mt-4 text-center">
                                    <Button variant="outline" size="sm" onClick={() => navigate('/portfolio')}>
                                        Xem tất cả wishlist
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 7. Performance Chart Placeholder */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-blue-400">
                        <Activity className="w-5 h-5" />
                        Your Performance
                    </h3>
                    <Card className="glass-card p-6 min-h-[200px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                                <path d="M0,150 Q250,50 500,100 T1000,20" fill="none" stroke="#3D7DCA" strokeWidth="4" />
                                <path d="M0,150 Q250,50 500,100 T1000,20 V200 H0 Z" fill="url(#gradient)" opacity="0.3" />
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3D7DCA" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <TrendingUp className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-muted-foreground text-sm max-w-md text-center">
                                Theo dõi hiệu suất danh mục đầu tư, biến động giá thị trường và xếp hạng bộ sưu tập của bạn theo thời gian thực.
                            </p>
                        </div>
                    </Card>
                </div>

                </>
                )}

                {/* ===== Tab: Feedback ===== */}
                {activeTab === 'feedback' && (
                    <div>
                        <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-yellow-400">
                            <Star className="w-5 h-5" />
                            Đánh giá ({feedbackTotalElements})
                        </h3>
                        {feedbackLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="rounded-full h-10 w-10 border-2 border-yellow-500/30 border-t-yellow-500 animate-spin" />
                            </div>
                        ) : feedbackList.length === 0 ? (
                            <Card className="glass-card p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Star className="w-8 h-8 text-yellow-400" />
                                </div>
                                <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                            </Card>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    {feedbackList.map((fb) => {
                                        const reviewer = fb.userResponse;
                                        const card = fb.cardResponse;
                                        const images = fb.imageResponses ?? [];
                                        const cardImg = (card?.imageUrl as any)?.[0]?.imageUrl || '';
                                        return (
                                            <Card key={fb.feedBackId} className="glass-card p-4">
                                                <div className="flex gap-3">
                                                    <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                                        {reviewer?.avatarUrl ? (
                                                            <img src={reviewer.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-sm text-white">
                                                                {reviewer?.name || 'Ẩn danh'}
                                                            </span>
                                                            <span className="flex items-center gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-3.5 w-3.5 ${i <= fb.rating
                                                                            ? 'fill-yellow-400 text-yellow-400'
                                                                            : 'text-white/20'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                                                            </span>
                                                            {card && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                    X
                                                                    {cardImg && (
                                                                        <button
                                                                            type="button"
                                                                            className="shrink-0 rounded overflow-hidden border border-white/10 hover:border-primary-400/50 transition-colors focus:outline-none"
                                                                            onClick={() => setPreviewImage(cardImg)}
                                                                        >
                                                                            <img src={cardImg} alt={card.name} className="w-6 h-8 object-cover" />
                                                                        </button>
                                                                    )}
                                                                    <span className="line-clamp-1">{card.name}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        {fb.comment && (
                                                            <p className="text-sm text-muted-foreground mt-2">{fb.comment}</p>
                                                        )}
                                                        {images.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {images.map((img, idx) => {
                                                                    const rawUrl = img.imageUrl || img.url || '';
                                                                    const fullUrl = getFullImageUrl(rawUrl);
                                                                    return fullUrl ? (
                                                                        <button
                                                                            key={img.imageId || idx}
                                                                            type="button"
                                                                            onClick={() => setPreviewImage(fullUrl)}
                                                                            className="rounded-lg overflow-hidden border border-white/10 hover:border-primary-400/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400/40"
                                                                        >
                                                                            <img
                                                                                src={fullUrl}
                                                                                alt={`Feedback ${idx + 1}`}
                                                                                className="w-16 h-16 object-cover"
                                                                            />
                                                                        </button>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {feedbackTotalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={feedbackPage <= 1}
                                            onClick={() => {
                                                const p = feedbackPage - 1;
                                                setFeedbackPage(p);
                                                fetchFeedback(p);
                                            }}
                                        >
                                            ‹
                                        </Button>
                                        {Array.from({ length: feedbackTotalPages }, (_, i) => i + 1).map((p) => (
                                            <Button
                                                key={p}
                                                size="sm"
                                                variant={p === feedbackPage ? 'default' : 'outline'}
                                                className={p === feedbackPage ? 'bg-primary-500' : ''}
                                                onClick={() => {
                                                    setFeedbackPage(p);
                                                    fetchFeedback(p);
                                                }}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={feedbackPage >= feedbackTotalPages}
                                            onClick={() => {
                                                const p = feedbackPage + 1;
                                                setFeedbackPage(p);
                                                fetchFeedback(p);
                                            }}
                                        >
                                            ›
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* Edit Profile Modal */}
            {showEditProfileModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[#1a0a2e] rounded-lg p-6 max-w-md w-full border border-white/10 my-8">
                        <h3 className="text-xl font-bold mb-4 text-white">Chỉnh sửa profile</h3>
                        <div className="space-y-4">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-24 h-24 rounded-full border-4 border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-primary-400">
                                            {editForm.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <label className="text-sm text-primary-400 cursor-pointer hover:underline">
                                    Đổi ảnh đại diện
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tên hiển thị</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="Tên của bạn"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={editForm.phone ?? ''}
                                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="0912345678"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Địa chỉ</label>
                                <AddressSelect
                                    value={editForm.address}
                                    onChange={(address) => setEditForm((f) => ({ ...f, address }))}
                                    showDetailInput={true}
                                        onCodesChange={({ districtId, wardCode }) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            // Lưu districtId/wardId dạng string để gửi lên BE
                                            districtId: districtId ? String(districtId) : f.districtId,
                                            wardId: wardCode ?? f.wardId,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Giới tính</label>
                                <select
                                    value={editForm.gender ?? ''}
                                    onChange={(e) => setEditForm((f) => ({ ...f, gender: (e.target.value || undefined) as 'MALE' | 'FEMALE' | undefined }))}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="">-- Chọn --</option>
                                    <option value="MALE">Nam</option>
                                    <option value="FEMALE">Nữ</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Mật khẩu mới (để trống nếu không đổi)</label>
                                <input
                                    type="password"
                                    value={editForm.password ?? ''}
                                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowEditProfileModal(false)}
                                    disabled={isSavingProfile}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1 bg-primary-600 hover:bg-primary-700"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSaveProfile();
                                    }}
                                    disabled={isSavingProfile}
                                >
                                    {isSavingProfile ? 'Đang lưu...' : 'Lưu'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a0a2e] rounded-lg p-6 max-w-md w-full border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white">Nạp tiền vào ví</h3>

                        <div className="space-y-4">
                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Số tiền (VND)
                                </label>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Nhập số tiền"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    min="10000"
                                    step="10000"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Số tiền tối thiểu: 10,000 đ
                                </p>
                            </div>

                            {/* Payment Provider Info */}
                            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">💳</div>
                                    <div>
                                        <div className="font-medium text-white">Thanh toán qua MoMo</div>
                                        <div className="text-xs text-muted-foreground">
                                            Nhanh chóng, an toàn và bảo mật
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowDepositModal(false);
                                        setDepositAmount('');
                                    }}
                                    disabled={isProcessing}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    className="flex-1 bg-pink-600 hover:bg-pink-700"
                                    onClick={handleDeposit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Đang xử lý...' : 'Thanh toán MoMo'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Overlay */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold z-10"
                        onClick={() => setPreviewImage(null)}
                        aria-label="Đóng"
                    >
                        ✕
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
