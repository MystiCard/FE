import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShoppingBag, TrendingUp, User, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
    return (
        <aside className="glass-card-strong fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 border-r border-white/10 animate-slide-down hidden lg:block">
            <div className="flex flex-col items-center py-8 space-y-6">
                {/* Logo */}
                <Link to="/" className="hover-lift">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">M</span>
                    </div>
                </Link>

                <div className="w-8 h-px bg-white/10" />

                {/* Menu Items */}
                <nav className="flex flex-col items-center space-y-4">
                    <Link
                        to="/"
                        className="hover-lift p-3 rounded-lg hover:bg-white/10 transition-all group"
                        title="Home"
                    >
                        <Home className="h-6 w-6 group-hover:text-primary-400 transition-colors" />
                    </Link>

                    <Link
                        to="/shop"
                        className="hover-lift p-3 rounded-lg hover:bg-white/10 transition-all group"
                        title="Shop"
                    >
                        <ShoppingBag className="h-6 w-6 group-hover:text-primary-400 transition-colors" />
                    </Link>

                    <Link
                        to="/trends"
                        className="hover-lift p-3 rounded-lg hover:bg-white/10 transition-all group"
                        title="Trends"
                    >
                        <TrendingUp className="h-6 w-6 group-hover:text-primary-400 transition-colors" />
                    </Link>

                    <Link
                        to="/profile"
                        className="hover-lift p-3 rounded-lg hover:bg-white/10 transition-all group"
                        title="Profile"
                    >
                        <User className="h-6 w-6 group-hover:text-primary-400 transition-colors" />
                    </Link>
                </nav>

                {/* Settings at bottom */}
                <div className="flex-1" />
                <Link
                    to="/settings"
                    className="hover-lift p-3 rounded-lg hover:bg-white/10 transition-all group"
                    title="Settings"
                >
                    <Settings className="h-6 w-6 group-hover:text-primary-400 transition-colors" />
                </Link>
            </div>
        </aside>
    );
};
