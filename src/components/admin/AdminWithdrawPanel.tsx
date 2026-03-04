import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { transactionApi, TransactionResponse, PageResponse } from '@/utils/api';
import { Activity, CheckCircle2 } from 'lucide-react';

export const AdminWithdrawPanel: React.FC = () => {
    const [pending, setPending] = useState<TransactionResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [manualId, setManualId] = useState('');
    const [provider, setProvider] = useState('MOMO');

    const loadPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const res: PageResponse<TransactionResponse> = await transactionApi.getWithdrawRequests('PENDING', 0, 20);
            const list = res.content ?? [];
            setPending(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu rút tiền');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPending();
    }, []);

    const approve = async (transactionId: string) => {
        setApprovingId(transactionId);
        setError(null);
        try {
            await transactionApi.approveWithdraw(transactionId, provider);
            alert('Đã gửi lệnh approve rút tiền.');
            await loadPending();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể approve yêu cầu rút tiền');
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    Duyệt yêu cầu rút tiền (Admin)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {/* Quick manual approve by ID */}
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Nhập mã giao dịch rút tiền (transactionId) để duyệt nhanh:
                    </p>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Transaction ID..."
                            value={manualId}
                            onChange={e => setManualId(e.target.value)}
                        />
                        <select
                            value={provider}
                            onChange={e => setProvider(e.target.value)}
                            className="px-2 py-1 rounded border border-white/10 bg-black/40 text-xs"
                        >
                            <option value="MOMO">MoMo</option>
                            <option value="VNPAY">VNPAY</option>
                        </select>
                        <Button
                            size="sm"
                            disabled={!manualId || !!approvingId}
                            onClick={() => approve(manualId)}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Duyệt
                        </Button>
                    </div>
                </div>

                {/* Pending list (nếu lấy được từ API) */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Yêu cầu rút tiền đang chờ</span>
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={loadPending}
                            disabled={loading}
                        >
                            Tải lại
                        </Button>
                    </div>
                    {loading ? (
                        <p className="text-xs text-muted-foreground">Đang tải...</p>
                    ) : pending.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Không có yêu cầu rút tiền nào đang chờ.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-auto text-xs">
                            {pending.map((tx, idx) => {
                                const id = tx.walletTransactionId || '';
                                const shortId = id ? id.slice(0, 8) : '—';
                                return (
                                    <div
                                        key={id || `tx-${idx}`}
                                        className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10"
                                    >
                                        <div>
                                            <div className="font-semibold">
                                                {shortId} • {tx.amount.toLocaleString('vi-VN')}đ
                                            </div>
                                            <div className="text-muted-foreground">
                                                {tx.statusTransaction} • {tx.transactionType}
                                            </div>
                                        </div>
                                        <Button
                                            size="xs"
                                            disabled={!id || approvingId === id}
                                            onClick={() => id && approve(id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Duyệt
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

