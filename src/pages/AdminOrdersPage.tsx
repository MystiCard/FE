import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderApi, OrderItemResponse, ShippingStatus, shipmentApi } from '@/utils/api';
import { Search, Package, Truck, AlertCircle, RefreshCcw, MapPin, Phone } from 'lucide-react';

type AdminShippingFilter = ShippingStatus | 'ALL';

// Các trạng thái thật để gọi API BE
const ALL_SHIPPING_STATUSES: ShippingStatus[] = [
    'PENDING_APPROVED',
    'PENDING',
    'ASIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'RECEIVED',
    'FAILED',
    'LOST',
    'CANCELLED',
];

const SHIPPING_LABELS: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    PENDING_APPROVED: 'Chờ xác nhận',
    ASIGNED: 'Đã gán shipper',
    PICKED_UP: 'Đã lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    RECEIVED: 'Đã nhận',
    FAILED: 'Giao thất bại',
    LOST: 'Thất lạc',
    CANCELLED: 'Đã hủy',
};

const SHIPPING_FILTERS: { value: AdminShippingFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    ...ALL_SHIPPING_STATUSES.map((v) => ({
        value: v,
        label: SHIPPING_LABELS[v] || 'Không rõ',
    })),
];

export const AdminOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<OrderItemResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<AdminShippingFilter>('ALL');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');

    const loadOrders = async (pageIndex: number, shippingStatus: AdminShippingFilter) => {
        try {
            setIsLoading(true);
            setError('');
            const pageSize = 10;

            // Admin xem danh sách shipment chưa được gán shipper dựa trên ShipmentController (/api/shipments/not-asign)
            const res = await shipmentApi.getNotAssignedShipments(pageIndex + 1, pageSize);
            let shipments = res.content ?? [];

            if (shippingStatus !== 'ALL') {
                shipments = shipments.filter((s) => s.shipmentStatus === shippingStatus);
            }

            const mapped: OrderItemResponse[] = shipments.map((s) => ({
                shipfee: Number(s.shipmentFee ?? 0),
                shipmentResponse: {
                    shipmentId: s.shipmentId,
                    toAddress: s.toAddress,
                    toPhone: s.toPhone,
                    fromAddress: s.fromAddress,
                    fromPhone: s.fromPhone,
                    shipmentStatus: s.shipmentStatus,
                    shipmentFee: Number(s.shipmentFee ?? 0),
                    createAt: s.createAt,
                } as any,
                orderDetailResponseList: [],
            }));

            setOrders(mapped);
            setTotalPages(res.totalPages || 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn hàng');
            setOrders([]);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders(page, status);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status]);

    const filtered = orders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        const shipmentId = String(o.shipmentResponse?.shipmentId || '');
        return shipmentId.toLowerCase().includes(s);
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý đơn hàng</h1>
                    <p className="text-muted-foreground mt-1">
                        Xem và theo dõi trạng thái các đơn hàng (dựa trên trạng thái giao hàng).
                    </p>
                </div>
                <button
                    onClick={() => loadOrders(page, status)}
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
                            placeholder="Tìm theo mã orderItemId..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={status}
                            onChange={(e) => {
                                setPage(0);
                                setStatus(e.target.value as AdminShippingFilter);
                            }}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            {SHIPPING_FILTERS.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Shipments table (admin xem shipment chưa gán shipper) */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Shipment chưa gán shipper ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải đơn hàng...</div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-2 text-sm text-red-400 py-4">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Không có đơn hàng nào phù hợp.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3">Shipment</th>
                                        <th className="text-left p-3">Trạng thái</th>
                                        <th className="text-left p-3">Địa chỉ nhận</th>
                                        <th className="text-left p-3">SĐT nhận</th>
                                        <th className="text-right p-3">Phí ship</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((o, sIdx) => {
                                        const shipmentId =
                                            o.shipmentResponse?.shipmentId || `shipment-${sIdx}`;
                                        const shipmentStatus =
                                            o.shipmentResponse?.shipmentStatus || 'UNKNOWN';
                                        const ship = Number(o.shipfee || 0);
                                        return (
                                            <tr
                                                key={shipmentId}
                                                className="border-b border-white/5 hover:bg-white/5"
                                            >
                                                <td className="p-3 font-mono text-xs">
                                                    {shipmentId.slice(0, 8)}
                                                </td>
                                                <td className="p-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-200">
                                                        <Package className="w-3 h-3" />
                                                        {SHIPPING_LABELS[shipmentStatus] || 'Không rõ'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-xs max-w-xs">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                                                        <span className="line-clamp-2">
                                                            {o.shipmentResponse?.toAddress || '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3 text-muted-foreground" />
                                                        <span>{o.shipmentResponse?.toPhone || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {ship.toLocaleString('vi-VN')} đ
                                                </td>
                                            </tr>
                                        );
                                    })}
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

