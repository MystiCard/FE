import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Home, ShoppingBag, TrendingUp, User, Info, Settings } from 'lucide-react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
    const location = useLocation();
    const pathname = location.pathname;

    if (!isOpen) return null;

    const menuItems = [
        { icon: Home, label: 'Trang chủ', path: '/', exact: true },
        { icon: Info, label: 'Giới thiệu', path: '/about', exact: true },
        { icon: ShoppingBag, label: 'Hộp bí ẩn', path: '/mystery-box', exact: true },
        { icon: TrendingUp, label: 'Sàn giao dịch', path: '/marketplace', exact: true },
        { icon: User, label: 'Hồ sơ', path: '/profile', exact: false },
        { icon: Settings, label: 'Quản trị', path: '/admin', exact: false },
    ];

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden "
                onClick={onClose}
            />

            {/* Menu */}
            <div className="fixed left-0 top-0 h-full w-64 glass-card-strong border-r border-white/20 z-50 md:hidden shadow-2xl">
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
                            className="p-2 hover:bg-white/10 rounded-lg "
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/');
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 ${isActive ? 'text-primary-400 bg-white/5' : ''}`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Portfolio Submenu */}
                <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-4">BỘ SƯU TẬP</div>
                    <div className="space-y-1">
                        <Link
                            to="/portfolio"
                            onClick={onClose}
                            className={`block px-4 py-2 rounded-lg hover:bg-white/10 text-sm ${pathname === '/portfolio' || pathname.startsWith('/portfolio/') ? 'text-primary-400 bg-white/5' : ''}`}
                        >
                            Bộ sưu tập của tôi
                        </Link>
                        <Link
                            to="/trends"
                            onClick={onClose}
                            className={`block px-4 py-2 rounded-lg hover:bg-white/10 text-sm ${pathname === '/trends' || pathname.startsWith('/trends/') ? 'text-primary-400 bg-white/5' : ''}`}
                        >
                            Xu hướng thị trường
                        </Link>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <Link to="/login" onClick={onClose}>
                        <button className="w-full glass-card px-4 py-3 rounded-lg hover:bg-white/10 font-medium">
                            Đăng nhập
                        </button>
                    </Link>
                </div>
            </div>
        </>
    );
};
