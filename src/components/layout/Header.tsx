import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Bell, User, ChevronDown, Menu, Heart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { WishlistDrawer } from '@/components/shared/WishlistDrawer';
import { MobileMenu } from '@/components/shared/MobileMenu';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [isShopOpen, setIsShopOpen] = React.useState(false);
    const [isPortfolioOpen, setIsPortfolioOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isCartOpen, setIsCartOpen] = React.useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { itemCount } = useCart();
    const { itemCount: wishlistCount } = useWishlist();
    const { user, isAuthenticated, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="pokemon-header glass-card-strong sticky top-0 z-50 w-full border-b border-white/10 animate-slide-down">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <Link to="/" className="flex items-center space-x-2 hover-lift">
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
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link to="/" className="text-sm font-medium hover-lift hover:text-primary-400 transition-colors">
                            Home
                        </Link>

                        <Link to="/about" className="text-sm font-medium hover-lift hover:text-primary-400 transition-colors">
                            About
                        </Link>

                        {/* Shop Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsShopOpen(true)}
                            onMouseLeave={() => setIsShopOpen(false)}
                        >
                            <button className="flex items-center space-x-1 text-sm font-medium hover-lift hover:text-primary-400 transition-colors">
                                <span>Shop</span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {isShopOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 glass-card-strong rounded-lg shadow-xl animate-slide-down">
                                    <div className="p-2 space-y-1">
                                        <Link to="/products" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            All Products
                                        </Link>
                                        <Link to="/booster-boxes" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            Booster Boxes
                                        </Link>
                                        <Link to="/special-items" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            Special Items
                                        </Link>
                                        <Link to="/mystery-box" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            Mystery Box
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link to="/marketplace" className="text-sm font-medium hover-lift hover:text-primary-400 transition-colors">
                            Marketplace
                        </Link>

                        {/* Portfolio Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setIsPortfolioOpen(true)}
                            onMouseLeave={() => setIsPortfolioOpen(false)}
                        >
                            <button className="flex items-center space-x-1 text-sm font-medium hover-lift hover:text-primary-400 transition-colors">
                                <span>Portfolio</span>
                                <ChevronDown className="h-4 w-4" />
                            </button>

                            {isPortfolioOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 glass-card-strong rounded-lg shadow-xl animate-slide-down">
                                    <div className="p-2 space-y-1">
                                        <Link to="/portfolio" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            My Collection
                                        </Link>
                                        <Link to="/trends" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            Market Trends
                                        </Link>
                                        <Link to="/post-listing" className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors">
                                            Post Listing
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Search Bar */}
                    <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Search cards..."
                                className="glass-card w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover-lift relative"
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
                            className="hover-lift relative"
                            onClick={() => setIsCartOpen(true)}
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full text-xs font-bold flex items-center justify-center text-black">
                                    {itemCount}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="hover-lift">
                            <Bell className="h-5 w-5" />
                        </Button>
                        
                        {/* User Menu */}
                        {isAuthenticated && user ? (
                            <div
                                className="relative"
                                onMouseEnter={() => setIsUserMenuOpen(true)}
                                onMouseLeave={() => setIsUserMenuOpen(false)}
                            >
                                <button className="flex items-center space-x-2 hover-lift">
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
                                    <div className="absolute top-full right-0 mt-2 w-48 glass-card-strong rounded-lg shadow-xl animate-slide-down">
                                        <div className="p-2 space-y-1">
                                            <Link
                                                to="/profile"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                Profile
                                            </Link>
                                            <Link
                                                to="/portfolio"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                My Collection
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                Settings
                                            </Link>
                                            <Link
                                                to="/admin"
                                                className="block px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                Admin Panel
                                            </Link>
                                            <hr className="my-2 border-white/10" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-red-400 flex items-center space-x-2"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login">
                                <Button variant="premium" className="hover-lift">
                                    <User className="h-4 w-4 mr-2" />
                                    <span>Đăng nhập</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        </header>
    );
};
