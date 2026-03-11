import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { listSellerApi, orderApi, OrderItemResponse, ShippingStatus, transactionApi, OrderSummaryResponse, OrderStatus, shipmentApi, TrackingResponse, cardApi, Card, getCardImageUrl } from '@/utils/api';
import { AlertCircle, Package, Search, Truck, MapPin, Phone, CreditCard, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type UserShippingFilter = ShippingStatus | 'ALL';
type BuyOrderFilter =
    | 'ALL'
    | 'UNPAID'
    | 'WAIT_CONFIRM'
    | 'WAIT_PICKUP'
    | 'WAIT_SHIP'
    | 'DELIVERED'
    | 'RETURN'
    | 'CANCELLED';

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

type DraftOrderItem = { listSellerId: string; cardId: string; quantity: number };
const ORDER_ITEMS_STORAGE_KEY = 'marketplace.orderItemsByOrderId';

function loadOrderItemsMap(): Record<string, DraftOrderItem[]> {
    try {
        const raw = localStorage.getItem(ORDER_ITEMS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, DraftOrderItem[]>) : {};
    } catch {
        return {};
    }
}

async function precheckListingAvailability(items: DraftOrderItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
    const byCard = new Map<string, DraftOrderItem[]>();
    for (const it of items) {
        const list = byCard.get(it.cardId) || [];
        list.push(it);
        byCard.set(it.cardId, list);
    }

    for (const [cardId, cardItems] of byCard.entries()) {
        let listingPage;
        try {
            listingPage = await listSellerApi.getListingsByCardId(cardId, 0, 100);
        } catch (e) {
            return { ok: false, message: e instanceof Error ? e.message : 'Không kiểm tra được tồn kho.' };
        }
        const listings = (listingPage?.content ?? []) as any[];
        for (const it of cardItems) {
            const listing = listings.find((l) => String(l.listSellerId) === String(it.listSellerId));
            if (!listing) {
                return { ok: false, message: `Tin bán không còn tồn tại (cardId=${cardId}). Vui lòng tạo đơn mới.` };
            }
            const available = Number(listing.quantity ?? 0);
            if (available < Number(it.quantity)) {
                return {
                    ok: false,
                    message: `Không đủ số lượng để thanh toán. Còn ${available} (yêu cầu ${it.quantity}) cho cardId=${cardId}. Vui lòng tạo đơn mới.`,
                };
            }
        }
    }

    return { ok: true };
}

const SHIPPING_FILTERS: { value: UserShippingFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'ASIGNED', label: 'Chờ lấy hàng' },
    { value: 'PICKED_UP', label: 'Đã lấy hàng' },
    { value: 'IN_TRANSIT', label: 'Đang giao' },
    { value: 'DELIVERED', label: 'Đã giao kho' },
    { value: 'RECEIVED', label: 'Đã giao' },
    { value: 'FAILED', label: 'Giao thất bại' },
    { value: 'LOST', label: 'Thất lạc' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const BUY_FILTERS: { value: BuyOrderFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'UNPAID', label: 'Chưa thanh toán' },
    { value: 'WAIT_CONFIRM', label: 'Chờ xác nhận' },
    { value: 'WAIT_PICKUP', label: 'Chờ lấy hàng' },
    { value: 'WAIT_SHIP', label: 'Chờ giao' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'RETURN', label: 'Trả hàng' },
    { value: 'CANCELLED', label: 'Đã hủy' },
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
    const [viewMode, setViewMode] = useState<'BUY' | 'UNPAID' | 'SELL'>('BUY');
    const [actionLoading, setActionLoading] = useState(false);
    const [buyOrders, setBuyOrders] = useState<OrderSummaryResponse[]>([]);
    const [buyLoading, setBuyLoading] = useState(false);
    const [buyError, setBuyError] = useState<string>('');
    const [buyFilter, setBuyFilter] = useState<BuyOrderFilter>('ALL');
    const [unpaidOrders, setUnpaidOrders] = useState<OrderSummaryResponse[]>([]);
    const [unpaidLoading, setUnpaidLoading] = useState(false);
    const [unpaidError, setUnpaidError] = useState<string>('');
    const [unpaidActionLoadingId, setUnpaidActionLoadingId] = useState<string | null>(null);
    const [unpaidBulkLoading, setUnpaidBulkLoading] = useState(false);
    const [feedbackEditingId, setFeedbackEditingId] = useState<string | null>(null);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
    const [detailItems, setDetailItems] = useState<(OrderItemResponse['orderDetailResponseList'][number] & { cardName?: string; cardImageUrl?: string })[]>([]);
    const [detailBlindBoxCards, setDetailBlindBoxCards] = useState<OrderItemResponse['blindBoxDetails'] | null>(null);
    const [detailBlindBoxShipment, setDetailBlindBoxShipment] = useState<OrderItemResponse['shipmentResponse'] | null>(null);
    const [detailShipments, setDetailShipments] = useState<Record<string, { shipmentId: string; status: string }[]>>({});
    const [detailTrackings, setDetailTrackings] = useState<Record<string, TrackingResponse[]>>({});
    const [detailLoading, setDetailLoading] = useState(false);
    // Dùng cho nút "Xác nhận đã nhận hàng" trong dialog theo orderId (Đơn mua)
    const firstDetailOrderItemId =
        detailItems.length > 0 ? String(detailItems[0].orderItemId) : undefined;
    const firstDetailShipmentId =
        firstDetailOrderItemId && detailShipments[firstDetailOrderItemId]?.length
            ? detailShipments[firstDetailOrderItemId][0].shipmentId
            : undefined;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const loadOrders = async (pageIndex: number, shippingStatus: UserShippingFilter, mode: 'BUY' | 'UNPAID' | 'SELL') => {
        try {
            setIsLoading(true);
            setError('');
            const pageSize = 10;

            if (mode === 'UNPAID') {
                setUnpaidLoading(true);
                setUnpaidError('');
                const res = await orderApi.getMyOrders('CREATED', pageIndex, pageSize);
                setUnpaidOrders(res.content ?? []);
                setTotalPages(res.totalPages || 1);
                setOrders([]); // tránh lẫn dữ liệu table cũ
                setBuyOrders([]);
                return;
            }

            if (mode === 'BUY') {
                // Buyer: xem danh sách order của tôi → /api/orders/my-orders (lọc theo orderStatus)
                setBuyLoading(true);
                setBuyError('');
                let orderStatusFilter: OrderStatus | undefined;
                if (buyFilter === 'UNPAID') {
                    orderStatusFilter = 'CREATED';
                } else if (
                    buyFilter === 'WAIT_CONFIRM' ||
                    buyFilter === 'WAIT_PICKUP' ||
                    buyFilter === 'WAIT_SHIP'
                ) {
                    orderStatusFilter = 'PAID';
                } else if (buyFilter === 'DELIVERED') {
                    orderStatusFilter = 'COMPLETED';
                } else if (buyFilter === 'CANCELLED') {
                    orderStatusFilter = 'CANCELLED';
                } else {
                    // TẤT CẢ hoặc TRẢ HÀNG: hiện tại không có orderStatus riêng → không filter theo status
                    orderStatusFilter = undefined;
                }
                const res = await orderApi.getMyOrders(orderStatusFilter, pageIndex, pageSize);
                setBuyOrders(res.content ?? []);
                setTotalPages(res.totalPages || 1);
                setOrders([]); // tránh lẫn dữ liệu table shipment/seller
            } else {
                // Seller: xem các đơn trả thẻ về cho tôi (my-card-return) theo trạng thái shipment.
                if (shippingStatus === 'ALL') {
                    const allResults = await Promise.all(
                        ALL_SHIPPING_STATUSES.map((st) =>
                            orderApi
                                .getMyReturnOrderItem(st, 0, 1000)
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
                    const res = await orderApi.getMyReturnOrderItem(shippingStatus, pageIndex, pageSize);
                    setOrders(res.content ?? []);
                    setTotalPages(res.totalPages || 1);
                }
            }
        } catch (e) {
            if (mode === 'UNPAID') {
                setUnpaidError(e instanceof Error ? e.message : 'Không tải được danh sách đơn chưa thanh toán');
                setUnpaidOrders([]);
                setTotalPages(1);
            } else if (mode === 'BUY') {
                setBuyError(e instanceof Error ? e.message : 'Không tải được danh sách đơn mua');
                setBuyOrders([]);
                setTotalPages(1);
            } else {
                setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn hàng');
                setOrders([]);
                setTotalPages(1);
            }
        } finally {
            setIsLoading(false);
            setUnpaidLoading(false);
            setBuyLoading(false);
        }
    };

    const loadOrderDetail = async (orderId: string) => {
        setDetailOrderId(orderId);
        setDetailLoading(true);
        setDetailItems([]);
        setDetailShipments({});
        setDetailTrackings({});
        setDetailBlindBoxCards(null);
        setDetailBlindBoxShipment(null);
        try {
            const page = await orderApi.getOrderItemsByOrderId(orderId, 0, 100);
            const content = page.content ?? [];

            // Nếu là đơn Hộp bí ẩn: không có orderDetailResponseList nhưng có blindBoxDetails
            const blindBoxEntry = content.find((o) => (o.blindBoxDetails?.length ?? 0) > 0);
            const rawItems = content.flatMap((o) => o.orderDetailResponseList || []);

            if (rawItems.length === 0 && blindBoxEntry && (blindBoxEntry.blindBoxDetails?.length ?? 0) > 0) {
                setDetailBlindBoxCards(blindBoxEntry.blindBoxDetails || []);
                setDetailBlindBoxShipment(blindBoxEntry.shipmentResponse || null);
                setDetailItems([]);
                setDetailShipments({});
                setDetailTrackings({});
                return;
            }
            // Ưu tiên dùng cardResponse từ BE; nếu thiếu thì mới gọi cardApi
            const enrichedItems: (OrderItemResponse['orderDetailResponseList'][number] & { cardName?: string; cardImageUrl?: string; cardId?: string })[] =
                rawItems.map((it: any) => {
                    const cardResp = it.cardResponse as { name?: string; imageUrl?: any } | undefined;
                    const nameFromBe = cardResp?.name;
                    const imgFromBe = cardResp ? getCardImageUrl(cardResp as any) : undefined;
                    return {
                        ...it,
                        cardName: it.cardName ?? nameFromBe,
                        cardImageUrl: it.cardImageUrl ?? imgFromBe,
                    };
                });
            // Nếu thiếu tên/ảnh, cố gắng join thêm từ cardApi bằng cardId (nếu có)
            for (let i = 0; i < enrichedItems.length; i++) {
                const it = enrichedItems[i];
                const hasDisplay = it.cardName && it.cardImageUrl;
                const cardId = ((it as any).cardResponse?.cardId as string | undefined) || ((it as any).cardId as string | undefined);
                if (!hasDisplay && cardId) {
                    try {
                        const card: Card = await cardApi.getCardById(cardId);
                        const imageUrl =
                            typeof card.imageUrl === 'string'
                                ? card.imageUrl
                                : Array.isArray(card.imageUrl) && card.imageUrl.length > 0
                                ? card.imageUrl[0]?.imageUrl
                                : undefined;
                        enrichedItems[i] = {
                            ...it,
                            cardName: it.cardName || card.name,
                            cardImageUrl: it.cardImageUrl || imageUrl,
                        };
                    } catch {
                        // ignore nếu cardApi lỗi
                    }
                }
            }
            setDetailItems(enrichedItems);
            const shipmentsByItem: Record<string, { shipmentId: string; status: string }[]> = {};
            for (const it of enrichedItems) {
                const id = String(it.orderItemId);
                try {
                    const ships = await shipmentApi.getByOrderItemId(id);
                    shipmentsByItem[id] =
                        (ships || []).map((s) => ({
                            shipmentId: String(s.shipmentId),
                            status: String(s.shipmentStatus),
                        }));
                } catch {
                    shipmentsByItem[id] = [];
                }
            }
            setDetailShipments(shipmentsByItem);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Không tải được chi tiết đơn hàng.');
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        loadOrders(page, status, viewMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, viewMode, buyFilter, isAuthenticated]);

    const filtered = orders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return (o.orderDetailResponseList || []).some((d) =>
            String(d.orderItemId || '').toLowerCase().includes(s)
        );
    });

    const filteredBuy = buyOrders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return String(o.orderId || '').toLowerCase().includes(s);
    });

    const filteredUnpaid = unpaidOrders.filter((o) => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return String(o.orderId || '').toLowerCase().includes(s);
    });

    if (!isAuthenticated) return null;

    // Quyền xác nhận nhận hàng sẽ được BE quyết định qua /orders/can-do/{orderItemId}.
    const firstOrderItemId =
        selectedShipment?.orderDetailResponseList && selectedShipment.orderDetailResponseList.length > 0
            ? selectedShipment.orderDetailResponseList[0].orderItemId
            : undefined;

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
                        variant={viewMode === 'UNPAID' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setViewMode('UNPAID');
                            setPage(0);
                        }}
                    >
                        Chưa thanh toán
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

            <UICard className="glass-card-strong">
                <CardContent className="p-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={viewMode === 'SELL' ? 'Tìm theo mã orderItemId...' : 'Tìm theo mã orderId...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                    </div>
                    {viewMode === 'BUY' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-2">
                                {BUY_FILTERS.map((f) => (
                                    <Button
                                        key={f.value}
                                        type="button"
                                        size="sm"
                                        variant={buyFilter === f.value ? 'default' : 'outline'}
                                        className="text-xs"
                                        onClick={() => {
                                            setPage(0);
                                            setBuyFilter(f.value);
                                        }}
                                    >
                                        {f.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                    {viewMode === 'SELL' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-2">
                                {SHIPPING_FILTERS.map((f) => (
                                    <Button
                                        key={f.value}
                                        type="button"
                                        size="sm"
                                        variant={status === f.value ? 'default' : 'outline'}
                                        className="text-xs"
                                        onClick={() => {
                                            setPage(0);
                                            setStatus(f.value);
                                        }}
                                    >
                                        {f.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </UICard>

            <UICard className="glass-card-strong">
                <CardHeader>
                    <CardTitle>
                        {viewMode === 'BUY'
                            ? `Đơn mua (${filteredBuy.length})`
                            : viewMode === 'UNPAID'
                            ? `Đơn chưa thanh toán (${filteredUnpaid.length})`
                            : `Đơn hàng (${filtered.length})`}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(viewMode === 'BUY' ? buyLoading : viewMode === 'UNPAID' ? unpaidLoading : isLoading) ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải đơn hàng...</div>
                        </div>
                    ) : (viewMode === 'BUY' ? buyError : viewMode === 'UNPAID' ? unpaidError : error) ? (
                        <div className="flex items-center gap-2 text-sm text-red-400 py-4">
                            <AlertCircle className="w-4 h-4" />
                            <span>{viewMode === 'BUY' ? buyError : viewMode === 'UNPAID' ? unpaidError : error}</span>
                        </div>
                    ) : (viewMode === 'BUY'
                        ? filteredBuy.length === 0
                        : viewMode === 'UNPAID'
                        ? filteredUnpaid.length === 0
                        : filtered.length === 0) ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            Bạn chưa có đơn hàng nào.
                        </div>
                    ) : (
                        viewMode === 'BUY' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-3">Order</th>
                                            <th className="text-left p-3">Ngày tạo</th>
                                            <th className="text-left p-3">Trạng thái</th>
                                            <th className="text-right p-3">Tổng tiền</th>
                                            <th className="text-right p-3">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBuy.map((o) => (
                                            <tr key={o.orderId} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3 font-mono text-xs">#{String(o.orderId).slice(0, 8)}</td>
                                                <td className="p-3 text-xs text-muted-foreground">
                                                    {o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '—'}
                                                </td>
                                                <td className="p-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-white">
                                                        <Package className="w-3 h-3" />
                                                        {o.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {Number(o.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                loadOrderDetail(String(o.orderId));
                                                            }}
                                                        >
                                                            Xem chi tiết
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={actionLoading}
                                                            onClick={async () => {
                                                                if (!confirm(`Hủy đơn #${String(o.orderId).slice(0, 8)}?`)) return;
                                                                setActionLoading(true);
                                                                try {
                                                                    const can = await orderApi.canCancelOrder(String(o.orderId));
                                                                    if (!can) {
                                                                        alert('Backend không cho phép hủy đơn này (can-cancle-order = false).');
                                                                        return;
                                                                    }
                                                                    await orderApi.cancelOrder(String(o.orderId));
                                                                    await loadOrders(page, status, viewMode);
                                                                } catch (err) {
                                                                    alert(err instanceof Error ? err.message : 'Không thể hủy đơn.');
                                                                } finally {
                                                                    setActionLoading(false);
                                                                }
                                                            }}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : viewMode === 'UNPAID' ? (
                            <div className="overflow-x-auto">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="text-xs text-muted-foreground">
                                        Đây là các đơn đã tạo từ checkout nhưng chưa thanh toán (status <span className="font-mono">CREATED</span>).
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={unpaidBulkLoading || filteredUnpaid.length === 0}
                                        onClick={async () => {
                                            if (!confirm('Hủy TẤT CẢ đơn chưa thanh toán?')) return;
                                            setUnpaidBulkLoading(true);
                                            try {
                                                const ids = filteredUnpaid.map((o) => String(o.orderId));
                                                // Best-effort: kiểm tra quyền trước rồi hủy lần lượt
                                                for (const id of ids) {
                                                    try {
                                                        const can = await orderApi.canCancelOrder(id);
                                                        if (!can) {
                                                            // skip nếu BE không cho hủy
                                                            continue;
                                                        }
                                                        await orderApi.cancelOrder(id);
                                                    } catch {
                                                        // ignore
                                                    }
                                                }
                                                await loadOrders(page, status, viewMode);
                                            } finally {
                                                setUnpaidBulkLoading(false);
                                            }
                                        }}
                                    >
                                        {unpaidBulkLoading ? 'Đang hủy...' : 'Hủy tất cả'}
                                    </Button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-3">Order</th>
                                            <th className="text-left p-3">Ngày tạo</th>
                                            <th className="text-left p-3">Trạng thái</th>
                                            <th className="text-right p-3">Tổng tiền</th>
                                            <th className="text-right p-3">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUnpaid.map((o) => (
                                            <tr key={o.orderId} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3 font-mono text-xs">#{String(o.orderId).slice(0, 8)}</td>
                                                <td className="p-3 text-xs text-muted-foreground">
                                                    {o.orderDate ? new Date(o.orderDate).toLocaleString('vi-VN') : '—'}
                                                </td>
                                                <td className="p-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-200">
                                                        <Package className="w-3 h-3" />
                                                        {o.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {Number(o.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            disabled={unpaidBulkLoading || unpaidActionLoadingId === o.orderId}
                                                            onClick={async () => {
                                                                setUnpaidActionLoadingId(String(o.orderId));
                                                                try {
                                                                    const map = loadOrderItemsMap();
                                                                    const items = map[String(o.orderId)];
                                                                    if (Array.isArray(items) && items.length > 0) {
                                                                        const check = await precheckListingAvailability(items);
                                                                        if (!check.ok) {
                                                                            alert(check.message);
                                                                            return;
                                                                        }
                                                                    } else {
                                                                        // Không có mapping listSellerId → không thể check chính xác theo seller
                                                                        if (!confirm('Không kiểm tra được tồn kho theo seller (thiếu dữ liệu). Vẫn thanh toán?')) {
                                                                            return;
                                                                        }
                                                                    }
                                                                    const tx = await transactionApi.payOrderWithWallet(String(o.orderId));
                                                                    window.dispatchEvent(new CustomEvent('wallet-updated'));
                                                                    const st = tx?.statusTransaction ?? 'PENDING';
                                                                    alert(
                                                                        st === 'SUCCESS'
                                                                            ? 'Thanh toán thành công.'
                                                                            : st === 'PENDING'
                                                                            ? 'Giao dịch đang xử lý. Vui lòng kiểm tra trong Ví.'
                                                                            : `Giao dịch: ${st}`
                                                                    );
                                                                    await loadOrders(page, status, viewMode);
                                                                } catch (err) {
                                                                    alert(err instanceof Error ? err.message : 'Không thể thanh toán.');
                                                                } finally {
                                                                    setUnpaidActionLoadingId(null);
                                                                }
                                                            }}
                                                        >
                                                            Thanh toán
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={unpaidBulkLoading || unpaidActionLoadingId === o.orderId}
                                                            onClick={async () => {
                                                                if (!confirm(`Hủy đơn #${String(o.orderId).slice(0, 8)}?`)) return;
                                                                setUnpaidActionLoadingId(String(o.orderId));
                                                                try {
                                                                    const can = await orderApi.canCancelOrder(String(o.orderId));
                                                                    if (!can) {
                                                                        alert('Backend không cho phép hủy đơn này (can-cancle-order = false).');
                                                                        return;
                                                                    }
                                                                    await orderApi.cancelOrder(String(o.orderId));
                                                                    await loadOrders(page, status, viewMode);
                                                                } catch (err) {
                                                                    alert(err instanceof Error ? err.message : 'Không thể hủy đơn.');
                                                                } finally {
                                                                    setUnpaidActionLoadingId(null);
                                                                }
                                                            }}
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                        )
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
            </UICard>
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
                                <DialogDescription>
                                    Thông tin shipment, địa chỉ nhận và các item trong đơn.
                                </DialogDescription>
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
                                                {selectedShipment.blindBoxDetails?.map((card, i) => {
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
                                {viewMode === 'BUY' &&
                                    selectedShipment?.shipmentResponse?.shipmentId && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            disabled={actionLoading}
                                            onClick={async () => {
                                                if (!selectedShipment?.shipmentResponse?.shipmentId) return;
                                                setActionLoading(true);
                                                try {
                                                    // Đơn sàn giao dịch: có orderDetailResponseList => check quyền trước.
                                                    if (
                                                        firstOrderItemId &&
                                                        (selectedShipment.orderDetailResponseList || []).length > 0
                                                    ) {
                                                        const canDo = await orderApi.canDo(String(firstOrderItemId));
                                                        if (!canDo.canConfirmRecieve) {
                                                            alert('Đơn này hiện không thể xác nhận nhận hàng.');
                                                            return;
                                                        }
                                                    }
                                                    await orderApi.confirmReceive(
                                                        selectedShipment.shipmentResponse.shipmentId
                                                    );
                                                    // Báo cho WalletPage reload lại số dư + lịch sử
                                                    try {
                                                        window.dispatchEvent(new Event('wallet-updated'));
                                                    } catch {
                                                        // ignore
                                                    }
                                                    await loadOrders(page, status, viewMode);
                                                    alert(
                                                        (selectedShipment.blindBoxDetails?.length ?? 0) > 0
                                                            ? 'Đã xác nhận nhận thẻ từ Hộp bí ẩn.'
                                                            : 'Đã xác nhận nhận hàng, tiền sẽ được chuyển cho người bán.'
                                                    );
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

            {/* Order detail dialog by orderId (BUY tab) */}
            <Dialog open={!!detailOrderId} onOpenChange={(open) => { if (!open) { setDetailOrderId(null); } }}>
                <DialogContent className="w-[96vw] max-w-5xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Chi tiết đơn hàng #{detailOrderId?.slice(0, 8)}
                        </DialogTitle>
                        <DialogDescription>
                            Sản phẩm, shipment và trạng thái giao hàng cho đơn này.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            Đang tải chi tiết đơn hàng...
                        </div>
                    ) : detailItems.length === 0 && !(detailBlindBoxCards && detailBlindBoxCards.length > 0) ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            Không tìm thấy order item cho đơn này.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {detailBlindBoxCards && detailBlindBoxCards.length > 0 ? (
                                <>
                                    <h3 className="text-sm font-semibold mb-2">Giao thẻ từ Hộp bí ẩn</h3>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-2">Thẻ</th>
                                                <th className="text-right p-2">Giá tham khảo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailBlindBoxCards.map((card, idx) => {
                                                const price = Number(card.basePrice ?? 0);
                                                return (
                                                    <tr key={idx} className="border-b border-white/5">
                                                        <td className="p-2">
                                                            <div className="flex items-center gap-2">
                                                                {card.cardImageUrl ? (
                                                                    <img
                                                                        src={card.cardImageUrl}
                                                                        alt={card.cardName || ''}
                                                                        className="w-12 h-18 rounded object-cover bg-white/5"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-18 rounded bg-white/5 flex items-center justify-center text-lg">
                                                                        🎴
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-medium line-clamp-2">
                                                                    {card.cardName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-right font-semibold">
                                                            {price.toLocaleString('vi-VN')} đ
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {detailBlindBoxShipment && (
                                        <div className="mt-4 text-sm space-y-1">
                                            <div>
                                                <span className="font-semibold">Địa chỉ nhận:</span>{' '}
                                                <span>{detailBlindBoxShipment.toAddress}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">SĐT:</span>{' '}
                                                <span>{detailBlindBoxShipment.toPhone}</span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Phí ship:</span>{' '}
                                                <span>
                                                    {Number(detailBlindBoxShipment.shipmentFee || 0).toLocaleString('vi-VN')}{' '}
                                                    đ
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Trạng thái:</span>{' '}
                                                <span>{detailBlindBoxShipment.shipmentStatus}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-2">Sản phẩm</th>
                                        <th className="text-right p-2">Số lượng</th>
                                        <th className="text-right p-2">Đơn giá</th>
                                        <th className="text-right p-2">Trạng thái</th>
                                        <th className="text-left p-2">Shipment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailItems.map((it) => {
                                        const id = String(it.orderItemId);
                                        const ships = detailShipments[id] || [];
                                        const name = it.cardName || 'Thẻ';
                                        const image = it.cardImageUrl;
                                        return (
                                            <tr key={id} className="border-b border-white/5 align-top">
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        {image ? (
                                                            <img
                                                                src={image}
                                                                alt={name}
                                                                className="w-20 h-28 rounded-lg object-contain bg-white/5"
                                                            />
                                                        ) : (
                                                            <div className="w-20 h-28 rounded-lg bg-white/5 flex items-center justify-center text-2xl">
                                                                🎴
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-sm font-semibold line-clamp-2">
                                                                {name}
                                                            </div>
                                                            <div className="text-xs font-mono text-muted-foreground">
                                                                #{id.slice(0, 8)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right">{Number(it.quantity ?? 0)}</td>
                                                <td className="p-2 text-right">
                                                    {Number(it.price ?? 0).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="p-2 text-right">{it.orderItemStatus}</td>
                                                <td className="p-2">
                                                    {ships.length === 0 ? (
                                                        '—'
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {ships.map((s) => {
                                                                const tid = s.shipmentId;
                                                                const trackings = detailTrackings[tid] || [];
                                                                return (
                                                                    <div key={tid} className="border border-white/10 rounded-md p-2">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="font-mono">
                                                                                {tid.slice(0, 8)}
                                                                            </span>
                                                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary-100">
                                                                                {s.status}
                                                                            </span>
                                                                        </div>
                                                                        {trackings.length === 0 ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="mt-2 text-[10px] px-2 py-1 h-auto"
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        const list = await shipmentApi.getTrackingsByShipmentId(tid);
                                                                                        setDetailTrackings(prev => ({ ...prev, [tid]: list || [] }));
                                                                                    } catch (e) {
                                                                                        alert(e instanceof Error ? e.message : 'Không tải được tracking.');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Xem hành trình
                                                                            </Button>
                                                                        ) : (
                                                                            <ul className="mt-2 space-y-1 text-[10px]">
                                                                                {trackings
                                                                                    .slice()
                                                                                    .sort((a, b) => (a.createAt || '').localeCompare(b.createAt || ''))
                                                                                    .map((t) => (
                                                                                        <li key={t.trackingId} className="flex flex-col">
                                                                                            <span className="text-muted-foreground">
                                                                                                {t.createAt
                                                                                                    ? new Date(t.createAt).toLocaleString('vi-VN')
                                                                                                    : ''}
                                                                                            </span>
                                                                                            <span>{t.shippingStatus}</span>
                                                                                            {t.note && (
                                                                                                <span className="text-muted-foreground">
                                                                                                    Ghi chú: {t.note}
                                                                                                </span>
                                                                                            )}
                                                                                        </li>
                                                                                    ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            )}
                            <div className="mt-4 flex justify-end gap-2">
                                {viewMode === 'BUY' &&
                                    firstDetailOrderItemId &&
                                    firstDetailShipmentId && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            disabled={actionLoading}
                                            onClick={async () => {
                                                setActionLoading(true);
                                                try {
                                                    const canDo = await orderApi.canDo(
                                                        String(firstDetailOrderItemId)
                                                    );
                                                    if (!canDo.canConfirmRecieve) {
                                                        alert('Đơn này hiện không thể xác nhận nhận hàng.');
                                                        return;
                                                    }
                                                    await orderApi.confirmReceive(firstDetailShipmentId);
                                                    try {
                                                        window.dispatchEvent(new Event('wallet-updated'));
                                                    } catch {
                                                        // ignore
                                                    }
                                                    await loadOrders(page, status, viewMode);
                                                    alert('Đã xác nhận nhận hàng, tiền sẽ được chuyển cho người bán.');
                                                    setDetailOrderId(null);
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
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

