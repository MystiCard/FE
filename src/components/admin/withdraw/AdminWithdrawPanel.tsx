import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { transactionApi, paymentApi, TransactionResponse, PageResponse } from '@/api';
import { ADMIN_API_PAGE_SIZE } from '@/pages/admin/adminApiPageSize';
import { toast } from '@/components/ui/use-toast';
import { AlertCircle, ArrowUpCircle, RefreshCcw } from 'lucide-react';

const getStatusLabel = (s: string | undefined): string => {
    if (!s) return '—';
    const v = s.toUpperCase();
    if (v === 'SUCCESS') return 'Thành công';
    if (v === 'PENDING') return 'Đang xử lý';
    if (v === 'FAILED') return 'Thất bại';
    if (v === 'CANCELLED') return 'Đã hủy';
    return s;
};

export const AdminWithdrawPanel: React.FC = () => {
    const [rows, setRows] = useState<TransactionResponse[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionId, setActionId] = useState<string | null>(null);

    const load = async (p: number) => {
        try {
            setLoading(true);
            setError('');
            const res: PageResponse<TransactionResponse> =
                await transactionApi.getWithdrawRequestsAdmin(p, ADMIN_API_PAGE_SIZE);
            setRows(res.content ?? []);
            setTotalPages(res.totalPages || 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu rút tiền');
            setRows([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(page);
    }, [page]);

    const statusBadgeClass = (status: TransactionResponse['statusTransaction']) => {
        switch (status) {
            case 'SUCCESS':
                return 'bg-green-500/20 text-green-300';
            case 'PENDING':
                return 'bg-yellow-500/20 text-yellow-300';
            case 'FAILED':
                return 'bg-red-500/20 text-red-300';
            case 'CANCELLED':
            default:
                return 'bg-gray-500/20 text-gray-200';
        }
    };

    return (
        <Card className="glass-card-strong mt-0 md:mt-6">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    Quản lý yêu cầu rút tiền
                </CardTitle>
                <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => load(page)}
                >
                    <RefreshCcw className="w-4 h-4" />
                    Tải lại
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Đang tải danh sách yêu cầu rút tiền...
                    </div>
                ) : error ? (
                    <div className="py-8 text-center text-sm text-red-400">{error}</div>
                ) : rows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có yêu cầu rút tiền nào.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-3">Thời gian</th>
                                    <th className="text-left p-3">Tài khoản nhận</th>
                                    <th className="text-left p-3">Trạng thái</th>
                                    <th className="text-right p-3">Số tiền</th>
                                    <th className="text-right p-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((tx, idx) => (
                                    <tr
                                        key={String(tx.walletTransactionId ?? idx)}
                                        className="border-b border-white/5"
                                    >
                                        <td className="p-3">
                                            {tx.createAt
                                                ? new Date(tx.createAt).toLocaleString('vi-VN')
                                                : '—'}
                                        </td>
                                        <td className="p-3">
                                            {tx.bankAccountResponse ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">
                                                        {tx.bankAccountResponse.bankCode} •{' '}
                                                        {tx.bankAccountResponse.accountNumber}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {tx.bankAccountResponse.accountName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    Không có thông tin bank
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                                                    tx.statusTransaction
                                                )}`}
                                            >
                                                {getStatusLabel(tx.statusTransaction)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-semibold">
                                            {Number(tx.amount ?? 0).toLocaleString('vi-VN')} đ
                                        </td>
                                        <td className="p-3 text-right">
                                            {tx.statusTransaction === 'PENDING' || tx.statusTransaction === 'FAILED' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionId === tx.walletTransactionId}
                                                    className={`flex items-center gap-1 ml-auto ${
                                                        tx.statusTransaction === 'FAILED'
                                                            ? 'border-red-500/60 text-red-300 hover:bg-red-500/10'
                                                            : 'border-green-500/50 text-green-300 hover:bg-green-500/10'
                                                    }`}
                                                    title={
                                                        tx.statusTransaction === 'FAILED'
                                                            ? 'Thử lại thanh toán rút (BE: POST /transactions/pay-againt/{paymentId})'
                                                            : 'Duyệt rút tiền qua MoMo (BE: POST /transactions/approve)'
                                                    }
                                                    onClick={async () => {
                                                        setActionId(tx.walletTransactionId);
                                                        try {
                                                            let url: string;
                                                            if (tx.statusTransaction === 'FAILED') {
                                                                const payment = await paymentApi.getByWalletTransactionId(
                                                                    tx.walletTransactionId
                                                                );
                                                                if (!payment?.paymentId) {
                                                                    throw new Error(
                                                                        'Không tìm thấy payment gắn với giao dịch này để thử lại.'
                                                                    );
                                                                }
                                                                url = await transactionApi.retryFailedWithdrawPayment(
                                                                    payment.paymentId
                                                                );
                                                            } else {
                                                                url = await transactionApi.approveWithdraw(
                                                                    tx.walletTransactionId,
                                                                    'MOMO'
                                                                );
                                                            }
                                                            if (url) {
                                                                window.location.href = url;
                                                            }
                                                        } catch (e) {
                                                            toast({
                                                                title: 'Không thể xử lý yêu cầu rút tiền',
                                                                description:
                                                                    e instanceof Error
                                                                        ? e.message
                                                                        : undefined,
                                                                variant: 'error',
                                                            });
                                                        } finally {
                                                            setActionId(null);
                                                        }
                                                    }}
                                                >
                                                    <ArrowUpCircle className="w-3 h-3" />
                                                    {tx.statusTransaction === 'FAILED'
                                                        ? 'Thử lại thanh toán'
                                                        : 'Duyệt (MoMo)'}
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>
                        Trang {page} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Trước
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

