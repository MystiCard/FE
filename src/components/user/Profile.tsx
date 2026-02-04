import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    User, Mail, Edit, Share2, Layers, Award, TrendingUp,
    Settings, Image as ImageIcon, LifeBuoy, CreditCard,
    Briefcase, Activity
} from 'lucide-react';
import { userApi, UserProfile, transactionApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<'MOMO' | 'VNPAY'>('MOMO');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isAuthenticated) {
                setIsLoading(false);
                return;
            }

            try {
                const data = await userApi.getMyProfile();
                setProfile(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [isAuthenticated]);

    const handleTopUp = () => {
        setShowDepositModal(true);
    };

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) {
            alert('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        if (!profile?.userId) {
            alert('Không tìm thấy thông tin người dùng');
            return;
        }

        setIsProcessing(true);
        try {
            const paymentUrl = await transactionApi.deposit({
                userId: profile.userId,
                amount: Number(depositAmount),
                provider: selectedProvider,
            });
            
            // Redirect to payment gateway
            window.location.href = paymentUrl;
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Nạp tiền thất bại');
            setIsProcessing(false);
        }
    };

    const handleViewTransactions = () => {
        // TODO: Navigate to transaction history page or open modal
        alert('Tính năng xem lịch sử giao dịch đang được phát triển');
    };

    const stats = {
        totalCards: 156,
        totalSets: 23,
        totalBadges: 8,
        totalValue: profile?.walletResponse?.balance || 48500000
    };

    const [activeTab, setActiveTab] = useState<'stats' | 'badges' | 'support'>('stats');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <div className="text-xl">Loading profile...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error}</div>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl">Please login to view profile</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* 1. Header Section */}
            <div className="relative mb-8">
                {/* Cover Image */}
                <div className="h-48 md:h-64 rounded-b-3xl relative group">
                    <div className="absolute inset-0 bg-transparent" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Edit Cover
                    </Button>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-4 -mt-16 relative flex flex-col md:flex-row items-end md:items-center gap-6">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-[#0B0112] bg-[#1a0a2e] flex items-center justify-center overflow-hidden">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-primary-400">
                                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-[#0B0112] flex items-center justify-center">
                            <Edit className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                            <Edit className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
                            <Award className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-primary-400 font-medium">@{profile.email?.split('@')[0]}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        {profile.phone && (
                            <p className="text-sm text-muted-foreground">📱 {profile.phone}</p>
                        )}
                        {profile.address && (
                            <p className="text-sm text-muted-foreground">📍 {profile.address}</p>
                        )}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Button variant="outline" className="glass-card">
                            <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button variant="premium">
                            <Settings className="w-4 h-4 mr-2" /> Settings
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* 2. Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#FFF9C4] uppercase tracking-wider mb-1">Total Cards</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.totalCards}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#E1F5FE] uppercase tracking-wider mb-1">Total Sets</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.totalSets}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#E8F5E9] uppercase tracking-wider mb-1">Total Badges</div>
                            <div className="text-2xl font-bold text-green-400">{stats.totalBadges}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#FFEBEE] uppercase tracking-wider mb-1">Total Value</div>
                            <div className="text-2xl font-bold text-red-400">{stats.totalValue.toLocaleString('vi-VN')} đ</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Action Bar */}
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                    <button className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
                        <User className="w-4 h-4" /> View Social Profile
                    </button>
                    <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                        <Edit className="w-4 h-4" /> Edit Background
                    </button>
                </div>

                {/* 4. Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                    {['stats', 'badges', 'support'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* 5. Wallet Section */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-green-400">
                        <CreditCard className="w-5 h-5" />
                        Ví của tôi
                    </h3>
                    <Card className="glass-card p-6 relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Số dư khả dụng</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-4xl font-bold text-green-400">
                                            {(profile?.walletResponse?.balance || 0).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-xl text-muted-foreground">đ</span>
                                    </div>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CreditCard className="w-8 h-8 text-green-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleTopUp}
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Nạp tiền
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="border-green-500/30 hover:bg-green-500/10"
                                    onClick={handleViewTransactions}
                                >
                                    <Activity className="w-4 h-4 mr-2" />
                                    Lịch sử
                                </Button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-muted-foreground text-center">
                                    Sử dụng ví để mua thẻ, mở hộp bí ẩn và giao dịch trên marketplace
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 6. Main Collection Summary */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-yellow-400">
                        <Briefcase className="w-5 h-5" />
                        Portfolio: Main Collection
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">156</div>
                                <div className="text-xs text-muted-foreground">Cards</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">23</div>
                                <div className="text-xs text-muted-foreground">Sets</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">8</div>
                                <div className="text-xs text-muted-foreground">Graded</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-red-400">48.700.000 đ</div>
                                <div className="text-xs text-muted-foreground">Value</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 7. Performance Chart Placeholder */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-blue-400">
                        <Activity className="w-5 h-5" />
                        Your Performance
                    </h3>
                    <Card className="glass-card p-6 min-h-[200px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            {/* Fake Graph SVG */}
                            <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                                <path
                                    d="M0,150 Q250,50 500,100 T1000,20"
                                    fill="none"
                                    stroke="#3D7DCA"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M0,150 Q250,50 500,100 T1000,20 V200 H0 Z"
                                    fill="url(#gradient)"
                                    opacity="0.3"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3D7DCA" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                <TrendingUp className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-muted-foreground text-sm max-w-md text-center">
                                Theo dõi hiệu suất danh mục đầu tư, biến động giá thị trường và xếp hạng bộ sưu tập của bạn theo thời gian thực.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a0a2e] rounded-lg p-6 max-w-md w-full border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white">Nạp tiền vào ví</h3>
                        
                        <div className="space-y-4">
                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Số tiền (VND)
                                </label>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Nhập số tiền"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    min="10000"
                                    step="10000"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Số tiền tối thiểu: 10,000 đ
                                </p>
                            </div>

                            {/* Provider Selection */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Phương thức thanh toán
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProvider('MOMO')}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            selectedProvider === 'MOMO'
                                                ? 'border-pink-500 bg-pink-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-2xl mb-1">💳</div>
                                            <div className="text-sm font-medium text-white">MoMo</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProvider('VNPAY')}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            selectedProvider === 'VNPAY'
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="text-center">
                                            <div className="text-2xl mb-1">🏦</div>
                                            <div className="text-sm font-medium text-white">VNPay</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowDepositModal(false);
                                        setDepositAmount('');
                                    }}
                                    disabled={isProcessing}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleDeposit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Đang xử lý...' : 'Nạp tiền'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
