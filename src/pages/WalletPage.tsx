import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Activity, ArrowUpCircle, ArrowDownCircle, Search, X } from 'lucide-react';
import { userApi, UserProfile, transactionApi, TransactionResponse, PageResponse, bankAccountApi, BankAccountRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TopUpModal } from '@/components/wallet/TopUpModal';
import { TransactionHistory } from '@/components/wallet/TransactionHistory';
import { getVietQrBanks, VietQrBank } from '@/utils/vietqrBanks';

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
    const [bankList, setBankList] = useState<VietQrBank[]>([]);
    const [bankListLoading, setBankListLoading] = useState(false);
    const [selectedBankCode, setSelectedBankCode] = useState('');
    const [bankSearchQuery, setBankSearchQuery] = useState('');
    const [customBankName, setCustomBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | undefined>(undefined);
    // true = tab "Tiền vào", false = tab "Tiền ra"
    const [inFilter, setInFilter] = useState<true | false>(true);

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

    const fetchTransactions = async () => {
        if (!isAuthenticated) return;

        setIsLoadingTransactions(true);
        try {
            const data: PageResponse<TransactionResponse> = await transactionApi.getMyTransactions(
                statusFilter,
                currentPage - 1,
                10,
                inFilter,
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

    // Fetch user profile
    useEffect(() => {
        fetchProfile();
    }, [isAuthenticated, navigate]);

    // Fetch transactions
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            fetchTransactions();
        }
    }, [isAuthenticated, isLoading, currentPage, statusFilter, inFilter]);

    // Khi ví thay đổi từ màn khác (checkout / rút tiền / mở hộp...), refetch profile + transactions.
    useEffect(() => {
        if (!isAuthenticated) return;
        const handler = () => {
            fetchProfile();
            fetchTransactions();
        };
        window.addEventListener('wallet-updated', handler);
        return () => window.removeEventListener('wallet-updated', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, currentPage, statusFilter]);

    // Load danh sách ngân hàng khi mở modal thêm tài khoản
    useEffect(() => {
        if (!showAddBankModal) return;
        setBankListLoading(true);
        setBankSearchQuery('');
        getVietQrBanks()
            .then(setBankList)
            .catch(() => setBankList([]))
            .finally(() => setBankListLoading(false));
    }, [showAddBankModal]);

    // Lọc ngân hàng theo ô tìm kiếm (code, shortName, name)
    const filteredBanks = useMemo(() => {
        const q = bankSearchQuery.trim().toLowerCase();
        if (!q) return bankList;
        return bankList.filter(
            (b) =>
                b.code.toLowerCase().includes(q) ||
                b.shortName.toLowerCase().includes(q) ||
                b.name.toLowerCase().includes(q)
        );
    }, [bankList, bankSearchQuery]);

    const selectedBank = useMemo(
        () => (selectedBankCode && selectedBankCode !== 'OTHER' ? bankList.find((b) => b.code === selectedBankCode) : null),
        [bankList, selectedBankCode]
    );

    // Cảnh báo khi tên chủ tài khoản khác tên user (nên trùng để bảo mật rút tiền)
    const accountNameMismatch = useMemo(() => {
        if (!profile?.name || !accountName.trim()) return false;
        const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalize(accountName) !== normalize(profile.name);
    }, [profile?.name, accountName]);

    const handleTopUpSuccess = async () => {
        // Refresh profile to get updated balance
        try {
            const data = await userApi.getMyProfile();
            setProfile(data);
            // Refresh transactions
            const txData = await transactionApi.getMyTransactions(statusFilter, currentPage - 1, 10, inFilter);
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
                    statusFilter={statusFilter as any}
                    onPageChange={setCurrentPage}
                    onStatusFilterChange={(st) => setStatusFilter(st as any)}
                    inFilter={inFilter}
                    onInFilterChange={(val) => {
                        setInFilter(val);
                        setCurrentPage(1);
                    }}
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
                        <h3 className="text-xl font-bold mb-4 text-white">Thêm tài khoản ngân hàng (rút tiền)</h3>
                        <p className="text-xs text-muted-foreground mb-3">Chỉ hỗ trợ rút tiền về tài khoản ngân hàng.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Ngân hàng nhận tiền
                                </label>
                                {bankListLoading ? (
                                    <div className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-muted-foreground">
                                        Đang tải danh sách ngân hàng...
                                    </div>
                                ) : selectedBank && selectedBankCode !== 'OTHER' ? (
                                    <div className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-black/40 border border-white/10">
                                        <span className="text-sm text-white flex-1">
                                            {selectedBank.shortName} - {selectedBank.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBankCode('')}
                                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                                            title="Đổi ngân hàng"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                            <input
                                                type="text"
                                                className="w-full pl-9 pr-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                placeholder="Tìm nhanh ngân hàng (VD: Vietcombank, VCB, BIDV...)"
                                                value={bankSearchQuery}
                                                onChange={e => setBankSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-white/10 bg-black/40">
                                            {filteredBanks.length === 0 ? (
                                                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                                    Không tìm thấy ngân hàng. Chọn &quot;Khác&quot; để nhập mã ngân hàng.
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredBanks.map((b) => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-2 first:rounded-t-md last:rounded-b-md"
                                                            onClick={() => setSelectedBankCode(b.code)}
                                                        >
                                                            {b.logo && (
                                                                <img
                                                                    src={b.logo}
                                                                    alt=""
                                                                    className="w-6 h-6 object-contain rounded"
                                                                />
                                                            )}
                                                            <span>
                                                                {b.shortName} - {b.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/10 border-t border-white/10"
                                                        onClick={() => setSelectedBankCode('OTHER')}
                                                    >
                                                        Khác (nhập tên)
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {selectedBankCode === 'OTHER' && (
                                            <input
                                                className="mt-2 w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                placeholder="Nhập mã ngân hàng (VD: VCB, BIDV)"
                                                value={customBankName}
                                                onChange={e => setCustomBankName(e.target.value)}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Số tài khoản
                                </label>
                                <input
                                    inputMode="numeric"
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Chỉ nhập số (VD: 1234567890)"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">Chỉ được nhập chữ số.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Tên chủ tài khoản
                                </label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Nên trùng với tên tài khoản đăng nhập ({profile?.name || '—'}) để rút tiền an toàn.
                                </p>
                                <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập tên chủ tài khoản"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                />
                                {accountNameMismatch && (
                                    <p className="mt-1.5 text-xs text-amber-400">
                                        Tên bạn nhập khác với tên tài khoản. Chỉ nên thêm tài khoản thuộc sở hữu của bạn.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowAddBankModal(false);
                                        setSelectedBankCode('');
                                        setBankSearchQuery('');
                                        setCustomBankName('');
                                        setAccountNumber('');
                                        setAccountName('');
                                    }}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    onClick={async () => {
                                        const bankCode =
                                            selectedBankCode === 'OTHER'
                                                ? customBankName.trim()
                                                : selectedBankCode;
                                        if (!bankCode || !accountNumber.trim() || !accountName.trim()) {
                                            alert('Vui lòng chọn ngân hàng và nhập đầy đủ thông tin tài khoản.');
                                            return;
                                        }
                                        if (!/^[0-9]+$/.test(accountNumber.trim())) {
                                            alert('Số tài khoản chỉ được chứa chữ số. Vui lòng kiểm tra lại.');
                                            return;
                                        }
                                        try {
                                            const payload: BankAccountRequest = {
                                                bankCode,
                                                accountNumber: accountNumber.trim(),
                                                accountName: accountName.trim(),
                                            };
                                            await bankAccountApi.create(profile.userId, payload);
                                            alert('Thêm tài khoản rút tiền thành công.');
                                            setShowAddBankModal(false);
                                            setSelectedBankCode('');
                                            setBankSearchQuery('');
                                            setCustomBankName('');
                                            setAccountNumber('');
                                            setAccountName('');
                                        } catch (e) {
                                            const msg = e instanceof Error ? e.message : 'Không thể thêm tài khoản rút tiền.';
                                            const lower = msg.toLowerCase();
                                            if (lower.includes('digit') || lower.includes('number') || lower.includes('account')) {
                                                alert('Số tài khoản chỉ được chứa chữ số. Vui lòng kiểm tra lại.');
                                            } else {
                                                alert(msg);
                                            }
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
