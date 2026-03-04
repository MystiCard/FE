import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Activity, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { userApi, UserProfile, transactionApi, TransactionResponse, PageResponse, bankAccountApi, BankAccountRequest } from '@/utils/api';
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
    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
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
                    currentPage - 1,
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
            const txData = await transactionApi.getMyTransactions(statusFilter, currentPage - 1, 10);
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
    const pendingWithdraws = transactions.filter(
        (t) => t.transactionType === 'REQUEST_WITHDRAW' && t.statusTransaction === 'PENDING'
    );

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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            onClick={() => navigate('/wallet/withdraw')}
                        >
                            <ArrowDownCircle className="w-4 h-4 mr-2" />
                            Rút tiền
                        </Button>
                        <Button
                            variant="outline"
                            className="border-blue-500/30 hover:bg-blue-500/10"
                            onClick={() => setShowAddBankModal(true)}
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Thêm tài khoản rút tiền
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-muted-foreground text-center">
                            💡 Sử dụng ví để mua thẻ, mở hộp bí ẩn và giao dịch trên marketplace
                        </p>
                    </div>
                </div>
            </Card>

            {/* Pending withdraw requests */}
            {pendingWithdraws.length > 0 && (
                <Card className="glass-card mb-6 p-4 border-yellow-500/40">
                    <h2 className="text-lg font-semibold mb-2 text-yellow-300">
                        Yêu cầu rút tiền đang chờ
                    </h2>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        {pendingWithdraws.map((tx, idx) => (
                            <li key={tx.walletTransactionId || idx} className="flex justify-between">
                                <span>
                                    {tx.createAt
                                        ? new Date(tx.createAt).toLocaleString('vi-VN')
                                        : '—'}{' '}
                                    • Yêu cầu rút
                                </span>
                                <span className="font-semibold text-yellow-300">
                                    {tx.amount.toLocaleString('vi-VN')} đ
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Trạng thái: Đang xử lý — vui lòng chờ Admin duyệt.
                    </p>
                </Card>
            )}

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

            {/* Add Bank Account Modal */}
            {showAddBankModal && profile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a0a2e] rounded-lg p-6 max-w-md w-full border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white">Thêm tài khoản rút tiền</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Tên ngân hàng / ví (VD: Vietcombank, MoMo)
                                </label>
                                <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập tên ngân hàng hoặc MoMo"
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Số tài khoản / SĐT MoMo
                                </label>
                                <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập số tài khoản ngân hàng hoặc số điện thoại MoMo"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Tên chủ tài khoản
                                </label>
                                <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập tên chủ tài khoản"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowAddBankModal(false);
                                        setBankName('');
                                        setAccountNumber('');
                                        setAccountName('');
                                    }}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={async () => {
                                        if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
                                            alert('Vui lòng nhập đầy đủ thông tin tài khoản.');
                                            return;
                                        }
                                        try {
                                            const payload: BankAccountRequest = {
                                                bankCode: bankName.trim(),
                                                accountNumber: accountNumber.trim(),
                                                accountName: accountName.trim(),
                                            };
                                            await bankAccountApi.create(profile.userId, payload);
                                            alert('Thêm tài khoản rút tiền thành công.');
                                            setShowAddBankModal(false);
                                            setBankName('');
                                            setAccountNumber('');
                                            setAccountName('');
                                        } catch (e) {
                                            alert(
                                                e instanceof Error
                                                    ? e.message
                                                    : 'Không thể thêm tài khoản rút tiền.'
                                            );
                                        }
                                    }}
                                >
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
