import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Folder, CreditCard, Gift, Percent, LogOut, Menu, X, ShoppingBag, Wallet, Banknote, BarChart3, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            navigate('/login');
        }
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/admin' },
        { icon: BarChart3, label: 'Report doanh thu', path: '/admin/report' },
        { icon: Folder, label: 'Danh mục', path: '/admin/categories' },
        { icon: CreditCard, label: 'Thẻ', path: '/admin/cards' },
        { icon: Gift, label: 'Hộp bí ẩn', path: '/admin/blind-boxes' },
        { icon: Percent, label: 'Tỷ lệ thẻ', path: '/admin/rate-configs' },
        { icon: Users, label: 'Người dùng', path: '/admin/users' },
        { icon: ShieldCheck, label: 'Vai trò & quyền', path: '/admin/roles' },
        { icon: Wallet, label: 'Ví', path: '/admin/wallet' },
        { icon: Banknote, label: 'Duyệt rút tiền', path: '/admin/withdraws' },
        { icon: ShoppingBag, label: 'Đơn hàng', path: '/admin/orders' },
        { icon: CreditCard, label: 'Giao dịch', path: '/admin/transactions' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-background to-secondary-900">
            {/* Admin Header */}
            <header className="glass-card-strong sticky top-0 z-50 border-b border-white/10">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo & Title */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="lg:hidden p-2 hover:bg-white/10 rounded-lg "
                            >
                                {isSidebarOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                            <img
                                src="/logo/logo.png"
                                alt="MysticCard Logo"
                                className="h-10 w-10 object-contain"
                            />
                            <div>
                                <h1 className="text-xl font-bold gradient-text font-serif">MysticCard Quản trị</h1>
                                <p className="text-xs text-muted-foreground">Bảng điều khiển</p>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex items-center gap-3">
                            <Link
                                to="/"
                                className="hidden sm:flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-white/10 text-sm"
                            >
                                Xem trang chủ
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-64 
                    glass-card-strong border-r border-white/10 z-40 overflow-y-auto
                    lg:translate-x-0
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <nav className="p-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 group"
                                >
                                    <Icon className="h-5 w-5 text-primary-400 group-hover:text-accent-400 " />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8 ">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
