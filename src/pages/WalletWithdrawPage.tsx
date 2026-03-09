import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bankAccountApi, BankAccountResponse, transactionApi, WithdrawRequest, userApi } from '@/utils/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft } from 'lucide-react';

export const WalletWithdrawPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const load = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }
            try {
                const profile = await userApi.getMyProfile();
                const userId = profile.userId;
                const page = await bankAccountApi.getMyBankAccounts(userId, 1, 20);
                const list = page.content ?? [];
                setBankAccounts(list);
                if (list.length > 0) {
                    const def = list.find(b => b.defaultAccount) ?? list[0];
                    setSelectedBankId(def.bankAccountId);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được danh sách tài khoản ngân hàng.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthenticated]);

    const handleSubmit = async () => {
        if (!selectedBankId) {
            alert('Vui lòng chọn tài khoản ngân hàng nhận tiền.');
            return;
        }
        const value = Number(amount);
        if (!value || value < 1000) {
            alert('Số tiền rút phải lớn hơn hoặc bằng 1.000đ.');
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
            alert('Gửi yêu cầu rút tiền thành công. Vui lòng chờ admin duyệt.');
            navigate('/wallet');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể gửi yêu cầu rút tiền');
        } finally {
            setSubmitting(false);
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
        </div>
    );
};

