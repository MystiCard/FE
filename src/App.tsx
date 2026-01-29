import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/HomePage';
import { ProductsPage } from '@/pages/ProductsPage';
import { BoosterBoxesPage } from '@/pages/BoosterBoxesPage';
import { MysteryBoxPage } from '@/pages/MysteryBoxPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage';
import { AdminPage } from '@/pages/AdminPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { AboutPage } from '@/pages/AboutPage';
import { AdminProductsPage } from '@/pages/AdminProductsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { CreateListing } from '@/components/shop/CreateListing';

// Placeholder pages
const ShopPage = () => {
    const categories = [
        {
            title: "All Products",
            description: "Browse our complete collection of cards and sets",
            href: "/products",
            icon: "🛍️",
            color: "from-blue-500 to-cyan-500"
        },
        {
            title: "Booster Boxes",
            description: "Sealed boxes for the ultimate unboxing experience",
            href: "/booster-boxes",
            icon: "📦",
            color: "from-purple-500 to-pink-500"
        },
        {
            title: "Mystery Box",
            description: "Test your luck with our exclusive mystery packs",
            href: "/mystery-box",
            icon: "✨",
            color: "from-amber-400 to-orange-500"
        }
    ];

    return (
        <div className="py-12 animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-serif mb-4 gradient-text">Shop Categories</h1>
                <p className="text-muted-foreground text-lg">Choose a category to start browsing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                {categories.map((cat, idx) => (
                    <a
                        key={idx}
                        href={cat.href}
                        className="group relative overflow-hidden rounded-2xl glass-card border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                        <div className="p-8 flex flex-col items-center text-center h-full">
                            <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                                {cat.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-2 group-hover:text-primary-400 transition-colors">
                                {cat.title}
                            </h3>
                            <p className="text-muted-foreground group-hover:text-gray-300 transition-colors">
                                {cat.description}
                            </p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const TrendsPage = () => (
    <div className="text-center py-20">
        <h1 className="text-4xl font-bold mb-4 font-serif">Market Trends</h1>
        <p className="text-muted-foreground">Track card values and market analytics</p>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Customer Routes */}
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="shop" element={<ShopPage />} />
                        <Route path="products" element={<ProductsPage />} />
                        <Route path="booster-boxes" element={<BoosterBoxesPage />} />
                        <Route path="special-items" element={<ProductsPage />} />
                        <Route path="mystery-box" element={<MysteryBoxPage />} />
                        <Route path="marketplace" element={<MarketplacePage />} />
                        <Route path="portfolio" element={<PortfolioPage />} />
                        <Route path="trends" element={<TrendsPage />} />
                        <Route path="post-listing" element={<CreateListing />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="settings" element={<ProfilePage />} />
                        <Route path="compare" element={<ComparisonPage />} />
                        <Route path="about" element={<AboutPage />} />
                    </Route>

                    {/* Auth Routes (No Layout) */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="auth/google/callback" element={<GoogleCallbackPage />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminPage />} />
                        <Route path="products" element={<AdminProductsPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
