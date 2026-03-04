import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    Package,
    AlertCircle,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { AdminWithdrawPanel } from '@/components/admin/AdminWithdrawPanel';
import {
    transactionApi,
    TransactionResponse,
    PageResponse,
    TransactionReportResponse,
    userApi,
    cardApi,
} from '@/utils/api';

export const AdminDashboard: React.FC = () => {
    const [report, setReport] = useState<TransactionReportResponse | null>(null);
    const [userCount, setUserCount] = useState<number>(0);
    const [productCount, setProductCount] = useState<number>(0);
    const [statsLoading, setStatsLoading] = useState(false);

    const [recentTransactions, setRecentTransactions] = useState<TransactionResponse[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txError, setTxError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            setStatsLoading(true);
            try {
                // 30 ngày gần nhất
                const to = new Date();
                const from = new Date();
                from.setDate(to.getDate() - 30);
                const toStr = to.toISOString().slice(0, 10);
                const fromStr = from.toISOString().slice(0, 10);

                const [reportRes, users, cards] = await Promise.all([
                    transactionApi.report({ from: fromStr, to: toStr }),
                    userApi.getAllUsers(),
                    cardApi.getAllCards(),
                ]);

                setReport(reportRes);
                setUserCount(users.length);
                setProductCount(cards.length);
            } catch {
                // giữ nguyên default nếu lỗi
            } finally {
                setStatsLoading(false);
            }
        };

        loadStats();

        const loadRecentTransactions = async () => {
            setTxLoading(true);
            setTxError(null);
            try {
                // Admin: lấy các giao dịch mới nhất của TẤT CẢ user
                const res: PageResponse<TransactionResponse> = await transactionApi.getAllTransactionsAdmin(
                    undefined,
                    0,
                    10
                );
                setRecentTransactions(res.content ?? []);
            } catch (e) {
                setTxError(e instanceof Error ? e.message : 'Không tải được lịch sử giao dịch');
            } finally {
                setTxLoading(false);
            }
        };

        loadRecentTransactions();
    }, []);

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 font-serif">Bảng điều khiển Admin</h1>
                <p className="text-muted-foreground">Chào mừng trở lại, Admin!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Doanh thu */}
                <Card className="glass-card-strong">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Doanh thu (30 ngày)
                            </CardTitle>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold gradient-text mb-2">
                            {report
                                ? `${report.totalAmount.toLocaleString('vi-VN')}đ`
                                : statsLoading
                                ? '...'
                                : '0đ'}
                        </div>
                        <div className="flex items-center text-sm text-green-400">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>
                                {report
                                    ? `${report.totalSuccess} giao dịch thành công`
                                    : 'Chưa có dữ liệu'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Đơn hàng / giao dịch */}
                <Card className="glass-card-strong">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Giao dịch
                            </CardTitle>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold gradient-text mb-2">
                            {report
                                ? report.totalPayment.toLocaleString('vi-VN')
                                : statsLoading
                                ? '...'
                                : '0'}
                        </div>
                        <div className="flex items-center text-sm text-blue-400">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span>
                                {report
                                    ? `${report.totalPending} đang chờ, ${report.totalError} lỗi`
                                    : 'Chưa có dữ liệu'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Người dùng */}
                <Card className="glass-card-strong">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Người dùng
                            </CardTitle>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold gradient-text mb-2">
                            {statsLoading ? '...' : userCount.toString()}
                        </div>
                        <div className="flex items-center text-sm text-green-400">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>Tổng user trong hệ thống</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Sản phẩm (thẻ) */}
                <Card className="glass-card-strong">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Sản phẩm (thẻ)
                            </CardTitle>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold gradient-text mb-2">
                            {statsLoading ? '...' : productCount.toString()}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <ArrowUp className="h-4 w-4 mr-1" />
                            <span>Tổng số thẻ đang có</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Thao tác nhanh</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Thêm sản phẩm</div>
                                    <div className="text-xs text-muted-foreground">Tạo sản phẩm mới</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Quản lý người dùng</div>
                                    <div className="text-xs text-muted-foreground">Xem tất cả người dùng</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Phân tích</div>
                                    <div className="text-xs text-muted-foreground">Xem báo cáo</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-400" />
                                <div>
                                    <div className="font-semibold">Cảnh báo</div>
                                    <div className="text-xs text-muted-foreground">3 vấn đề chờ xử lý</div>
                                </div>
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </div>

            {/* Wallet Transactions (separate section) */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Lịch sử giao dịch ví (Admin)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {txLoading ? (
                        <p className="text-sm text-muted-foreground">Đang tải...</p>
                    ) : txError ? (
                        <p className="text-sm text-red-400">{txError}</p>
                    ) : recentTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-left">
                                        <th className="py-2 pr-2">Thời gian</th>
                                        <th className="py-2 pr-2">Loại</th>
                                        <th className="py-2 pr-2">Trạng thái</th>
                                        <th className="py-2 pr-2 text-right">Số tiền</th>
                                        <th className="py-2 pr-2 text-right">ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((tx) => (
                                        <tr
                                            key={tx.walletTransactionId}
                                            className="border-b border-white/5 last:border-0"
                                        >
                                            <td className="py-2 pr-2">
                                                {tx.createAt
                                                    ? new Date(tx.createAt).toLocaleString('vi-VN')
                                                    : '—'}
                                            </td>
                                            <td className="py-2 pr-2">{tx.transactionType}</td>
                                            <td className="py-2 pr-2">{tx.statusTransaction}</td>
                                            <td className="py-2 pr-2 text-right font-semibold">
                                                {tx.amount.toLocaleString('vi-VN')} đ
                                            </td>
                                            <td className="py-2 pr-2 text-right text-xs text-muted-foreground">
                                                {tx.walletTransactionId?.slice(0, 8)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Withdraw management */}
            <AdminWithdrawPanel />
        </div>
    );
};
