import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Bell, User, ChevronDown, Menu, Heart, LogOut, Wallet, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { WishlistDrawer } from '@/components/shared/WishlistDrawer';
import { MobileMenu } from '@/components/shared/MobileMenu';
import { userApi, cardApi } from '@/utils/api';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [isPortfolioOpen, setIsPortfolioOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { itemCount } = useCart();
    const { itemCount: wishlistLocalCount } = useWishlist();
    const { user, isAuthenticated, logout } = useAuth();
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [apiWishlistCount, setApiWishlistCount] = useState<number>(0);

    // Khi đã đăng nhập: số wishlist lấy từ API (DB)
    const wishlistCount = isAuthenticated ? apiWishlistCount : wishlistLocalCount;

    const fetchWishlistCount = async () => {
        try {
            const res = await cardApi.getUserWishlist(0, 1);
            setApiWishlistCount(res.totalElements ?? 0);
        } catch {
            setApiWishlistCount(0);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchWishlistCount();
        const onUpdated = () => fetchWishlistCount();
        window.addEventListener('wishlist-api-updated', onUpdated);
        return () => window.removeEventListener('wishlist-api-updated', onUpdated);
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
        return () => window.removeEventListener('wallet-balance-updated', handleWalletUpdated);
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
            <div className="container mx-auto px-4">
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
                        <Link to="/" className="text-sm font-medium hover:text-primary-400">
                            Trang chủ
                        </Link>

                        <Link to="/about" className="text-sm font-medium hover:text-primary-400">
                            Giới thiệu
                        </Link>

                        <Link to="/mystery-box" className="text-sm font-medium hover:text-primary-400">
                            Hộp bí ẩn
                        </Link>

                        <Link to="/marketplace" className="text-sm font-medium hover:text-primary-400">
                            Sàn giao dịch
                        </Link>

                        {/* Portfolio Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsPortfolioOpen(true)}
                            onMouseLeave={() => setIsPortfolioOpen(false)}
                        >
                            <button className="flex items-center gap-1 text-sm font-medium hover:text-primary-400">
                                <span>Bộ sưu tập</span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {isPortfolioOpen && (
                                <div className="absolute top-full left-0 pt-2 w-48">
                                    <div className="p-2 space-y-1 glass-card-strong rounded-lg shadow-xl">
                                        <Link to="/portfolio" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md">
                                            Bộ sưu tập của tôi
                                        </Link>
                                        <Link to="/trends" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md">
                                            Xu hướng thị trường
                                        </Link>
                                        <Link to="/post-listing" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md">
                                            Đăng bán
                                        </Link>
                                    </div>
                                </div>
                            )}
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative"
                            onClick={() => setIsWishlistOpen(true)}
                        >
                            <Heart className="h-5 w-5" />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                                    {wishlistCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative"
                            onClick={() => navigate('/cart')}
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-xs font-bold flex items-center justify-center text-black">
                                    {itemCount}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="">
                            <Bell className="h-5 w-5" />
                        </Button>

                        {/* User Menu */}
                        {isAuthenticated && user ? (
                            <div
                                className="relative"
                                onMouseEnter={() => setIsUserMenuOpen(true)}
                                onMouseLeave={() => setIsUserMenuOpen(false)}
                            >
                                <button className="flex items-center gap-2">
                                    {user.picture || user.avatarUrl ? (
                                        <img
                                            src={user.picture || user.avatarUrl}
                                            alt={user.name || user.email || 'User'}
                                            className="h-8 w-8 rounded-full object-cover border-2 border-primary-500"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                            {(user.name || user.email || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <span className="hidden md:block text-sm font-medium">
                                        {user.name || user.email?.split('@')[0]}
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

            <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </header>
    );
};
