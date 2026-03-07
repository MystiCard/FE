import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { orderApi, OrderItemResponse, ShippingStatus } from '@/utils/api';
import { AlertCircle, Package, Search, Truck, MapPin, Phone, CreditCard, Star } from 'lucide-react';
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
    const [viewMode, setViewMode] = useState<'BUY' | 'SELL'>('BUY');
    const [actionLoading, setActionLoading] = useState(false);
    const [feedbackEditingId, setFeedbackEditingId] = useState<string | null>(null);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const loadOrders = async (pageIndex: number, shippingStatus: UserShippingFilter, mode: 'BUY' | 'SELL') => {
        try {
            setIsLoading(true);
            setError('');
            const pageSize = 10;

            if (shippingStatus === 'ALL') {
                const allResults = await Promise.all(
                    ALL_SHIPPING_STATUSES.map((st) =>
                        (mode === 'BUY'
                            ? orderApi.getByShippingStatus(st, 0, 1000)
                            : orderApi.getByShippingStatusSeller(st, 0, 1000)
                        )
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
                const res =
                    mode === 'BUY'
                        ? await orderApi.getByShippingStatus(shippingStatus, pageIndex, pageSize)
                        : await orderApi.getByShippingStatusSeller(shippingStatus, pageIndex, pageSize);
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
        loadOrders(page, status, viewMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, viewMode, isAuthenticated]);

    const filtered = orders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (o.orderDetailResponseList || []).some((d) =>
            String(d.orderItemId || '').toLowerCase().includes(s)
        );
    });

    if (!isAuthenticated) return null;

    const canConfirmReceive =
        viewMode === 'BUY' &&
        selectedShipment?.shipmentResponse?.shipmentStatus === 'DELIVERED' &&
        selectedShipment?.shipmentResponse?.shipmentId &&
        ((selectedShipment.orderDetailResponseList || []).some(
            (d) => d.orderItemStatus !== 'CANCELLED'
        ) ||
            (selectedShipment.blindBoxDetails?.length ?? 0) > 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text flex items-center gap-2">
                        <Package className="w-7 h-7" />
                        {viewMode === 'BUY' ? 'Đơn mua của tôi' : 'Đơn bán của tôi'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {viewMode === 'BUY'
                            ? 'Xem và theo dõi trạng thái các đơn hàng bạn đã đặt.'
                            : 'Xem và theo dõi trạng thái các đơn hàng bạn đã bán cho người khác.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'BUY' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setViewMode('BUY');
                            setPage(0);
                        }}
                    >
                        Đơn mua
                    </Button>
                    <Button
                        variant={viewMode === 'SELL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setViewMode('SELL');
                            setPage(0);
                        }}
                    >
                        Đơn bán
                    </Button>
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
            <Dialog open={!!selectedShipment} onOpenChange={(open) => { if (!open) { setSelectedShipment(null); setFeedbackEditingId(null); } }}>
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
                                                {viewMode === 'BUY' && <th className="text-left p-2 w-40">Đánh giá</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedShipment.orderDetailResponseList.map((d) => {
                                                const unitPrice = Number(d.price || 0);
                                                const qty = Number(d.quantity || 0);
                                                const rowTotal = unitPrice * qty;
                                                const name = d.cardName || 'Thẻ';
                                                const image = d.cardImageUrl;
                                                const isReceived = d.orderItemStatus === 'RECIEVED' || d.orderItemStatus === 'RECEIVED';
                                                const hasFeedback = d.feedbackRating != null;
                                                const isEditing = feedbackEditingId === d.orderItemId;
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
                                                        {viewMode === 'BUY' && (
                                                            <td className="p-2">
                                                                {hasFeedback ? (
                                                                    <div className="text-xs">
                                                                        <span className="flex items-center gap-0.5 text-yellow-400">
                                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                                <Star key={i} className={`h-3 w-3 ${i <= (d.feedbackRating ?? 0) ? 'fill-current' : ''}`} />
                                                                            ))}
                                                                        </span>
                                                                        {d.feedbackComment && <p className="text-muted-foreground mt-0.5 line-clamp-2">{d.feedbackComment}</p>}
                                                                    </div>
                                                                ) : isReceived ? (
                                                                    isEditing ? (
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-0.5">
                                                                                {[1, 2, 3, 4, 5].map((i) => (
                                                                                    <button
                                                                                        key={i}
                                                                                        type="button"
                                                                                        onClick={() => setFeedbackRating(i)}
                                                                                        className="p-0.5"
                                                                                    >
                                                                                        <Star className={`h-4 w-4 ${i <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}`} />
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Nhận xét (tùy chọn)"
                                                                                value={feedbackComment}
                                                                                onChange={(e) => setFeedbackComment(e.target.value)}
                                                                                className="w-full px-2 py-1 rounded text-xs bg-white/5 border border-white/10"
                                                                            />
                                                                            <div className="flex gap-1">
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-6 text-xs"
                                                                                    disabled={feedbackSubmitting}
                                                                                    onClick={async () => {
                                                                                        if (!d.orderItemId) return;
                                                                                        setFeedbackSubmitting(true);
                                                                                        try {
                                                                                            await orderApi.createFeedback(d.orderItemId, feedbackRating, feedbackComment);
                                                                                            setSelectedShipment((prev) => prev ? {
                                                                                                ...prev,
                                                                                                orderDetailResponseList: (prev.orderDetailResponseList || []).map((x) =>
                                                                                                    x.orderItemId === d.orderItemId
                                                                                                        ? { ...x, feedbackRating, feedbackComment, feedbackCreatedAt: new Date().toISOString() }
                                                                                                        : x
                                                                                                ),
                                                                                            } : null);
                                                                                            setFeedbackEditingId(null);
                                                                                            setFeedbackComment('');
                                                                                            setFeedbackRating(5);
                                                                                        } catch (err) {
                                                                                            alert(err instanceof Error ? err.message : 'Gửi đánh giá thất bại.');
                                                                                        } finally {
                                                                                            setFeedbackSubmitting(false);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    Gửi
                                                                                </Button>
                                                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setFeedbackEditingId(null); setFeedbackComment(''); setFeedbackRating(5); }}>
                                                                                    Hủy
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs"
                                                                            onClick={() => { setFeedbackEditingId(d.orderItemId); setFeedbackRating(5); setFeedbackComment(''); }}
                                                                        >
                                                                            Đánh giá
                                                                        </Button>
                                                                    )
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">—</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (selectedShipment.blindBoxDetails?.length ?? 0) > 0 ? (
                                    <>
                                        <p className="text-xs text-yellow-200/90 mb-2">Giao thẻ từ Hộp bí ẩn</p>
                                        <table className="w-full text-xs sm:text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left p-2">Thẻ</th>
                                                    <th className="text-right p-2">Số lượng</th>
                                                    <th className="text-right p-2">Giá tham khảo</th>
                                                    <th className="text-right p-2">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedShipment.blindBoxDetails.map((card, i) => {
                                                    const price = Number(card.basePrice ?? 0);
                                                    return (
                                                        <tr key={i} className="border-b border-white/5">
                                                            <td className="p-2">
                                                                <div className="flex items-center gap-2">
                                                                    {card.cardImageUrl ? (
                                                                        <img
                                                                            src={card.cardImageUrl}
                                                                            alt={card.cardName || ''}
                                                                            className="w-10 h-14 rounded object-cover bg-white/5"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-10 h-14 rounded bg-white/5 flex items-center justify-center text-lg">
                                                                            🎴
                                                                        </div>
                                                                    )}
                                                                    <span className="text-xs font-medium line-clamp-2">
                                                                        {card.cardName || '—'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-2 text-right">1</td>
                                                            <td className="p-2 text-right">
                                                                {price.toLocaleString('vi-VN')} đ
                                                            </td>
                                                            <td className="p-2 text-right font-semibold">
                                                                {price.toLocaleString('vi-VN')} đ
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Đơn hàng này chưa có item chi tiết để hiển thị.
                                    </p>
                                )}
                            </div>

                            {/* Tóm tắt tiền giống Shopee */}
                            <div className="mt-4 border-t border-white/10 pt-4 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {(selectedShipment.blindBoxDetails?.length ?? 0) > 0
                                            ? 'Tổng giá trị thẻ (tham khảo)'
                                            : 'Tổng tiền hàng'}
                                    </span>
                                    <span className="font-semibold">
                                        {(
                                            (selectedShipment.orderDetailResponseList || []).length > 0
                                                ? (selectedShipment.orderDetailResponseList || []).reduce(
                                                      (sum, d) =>
                                                          sum +
                                                          Number(d.price || 0) * Number(d.quantity || 0),
                                                      0
                                                  )
                                                : (selectedShipment.blindBoxDetails || []).reduce(
                                                      (sum, c) => sum + Number(c.basePrice ?? 0),
                                                      0
                                                  )
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
                                            const itemsTotal =
                                                (selectedShipment.orderDetailResponseList || []).length > 0
                                                    ? (selectedShipment.orderDetailResponseList || []).reduce(
                                                          (sum, d) =>
                                                              sum +
                                                              Number(d.price || 0) * Number(d.quantity || 0),
                                                          0
                                                      )
                                                    : (selectedShipment.blindBoxDetails || []).reduce(
                                                          (sum, c) => sum + Number(c.basePrice ?? 0),
                                                          0
                                                      );
                                            const ship = Number(selectedShipment.shipfee || 0);
                                            const total =
                                                (selectedShipment.blindBoxDetails?.length ?? 0) > 0
                                                    ? ship
                                                    : itemsTotal + ship;
                                            return total.toLocaleString('vi-VN');
                                        })()}{' '}
                                        đ
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                {canConfirmReceive && selectedShipment?.shipmentResponse?.shipmentId && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={actionLoading}
                                        onClick={async () => {
                                            if (!selectedShipment?.shipmentResponse?.shipmentId) return;
                                            setActionLoading(true);
                                            try {
                                                await orderApi.confirmReceive(
                                                    selectedShipment.shipmentResponse.shipmentId
                                                );
                                                await loadOrders(page, status, viewMode);
                                                alert('Đã xác nhận nhận hàng, tiền sẽ được chuyển cho người bán.');
                                                setSelectedShipment(null);
                                            } catch (err) {
                                                alert(
                                                    err instanceof Error
                                                        ? err.message
                                                        : 'Không thể xác nhận nhận hàng.'
                                                );
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                    >
                                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận đã nhận hàng'}
                                    </Button>
                                )}
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

