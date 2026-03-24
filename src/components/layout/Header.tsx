import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Bell, User, ChevronDown, Menu, Heart, LogOut, Wallet, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { useAuth } from '@/contexts/AuthContext';
import { MobileMenu } from '@/components/shared/MobileMenu';
import { userApi, cardApi, notificationApi, cartApi, type NotificationItem } from '@/utils/api';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const navLinkClass = (path: string, exact = true) =>
        `text-sm font-medium hover:text-primary-400 transition-colors ${(exact ? pathname === path : pathname.startsWith(path)) ? 'text-primary-400' : ''}`;
    const [isMarketplaceOpen, setIsMarketplaceOpen] = React.useState(false);
    const [isPortfolioOpen, setIsPortfolioOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isAlertsOpen, setIsAlertsOpen] = React.useState(false);
    const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
    const [notificationPage, setNotificationPage] = React.useState(0); // 0-based
    const [notificationTotalPages, setNotificationTotalPages] = React.useState(0);
    const [selectedNotification, setSelectedNotification] = React.useState<NotificationItem | null>(null);
    const { user, isAuthenticated, logout } = useAuth();
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [apiWishlistCount, setApiWishlistCount] = useState<number>(0);
    const [carts, setCarts] = useState([]);
    const [myuser, setMyUser] = useState({});

    // Khi đã đăng nhập: số wishlist lấy từ API (DB)
    const [wishlistCount,setWiilistCount] = useState([]);

    const fetchWishlistCount = async () => {

        try {
            const res = await cardApi.getUserWishlist(0, 1);
            setApiWishlistCount(res.totalElements ?? 0);
        } catch {
            setApiWishlistCount(0);
        }
    };
    const fetchMyInfor = async () => {
        const response = await userApi.getMyProfile();
        setMyUser(response);
    }
    const fetchCarts = async () => {
        if (!isAuthenticated) {
            setCarts([]);
            return;
        }
        try {
            const res = await cartApi.getAllCarts(1, 1000)
            setCarts(res.data.content)
        } catch {
            setCarts([]);
        }
    };
    useEffect(() => {
        if (!isAuthenticated) {
            setApiWishlistCount(0);
            setCarts([]);
            return;
        }
        fetchMyInfor();
        fetchWishlistCount();
        fetchCarts();
        const onUpdated = () => fetchWishlistCount();
        const onCartUpdated = () => fetchCarts();
        window.addEventListener('wishlist-api-updated', onUpdated);
        window.addEventListener('cart-updated', onCartUpdated);
        return () => {
            window.removeEventListener('wishlist-api-updated', onUpdated);
            window.removeEventListener('cart-updated', onCartUpdated);
        };
    }, [isAuthenticated]);

    const sortNotifications = (list: NotificationItem[]) => {
        // Chưa đọc trước, sau đó theo thời gian mới → cũ
        return [...list].sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            return a.createdAt < b.createdAt ? 1 : -1;
        });
    };

    const fetchNotifications = async (page: number = 0) => {
        if (!isAuthenticated) {
            setNotifications([]);
            return;
        }
        try {
            const res = await notificationApi.getMyNotifications(page, 10);
            const list = res.content ?? [];
            setNotifications(sortNotifications(list));
            setNotificationPage(res.number ?? page);
            setNotificationTotalPages(res.totalPages ?? 0);
        } catch {
            setNotifications([]);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setNotificationPage(0);
            setNotificationTotalPages(0);
            return;
        }
        fetchNotifications(0);
        const onWishlistUpdated = () => fetchNotifications(notificationPage);
        const onWalletUpdated = () => fetchNotifications(notificationPage);
        window.addEventListener('wishlist-api-updated', onWishlistUpdated);
        window.addEventListener('wallet-updated', onWalletUpdated);
        return () => {
            window.removeEventListener('wishlist-api-updated', onWishlistUpdated);
            window.removeEventListener('wallet-updated', onWalletUpdated);
        };
    }, [isAuthenticated]);

    // Fetch wallet balance for authenticated users + listen for realtime updates
    useEffect(() => {
        const fetchWalletBalance = async () => {
            if (!isAuthenticated) {
                setWalletBalance(0);
                return;
            }
            try {
                const profile = await userApi.getMyProfile();
                setWalletBalance(profile.walletResponse?.balance || 0);
            } catch (err) {
                console.error('Failed to fetch wallet balance:', err);
            }
        };

        fetchWalletBalance();

        const handleWalletUpdated = (event: Event) => {
            const custom = event as CustomEvent<{ balance?: number }>;
            if (custom.detail && typeof custom.detail.balance === 'number') {
                setWalletBalance(custom.detail.balance);
            } else {
                // Fallback: refetch from API
                fetchWalletBalance();
            }
        };

        window.addEventListener('wallet-balance-updated', handleWalletUpdated);
        // Đồng bộ với các màn khác đang dispatch sự kiện 'wallet-updated'
        window.addEventListener('wallet-updated', () => {
            fetchWalletBalance();
        });
        return () => {
            window.removeEventListener('wallet-balance-updated', handleWalletUpdated);
            window.removeEventListener('wallet-updated', fetchWalletBalance);
        };
    }, [isAuthenticated]);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        console.log("Logout clicked");
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            navigate('/login');
        }
    };

    return (
        <header className="pokemon-header glass-card-strong sticky top-0 z-50 w-full border-b border-white/10 ">
            <div className="flex h-16 items-center justify-between gap-4">
                <div className="flex h-16 items-center justify-between gap-6 lg:gap-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <Link to="/" className="flex items-center gap-2">
                            <img
                                src="/logo/logo.png"
                                alt="MysticCard Logo"
                                className="h-20 w-20 object-contain"
                            />
                            <div className="text-2xl font-bold gradient-text font-serif">
                                MysticCard
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-5 lg:gap-6">
                        <Link to="/" className={navLinkClass('/', true)}>
                            Trang chủ
                        </Link>

                        <Link to="/about" className={navLinkClass('/about')}>
                            Giới thiệu
                        </Link>

                        <Link to="/mystery-box" className={navLinkClass('/mystery-box')}>
                            Hộp bí ẩn
                        </Link>

                        {/* Marketplace Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsMarketplaceOpen(true)}
                            onMouseLeave={() => setIsMarketplaceOpen(false)}
                        >
                            <button
                                className={`flex items-center gap-1 text-sm font-medium hover:text-primary-400 transition-colors ${['/marketplace', '/post-listing'].some((p) => pathname === p || pathname.startsWith(p + '/'))
                                        ? 'text-primary-400'
                                        : ''
                                    }`}
                            >
                                <span>Sàn giao dịch</span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {isMarketplaceOpen && (
                                <div className="absolute top-full left-0 pt-2 w-52">
                                    <div className="p-2 space-y-1 glass-card-strong rounded-lg shadow-xl">
                                        <Link
                                            to="/marketplace"
                                            className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md"
                                        >
                                            Sàn giao dịch
                                        </Link>
                                        <Link
                                            to="/my-listings"
                                            className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md"
                                        >
                                            Bài đăng của tôi
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Portfolio Dropdown */}
                        <div
                            className="relative"

                        >
                            <button
                                className={`flex items-center gap-1 text-sm font-medium hover:text-primary-400 transition-colors ${['/portfolio', '/trends'].some((p) => pathname === p || pathname.startsWith(p + '/'))
                                        ? 'text-primary-400'
                                        : ''
                                    }`}
                            >
                                <Link to="/trends" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md">
                                    Xu hướng thị trường
                                </Link>

                            </button>
                        </div>
                    </nav>

                    {/* Search Bar */}
                    <div className="hidden lg:flex items-center flex-1 min-w-0 max-w-md justify-center px-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Tìm thẻ..."
                                className="glass-card w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 lg:gap-4 shrink-0">
                        {/* Wallet Balance - Show for authenticated users */}
                        {isAuthenticated && (
                            <Link to="/wallet">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hidden md:flex items-center gap-2 hover:bg-white/10"
                                >
                                    <Wallet className="h-4 w-4 text-green-400" />
                                    <span className="text-sm font-medium text-green-400">
                                        {walletBalance.toLocaleString('vi-VN')}đ
                                    </span>
                                </Button>
                            </Link>
                        )}
                        <Link to="/wishlist">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative"
                            >
                                <Heart className="h-5 w-5" />
                                {apiWishlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                                        {apiWishlistCount}
                                    </span>
                                )}
                            </Button>
                        </Link>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative"
                            onClick={() => navigate('/cart')}
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {carts.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-xs font-bold flex items-center justify-center text-black">
                                    {carts.length}
                                </span>
                            )}

                            {/* </Link> */}
                        </Button>
                        <div
                            className="relative"
                            onMouseEnter={() => isAuthenticated && setIsAlertsOpen(true)}
                            onMouseLeave={() => setIsAlertsOpen(false)}
                        >
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                {isAuthenticated && notifications.some((n) => !n.isRead) && (
                                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-amber-500 rounded-full text-[10px] font-bold flex items-center justify-center text-black">
                                        {notifications.filter((n) => !n.isRead).length}
                                    </span>
                                )}
                            </Button>
                            {isAuthenticated && isAlertsOpen && (
                                <div className="absolute top-full right-0 pt-2 w-80 max-h-96 overflow-auto z-50">
                                    <div className="p-2 space-y-1 rounded-lg shadow-xl border border-white/15 bg-[#050015]/95 backdrop-blur-md">
                                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Thông báo
                                        </div>
                                        {selectedNotification && (
                                            <div className="mx-2 mb-2 rounded-md border border-amber-500/40 bg-black/40 p-2 text-xs text-white space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-amber-300 font-semibold">
                                                        {selectedNotification.notiType === 'wishList'
                                                            ? 'Wishlist'
                                                            : selectedNotification.notiType === 'shipment'
                                                                ? 'Giao hàng'
                                                                : 'Ví tiền'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(selectedNotification.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <p className="whitespace-pre-line">
                                                    {selectedNotification.message}
                                                </p>
                                            </div>
                                        )}
                                        {notifications.length === 0 ? (
                                            <p className="px-3 py-4 text-sm text-muted-foreground">
                                                Chưa có thông báo nào.
                                            </p>
                                        ) : (
                                            <>
                                                {notifications.map((n) => {
                                                    const typeLabel =
                                                        n.notiType === 'wishList'
                                                            ? 'Wishlist'
                                                            : n.notiType === 'shipment'
                                                                ? 'Giao hàng'
                                                                : 'Ví tiền';

                                                    const handleClick = async () => {
                                                        setSelectedNotification(n);
                                                        if (!n.isRead) {
                                                            try {
                                                                await notificationApi.markAsRead(n.notificationId);
                                                                setNotifications((prev) =>
                                                                    sortNotifications(
                                                                        prev.map((item) =>
                                                                            item.notificationId === n.notificationId
                                                                                ? { ...item, isRead: true }
                                                                                : item
                                                                        )
                                                                    )
                                                                );
                                                            } catch {
                                                                // ignore error, giữ nguyên UI
                                                            }
                                                        }
                                                    };

                                                    return (
                                                        <button
                                                            key={n.notificationId}
                                                            type="button"
                                                            onClick={handleClick}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 rounded-md border-l-2 ${n.isRead
                                                                    ? 'border-transparent opacity-50'
                                                                    : 'border-amber-500/60 bg-amber-500/10'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    {!n.isRead && (
                                                                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                                                                    )}
                                                                    <span className="text-xs text-amber-300 font-semibold">
                                                                        {typeLabel}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                                                                </span>
                                                            </div>
                                                            <p className={`text-xs mt-1 whitespace-pre-line ${n.isRead ? 'text-muted-foreground' : 'text-white'}`}>
                                                                {n.message}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                                {notificationTotalPages > 1 && (
                                                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10 mt-2 px-2 pb-1">
                                                        <button
                                                            type="button"
                                                            disabled={notificationPage <= 0}
                                                            onClick={() => fetchNotifications(Math.max(0, notificationPage - 1))}
                                                            className="px-2 h-7 rounded-full text-[10px] border border-white/30 text-white/80 disabled:opacity-40 hover:bg-white/10"
                                                        >
                                                            ‹
                                                        </button>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Trang {notificationPage + 1}/{notificationTotalPages}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={notificationPage >= notificationTotalPages - 1}
                                                            onClick={() => fetchNotifications(Math.min(notificationTotalPages - 1, notificationPage + 1))}
                                                            className="px-2 h-7 rounded-full text-[10px] border border-white/30 text-white/80 disabled:opacity-40 hover:bg-white/10"
                                                        >
                                                            ›
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        {isAuthenticated && user ? (
                            <div
                                className="relative"
                                onMouseEnter={() => setIsUserMenuOpen(true)}
                                onMouseLeave={() => setIsUserMenuOpen(false)}
                            >
                                <button className="flex items-center gap-2">
                                    {myuser.avatarUrl ? (
                                        <img
                                            src={myuser.avatarUrl}
                                            alt={myuser.name || 'User'}
                                            className="h-8 w-8 rounded-full object-cover border-2 border-primary-500"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                            {(myuser.name || myuser.email || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="hidden md:block text-sm font-medium">
                                        {myuser.name || myuser.email?.split('@')[0]}
                                    </span>
                                    <ChevronDown className="h-4 w-4 hidden md:block" />
                                </button>

                                {isUserMenuOpen && (
                                    <div className="absolute top-full right-0 pt-2 w-48">
                                        <div className="p-2 space-y-1 glass-card-strong rounded-lg shadow-xl">
                                            <Link
                                                to="/profile"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md flex items-center gap-2"
                                            >
                                                <User className="h-4 w-4" />
                                                <span>Hồ sơ</span>
                                            </Link>
                                            <Link
                                                to="/wallet"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md flex items-center gap-2"
                                            >
                                                <Wallet className="h-4 w-4 text-green-400" />
                                                <span>Ví tiền</span>
                                            </Link>
                                            <Link
                                                to="/orders"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md flex items-center gap-2"
                                            >
                                                <Package className="h-4 w-4" />
                                                <span>Đơn hàng</span>
                                            </Link>
                                            <Link
                                                to="/portfolio"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md flex items-center gap-2"
                                            >
                                                <Layers className="h-4 w-4" />
                                                <span>Bộ sưu tập</span>
                                            </Link>
                                            <hr className="my-2 border-white/10" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-md text-red-400 flex items-center gap-2"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Đăng xuất</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login">
                                <Button variant="premium" className="gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Đăng nhập</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </header>
    );
};
