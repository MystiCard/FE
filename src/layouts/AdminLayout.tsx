import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Settings, LogOut, Menu, X } from 'lucide-react';

export const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
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
                                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
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
                                <h1 className="text-xl font-bold gradient-text font-serif">MysticCard Admin</h1>
                                <p className="text-xs text-muted-foreground">Management Dashboard</p>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="flex items-center gap-3">
                            <Link
                                to="/"
                                className="hidden sm:flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                            >
                                View Site
                            </Link>
                            <button className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400 text-sm">
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className={`
                    fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-64 
                    glass-card-strong border-r border-white/10 z-40
                    transition-transform duration-300 lg:translate-x-0
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
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
                                >
                                    <Icon className="h-5 w-5 text-primary-400 group-hover:text-accent-400 transition-colors" />
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
                <main className="flex-1 p-6 lg:p-8 animate-fade-in">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
