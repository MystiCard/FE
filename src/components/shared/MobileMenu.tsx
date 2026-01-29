import React from 'react';
import { Link } from 'react-router-dom';
import { X, Home, ShoppingBag, TrendingUp, User, Package, Info, Settings } from 'lucide-react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const menuItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Info, label: 'About', path: '/about' },
        { icon: ShoppingBag, label: 'Shop', path: '/shop' },
        { icon: Package, label: 'Products', path: '/products' },
        { icon: TrendingUp, label: 'Marketplace', path: '/marketplace' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Admin', path: '/admin' },
    ];

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                onClick={onClose}
            />

            {/* Menu */}
            <div className="fixed left-0 top-0 h-full w-64 glass-card-strong border-r border-white/20 z-50 md:hidden animate-slide-down shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <img
                                src="/logo/logo.png"
                                alt="MysticCard Logo"
                                className="h-9 w-9 object-contain"
                            />
                            <div className="text-2xl font-bold gradient-text font-serif">
                                MysticCard
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Shop Submenu */}
                <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-4">SHOP</div>
                    <div className="space-y-1">
                        <Link to="/products" onClick={onClose} className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                            All Products
                        </Link>
                        <Link to="/booster-boxes" onClick={onClose} className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                            Booster Boxes
                        </Link>
                        <Link to="/mystery-box" onClick={onClose} className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                            Mystery Box
                        </Link>
                    </div>
                </div>

                {/* Portfolio Submenu */}
                <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-4">PORTFOLIO</div>
                    <div className="space-y-1">
                        <Link to="/portfolio" onClick={onClose} className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                            My Collection
                        </Link>
                        <Link to="/trends" onClick={onClose} className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm">
                            Market Trends
                        </Link>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <Link to="/login" onClick={onClose}>
                        <button className="w-full glass-card px-4 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium">
                            Sign In
                        </button>
                    </Link>
                </div>
            </div>
        </>
    );
};
