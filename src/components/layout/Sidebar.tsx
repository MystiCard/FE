import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingBag, TrendingUp, User, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
    return (
        <aside className="glass-card-strong fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 border-r border-white/10 hidden lg:block">
            <div className="flex flex-col items-center py-8 space-y-6">
                {/* Menu Items */}
                <nav className="flex flex-col items-center space-y-4">
                    <Link
                        to="/"
                        className="p-3 rounded-lg hover:bg-white/10 group"
                        title="Trang chủ"
                    >
                        <Home className="h-6 w-6 group-hover:text-primary-400 " />
                    </Link>

                    <Link
                        to="/shop"
                        className="p-3 rounded-lg hover:bg-white/10 group"
                        title="Cửa hàng"
                    >
                        <ShoppingBag className="h-6 w-6 group-hover:text-primary-400 " />
                    </Link>

                    <Link
                        to="/trends"
                        className="p-3 rounded-lg hover:bg-white/10 group"
                        title="Xu hướng"
                    >
                        <TrendingUp className="h-6 w-6 group-hover:text-primary-400 " />
                    </Link>

                    <Link
                        to="/profile"
                        className="p-3 rounded-lg hover:bg-white/10 group"
                        title="Hồ sơ"
                    >
                        <User className="h-6 w-6 group-hover:text-primary-400 " />
                    </Link>
                </nav>

                {/* Settings at bottom */}
                <div className="flex-1" />
                <Link
                    to="/settings"
                    className="p-3 rounded-lg hover:bg-white/10 group"
                    title="Cài đặt"
                >
                    <Settings className="h-6 w-6 group-hover:text-primary-400 " />
                </Link>
            </div>
        </aside>
    );
};
