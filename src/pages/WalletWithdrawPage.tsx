import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    bankAccountApi,
    BankAccountResponse,
    transactionApi,
    WithdrawRequest,
    userApi,
    BankAccountRequest,
} from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Search, X, Pencil, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getVietQrBanks, VietQrBank } from '@/utils/vietqrBanks';

export const WalletWithdrawPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profileUserId, setProfileUserId] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [showBankModal, setShowBankModal] = useState(false);
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [bankList, setBankList] = useState<VietQrBank[]>([]);
    const [bankListLoading, setBankListLoading] = useState(false);
    const [selectedBankCode, setSelectedBankCode] = useState('');
    const [bankSearchQuery, setBankSearchQuery] = useState('');
    const [customBankName, setCustomBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
    }, [isAuthenticated, navigate]);

    const loadBankAccounts = async (currentPage: number, forceUserId?: string) => {
        const userId = forceUserId || profileUserId;
        if (!userId) return;
        const bankPage = await bankAccountApi.getMyBankAccounts(userId, currentPage, 5);
        const list = bankPage.content ?? [];
        setBankAccounts(list);
        setTotalPages(Math.max(1, bankPage.totalPages || 1));
        if (list.length > 0) {
            const def = list.find((b) => b.defaultAccount) ?? list[0];
            setSelectedBankId(def.bankAccountId);
        } else {
            setSelectedBankId(null);
        }
    };

    useEffect(() => {
        const load = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }
            try {
                const profile = await userApi.getMyProfile();
                setProfileUserId(profile.userId);
                await loadBankAccounts(1, profile.userId);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được danh sách tài khoản ngân hàng.');
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    useEffect(() => {
        if (showBankModal) {
            setBankListLoading(true);
            getVietQrBanks()
                .then(setBankList)
                .catch(() => setBankList([]))
                .finally(() => setBankListLoading(false));
        }
    }, [showBankModal]);

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

    const resetBankForm = () => {
        setEditingBankId(null);
        setSelectedBankCode('');
        setBankSearchQuery('');
        setCustomBankName('');
        setAccountNumber('');
        setAccountName('');
    };

    const openCreateBankModal = () => {
        resetBankForm();
        setShowBankModal(true);
    };

    const openEditBankModal = async (bankId: string) => {
        try {
            const bank = await bankAccountApi.getById(bankId);
            setEditingBankId(bankId);
            setSelectedBankCode(bank.bankCode || '');
            setBankSearchQuery('');
            setCustomBankName('');
            setAccountNumber(bank.accountNumber || '');
            setAccountName(bank.accountName || '');
            setShowBankModal(true);
        } catch (e) {
            toast({
                title: 'Không tải được tài khoản',
                description: e instanceof Error ? e.message : 'Vui lòng thử lại.',
                variant: 'error',
            });
        }
    };

    const handleSubmit = async () => {
        if (!selectedBankId) {
            toast({ title: 'Thiếu thông tin', description: 'Vui lòng chọn tài khoản ngân hàng nhận tiền.', variant: 'warning' });
            return;
        }
        const value = Number(amount);
        if (!value || value < 1000) {
            toast({ title: 'Số tiền không hợp lệ', description: 'Số tiền rút phải từ 1.000đ trở lên.', variant: 'warning' });
            return;
        }

        // WithdrawRequest cần userId (UUID) và bankId (UUID),
        // phần map email → userId cần làm ở BE hoặc từ profile; ở đây chỉ minh họa call API.
        setSubmitting(true);
        setError(null);
        try {
            const profile = await userApi.getMyProfile();
            const payload: WithdrawRequest = {
                userId: profile.userId,
                amount: value,
                bankId: selectedBankId,
            };
            await transactionApi.requestWithdraw(payload);
            window.dispatchEvent(new CustomEvent('wallet-updated'));
            toast({ title: 'Đã gửi yêu cầu', description: 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ admin duyệt.', variant: 'success' });
            navigate('/wallet');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể gửi yêu cầu rút tiền');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveBankAccount = async () => {
        if (!profileUserId) return;
        const bankCode = selectedBankCode === 'OTHER' ? customBankName.trim() : selectedBankCode.trim();
        if (!bankCode || !accountNumber.trim() || !accountName.trim()) {
            toast({
                title: 'Thiếu thông tin',
                description: 'Vui lòng chọn ngân hàng và nhập đầy đủ thông tin tài khoản.',
                variant: 'warning',
            });
            return;
        }
        if (!/^[0-9]+$/.test(accountNumber.trim())) {
            toast({
                title: 'Số tài khoản không hợp lệ',
                description: 'Số tài khoản chỉ được chứa chữ số.',
                variant: 'warning',
            });
            return;
        }
        const payload: BankAccountRequest = {
            bankCode,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim(),
        };
        try {
            if (editingBankId) {
                await bankAccountApi.update(editingBankId, payload);
                toast({ title: 'Đã cập nhật', description: 'Thông tin tài khoản đã được cập nhật.', variant: 'success' });
            } else {
                await bankAccountApi.create(profileUserId, payload);
                toast({ title: 'Đã thêm tài khoản', description: 'Tài khoản ngân hàng đã được thêm.', variant: 'success' });
            }
            setShowBankModal(false);
            resetBankForm();
            await loadBankAccounts(page);
        } catch (e) {
            toast({
                title: 'Không thể lưu tài khoản',
                description: e instanceof Error ? e.message : 'Vui lòng thử lại.',
                variant: 'error',
            });
        }
    };

    const handleSetDefault = async (bankId: string) => {
        if (!profileUserId) return;
        try {
            await bankAccountApi.setDefault({ bankId, userId: profileUserId });
            toast({ title: 'Đã đặt mặc định', description: 'Tài khoản mặc định đã được cập nhật.', variant: 'success' });
            await loadBankAccounts(page);
        } catch (e) {
            toast({
                title: 'Không thể đặt mặc định',
                description: e instanceof Error ? e.message : 'Vui lòng thử lại.',
                variant: 'error',
            });
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
                    <div className="text-xl text-yellow-200">Đang tải thông tin rút tiền...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-serif mb-1 gradient-text flex items-center gap-2">
                        <CreditCard className="w-7 h-7 text-yellow-300" />
                        Rút tiền từ Ví MystiCard
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Chỉ rút tiền về tài khoản ngân hàng. Chọn tài khoản và nhập số tiền muốn rút.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/wallet')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Về trang Ví
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form rút tiền */}
                <Card className="glass-card border-white/10">
                    <CardContent className="pt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                Số tiền muốn rút (VND)
                            </label>
                            <input
                                type="number"
                                min={1000}
                                step={1000}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                placeholder="Nhập số tiền, tối thiểu 1.000đ"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                Tài khoản ngân hàng nhận tiền
                            </label>
                            {bankAccounts.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    Chưa có tài khoản ngân hàng. Vui lòng thêm trong phần cài đặt tài khoản (BE: /api/bank-account).
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {bankAccounts.map((b) => (
                                        <label
                                            key={b.bankAccountId}
                                            className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer ${
                                                selectedBankId === b.bankAccountId
                                                    ? 'border-yellow-400 bg-yellow-500/10'
                                                    : 'border-white/10 hover:border-yellow-400/60'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="bank"
                                                checked={selectedBankId === b.bankAccountId}
                                                onChange={() => setSelectedBankId(b.bankAccountId)}
                                            />
                                            <div className="flex flex-col text-xs">
                                                <span className="font-semibold">
                                                    {b.bankCode} • {b.accountNumber}
                                                </span>
                                                <span className="text-muted-foreground">{b.accountName}</span>
                                                {b.defaultAccount && (
                                                    <span className="text-[10px] text-green-300 mt-0.5">
                                                        Mặc định
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-lg hover:from-yellow-400 hover:to-orange-400"
                            size="lg"
                            disabled={submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu rút tiền'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Gợi ý / lưu ý */}
                <Card className="glass-card border-white/10">
                    <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                        <p>
                            • Số tiền rút tối thiểu: <span className="font-semibold text-yellow-300">1.000đ</span>.
                        </p>
                        <p>
                            • Yêu cầu rút tiền sẽ được <span className="font-semibold">admin duyệt thủ công</span>.
                            Thời gian xử lý có thể mất vài phút.
                        </p>
                        <p>
                            • Đảm bảo thông tin tài khoản ngân hàng chính xác để tránh bị hoàn trả giao dịch.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card border-white/10 mt-6">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Quản lý tài khoản ngân hàng</h2>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateBankModal}>
                            Thêm tài khoản
                        </Button>
                    </div>

                    {bankAccounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Bạn chưa có tài khoản ngân hàng nào.</p>
                    ) : (
                        <div className="space-y-2">
                            {bankAccounts.map((b) => (
                                <div
                                    key={b.bankAccountId}
                                    className="border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                >
                                    <div>
                                        <div className="font-semibold text-white">
                                            {b.bankCode} • {b.accountNumber}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{b.accountName}</div>
                                        {b.defaultAccount && (
                                            <div className="text-xs text-green-300 mt-1 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Tài khoản mặc định
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {!b.defaultAccount && (
                                            <Button size="sm" variant="outline" onClick={() => handleSetDefault(b.bankAccountId)}>
                                                Mặc định
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => openEditBankModal(b.bankAccountId)}>
                                            <Pencil className="w-3.5 h-3.5 mr-1" />
                                            Sửa
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={async () => {
                                    const next = page - 1;
                                    setPage(next);
                                    await loadBankAccounts(next);
                                }}
                            >
                                ‹
                            </Button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <Button
                                    key={p}
                                    size="sm"
                                    variant={p === page ? 'default' : 'outline'}
                                    onClick={async () => {
                                        setPage(p);
                                        await loadBankAccounts(p);
                                    }}
                                >
                                    {p}
                                </Button>
                            ))}
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= totalPages}
                                onClick={async () => {
                                    const next = page + 1;
                                    setPage(next);
                                    await loadBankAccounts(next);
                                }}
                            >
                                ›
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {showBankModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a0a2e] rounded-lg p-6 max-w-md w-full border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white">
                            {editingBankId ? 'Cập nhật tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Ngân hàng</label>
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
                                                placeholder="Tìm ngân hàng..."
                                                value={bankSearchQuery}
                                                onChange={(e) => setBankSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-white/10 bg-black/40">
                                            {filteredBanks.length === 0 ? (
                                                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                                    Không tìm thấy ngân hàng. Chọn &quot;Khác&quot; để nhập mã.
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredBanks.map((b) => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10"
                                                            onClick={() => setSelectedBankCode(b.code)}
                                                        >
                                                            {b.shortName} - {b.name}
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/10 border-t border-white/10"
                                                        onClick={() => setSelectedBankCode('OTHER')}
                                                    >
                                                        Khác (nhập mã ngân hàng)
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {selectedBankCode === 'OTHER' && (
                                            <input
                                                className="mt-2 w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                placeholder="Nhập mã ngân hàng (VD: VCB, BIDV)"
                                                value={customBankName}
                                                onChange={(e) => setCustomBankName(e.target.value)}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Số tài khoản</label>
                                <input
                                    inputMode="numeric"
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập số tài khoản"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tên chủ tài khoản</label>
                                <input
                                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    placeholder="Nhập tên chủ tài khoản"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowBankModal(false);
                                        resetBankForm();
                                    }}
                                >
                                    Hủy
                                </Button>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSaveBankAccount}>
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

