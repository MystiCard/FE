import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { orderApi, OrderItemResponse, ShippingStatus } from '@/utils/api';
import { AlertCircle, Package, Search, Truck, MapPin, Phone, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type UserShippingFilter = ShippingStatus | 'ALL';

const ALL_SHIPPING_STATUSES: ShippingStatus[] = [
    'PENDING',
    'ASIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'RECEIVED',
    'FAILED',
    'RETURNED',
    'LOST',
    'CANCELLED',
];

const SHIPPING_FILTERS: { value: UserShippingFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    ...ALL_SHIPPING_STATUSES.map((v) => ({
        value: v,
        label:
            v === 'PENDING'
                ? 'Chờ xử lý'
                : v === 'ASIGNED'
                ? 'Đã gán shipper'
                : v === 'PICKED_UP'
                ? 'Đã lấy hàng'
                : v === 'IN_TRANSIT'
                ? 'Đang giao'
                : v === 'DELIVERED'
                ? 'Đã giao'
                : v === 'RECEIVED'
                ? 'Người nhận đã xác nhận'
                : v === 'FAILED'
                ? 'Giao thất bại'
                : v === 'RETURNED'
                ? 'Đã hoàn'
                : v === 'LOST'
                ? 'Thất lạc'
                : 'Đã hủy',
    })),
];

export const OrdersPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderItemResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<UserShippingFilter>('ALL');
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<OrderItemResponse | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const loadOrders = async (pageIndex: number, shippingStatus: UserShippingFilter) => {
        try {
            setIsLoading(true);
            setError('');
            const pageSize = 10;

            if (shippingStatus === 'ALL') {
                const allResults = await Promise.all(
                    ALL_SHIPPING_STATUSES.map((st) =>
                        orderApi
                            .getByShippingStatus(st, 0, 1000)
                            .then((res) => res.content ?? [])
                            .catch(() => [])
                    )
                );
                const merged: OrderItemResponse[] = allResults.flat();
                const start = pageIndex * pageSize;
                const paged = merged.slice(start, start + pageSize);
                const pages = Math.max(1, Math.ceil(merged.length / pageSize));
                setOrders(paged);
                setTotalPages(pages);
            } else {
                const res = await orderApi.getByShippingStatus(shippingStatus, pageIndex, pageSize);
                setOrders(res.content ?? []);
                setTotalPages(res.totalPages || 1);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn hàng');
            setOrders([]);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        loadOrders(page, status);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, isAuthenticated]);

    const filtered = orders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (o.orderDetailResponseList || []).some((d) =>
            String(d.orderItemId || '').toLowerCase().includes(s)
        );
    });

    if (!isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text flex items-center gap-2">
                        <Package className="w-7 h-7" />
                        Đơn hàng của tôi
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Xem và theo dõi trạng thái các đơn hàng bạn đã đặt.
                    </p>
                </div>
            </div>

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
                                setStatus(e.target.value as UserShippingFilter);
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

            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Đơn hàng ({filtered.length})</CardTitle>
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
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            Bạn chưa có đơn hàng nào.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3">Shipment</th>
                                        <th className="text-left p-3">OrderItem</th>
                                        <th className="text-left p-3">Trạng thái</th>
                                        <th className="text-right p-3">Số lượng</th>
                                        <th className="text-right p-3">Giá</th>
                                        <th className="text-right p-3">Phí ship</th>
                                        <th className="text-right p-3">Tổng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.flatMap((o, sIdx) => {
                                        const shipmentId =
                                            o.shipmentResponse?.shipmentId || `shipment-${sIdx}`;
                                        const shipmentStatus =
                                            o.shipmentResponse?.shipmentStatus || 'UNKNOWN';
                                        const ship = Number(o.shipfee || 0);
                                        const items = o.orderDetailResponseList || [];

                                        if (items.length === 0) {
                                            const rowTotal = ship;
                                            return [
                                                <tr
                                                    key={shipmentId}
                                                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                                    onClick={() => setSelectedShipment(o)}
                                                >
                                                    <td className="p-3 font-mono text-xs">
                                                        {shipmentId.slice(0, 8)}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs">—</td>
                                                    <td className="p-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-200">
                                                            <Package className="w-3 h-3" />
                                                            {shipmentStatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">0</td>
                                                    <td className="p-3 text-right">0 đ</td>
                                                    <td className="p-3 text-right">
                                                        {ship.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="p-3 text-right font-semibold">
                                                        {rowTotal.toLocaleString('vi-VN')} đ
                                                    </td>
                                                </tr>,
                                            ];
                                        }

                                        return items.map((d, idx) => {
                                            const unitPrice = Number(d.price || 0);
                                            const qty = Number(d.quantity || 0);
                                            const idStr = String(d.orderItemId || '');
                                            const rowTotal = unitPrice * qty + ship;

                                            return (
                                                <tr
                                                    key={`${shipmentId}-${idStr || idx}`}
                                                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                                    onClick={() => setSelectedShipment(o)}
                                                >
                                                    <td className="p-3 font-mono text-xs">
                                                        {shipmentId.slice(0, 8)}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs">
                                                        {idStr.slice(0, 8) || '—'}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-200">
                                                            <Package className="w-3 h-3" />
                                                            {d.orderItemStatus || shipmentStatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">{qty}</td>
                                                    <td className="p-3 text-right">
                                                        {unitPrice.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {ship.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="p-3 text-right font-semibold">
                                                        {rowTotal.toLocaleString('vi-VN')} đ
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

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
            {/* Order detail dialog by shipment */}
            <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
                <DialogContent className="max-w-2xl">
                    {selectedShipment && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Chi tiết đơn hàng
                                    <span className="font-mono text-xs text-muted-foreground">
                                        #{selectedShipment.shipmentResponse?.shipmentId.slice(0, 8)}
                                    </span>
                                </DialogTitle>
                            </DialogHeader>
                            {/* Thông tin chung + địa chỉ giao hàng */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Trạng thái giao hàng</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-200">
                                            <Package className="w-3 h-3" />
                                            {selectedShipment.shipmentResponse?.shipmentStatus || 'UNKNOWN'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Phí vận chuyển</span>
                                        <span className="font-semibold">
                                            {Number(selectedShipment.shipfee || 0).toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground mt-2">
                                        <CreditCard className="w-4 h-4" />
                                        <span className="text-xs">
                                            Thanh toán qua ví / hệ thống (giống Shopee thu hộ, người bán nhận sau).
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Địa chỉ nhận hàng</div>
                                            <div className="text-sm">
                                                {selectedShipment.shipmentResponse?.toAddress || '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">SĐT người nhận</div>
                                            <div className="text-sm">
                                                {selectedShipment.shipmentResponse?.toPhone || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách sản phẩm trong đơn */}
                            <div className="mt-6 border-t border-white/10 pt-4">
                                <h3 className="text-sm font-semibold mb-2">Sản phẩm trong đơn</h3>
                                {selectedShipment.orderDetailResponseList?.length ? (
                                    <table className="w-full text-xs sm:text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-2">Sản phẩm</th>
                                                <th className="text-right p-2">Số lượng</th>
                                                <th className="text-right p-2">Đơn giá</th>
                                                <th className="text-right p-2">Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedShipment.orderDetailResponseList.map((d) => {
                                                const unitPrice = Number(d.price || 0);
                                                const qty = Number(d.quantity || 0);
                                                const rowTotal = unitPrice * qty;
                                                const name = d.cardName || 'Thẻ';
                                                const image = d.cardImageUrl;
                                                return (
                                                    <tr key={String(d.orderItemId)} className="border-b border-white/5">
                                                        <td className="p-2">
                                                            <div className="flex items-center gap-2">
                                                                {image ? (
                                                                    <img
                                                                        src={image}
                                                                        alt={name}
                                                                        className="w-10 h-14 rounded object-cover bg-white/5"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-14 rounded bg-white/5 flex items-center justify-center text-lg">
                                                                        🎴
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-xs font-medium line-clamp-2">
                                                                        {name}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-muted-foreground">
                                                                        #{String(d.orderItemId || '').slice(0, 8) || '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-right">{qty}</td>
                                                        <td className="p-2 text-right">
                                                            {unitPrice.toLocaleString('vi-VN')} đ
                                                        </td>
                                                        <td className="p-2 text-right font-semibold">
                                                            {rowTotal.toLocaleString('vi-VN')} đ
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Đơn hàng này chưa có item chi tiết để hiển thị.
                                    </p>
                                )}
                            </div>

                            {/* Tóm tắt tiền giống Shopee */}
                            <div className="mt-4 border-t border-white/10 pt-4 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tổng tiền hàng</span>
                                    <span className="font-semibold">
                                        {(
                                            (selectedShipment.orderDetailResponseList || []).reduce(
                                                (sum, d) =>
                                                    sum +
                                                    Number(d.price || 0) * Number(d.quantity || 0),
                                                0
                                            ) || 0
                                        ).toLocaleString('vi-VN')}{' '}
                                        đ
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Phí vận chuyển</span>
                                    <span className="font-semibold">
                                        {Number(selectedShipment.shipfee || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
                                    <span className="text-sm font-semibold">Thành tiền</span>
                                    <span className="text-base font-bold text-green-300">
                                        {(() => {
                                            const itemsTotal = (selectedShipment.orderDetailResponseList || []).reduce(
                                                (sum, d) =>
                                                    sum +
                                                    Number(d.price || 0) * Number(d.quantity || 0),
                                                0
                                            );
                                            const ship = Number(selectedShipment.shipfee || 0);
                                            return (itemsTotal + ship).toLocaleString('vi-VN');
                                        })()}{' '}
                                        đ
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <Button size="sm" variant="outline" onClick={() => setSelectedShipment(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

