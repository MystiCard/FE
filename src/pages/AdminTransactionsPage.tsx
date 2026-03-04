import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { transactionApi, TransactionResponse, PageResponse } from '@/utils/api';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, CreditCard, RefreshCcw } from 'lucide-react';

type StatusFilter = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | undefined;

const getTypeLabel = (type: TransactionResponse['transactionType']) => {
    switch (type) {
        case 'DEPOSIT':
        case 'DEPOSTIE':
            return 'Nạp tiền';
        case 'WITHDRAW':
            return 'Rút tiền';
        case 'REQUEST_WITHDRAW':
            return 'Yêu cầu rút';
        case 'TRANSFER':
            return 'Chuyển tiền';
        case 'PAYMENT':
        default:
            return 'Thanh toán';
    }
};

const getTypeIcon = (type: TransactionResponse['transactionType']) => {
    switch (type) {
        case 'DEPOSIT':
        case 'DEPOSTIE':
            return <ArrowUpCircle className="w-4 h-4 text-green-400" />;
        case 'WITHDRAW':
        case 'REQUEST_WITHDRAW':
            return <ArrowDownCircle className="w-4 h-4 text-red-400" />;
        default:
            return <CreditCard className="w-4 h-4 text-blue-400" />;
    }
};

export const AdminTransactionsPage: React.FC = () => {
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const loadTransactions = async (pageIndex: number, status: StatusFilter) => {
        try {
            setIsLoading(true);
            setError('');
            const res: PageResponse<TransactionResponse> = await transactionApi.getAllTransactionsAdmin(
                status,
                pageIndex,
                20
            );
            setTransactions(res.content ?? []);
            setTotalPages(res.totalPages || 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách giao dịch');
            setTransactions([]);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTransactions(page, statusFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter]);

    const filtered = transactions.filter((tx) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (
            tx.walletTransactionId?.toLowerCase().includes(s) ||
            getTypeLabel(tx.transactionType).toLowerCase().includes(s)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý giao dịch ví</h1>
                    <p className="text-muted-foreground mt-1">
                        Xem tất cả giao dịch nạp / rút / thanh toán của người dùng
                    </p>
                </div>
                <button
                    onClick={() => loadTransactions(page, statusFilter)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card text-sm hover:bg-white/10"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Tải lại
                </button>
            </div>

            {/* Filters */}
            <Card className="glass-card-strong">
                <CardContent className="p-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm theo loại giao dịch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter || ''}
                            onChange={(e) =>
                                setStatusFilter(
                                    (e.target.value || undefined) as StatusFilter
                                )
                            }
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="SUCCESS">Thành công</option>
                            <option value="PENDING">Đang xử lý</option>
                            <option value="FAILED">Thất bại</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Giao dịch ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải giao dịch...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-400 text-sm">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Không có giao dịch nào phù hợp.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3">Thời gian</th>
                                        <th className="text-left p-3">Loại</th>
                                        <th className="text-left p-3">Trạng thái</th>
                                        <th className="text-right p-3">Số tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((tx) => (
                                        <tr key={tx.walletTransactionId} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3">
                                                {tx.createAt
                                                    ? new Date(tx.createAt).toLocaleString('vi-VN')
                                                    : '—'}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {getTypeIcon(tx.transactionType)}
                                                    <span>{getTypeLabel(tx.transactionType)}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        tx.statusTransaction === 'SUCCESS'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : tx.statusTransaction === 'PENDING'
                                                            ? 'bg-yellow-500/20 text-yellow-400'
                                                            : tx.statusTransaction === 'FAILED'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-gray-500/20 text-gray-300'
                                                    }`}
                                                >
                                                    {tx.statusTransaction}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-semibold">
                                                {tx.amount.toLocaleString('vi-VN')} đ
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span>
                            Trang {page + 1} / {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                className="px-3 py-1 rounded-lg glass-card disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <button
                                disabled={page + 1 >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1 rounded-lg glass-card disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

