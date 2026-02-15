import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Activity, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { userApi, UserProfile, transactionApi, TransactionResponse, PageResponse } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TopUpModal } from '@/components/wallet/TopUpModal';
import { TransactionHistory } from '@/components/wallet/TransactionHistory';

export const WalletPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [error, setError] = useState('');
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | undefined>(undefined);

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isAuthenticated) {
                navigate('/login');
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
    }, [isAuthenticated, navigate]);

    // Fetch transactions
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!isAuthenticated) return;

            setIsLoadingTransactions(true);
            try {
                const data: PageResponse<TransactionResponse> = await transactionApi.getMyTransactions(
                    statusFilter,
                    currentPage,
                    10
                );
                setTransactions(data.content);
                setTotalPages(data.totalPages);
            } catch (err) {
                console.error('Failed to load transactions:', err);
                // Set empty array on error
                setTransactions([]);
                setTotalPages(1);
            } finally {
                setIsLoadingTransactions(false);
            }
        };

        if (isAuthenticated && !isLoading) {
            fetchTransactions();
        }
    }, [isAuthenticated, isLoading, currentPage, statusFilter]);

    const handleTopUpSuccess = async () => {
        // Refresh profile to get updated balance
        try {
            const data = await userApi.getMyProfile();
            setProfile(data);
            // Refresh transactions
            const txData = await transactionApi.getMyTransactions(statusFilter, currentPage, 10);
            setTransactions(txData.content);
            setTotalPages(txData.totalPages);
        } catch (err) {
            console.error('Failed to refresh data:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <div className="text-xl">Đang tải thông tin ví...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error}</div>
                    <Button onClick={() => window.location.reload()}>Thử lại</Button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-xl">Vui lòng đăng nhập để xem ví</div>
                    <Button onClick={() => navigate('/login')} className="mt-4">Đăng nhập</Button>
                </div>
            </div>
        );
    }

    const balance = profile?.walletResponse?.balance || 0;

    return (
        <div className="min-h-screen pb-12">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2 gradient-text">
                    Ví của tôi
                </h1>
                <p className="text-muted-foreground">
                    Quản lý số dư và giao dịch của bạn
                </p>
            </div>

            {/* Balance Card */}
            <Card className="glass-card p-6 md:p-8 mb-8 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Số dư khả dụng
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl md:text-5xl font-bold text-green-400">
                                    {balance.toLocaleString('vi-VN')}
                                </span>
                                <span className="text-2xl text-muted-foreground">đ</span>
                            </div>
                        </div>
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CreditCard className="w-10 h-10 text-green-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setShowTopUpModal(true)}
                        >
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                            Nạp tiền
                        </Button>
                        <Button
                            variant="outline"
                            className="border-green-500/30 hover:bg-green-500/10"
                            onClick={() => {
                                // TODO: Implement withdraw functionality
                                alert('Tính năng rút tiền đang được phát triển');
                            }}
                        >
                            <ArrowDownCircle className="w-4 h-4 mr-2" />
                            Rút tiền
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-muted-foreground text-center">
                            💡 Sử dụng ví để mua thẻ, mở hộp bí ẩn và giao dịch trên marketplace
                        </p>
                    </div>
                </div>
            </Card>

            {/* Transaction History */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-400" />
                        Lịch sử giao dịch
                    </h2>
                </div>

                <TransactionHistory
                    transactions={transactions}
                    isLoading={isLoadingTransactions}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    statusFilter={statusFilter}
                    onPageChange={setCurrentPage}
                    onStatusFilterChange={setStatusFilter}
                />
            </div>

            {/* Top Up Modal */}
            {showTopUpModal && profile && (
                <TopUpModal
                    userId={profile.userId}
                    onClose={() => setShowTopUpModal(false)}
                    onSuccess={handleTopUpSuccess}
                />
            )}
        </div>
    );
};
