import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { transactionApi } from '@/api';
import type {
    TransactionReportResponse,
    TransactionReportSummary,
} from '@/api';
import { DollarSign, TrendingUp, AlertCircle, Clock, Calendar, Loader2, Activity } from 'lucide-react';

const formatVND = (value: number) =>
    Number.isFinite(value) ? `${value.toLocaleString('vi-VN')}đ` : '0đ';

const tooltipContentStyle = {
    background: 'rgba(15,15,25,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
} as const;

const xTickShort = (v: string) => (v ? v.slice(5) : '');

type RangeKey = '7' | '30' | '90';

export const AdminReportPage: React.FC = () => {
    const [range, setRange] = useState<RangeKey>('30');
    const [report, setReport] = useState<TransactionReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getFromTo = (key: RangeKey): { from: string; to: string } => {
        const to = new Date();
        const from = new Date();
        const days = parseInt(key, 10);
        from.setDate(to.getDate() - days);
        return {
            from: from.toISOString().slice(0, 10),
            to: to.toISOString().slice(0, 10),
        };
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const { from, to } = getFromTo(range);
        transactionApi
            .report({ from, to })
            .then((res) => {
                if (!cancelled) {
                    setReport(res);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Không tải được báo cáo');
                    setReport(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [range]);

    const chartData: {
        date: string;
        doanhThu: number;
        totalPayment: number;
        thanhCong: number;
        thatBai: number;
    }[] =
        report?.data?.map((d: TransactionReportSummary) => ({
            date: d.localDate,
            doanhThu: d.totalAmount ?? 0,
            totalPayment: d.totalPayment ?? 0,
            thanhCong: d.success ?? 0,
            thatBai: d.error ?? 0,
        })) ?? [];

    return (
        <div className="py-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2 font-serif">Report doanh thu</h1>
                    <p className="text-muted-foreground">Doanh thu và giao dịch theo khoảng thời gian</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    {(['7', '30', '90'] as RangeKey[]).map((key) => (
                        <Button
                            key={key}
                            variant={range === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRange(key)}
                        >
                            {key} ngày
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Đang tải báo cáo...</span>
                </div>
            ) : error ? (
                <Card className="border-red-500/30 bg-red-500/5">
                    <CardContent className="py-8 text-center text-red-400">{error}</CardContent>
                </Card>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Tổng doanh thu
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold gradient-text">
                                    {report ? formatVND(report.totalAmount) : '—'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Giao dịch thành công
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-400">
                                    {report?.totalSuccess ?? '—'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Đang chờ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-400">
                                    {report?.totalPending ?? '—'}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card-strong">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Lỗi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-400">
                                    {report?.totalError ?? '—'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card className="glass-card-strong">
                        <CardHeader>
                            <CardTitle>Doanh thu và giao dịch theo ngày</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Đường doanh thu (VND) và số giao dịch thành công / thất bại trong khoảng đã chọn.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {chartData.length === 0 ? (
                                <div className="h-80 flex items-center justify-center text-muted-foreground">
                                    Không có dữ liệu trong khoảng thời gian này.
                                </div>
                            ) : (
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                                                tickFormatter={xTickShort}
                                            />
                                            <YAxis
                                                yAxisId="vnd"
                                                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                                                tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : `${v / 1e3}K`)}
                                            />
                                            <YAxis
                                                yAxisId="count"
                                                orientation="right"
                                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                                            />
                                            <Tooltip
                                                contentStyle={tooltipContentStyle}
                                                formatter={(
                                                    value: number,
                                                    name: string,
                                                    item: { dataKey?: string }
                                                ) => [
                                                    item?.dataKey === 'doanhThu' ? formatVND(value) : value,
                                                    // Recharts passes `name` from <Line name="..." />, not dataKey
                                                    name,
                                                ]}
                                                labelFormatter={(label) => `Ngày ${label}`}
                                            />
                                            <Legend />
                                            <Line
                                                yAxisId="vnd"
                                                dataKey="doanhThu"
                                                name="Doanh thu"
                                                stroke="url(#revenueGradient)"
                                                strokeWidth={2.2}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                            <Line
                                                yAxisId="count"
                                                dataKey="thanhCong"
                                                name="Giao dịch thành công"
                                                stroke="rgba(34,197,94,0.9)"
                                                strokeWidth={1.8}
                                                dot={{ r: 2 }}
                                            />
                                            <Line
                                                yAxisId="count"
                                                dataKey="thatBai"
                                                name="Giao dịch thất bại"
                                                stroke="rgba(239,68,68,0.9)"
                                                strokeWidth={1.8}
                                                dot={{ r: 2 }}
                                            />
                                            <defs>
                                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                                                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                                                </linearGradient>
                                            </defs>
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {chartData.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <Card className="glass-card-strong">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Activity className="h-4 w-4 text-sky-400" />
                                        Số lượt giao dịch theo ngày
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Tổng số bản ghi giao dịch ví trong ngày (mọi trạng thái).
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={chartData}
                                                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                                                    tickFormatter={xTickShort}
                                                />
                                                <YAxis
                                                    tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip
                                                    contentStyle={tooltipContentStyle}
                                                    formatter={(value: number, name: string) => [
                                                        value.toLocaleString('vi-VN'),
                                                        name,
                                                    ]}
                                                    labelFormatter={(label) => `Ngày ${label}`}
                                                />
                                                <Bar
                                                    dataKey="totalPayment"
                                                    name="Lượt giao dịch"
                                                    fill="rgba(56,189,248,0.85)"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="glass-card-strong">
                                <CardHeader>
                                    <CardTitle className="text-base">Thành công vs thất bại</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Mỗi cột là tổng giao dịch trong ngày; màu xanh là thành công, đỏ là thất bại.
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={chartData}
                                                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-white/10" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                                                    tickFormatter={xTickShort}
                                                />
                                                <YAxis
                                                    tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip
                                                    contentStyle={tooltipContentStyle}
                                                    formatter={(value: number, name: string) => [
                                                        value.toLocaleString('vi-VN'),
                                                        name,
                                                    ]}
                                                    labelFormatter={(label) => `Ngày ${label}`}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="thanhCong"
                                                    stackId="outcome"
                                                    name="Giao dịch thành công"
                                                    fill="rgba(34,197,94,0.9)"
                                                    radius={[0, 0, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="thatBai"
                                                    stackId="outcome"
                                                    name="Giao dịch thất bại"
                                                    fill="rgba(239,68,68,0.9)"
                                                    radius={[6, 6, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminReportPage;
