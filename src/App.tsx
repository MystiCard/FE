import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ShipmentLayout } from '@/layouts/ShipmentLayout';
import { HomePage } from '@/pages/HomePage';
import { MysteryBoxPage } from '@/pages/MysteryBoxPage';
import { MysteryBoxHistoryPage } from '@/pages/MysteryBoxHistoryPage';
import { MysteryBoxCheckoutPage } from '@/pages/MysteryBoxCheckoutPage';
import { WalletWithdrawPage } from '@/pages/WalletWithdrawPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { MarketplaceCheckoutPage } from '@/pages/MarketplaceCheckoutPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage';
import { AdminPage } from '@/pages/AdminPage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { AboutPage } from '@/pages/AboutPage';
import { AdminCardsPage } from '@/pages/AdminCardsPage';
import { AdminCategoriesPage } from '@/pages/AdminCategoriesPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminTransactionsPage } from '@/pages/AdminTransactionsPage';
import { AdminOrdersPage } from '@/pages/AdminOrdersPage';
import { AdminBlindBoxesPage } from '@/pages/AdminBlindBoxesPage';
import { AdminBlindBoxDetailPage } from '@/pages/AdminBlindBoxDetailPage';
import { AdminRateConfigPage } from '@/pages/AdminRateConfigPage';
import { AdminWithdrawPage } from '@/pages/AdminWithdrawPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { PostListingPage } from '@/pages/PostListingPage';
import { MyListingsPage } from '@/pages/MyListingsPage';
import { TrendsPage } from '@/pages/TrendsPage';
import { WalletPage } from '@/pages/WalletPage';
import { PaymentCallbackPage } from '@/pages/PaymentCallbackPage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ShipmentPage } from '@/pages/ShipmentPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { WishlistDetailPage } from '@/pages/WishlistDetailPage';
import { SellerCardRequestPage } from '@/pages/SellerCardRequestPage';
import { MyCardRequestsPage } from '@/pages/MyCardRequestsPage';

// Placeholder pages
const ShopPage = () => {
    const categories = [
        {
            title: "Hộp bí ẩn",
            description: "Thử vận may với các gói bí ẩn độc quyền",
            href: "/mystery-box",
            icon: "✨",
            color: "from-amber-400 to-orange-500"
        }
    ];

    return (
        <div className="py-12 ">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-serif mb-4 gradient-text">Danh mục Hộp bí ẩn</h1>
                <p className="text-muted-foreground text-lg">Khám phá Hộp bí ẩn và nhận thẻ ngẫu nhiên</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                {categories.map((cat, idx) => (
                    <a
                        key={idx}
                        href={cat.href}
                        className="group relative overflow-hidden rounded-2xl glass-card border border-white/10 hover:border-white/20 hover:scale-105 hover:shadow-2xl"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 `} />
                        <div className="p-8 flex flex-col items-center text-center h-full">
                            <div className="text-6xl mb-6 transform group-hover:scale-110 ">
                                {cat.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-2 group-hover:text-primary-400 ">
                                {cat.title}
                            </h3>
                            <p className="text-muted-foreground group-hover:text-gray-300 ">
                                {cat.description}
                            </p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};



function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Customer Routes */}
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="shop" element={<ShopPage />} />
                        <Route path="cart" element={<CartPage />} />
                        <Route path="checkout" element={<CheckoutPage />} />
                        {/* === Hộp bí ẩn (Blind Box) — API: blindBoxApi (GET/POST /api/blind-boxes/*) === */}
                        <Route path="mystery-box" element={<MysteryBoxPage />} />
                        <Route path="mystery-box/history" element={<MysteryBoxHistoryPage />} />
                        <Route path="mystery-box/checkout" element={<MysteryBoxCheckoutPage />} />
                        {/* === Sàn giao dịch (Marketplace) — API: listSellerApi, orderApi, cardApi, categoryApi, shipmentApi, transactionApi === */}
                        <Route path="marketplace" element={<MarketplacePage />} />
                        <Route path="marketplace/checkout" element={<MarketplaceCheckoutPage />} />
                        <Route path="portfolio" element={<PortfolioPage />} />
                        <Route path="trends" element={<TrendsPage />} />
                        <Route path="post-listing" element={<PostListingPage />} />
                        <Route path="post-listing/:page" element={<PostListingPage />} />
                        <Route path="my-listings" element={<MyListingsPage />} />
                        <Route path="sell/request-card" element={<SellerCardRequestPage />} />
                        <Route path="my-card-requests" element={<MyCardRequestsPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="orders" element={<OrdersPage />} />
                        <Route path="wishlist" element={<WishlistPage />} />
                        <Route path="wishlist/:cardId" element={<WishlistDetailPage />} />
                        <Route path="wallet" element={<WalletPage />} />
                        <Route path="wallet/withdraw" element={<WalletWithdrawPage />} />
                        <Route path="payment/callback" element={<PaymentCallbackPage />} />
                        <Route path="settings" element={<ProfilePage />} />
                        <Route path="compare" element={<ComparisonPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="terms" element={<TermsPage />} />
                        <Route path="privacy" element={<PrivacyPage />} />
                    </Route>

                    {/* Auth Routes (No Layout) */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="auth/google/callback" element={<GoogleCallbackPage />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminPage />} />
                        <Route path="categories" element={<AdminCategoriesPage />} />
                        <Route path="cards" element={<AdminCardsPage />} />
                        <Route path="blind-boxes" element={<AdminBlindBoxesPage />} />
                        <Route path="blind-boxes/:id" element={<AdminBlindBoxDetailPage />} />
                        <Route path="rate-configs" element={<AdminRateConfigPage />} />
                        <Route path="users" element={<AdminUsersPage />} />
                        <Route path="wallet" element={<WalletPage />} />
                        <Route path="transactions" element={<AdminTransactionsPage />} />
                        <Route path="withdraws" element={<AdminWithdrawPage />} />
                        <Route path="orders" element={<AdminOrdersPage />} />
                    </Route>

                    {/* Shipment Routes (standalone like Admin) */}
                    <Route path="/shipments" element={<ShipmentLayout />}>
                        <Route index element={<ShipmentPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster />
        </AuthProvider>
    );
}


export default App;
