import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';
import { listSellerApi, orderApi, OrderItemResponse, OrderDetailResponse, ShippingStatus, transactionApi, OrderSummaryResponse, OrderStatus, shipmentApi, TrackingResponse, cardApi, Card, getCardImageUrl, returnRequestApi, ReturnRequestItem, ReturnRequestStatus, ReturnRequestCreate, userApi, UserProfile, blindBoxApi, BlindBoxHistoryItem } from '@/utils/api';
import { AlertCircle, Package, Search, Truck, MapPin, Phone, CreditCard, Star, Info } from 'lucide-react';
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
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'RECEIVED', label: 'Đã nhận' },
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
    // { value: 'RETURN', label: 'Trả hàng' }, // Ẩn filter Trả hàng ở tab Đơn mua (đã có tab riêng "Trả hàng")
    { value: 'CANCELLED', label: 'Đã hủy' },
];

// Nhãn tiếng Việt cho trạng thái đơn hàng
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    CREATED: 'Chưa thanh toán',
    PAID: 'Đã thanh toán',
    PARTIAL_COMPLETED: 'Hoàn tất một phần',
    COMPLETED: 'Đã hoàn tất',
    PARTIAL_CANCELLED: 'Hủy một phần',
    CANCELLED: 'Đã hủy',
};

// Nhãn tiếng Việt cho trạng thái giao hàng
const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
    PENDING: 'Chờ xử lý',
    ASIGNED: 'Đã gán shipper',
    PICKED_UP: 'Đã lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    RECEIVED: 'Đã nhận',
    FAILED: 'Giao thất bại',
    LOST: 'Thất lạc',
    CANCELLED: 'Đã hủy',
};

// Nhãn tiếng Việt cho trạng thái yêu cầu trả hàng
const RETURN_STATUS_LABELS: Record<ReturnRequestStatus, string> = {
    REQUESTED: 'Đang chờ xử lý',
    APPROVED: 'Đã chấp nhận trả',
    PAID: 'Đã thanh toán phí ship',
    REJECTED: 'Đã từ chối',
    CANCELED: 'Đã hủy yêu cầu',
};

// Tách chuỗi địa chỉ: tỉnh, quận/huyện, phường/xã (reuse logic từ trang checkout sàn).
function parseAddressParts(address: string): { provinceName: string; districtName: string; wardName: string } {
    const empty = { provinceName: '', districtName: '', wardName: '' };
    if (!address || !address.trim()) return empty;
    const parts = address
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return empty;
    const provinceName = parts[parts.length - 1] ?? '';
    const districtName = parts.length >= 2 ? (parts[parts.length - 2] ?? '') : '';
    const wardPrefixes = ['Phường', 'Phuong', 'Xã', 'Xa', 'Thị trấn', 'Thi tran'];
    let wardName = '';
    for (const p of parts) {
        const lower = p.toLowerCase();
        if (wardPrefixes.some((pre) => lower.includes(pre.toLowerCase()))) {
            wardName = p;
            break;
        }
    }
    if (!wardName && parts.length >= 3) wardName = parts[parts.length - 3] ?? '';
    return { provinceName, districtName, wardName };
}

// Tìm provinceId GHN từ tên tỉnh.
function findProvinceIdByName(provinces: { ProvinceID?: number; ProvinceName?: string }[], name: string): number | '' {
    if (!name || !provinces.length) return '';
    const normalized = name.toLowerCase().trim();
    const found = provinces.find((p) => {
        const pName = (p.ProvinceName ?? '').trim().toLowerCase();
        return pName === normalized || pName.includes(normalized) || normalized.includes(pName);
    });
    return found != null && found.ProvinceID != null ? Number(found.ProvinceID) : '';
}

// Tìm districtId GHN từ tên quận/huyện.
function findDistrictIdByName(
    districts: { DistrictID?: number; DistrictName?: string }[],
    name: string,
): number | '' {
    if (!name || !districts.length) return '';
    const normalized = name.toLowerCase().trim();
    const found = districts.find((d) => {
        const dName = (d.DistrictName ?? '').trim().toLowerCase();
        return dName === normalized || dName.includes(normalized) || normalized.includes(dName);
    });
    return found != null && found.DistrictID != null ? Number(found.DistrictID) : '';
}

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
    const [viewMode, setViewMode] = useState<'BUY' | 'UNPAID' | 'SELL' | 'PENDING_SELL' | 'RETURNS'>('BUY');
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
    const [pendingFeedbackOrderId, setPendingFeedbackOrderId] = useState<string | null>(null);
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
    const [detailCanReturnByShipmentId, setDetailCanReturnByShipmentId] = useState<Record<string, boolean>>({});
    const [detailCheckingCanReturn, setDetailCheckingCanReturn] = useState(false);

    // Return/Refund state
    const [returnTab, setReturnTab] = useState<'MY' | 'RECEIVED'>('MY');
    const [returnStatusFilter, setReturnStatusFilter] = useState<ReturnRequestStatus | 'ALL'>('ALL');
    const [returnPage, setReturnPage] = useState(0);
    const [returnTotalPages, setReturnTotalPages] = useState(1);
    const [returnLoading, setReturnLoading] = useState(false);
    const [returnError, setReturnError] = useState('');
    const [returnList, setReturnList] = useState<ReturnRequestItem[]>([]);
    const [returnActions, setReturnActions] = useState<Record<string, { canCancle?: boolean; canjectOrApproved?: boolean; canPayment?: boolean }>>({});
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequestItem | null>(null);

    const [returnCreateOpen, setReturnCreateOpen] = useState(false);
    const [returnCreateSubmitting, setReturnCreateSubmitting] = useState(false);
    const [returnCreateShipmentId, setReturnCreateShipmentId] = useState<string | null>(null);
    const [returnCreateItemIds, setReturnCreateItemIds] = useState<string[]>([]);
    const [returnCreateReason, setReturnCreateReason] = useState('');
    const [returnCreateReasonPreset, setReturnCreateReasonPreset] = useState<'PRESET' | 'OTHER'>('PRESET');
    const [returnCreateSendAddress, setReturnCreateSendAddress] = useState('');
    const [returnCreateAddressPreset, setReturnCreateAddressPreset] = useState<'PROFILE' | 'CUSTOM'>('PROFILE');
    const [returnCreateSendDistrictId, setReturnCreateSendDistrictId] = useState<number>(0);
    const [returnCreateSendWardId, setReturnCreateSendWardId] = useState<number>(0);
    const [returnCreateSendPhone, setReturnCreateSendPhone] = useState('');
    const [returnCreateFiles, setReturnCreateFiles] = useState<File[]>([]);
    // GHN master data cho form trả hàng (làm tương tự trang checkout sàn giao dịch)
    const [returnProvinces, setReturnProvinces] = useState<any[]>([]);
    const [returnDistricts, setReturnDistricts] = useState<any[]>([]);
    const [returnWards, setReturnWards] = useState<any[]>([]);
    const [returnProvinceId, setReturnProvinceId] = useState<number | ''>('');
    const [returnParsedAddress, setReturnParsedAddress] = useState<{ provinceName: string; districtName: string; wardName: string }>({
        provinceName: '',
        districtName: '',
        wardName: '',
    });
    const [canReturnSelectedShipment, setCanReturnSelectedShipment] = useState<boolean>(false);
    const [checkingCanReturn, setCheckingCanReturn] = useState(false);
    const [returnCreateItems, setReturnCreateItems] = useState<Array<{ orderItemId: string; cardName?: string; cardImageUrl?: string; quantity?: number; price?: number }>>([]);
    const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
    const [returnShowRefundDetail, setReturnShowRefundDetail] = useState(false);
    // Seller: đơn chờ duyệt (pendings)
    const [pendingList, setPendingList] = useState<OrderDetailResponse[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingError, setPendingError] = useState('');
    const [pendingPage, setPendingPage] = useState(0);
    const [pendingTotalPages, setPendingTotalPages] = useState(1);
    const [approvingOrderItemId, setApprovingOrderItemId] = useState<string | null>(null);
    const [returnShowReasonDetail, setReturnShowReasonDetail] = useState(false);
    // Thông tin bổ sung cho list Đơn mua: join thêm item/shipper từ API chi tiết theo orderId
    const [buyOrderExtras, setBuyOrderExtras] = useState<
        Record<
            string,
            {
                loaded?: boolean;
                sellerName?: string;
                firstItemName?: string;
                firstItemImage?: string;
                firstItemQty?: number;
                firstItemPrice?: number;
                shipmentStatus?: string;
                shipmentId?: string;
                firstOrderItemId?: string;
            }
        >
    >({});
    const [toasts, setToasts] = useState<Array<{ id: string; title: string; description?: string; variant?: 'default' | 'success' | 'error' | 'warning' }>>([]);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description?: string; onConfirm?: () => void }>({
        open: false,
        title: '',
    });
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

    useEffect(() => {
        if (!isAuthenticated) return;
        // Load profile once for autofill return form (address/phone/districtId)
        userApi
            .getMyProfile()
            .then((p) => setMyProfile(p))
            .catch(() => setMyProfile(null));
    }, [isAuthenticated]);

    // Load GHN provinces/districts cho form trả hàng (lấy từ địa chỉ trong My Info, giống trang checkout sàn)
    useEffect(() => {
        if (!myProfile) return;
        const load = async () => {
            try {
                const prov = await shipmentApi.getProvinces().catch(() => []);
                const list = Array.isArray(prov) ? prov : [];
                setReturnProvinces(list);
                const parts = parseAddressParts(myProfile.address || '');
                setReturnParsedAddress(parts);
                const pid = findProvinceIdByName(list, parts.provinceName);
                if (pid !== '') setReturnProvinceId(pid);
            } catch {
                setReturnProvinces([]);
            }
        };
        void load();
    }, [myProfile]);

    // Khi chọn tỉnh, load danh sách quận/huyện GHN và gợi ý Send District Id từ địa chỉ (nếu có)
    useEffect(() => {
        if (!returnProvinceId) {
            setReturnDistricts([]);
            return;
        }
        const load = async () => {
            try {
                const d = await shipmentApi.getDistricts(Number(returnProvinceId));
                const list = Array.isArray(d) ? d : [];
                setReturnDistricts(list);
                // Nếu user chưa nhập Send District Id nhưng địa chỉ có tên quận/huyện → auto map sang DistrictID GHN
                if ((!returnCreateSendDistrictId || returnCreateSendDistrictId === 0) && returnParsedAddress.districtName && list.length > 0) {
                    const suggested = findDistrictIdByName(list, returnParsedAddress.districtName);
                    if (suggested !== '') {
                        setReturnCreateSendDistrictId(suggested);
                    }
                }
            } catch {
                setReturnDistricts([]);
            }
        };
        void load();
    }, [returnProvinceId, returnParsedAddress.districtName, returnCreateSendDistrictId]);

    // Khi chọn quận/huyện gửi, load danh sách phường/xã GHN để user chọn sendWardId (giống checkout)
    useEffect(() => {
        if (!returnCreateSendDistrictId) {
            setReturnWards([]);
            setReturnCreateSendWardId(0);
            return;
        }
        const load = async () => {
            try {
                const w = await shipmentApi.getWards(Number(returnCreateSendDistrictId));
                const list = Array.isArray(w) ? w : [];
                setReturnWards(list);
                // Nếu địa chỉ có wardName, có thể gợi ý sẵn sendWardId sau này nếu cần
            } catch {
                setReturnWards([]);
            }
        };
        void load();
    }, [returnCreateSendDistrictId]);

    const pushToast = (t: { title: string; description?: string; variant?: 'default' | 'success' | 'error' | 'warning' }) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts((prev) => [...prev, { id, ...t }]);
    };

    const loadOrders = async (pageIndex: number, shippingStatus: UserShippingFilter, mode: 'BUY' | 'UNPAID' | 'SELL' | 'PENDING_SELL' | 'RETURNS') => {
        try {
            setIsLoading(true);
            setError('');
            const pageSize = 10;

            if (mode === 'RETURNS') {
                // Return requests dùng loader riêng (loadReturnRequests)
                setOrders([]);
                setBuyOrders([]);
                setUnpaidOrders([]);
                setTotalPages(1);
                return;
            }

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
                } else {
                    // TẤT CẢ / ĐÃ GIAO / ĐÃ HỦY / TRẢ HÀNG: không filter theo orderStatus, dùng shipmentStatus phía FE
                    orderStatusFilter = undefined;
                }
                const res = await orderApi.getMyOrders(orderStatusFilter, pageIndex, pageSize);
                setBuyOrders(res.content ?? []);
                setTotalPages(res.totalPages || 1);
                setOrders([]); // tránh lẫn dữ liệu table shipment/seller
            } else if (mode === 'PENDING_SELL') {
                setPendingLoading(true);
                setPendingError('');
                const res = await orderApi.getPendings(pageIndex, pageSize);
                setPendingList(res.content ?? []);
                setPendingTotalPages(res.totalPages ?? 1);
                setOrders([]);
                setBuyOrders([]);
                setUnpaidOrders([]);
            } else if (mode === 'SELL') {
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
            } else if (mode === 'PENDING_SELL') {
                setPendingError(e instanceof Error ? e.message : 'Không tải được đơn chờ duyệt');
                setPendingList([]);
                setPendingTotalPages(1);
            } else {
                setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn hàng');
                setOrders([]);
                setTotalPages(1);
            }
        } finally {
            setIsLoading(false);
            setUnpaidLoading(false);
            setBuyLoading(false);
            setPendingLoading(false);
        }
    };

    const loadOrderDetail = async (orderId: string, options?: { forFeedback?: boolean }) => {
        setDetailOrderId(orderId);
        if (options?.forFeedback) {
            setPendingFeedbackOrderId(orderId);
        }
        setDetailLoading(true);
        setDetailItems([]);
        setDetailShipments({});
        setDetailTrackings({});
        setDetailBlindBoxCards(null);
        setDetailBlindBoxShipment(null);
        setDetailCanReturnByShipmentId({});
        try {
            const page = await orderApi.getOrderItemsByOrderId(orderId, 0, 100);
            const content = page.content ?? [];

            // Nếu BE trả kèm blindBoxDetails trong orderItem → dùng trực tiếp
            let blindBoxCards: OrderItemResponse['blindBoxDetails'] | null = null;
            let blindBoxShipment: OrderItemResponse['shipmentResponse'] | null = null;
            const blindBoxEntry = content.find((o) => (o.blindBoxDetails?.length ?? 0) > 0);
            if (blindBoxEntry && (blindBoxEntry.blindBoxDetails?.length ?? 0) > 0) {
                blindBoxCards = blindBoxEntry.blindBoxDetails || [];
                blindBoxShipment = blindBoxEntry.shipmentResponse || null;
            } else {
                // Fallback: join từ lịch sử Hộp bí ẩn theo blindBoxId trong OrderSummary
                const summary = buyOrders.find((o) => String(o.orderId) === String(orderId));
                const blindBoxId = summary?.blindBoxId;
                if (blindBoxId) {
                    try {
                        const history: BlindBoxHistoryItem[] = await blindBoxApi.getMyHistory();
                        const cards = history
                            .filter((h) => h.blindBoxId === blindBoxId)
                            .map((h) => ({
                                cardName: h.card.name,
                                cardImageUrl: getCardImageUrl(h.card),
                                basePrice: h.card.basePrice,
                            }));
                        if (cards.length > 0) {
                            blindBoxCards = cards as any;
                        }
                    } catch {
                        // ignore nếu join từ lịch sử thất bại
                    }
                }
            }
            setDetailBlindBoxCards(blindBoxCards);
            setDetailBlindBoxShipment(blindBoxShipment);

            const rawItems = content.flatMap((o) => o.orderDetailResponseList || []);
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

    // Khi mở dialog chi tiết đơn mua (BUY), kiểm tra can-return theo từng shipment trong đơn
    useEffect(() => {
        if (!detailOrderId) return;
        const shipmentIds = new Set<string>();
        for (const itemId of Object.keys(detailShipments)) {
            const ships = detailShipments[itemId] || [];
            for (const s of ships) {
                if (s?.shipmentId) shipmentIds.add(String(s.shipmentId));
            }
        }
        const ids = Array.from(shipmentIds);
        if (ids.length === 0) {
            setDetailCanReturnByShipmentId({});
            return;
        }

        setDetailCheckingCanReturn(true);
        Promise.all(
            ids.map(async (sid) => {
                try {
                    const ok = await returnRequestApi.canReturn(sid);
                    return [sid, !!ok] as const;
                } catch {
                    return [sid, false] as const;
                }
            })
        )
            .then((pairs) => {
                const next: Record<string, boolean> = {};
                for (const [sid, ok] of pairs) next[sid] = ok;
                setDetailCanReturnByShipmentId(next);
            })
            .finally(() => setDetailCheckingCanReturn(false));
    }, [detailOrderId, detailShipments]);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadOrders(page, status, viewMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, viewMode, buyFilter, isAuthenticated]);

    const loadReturnRequests = async () => {
        setReturnLoading(true);
        setReturnError('');
        try {
            const st = returnStatusFilter === 'ALL' ? undefined : returnStatusFilter;
            const res =
                returnTab === 'MY'
                    ? await returnRequestApi.myRequests(st, returnPage, 10)
                    : await returnRequestApi.received(st, returnPage, 10);
            const list = res.content ?? [];
            setReturnList(list);
            setReturnTotalPages(res.totalPages || 1);

            // Preload can-do for each item to show action buttons correctly
            const entries = await Promise.all(
                list.map(async (r) => {
                    try {
                        const can = await returnRequestApi.canDo(String(r.returnRequestId));
                        return [String(r.returnRequestId), can] as const;
                    } catch {
                        return [String(r.returnRequestId), {} as any] as const;
                    }
                })
            );
            const next: typeof returnActions = {};
            for (const [id, can] of entries) next[id] = can;
            setReturnActions(next);
        } catch (e) {
            setReturnError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu trả hàng.');
            setReturnList([]);
            setReturnTotalPages(1);
            setReturnActions({});
        } finally {
            setReturnLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        if (viewMode !== 'RETURNS') return;
        loadReturnRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, returnTab, returnStatusFilter, returnPage, isAuthenticated]);

    useEffect(() => {
        const shipmentId = selectedShipment?.shipmentResponse?.shipmentId;
        if (!shipmentId || viewMode !== 'BUY') {
            setCanReturnSelectedShipment(false);
            return;
        }
        setCheckingCanReturn(true);
        returnRequestApi
            .canReturn(String(shipmentId))
            .then((v) => setCanReturnSelectedShipment(!!v))
            .catch(() => setCanReturnSelectedShipment(false))
            .finally(() => setCheckingCanReturn(false));
    }, [selectedShipment, viewMode]);

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

    // Prefetch thêm thông tin hiển thị Đơn mua (ảnh item đầu, seller, trạng thái shipment) bằng cách join API chi tiết
    useEffect(() => {
        if (!isAuthenticated) return;
        const ids = filteredBuy.map((o) => String(o.orderId));
        ids.forEach((orderId) => {
            const extra = buyOrderExtras[orderId];
            if (extra && extra.loaded) return;
            (async () => {
                try {
                    const page = await orderApi.getOrderItemsByOrderId(orderId, 0, 1);
                    const first = (page.content ?? [])[0] as OrderItemResponse | undefined;
                    if (!first) {
                        setBuyOrderExtras((prev) => ({
                            ...prev,
                            [orderId]: { ...(prev[orderId] || {}), loaded: true },
                        }));
                        return;
                    }
                    const item = (first.orderDetailResponseList || [])[0];
                    const sellerName =
                        (item as any)?.cardResponse?.sellerName ||
                        (item as any)?.cardResponse?.seller?.name ||
                        undefined;
                    const name = item?.cardName || (item as any)?.cardResponse?.name || undefined;
                    const img =
                        item?.cardImageUrl ||
                        ((item as any)?.cardResponse ? getCardImageUrl((item as any).cardResponse) : undefined);
                    const qty = Number(item?.quantity ?? 0) || undefined;
                    const price = Number(item?.price ?? 0) || undefined;
                    const shipmentStatus = first.shipmentResponse
                        ? String(first.shipmentResponse.shipmentStatus)
                        : undefined;
                    const shipmentId = first.shipmentResponse
                        ? String(first.shipmentResponse.shipmentId)
                        : undefined;
                    const firstOrderItemId = item?.orderItemId ? String(item.orderItemId) : undefined;
                    setBuyOrderExtras((prev) => ({
                        ...prev,
                        [orderId]: {
                            ...(prev[orderId] || {}),
                            loaded: true,
                            sellerName,
                            firstItemName: name,
                            firstItemImage: img,
                            firstItemQty: qty,
                            firstItemPrice: price,
                            shipmentStatus,
                            shipmentId,
                            firstOrderItemId,
                        },
                    }));
                } catch {
                    setBuyOrderExtras((prev) => ({
                        ...prev,
                        [orderId]: { ...(prev[orderId] || {}), loaded: true },
                    }));
                }
            })();
        });
    }, [isAuthenticated, filteredBuy, buyOrderExtras]);

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
        <ToastProvider swipeDirection="right">
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
                    <Button
                        variant={viewMode === 'PENDING_SELL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setViewMode('PENDING_SELL');
                            setPage(0);
                        }}
                    >
                        Đơn chờ duyệt
                    </Button>
                    <Button
                        variant={viewMode === 'RETURNS' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            setViewMode('RETURNS');
                            setReturnPage(0);
                        }}
                    >
                        Trả hàng
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
                    {viewMode === 'RETURNS' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    variant={returnTab === 'MY' ? 'default' : 'outline'}
                                    className="text-xs"
                                    onClick={() => {
                                        setReturnPage(0);
                                        setReturnTab('MY');
                                    }}
                                >
                                    Yêu cầu đã gửi
                                </Button>
                                <Button
                                    size="sm"
                                    variant={returnTab === 'RECEIVED' ? 'default' : 'outline'}
                                    className="text-xs"
                                    onClick={() => {
                                        setReturnPage(0);
                                        setReturnTab('RECEIVED');
                                    }}
                                >
                                    Yêu cầu nhận (Seller)
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-2">
                                {(['ALL', 'REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELED'] as const).map((st) => (
                                    <Button
                                        key={st}
                                        size="sm"
                                        variant={returnStatusFilter === st ? 'default' : 'outline'}
                                        className="text-[11px]"
                                        onClick={() => {
                                            setReturnPage(0);
                                            setReturnStatusFilter(st as any);
                                        }}
                                    >
                                        {st === 'ALL' ? 'Tất cả' : st}
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
                            : viewMode === 'RETURNS'
                            ? `Trả hàng (${returnList.length})`
                            : viewMode === 'PENDING_SELL'
                            ? `Đơn chờ duyệt (${pendingList.length})`
                            : `Đơn hàng (${filtered.length})`}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(viewMode === 'BUY'
                        ? buyLoading
                        : viewMode === 'UNPAID'
                        ? unpaidLoading
                        : viewMode === 'RETURNS'
                        ? returnLoading
                        : viewMode === 'PENDING_SELL'
                        ? pendingLoading
                        : isLoading) ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải đơn hàng...</div>
                        </div>
                    ) : (viewMode === 'BUY'
                        ? buyError
                        : viewMode === 'UNPAID'
                        ? unpaidError
                        : viewMode === 'RETURNS'
                        ? returnError
                        : viewMode === 'PENDING_SELL'
                        ? pendingError
                        : error) ? (
                        <div className="flex items-center gap-2 text-sm text-red-400 py-4">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                                {viewMode === 'BUY'
                                    ? buyError
                                    : viewMode === 'UNPAID'
                                    ? unpaidError
                                    : viewMode === 'RETURNS'
                                    ? returnError
                                    : viewMode === 'PENDING_SELL'
                                    ? pendingError
                                    : error}
                            </span>
                        </div>
                    ) : (viewMode === 'RETURNS'
                        ? returnList.length === 0
                        : viewMode === 'BUY'
                        ? filteredBuy.length === 0
                        : viewMode === 'UNPAID'
                        ? filteredUnpaid.length === 0
                        : viewMode === 'PENDING_SELL'
                        ? pendingList.length === 0
                        : filtered.length === 0) ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            Bạn chưa có đơn hàng nào.
                        </div>
                    ) : (
                        viewMode === 'RETURNS' ? (
                            <div className="space-y-4">
                                {returnList.map((r) => {
                                    const id = String(r.returnRequestId);
                                    const can = returnActions[id] || {};
                                    const shipmentId = r.shipmentResponse?.shipmentId ? String(r.shipmentResponse.shipmentId) : null;
                                    const items = (r.orderItems || []) as any[];
                                    const status = String(r.status || '') as ReturnRequestStatus | '';

                                    const statusStyle =
                                        status === 'REQUESTED'
                                            ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
                                            : status === 'APPROVED'
                                            ? 'bg-blue-500/15 text-blue-200 border-blue-500/30'
                                            : status === 'PAID'
                                            ? 'bg-green-500/15 text-green-200 border-green-500/30'
                                            : status === 'REJECTED' || status === 'CANCELED'
                                            ? 'bg-red-500/15 text-red-200 border-red-500/30'
                                            : 'bg-white/5 text-white border-white/10';

                                    return (
                                        <div key={id} className="glass-card-strong border border-white/10 rounded-xl overflow-hidden">
                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs text-muted-foreground">Mã yêu cầu</div>
                                                    <div className="font-mono text-xs">#{id.slice(0, 8)}</div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border ${statusStyle}`}>
                                                        <Package className="w-3 h-3" />
                                                        {status && RETURN_STATUS_LABELS[status as ReturnRequestStatus] ? RETURN_STATUS_LABELS[status as ReturnRequestStatus] : status || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:items-end gap-1 text-xs text-muted-foreground">
                                                    <span>{r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—'}</span>
                                                    {shipmentId && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono px-2 py-1 rounded bg-white/5 border border-white/10">
                                                                Shipment #{shipmentId.slice(0, 8)}
                                                            </span>
                                                            {r.shipmentResponse?.shipmentStatus && (
                                                                <span>
                                                                    Trạng thái giao:{' '}
                                                                    <span className="font-semibold">
                                                                        {SHIPPING_STATUS_LABELS[
                                                                            r.shipmentResponse
                                                                                .shipmentStatus as ShippingStatus
                                                                        ] || r.shipmentResponse.shipmentStatus}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-3">
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Lý do:</span>{' '}
                                                    <span className="font-medium">{r.reason || '—'}</span>
                                                </div>

                                                {items.length > 0 && (
                                                    <div className="space-y-2">
                                                        {items.slice(0, 3).map((it) => {
                                                            const name = it.cardName || it.cardResponse?.name || 'Thẻ';
                                                            const img =
                                                                it.cardImageUrl ||
                                                                (it.cardResponse ? getCardImageUrl(it.cardResponse) : '') ||
                                                                '';
                                                            const qty = Number(it.quantity ?? 0);
                                                            const price = Number(it.price ?? 0);
                                                            return (
                                                                <div key={String(it.orderItemId)} className="flex items-center gap-3">
                                                                    {img ? (
                                                                        <img src={img} alt={name} className="w-12 h-16 rounded bg-white/5 object-cover" />
                                                                    ) : (
                                                                        <div className="w-12 h-16 rounded bg-white/5 flex items-center justify-center text-lg">🎴</div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium line-clamp-1">{name}</div>
                                                                        <div className="text-xs text-muted-foreground font-mono">
                                                                            #{String(it.orderItemId || '').slice(0, 8)} · x{qty}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-sm font-semibold">
                                                                        {(price * qty).toLocaleString('vi-VN')} đ
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {items.length > 3 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                + {items.length - 3} sản phẩm khác…
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <Button size="sm" variant="outline" onClick={() => setSelectedReturn(r)}>
                                                    Xem chi tiết
                                                </Button>

                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    {can.canjectOrApproved && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await returnRequestApi.approve(id);
                                                                        await loadReturnRequests();
                                                                    } catch (e) {
                                                                        alert(e instanceof Error ? e.message : 'Không thể duyệt.');
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                Duyệt
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await returnRequestApi.reject(id);
                                                                        await loadReturnRequests();
                                                                    } catch (e) {
                                                                        alert(e instanceof Error ? e.message : 'Không thể từ chối.');
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                Từ chối
                                                            </Button>
                                                        </>
                                                    )}
                                                    {can.canPayment && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                            disabled={actionLoading}
                                                            onClick={async () => {
                                                                setActionLoading(true);
                                                                try {
                                                                    await transactionApi.payForReturn(id);
                                                                    window.dispatchEvent(new Event('wallet-updated'));
                                                                    await loadReturnRequests();
                                                                    pushToast({ title: 'Thanh toán thành công', description: 'Đã thanh toán phí ship trả hàng.', variant: 'success' });
                                                                } catch (e) {
                                                                    pushToast({ title: 'Không thể thanh toán', description: e instanceof Error ? e.message : 'Không thể thanh toán.', variant: 'error' });
                                                                } finally {
                                                                    setActionLoading(false);
                                                                }
                                                            }}
                                                        >
                                                            Thanh toán phí ship
                                                        </Button>
                                                    )}
                                                    {can.canCancle && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={actionLoading}
                                                            onClick={async () => {
                                                                setConfirmDialog({
                                                                    open: true,
                                                                    title: 'Hủy yêu cầu trả hàng?',
                                                                    description: 'Bạn có chắc chắn muốn hủy yêu cầu này không?',
                                                                    onConfirm: async () => {
                                                                        setConfirmDialog((p) => ({ ...p, open: false }));
                                                                        setActionLoading(true);
                                                                        try {
                                                                            await returnRequestApi.cancel(id);
                                                                            await loadReturnRequests();
                                                                            pushToast({ title: 'Đã hủy yêu cầu', variant: 'success' });
                                                                        } catch (e) {
                                                                            pushToast({ title: 'Không thể hủy', description: e instanceof Error ? e.message : 'Không thể hủy.', variant: 'error' });
                                                                        } finally {
                                                                            setActionLoading(false);
                                                                        }
                                                                    },
                                                                });
                                                            }}
                                                        >
                                                            Hủy yêu cầu
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                    <span>
                                        Trang {returnPage + 1} / {returnTotalPages}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={returnPage === 0}
                                            onClick={() => setReturnPage((p) => Math.max(0, p - 1))}
                                            className="px-3 py-1 rounded-lg glass-card disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Trước
                                        </button>
                                        <button
                                            disabled={returnPage + 1 >= returnTotalPages}
                                            onClick={() => setReturnPage((p) => p + 1)}
                                            className="px-3 py-1 rounded-lg glass-card disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'BUY' ? (
                            <div className="space-y-3">
                                {filteredBuy.map((o) => {
                                    const orderId = String(o.orderId);
                                    const extra = buyOrderExtras[orderId] || {};
                                    const shipStatus = extra.shipmentStatus as ShippingStatus | undefined;

                                    // Lọc thêm theo trạng thái shipment cho từng filter Đơn mua
                                    if (buyFilter === 'WAIT_CONFIRM') {
                                        // Chờ xác nhận: đơn đã PAID nhưng shipment chưa ra khỏi PENDING.
                                        // Nếu BE chưa tạo shipment => shipStatus undefined vẫn được xem là "chờ xác nhận".
                                        if (shipStatus && shipStatus !== 'PENDING') return null;
                                    } else if (buyFilter === 'WAIT_PICKUP') {
                                        // Chờ lấy hàng: shipper đã được gán hoặc đã lấy nhưng chưa đi giao.
                                        if (!shipStatus || (shipStatus !== 'ASIGNED' && shipStatus !== 'PICKED_UP')) {
                                            return null;
                                        }
                                    } else if (buyFilter === 'WAIT_SHIP') {
                                        // Chờ giao: đang trong quá trình vận chuyển.
                                        if (shipStatus !== 'IN_TRANSIT') return null;
                                    } else if (buyFilter === 'DELIVERED') {
                                        // Đã giao: GHN có thể trả DELIVERED hoặc RECEIVED.
                                        if (!shipStatus || (shipStatus !== 'DELIVERED' && shipStatus !== 'RECEIVED')) {
                                            return null;
                                        }
                                    } else if (buyFilter === 'CANCELLED') {
                                        // Đã hủy:
                                        // - Nếu order.status = CANCELLED → luôn hiển thị, bất kể shipmentStatus
                                        // - Nếu order chưa CANCELLED nhưng shipmentStatus = CANCELLED → cũng hiển thị
                                        const isOrderCancelled = o.status === 'CANCELLED';
                                        const isShipCancelled = shipStatus === 'CANCELLED';
                                        if (!isOrderCancelled && !isShipCancelled) return null;
                                    }

                                    return (
                                        <div
                                            key={orderId}
                                            className="glass-card-strong border border-white/10 rounded-xl overflow-hidden"
                                        >
                                            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs text-muted-foreground">Mã đơn</div>
                                                    <div className="font-mono text-xs">#{orderId.slice(0, 8)}</div>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-white/5 border-white/20">
                                                        <Package className="w-3 h-3" />
                                                        {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                                                    <span>
                                                        {o.orderDate
                                                            ? new Date(o.orderDate).toLocaleString('vi-VN')
                                                            : '—'}
                                                    </span>
                                                    {extra.shipmentStatus && (
                                                        <span>
                                                            Trạng thái giao:{' '}
                                                            <span className="font-semibold text-white">
                                                                {SHIPPING_STATUS_LABELS[extra.shipmentStatus as ShippingStatus] ||
                                                                    extra.shipmentStatus}
                                                            </span>
                                                        </span>
                                                    )}
                                                    <span className="font-semibold text-white">
                                                        {Number(o.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    {extra.firstItemImage ? (
                                                        <img
                                                            src={extra.firstItemImage}
                                                            alt={extra.firstItemName || ''}
                                                            className="w-16 h-24 rounded-lg object-cover bg-white/5"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-24 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                                                            🎴
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <div className="text-xs text-muted-foreground">
                                                            Tên người bán:{' '}
                                                            <span className="font-semibold text-white">
                                                                {extra.sellerName || '—'}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-semibold line-clamp-1">
                                                            {extra.firstItemName || '—'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Số lượng:{' '}
                                                            <span className="font-semibold">
                                                                {extra.firstItemQty ?? '—'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Giá:{' '}
                                                            <span className="font-semibold">
                                                                {extra.firstItemPrice != null
                                                                    ? Number(extra.firstItemPrice).toLocaleString(
                                                                          'vi-VN',
                                                                      ) + ' đ'
                                                                    : '—'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="text-[11px] text-primary-300 underline"
                                                            onClick={() => loadOrderDetail(orderId)}
                                                        >
                                                            Xem thêm sản phẩm / chi tiết đơn
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    {extra.shipmentStatus === 'RECEIVED' ? (
                                                        // Đơn đã giao xong: Trả hàng/Hoàn tiền + Đánh giá
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    // Mở dialog chi tiết đơn + tab tạo yêu cầu trả hàng
                                                                    loadOrderDetail(orderId);
                                                                    setTimeout(() => {
                                                                        if (!detailItems.length) return;
                                                                        const itemId = String(detailItems[0].orderItemId);
                                                                        const ships = detailShipments[itemId] || [];
                                                                        if (!ships.length) return;
                                                                        const shipmentId = String(ships[0].shipmentId);
                                                                        const items = detailItems.map((it) => ({
                                                                            orderItemId: String(it.orderItemId),
                                                                            cardName: it.cardName,
                                                                            cardImageUrl: it.cardImageUrl,
                                                                            quantity: it.quantity,
                                                                            price: it.price,
                                                                        }));
                                                                        const ids = items.map((x) => x.orderItemId).filter(Boolean);
                                                                        setReturnCreateShipmentId(shipmentId);
                                                                        setReturnCreateItemIds(ids);
                                                                        setReturnCreateItems(items.filter((x) => !!x.orderItemId));
                                                                        setReturnCreateReasonPreset('PRESET');
                                                                        setReturnCreateReason('');
                                                                        setReturnCreateSendAddress('');
                                                                        setReturnCreateSendDistrictId(0);
                                                                        setReturnCreateSendPhone('');
                                                                        setReturnCreateFiles([]);
                                                                        setReturnCreateOpen(true);
                                                                    }, 300);
                                                                }}
                                                            >
                                                                Trả hàng / Hoàn tiền
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    // Mở popup chi tiết shipment + bật form đánh giá cho item đầu tiên
                                                                    const extra = buyOrderExtras[orderId];
                                                                    const targetShipmentId = extra?.shipmentId;
                                                                    if (!targetShipmentId) return;

                                                                    const shipment = orders.find(
                                                                        (o) =>
                                                                            String(o.shipmentResponse?.shipmentId || '') ===
                                                                            String(targetShipmentId),
                                                                    );
                                                                    if (!shipment) return;

                                                                    setSelectedShipment(shipment);
                                                                    const firstItem = shipment.orderDetailResponseList?.[0];
                                                                    if (firstItem?.orderItemId) {
                                                                        setFeedbackEditingId(String(firstItem.orderItemId));
                                                                        setFeedbackRating(5);
                                                                        setFeedbackComment('');
                                                                    }
                                                                }}
                                                            >
                                                                Đánh giá
                                                            </Button>
                                                        </>
                                                    ) : extra.shipmentStatus &&
                                                      (extra.shipmentStatus === 'DELIVERED' || extra.shipmentStatus === 'RECEIVED') &&
                                                      extra.shipmentId &&
                                                      extra.firstOrderItemId ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    try {
                                                                        setActionLoading(true);
                                                                        const canDo = await orderApi.canDo(
                                                                            String(extra.firstOrderItemId),
                                                                        );
                                                                        if (!canDo.canConfirmRecieve) {
                                                                            alert('Đơn này hiện không thể xác nhận nhận hàng.');
                                                                            return;
                                                                        }
                                                                        await orderApi.confirmReceive(
                                                                            String(extra.shipmentId),
                                                                        );
                                                                        try {
                                                                            window.dispatchEvent(
                                                                                new Event('wallet-updated'),
                                                                            );
                                                                        } catch {
                                                                            // ignore
                                                                        }
                                                                        await loadOrders(page, status, viewMode);
                                                                        alert(
                                                                            'Đã xác nhận đã nhận hàng, tiền sẽ được chuyển cho người bán.',
                                                                        );
                                                                    } catch (err) {
                                                                        alert(
                                                                            err instanceof Error
                                                                                ? err.message
                                                                                : 'Không thể xác nhận nhận hàng.',
                                                                        );
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                {actionLoading ? 'Đang xử lý...' : 'Xác nhận đã nhận hàng'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    loadOrderDetail(orderId);
                                                                }}
                                                            >
                                                                Xem chi tiết
                                                            </Button>
                                                        </>
                                                    ) : buyFilter === 'WAIT_PICKUP' || buyFilter === 'WAIT_SHIP' ? (
                                                        // Đơn đang chờ lấy hàng / chờ giao: chỉ cho xem chi tiết
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                loadOrderDetail(orderId);
                                                            }}
                                                        >
                                                            Xem chi tiết
                                                        </Button>
                                                    ) : o.status === 'CANCELLED' ? (
                                                        // Đơn đã hủy: chỉ cho xem chi tiết, không cho hủy thêm lần nữa
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                loadOrderDetail(orderId);
                                                            }}
                                                        >
                                                            Xem chi tiết
                                                        </Button>
                                                    ) : (
                                                        // Các trạng thái khác: giữ Xem chi tiết + Hủy như cũ
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    loadOrderDetail(orderId);
                                                                }}
                                                            >
                                                                {o.status === 'CREATED' ? 'Thanh toán' : 'Xem chi tiết'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    if (
                                                                        !confirm(
                                                                            `Hủy đơn #${orderId.slice(0, 8)}?`,
                                                                        )
                                                                    )
                                                                        return;
                                                                    setActionLoading(true);
                                                                    try {
                                                                        const can =
                                                                            await orderApi.canCancelOrder(orderId);
                                                                        if (!can) {
                                                                            alert(
                                                                                'Backend không cho phép hủy đơn này (can-cancle-order = false).',
                                                                            );
                                                                            return;
                                                                        }
                                                                        await orderApi.cancelOrder(orderId);
                                                                        await loadOrders(page, status, viewMode);
                                                                    } catch (err) {
                                                                        alert(
                                                                            err instanceof Error
                                                                                ? err.message
                                                                                : 'Không thể hủy đơn.',
                                                                        );
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                Hủy
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                        ) : viewMode === 'PENDING_SELL' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                    Đơn hàng do người mua đặt, bạn (seller) cần duyệt để bắt đầu xử lý giao hàng. Mỗi dòng là một order item; duyệt từng item hoặc duyệt hết các item trong cùng một shipment để kích hoạt giao hàng.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-3">Thẻ</th>
                                                <th className="text-left p-3">Mã order item</th>
                                                <th className="text-right p-3">Số lượng</th>
                                                <th className="text-right p-3">Giá</th>
                                                <th className="text-left p-3">Trạng thái</th>
                                                <th className="text-right p-3">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingList.map((item) => {
                                                const card = item.cardResponse;
                                                const cardName = card?.name ?? '—';
                                                const cardImg = card ? getCardImageUrl(card as any) : undefined;
                                                const id = String(item.orderItemId);
                                                const isApproving = approvingOrderItemId === id;
                                                return (
                                                    <tr key={id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                {cardImg ? (
                                                                    <img src={cardImg} alt={cardName} className="w-12 h-16 rounded object-cover bg-white/5" />
                                                                ) : (
                                                                    <div className="w-12 h-16 rounded bg-white/5 flex items-center justify-center text-lg">🎴</div>
                                                                )}
                                                                <span className="font-medium line-clamp-2">{cardName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-mono text-xs">{id.slice(0, 8)}</td>
                                                        <td className="p-3 text-right">{item.quantity}</td>
                                                        <td className="p-3 text-right">{Number(item.price ?? 0).toLocaleString('vi-VN')} đ</td>
                                                        <td className="p-3">
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-200">
                                                                <Package className="w-3 h-3" />
                                                                {item.orderItemStatus || 'PENDING_CONFIRM'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                disabled={isApproving || item.orderItemStatus !== 'PENDING_CONFIRM'}
                                                                onClick={async () => {
                                                                    setApprovingOrderItemId(id);
                                                                    try {
                                                                        await orderApi.approveOrderItem(id);
                                                                        await loadOrders(page, status, viewMode);
                                                                        pushToast({
                                                                            title: 'Đã duyệt',
                                                                            description: 'Order item đã được duyệt.',
                                                                            variant: 'success',
                                                                        });
                                                                    } catch (e) {
                                                                        const msg = e instanceof Error ? e.message : String(e ?? '');
                                                                        if (/shipment_shipment_status_check|violates check constraint[\\s\\S]*shipment/i.test(msg)) {
                                                                            pushToast({
                                                                                title: 'Lỗi cấu hình cơ sở dữ liệu',
                                                                                description:
                                                                                    'Không duyệt được do cấu hình trạng thái shipment trong database chưa cho phép giá trị PENDING_APPROVED. ' +
                                                                                    'Quản trị viên vui lòng chạy script fix-shipment-status-check.sql trong thư mục db của backend rồi thử lại.',
                                                                                variant: 'error',
                                                                            });
                                                                        } else if (/tracking_shipping_status_check|violates check constraint[\\s\\S]*tracking/i.test(msg)) {
                                                                            pushToast({
                                                                                title: 'Lỗi cấu hình cơ sở dữ liệu',
                                                                                description:
                                                                                    'Không duyệt được do cấu hình trạng thái giao hàng trong database chưa cho phép giá trị PENDING_APPROVED. ' +
                                                                                    'Quản trị viên vui lòng chạy script fix-tracking-shipping-status-check.sql trong thư mục db của backend rồi thử lại.',
                                                                                variant: 'error',
                                                                            });
                                                                        } else {
                                                                            pushToast({
                                                                                title: 'Lỗi',
                                                                                description: msg || 'Không duyệt được.',
                                                                                variant: 'error',
                                                                            });
                                                                        }
                                                                    } finally {
                                                                        setApprovingOrderItemId(null);
                                                                    }
                                                                }}
                                                            >
                                                                {isApproving ? 'Đang duyệt...' : 'Duyệt'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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

                    {viewMode !== 'RETURNS' && (
                        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span>
                            Trang {page + 1} / {viewMode === 'PENDING_SELL' ? Math.max(1, pendingTotalPages) : totalPages}
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
                                disabled={page + 1 >= (viewMode === 'PENDING_SELL' ? pendingTotalPages : totalPages)}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1 rounded-lg glass-card disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                    )}
                </CardContent>
            </UICard>
            {/* Order detail dialog by shipment - full màn hình, chỉ nội dung bên trong cuộn */}
            <Dialog open={!!selectedShipment} onOpenChange={(open) => { if (!open) { setSelectedShipment(null); setFeedbackEditingId(null); } }}>
                <DialogContent className="w-[98vw] max-w-6xl h-[95vh] max-h-[95vh] flex flex-col overflow-hidden p-4 gap-0">
                    {selectedShipment && (
                        <>
                            <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
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
                            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-4">
                            {/* Thông tin chung + địa chỉ giao hàng */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Trạng thái giao hàng</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-200">
                                            <Package className="w-3 h-3" />
                                            {selectedShipment.shipmentResponse?.shipmentStatus
                                                ? SHIPPING_STATUS_LABELS[
                                                      selectedShipment.shipmentResponse
                                                          .shipmentStatus as ShippingStatus
                                                  ] || selectedShipment.shipmentResponse.shipmentStatus
                                                : 'UNKNOWN'}
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

                            {/* Danh sách sản phẩm trong đơn - kiểu Shopee: ảnh | tên + phân loại + x qty | tiền */}
                            <div className="mt-6 border-t border-white/10 pt-4">
                                <h3 className="text-sm font-semibold mb-3">Sản phẩm trong đơn</h3>
                                        {selectedShipment.orderDetailResponseList?.length ? (
                                            <div className="space-y-4">
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
                                                        <div
                                                            key={String(d.orderItemId)}
                                                            id={`order-item-${String(d.orderItemId)}`}
                                                            className="flex gap-3 items-start py-3 border-b border-white/5 last:border-0"
                                                        >
                                                    <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                                                        {image ? (
                                                            <img src={image} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xl">🎴</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm line-clamp-2">{name}</div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            Phân loại hàng: 1 thẻ
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">x{qty}</div>
                                                        {viewMode === 'BUY' && (
                                                            <div className="mt-2">
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
                                                                                    <button key={i} type="button" onClick={() => setFeedbackRating(i)} className="p-0.5">
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
                                                                                <Button size="sm" className="h-6 text-xs" disabled={feedbackSubmitting}
                                                                                    onClick={async () => {
                                                                                        if (!d.orderItemId) return;
                                                                                        setFeedbackSubmitting(true);
                                                                                        try {
                                                                                            await orderApi.createFeedback(d.orderItemId, feedbackRating, feedbackComment);
                                                                                            setSelectedShipment((prev) => prev ? { ...prev, orderDetailResponseList: (prev.orderDetailResponseList || []).map((x) => x.orderItemId === d.orderItemId ? { ...x, feedbackRating, feedbackComment, feedbackCreatedAt: new Date().toISOString() } : x) } : null);
                                                                                            setFeedbackEditingId(null);
                                                                                            setFeedbackComment('');
                                                                                            setFeedbackRating(5);
                                                                                        } catch (err) {
                                                                                            alert(err instanceof Error ? err.message : 'Gửi đánh giá thất bại.');
                                                                                        } finally {
                                                                                            setFeedbackSubmitting(false);
                                                                                        }
                                                                                    }}
                                                                                >Gửi</Button>
                                                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setFeedbackEditingId(null); setFeedbackComment(''); setFeedbackRating(5); }}>Hủy</Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFeedbackEditingId(d.orderItemId); setFeedbackRating(5); setFeedbackComment(''); }}>
                                                                            Đánh giá
                                                                        </Button>
                                                                    )
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">—</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <div className="font-semibold text-sm">{rowTotal.toLocaleString('vi-VN')}₫</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (selectedShipment.blindBoxDetails?.length ?? 0) > 0 ? (
                                    <>
                                        <p className="text-xs text-yellow-200/90 mb-2">Giao thẻ từ Hộp bí ẩn</p>
                                        <div className="space-y-4">
                                            {selectedShipment.blindBoxDetails?.map((card, i) => {
                                                const price = Number(card.basePrice ?? 0);
                                                return (
                                                    <div key={i} className="flex gap-3 items-start py-3 border-b border-white/5 last:border-0">
                                                        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                                                            {card.cardImageUrl ? (
                                                                <img src={card.cardImageUrl} alt={card.cardName || ''} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xl">🎴</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm line-clamp-2">{card.cardName || '—'}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">Phân loại hàng: 1 thẻ</div>
                                                            <div className="text-xs text-muted-foreground">x1</div>
                                                        </div>
                                                        <div className="shrink-0 text-right font-semibold text-sm">{price.toLocaleString('vi-VN')}₫</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Đơn hàng này chưa có item chi tiết để hiển thị.
                                    </p>
                                )}
                            </div>

                            {/* Tóm tắt tiền kiểu Shopee: dòng chấm chấm, Thành tiền nổi bật, Phương thức thanh toán */}
                            {(() => {
                                const itemsTotal =
                                    (selectedShipment.orderDetailResponseList || []).length > 0
                                        ? (selectedShipment.orderDetailResponseList || []).reduce(
                                              (sum, d) => sum + Number(d.price || 0) * Number(d.quantity || 0),
                                              0
                                          )
                                        : (selectedShipment.blindBoxDetails || []).reduce(
                                              (sum, c) => sum + Number(c.basePrice ?? 0),
                                              0
                                          );
                                const shipFee = Number(selectedShipment.shipfee || 0);
                                const shipDiscount = 0;
                                const voucherDiscount = 0;
                                const total =
                                    (selectedShipment.blindBoxDetails?.length ?? 0) > 0
                                        ? shipFee
                                        : itemsTotal + shipFee - shipDiscount - voucherDiscount;
                                return (
                                    <div className="mt-6 pt-4 text-sm">
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">
                                                {(selectedShipment.blindBoxDetails?.length ?? 0) > 0
                                                    ? 'Tổng giá trị thẻ (tham khảo)'
                                                    : 'Tổng tiền hàng'}
                                            </span>
                                            <span>{itemsTotal.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Phí vận chuyển</span>
                                            <span>{shipFee.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground inline-flex items-center gap-1">
                                                Giảm giá phí vận chuyển
                                                <span title="Áp dụng khi có chương trình giảm phí ship" className="text-muted-foreground/80 cursor-help">
                                                    <Info className="h-3.5 w-3.5 inline" />
                                                </span>
                                            </span>
                                            <span className={shipDiscount > 0 ? 'text-green-400' : ''}>
                                                {shipDiscount > 0 ? '-' : ''}{shipDiscount.toLocaleString('vi-VN')}₫
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Voucher</span>
                                            <span className={voucherDiscount > 0 ? 'text-green-400' : ''}>
                                                {voucherDiscount > 0 ? '-' : ''}{voucherDiscount.toLocaleString('vi-VN')}₫
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-t border-dotted border-white/20">
                                            <span className="font-semibold">Thành tiền</span>
                                            <span className="text-lg font-bold text-orange-400">
                                                {total.toLocaleString('vi-VN')}₫
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Phương thức thanh toán</span>
                                            <span className="font-medium">Ví MystiCard</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="mt-4 flex justify-end gap-2">
                                {viewMode === 'BUY' &&
                                    canReturnSelectedShipment &&
                                    selectedShipment?.shipmentResponse?.shipmentId && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={checkingCanReturn || actionLoading}
                                            onClick={() => {
                                                const shipmentId = String(selectedShipment.shipmentResponse?.shipmentId);
                                                const items = (selectedShipment.orderDetailResponseList || []).map((d) => ({
                                                    orderItemId: String(d.orderItemId),
                                                    cardName: d.cardName,
                                                    cardImageUrl: d.cardImageUrl,
                                                    quantity: d.quantity,
                                                    price: d.price,
                                                }));
                                                const ids = items.map((x) => x.orderItemId).filter(Boolean);
                                                setReturnCreateShipmentId(shipmentId);
                                                setReturnCreateItemIds(ids);
                                                setReturnCreateItems(items.filter((x) => !!x.orderItemId));
                                                setReturnCreateReasonPreset('PRESET');
                                                setReturnCreateReason('');
                                                setReturnCreateSendAddress('');
                                                setReturnCreateSendDistrictId(0);
                                                setReturnCreateSendPhone('');
                                                setReturnCreateFiles([]);
                                                setReturnCreateOpen(true);
                                            }}
                                        >
                                            Trả hàng
                                        </Button>
                                    )}
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
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create return request dialog (buyer) */}
            <Dialog open={returnCreateOpen} onOpenChange={(open) => { if (!open) setReturnCreateOpen(false); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Gửi yêu cầu trả hàng</DialogTitle>
                        <DialogDescription>
                            Chọn item cần trả trong shipment, nhập lý do và thông tin gửi hàng (theo `ReturnRequestdto`).
                        </DialogDescription>
                    </DialogHeader>
                    {/* Autofill from profile (do not override user input) */}
                    {returnCreateOpen && myProfile && (
                        <div style={{ display: 'none' }}>
                            {(() => {
                                // Run once per open tick via render side-effect guard
                                // (safe because we only set when fields are empty)
                                if (!returnCreateSendPhone && myProfile.phone) setReturnCreateSendPhone(myProfile.phone);
                                if (!returnCreateSendAddress && myProfile.address) {
                                    setReturnCreateSendAddress(myProfile.address);
                                    setReturnCreateAddressPreset('PROFILE');
                                }
                                if ((!returnCreateSendDistrictId || returnCreateSendDistrictId === 0) && myProfile.districtId) {
                                    const n = Number(myProfile.districtId);
                                    if (!Number.isNaN(n) && n > 0) setReturnCreateSendDistrictId(n);
                                }
                                return null as any;
                            })()}
                        </div>
                    )}
                        <div className="space-y-3 text-sm">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Shipment</div>
                            <div className="font-mono text-xs">#{String(returnCreateShipmentId || '').slice(0, 8) || '—'}</div>
                        </div>
                        <div className="border border-white/10 rounded-md p-3">
                            <div className="text-xs text-muted-foreground mb-2">Chọn item trả</div>
                            <div className="space-y-2">
                                {(returnCreateItems || []).map((d) => {
                                    const id = String(d.orderItemId);
                                    const checked = returnCreateItemIds.includes(id);
                                    const name = d.cardName || 'Thẻ';
                                    const image = d.cardImageUrl;
                                    const qty = Number(d.quantity ?? 0);
                                    const unitPrice = Number(d.price ?? 0);
                                    return (
                                        <label key={id} className="flex items-center gap-3 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const on = e.target.checked;
                                                    setReturnCreateItemIds((prev) => {
                                                        if (on) return Array.from(new Set([...prev, id]));
                                                        return prev.filter((x) => x !== id);
                                                    });
                                                }}
                                            />
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
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium line-clamp-1">{name}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground">
                                                    #{id.slice(0, 8)} · x{qty}
                                                </div>
                                            </div>
                                            <div className="text-xs font-semibold">
                                                {(unitPrice * qty).toLocaleString('vi-VN')} đ
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        const ids = (returnCreateItems || []).map((d) => String(d.orderItemId));
                                        setReturnCreateItemIds(ids.filter(Boolean));
                                    }}
                                >
                                    Chọn tất cả
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setReturnCreateItemIds([])}>
                                    Bỏ chọn
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Lý do trả hàng (bắt buộc)</div>
                                <select
                                    value={returnCreateReasonPreset === 'OTHER' ? '__OTHER__' : (returnCreateReason || '')}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '__OTHER__') {
                                            setReturnCreateReasonPreset('OTHER');
                                            setReturnCreateReason('');
                                        } else {
                                            setReturnCreateReasonPreset('PRESET');
                                            setReturnCreateReason(v);
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                >
                                    <option value="" disabled>
                                        -- Chọn lý do --
                                    </option>
                                    <option value="Sản phẩm bị lỗi/hư hỏng">Sản phẩm bị lỗi/hư hỏng</option>
                                    <option value="Không đúng mô tả/không đúng mẫu">Không đúng mô tả/không đúng mẫu</option>
                                    <option value="Thiếu phụ kiện/thiếu hàng">Thiếu phụ kiện/thiếu hàng</option>
                                    <option value="Giao sai sản phẩm">Giao sai sản phẩm</option>
                                    <option value="Không muốn mua nữa/đổi ý">Không muốn mua nữa/đổi ý</option>
                                    <option value="__OTHER__">Khác (tự nhập)</option>
                                </select>
                            </div>
                            {returnCreateReasonPreset === 'OTHER' && (
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Nhập lý do</div>
                                    <input
                                        value={returnCreateReason}
                                        onChange={(e) => setReturnCreateReason(e.target.value)}
                                        className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                        placeholder="Ví dụ: Thẻ bị lỗi/không đúng mô tả..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">SĐT gửi (bắt buộc)</div>
                                <input
                                    value={returnCreateSendPhone}
                                    onChange={(e) => setReturnCreateSendPhone(e.target.value)}
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                    placeholder="0xxxxxxxxx"
                                />
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Tỉnh/Thành gửi (GHN) (bắt buộc)</div>
                                <select
                                    value={returnProvinceId || ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        const pid = v ? Number(v) : '';
                                        setReturnProvinceId(pid);
                                        // reset quận/huyện & phường/xã khi đổi tỉnh
                                        setReturnCreateSendDistrictId(0);
                                        setReturnCreateSendWardId(0);

                                        // Cập nhật lại chuỗi "Địa chỉ gửi (tùy chọn)" theo tỉnh mới
                                        if (v) {
                                            const prov = returnProvinces.find((p: any) => Number(p.ProvinceID) === Number(v));
                                            const provinceName = prov?.ProvinceName;
                                            if (provinceName) {
                                                setReturnCreateSendAddress((prev) => {
                                                    if (!prev) return provinceName;
                                                    const parts = prev
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean);
                                                    if (parts.length === 0) return provinceName;
                                                    parts[parts.length - 1] = provinceName;
                                                    return parts.join(', ');
                                                });
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                >
                                    <option value="">-- Chọn tỉnh/thành --</option>
                                    {returnProvinces.map((p: any) => (
                                        <option key={String(p.ProvinceID)} value={Number(p.ProvinceID)}>
                                            {p.ProvinceName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Quận/Huyện gửi (GHN) (bắt buộc)</div>
                                <select
                                    value={returnCreateSendDistrictId || 0}
                                    onChange={(e) => {
                                        const val = Number(e.target.value || 0);
                                        setReturnCreateSendDistrictId(val);
                                        setReturnCreateSendWardId(0);
                                        if (val) {
                                            const dist = returnDistricts.find((d: any) => Number(d.DistrictID) === val);
                                            const districtName = dist?.DistrictName;
                                            if (districtName) {
                                                setReturnCreateSendAddress((prev) => {
                                                    if (!prev) return districtName;
                                                    const parts = prev
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean);
                                                    if (parts.length === 0) return districtName;
                                                    // giả định phần cuối là Tỉnh/TP, chèn/quán đổi Quận/Huyện ở trước nó
                                                    if (parts.length === 1) {
                                                        parts.unshift(districtName);
                                                    } else {
                                                        parts[parts.length - 2] = districtName;
                                                    }
                                                    return parts.join(', ');
                                                });
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                    disabled={!returnProvinceId || returnDistricts.length === 0}
                                >
                                    <option value={0}>-- Chọn quận/huyện --</option>
                                    {returnDistricts.map((d: any) => (
                                        <option key={String(d.DistrictID)} value={Number(d.DistrictID)}>
                                            {d.DistrictName}
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                    {returnParsedAddress.districtName
                                        ? `Gợi ý từ địa chỉ của bạn: ${returnParsedAddress.districtName}`
                                        : 'Chọn quận/huyện giống địa chỉ nhận hàng của bạn để GHN tính đúng tuyến.'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Phường/Xã gửi (GHN) (bắt buộc)</div>
                                <select
                                    value={returnCreateSendWardId || 0}
                                    onChange={(e) => {
                                        const val = Number(e.target.value || 0);
                                        setReturnCreateSendWardId(val);
                                        if (val) {
                                            const ward = returnWards.find((w: any) => Number(w.WardCode) === val);
                                            const wardName = ward?.WardName;
                                            if (wardName) {
                                                setReturnCreateSendAddress((prev) => {
                                                    if (!prev) return wardName;
                                                    const parts = prev
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean);
                                                    if (parts.length === 0) return wardName;
                                                    // giả định: ... , Phường/Xã, Quận/Huyện, Tỉnh/TP
                                                    if (parts.length >= 3) {
                                                        parts[parts.length - 3] = wardName;
                                                    } else {
                                                        parts.unshift(wardName);
                                                    }
                                                    return parts.join(', ');
                                                });
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                    disabled={!returnCreateSendDistrictId || returnWards.length === 0}
                                >
                                    <option value={0}>-- Chọn phường/xã --</option>
                                    {returnWards.map((w: any) => (
                                        <option key={String(w.WardCode)} value={Number(w.WardCode)}>
                                            {w.WardName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-muted-foreground">Địa chỉ gửi (tùy chọn)</div>
                                <select
                                    className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1"
                                    value={returnCreateAddressPreset}
                                    onChange={(e) => {
                                        const v = e.target.value === 'PROFILE' ? 'PROFILE' : 'CUSTOM';
                                        setReturnCreateAddressPreset(v);
                                        if (v === 'PROFILE' && myProfile?.address) {
                                            setReturnCreateSendAddress(myProfile.address);
                                        }
                                    }}
                                >
                                    <option value="PROFILE">Dùng địa chỉ trong hồ sơ</option>
                                    <option value="CUSTOM">Nhập địa chỉ khác</option>
                                </select>
                            </div>
                            <input
                                value={returnCreateSendAddress}
                                onChange={(e) => setReturnCreateSendAddress(e.target.value)}
                                className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                placeholder="Số nhà, đường..."
                                disabled={returnCreateAddressPreset === 'PROFILE'}
                            />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Ảnh đính kèm (bắt buộc theo BE)</div>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="w-full text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary/20 file:text-primary-400"
                                onChange={(e) => setReturnCreateFiles(Array.from(e.target.files ?? []))}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setReturnCreateOpen(false)}>
                            Đóng
                        </Button>
                        <Button
                            disabled={returnCreateSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                                if (!returnCreateShipmentId) return;
                                if (!returnCreateReason.trim()) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập lý do.', variant: 'warning' });
                                    return;
                                }
                                if (!returnCreateSendPhone.trim()) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập SĐT gửi.', variant: 'warning' });
                                    return;
                                }
                                if (!returnCreateSendDistrictId) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Vui lòng chọn Quận/Huyện gửi.', variant: 'warning' });
                                    return;
                                }
                                if (!returnCreateSendWardId) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Vui lòng chọn Phường/Xã gửi.', variant: 'warning' });
                                    return;
                                }
                                if (!returnCreateItemIds.length) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Bạn chưa chọn item nào để trả.', variant: 'warning' });
                                    return;
                                }
                                if (!returnCreateFiles.length) {
                                    pushToast({ title: 'Thiếu thông tin', description: 'Vui lòng chọn ít nhất 1 ảnh đính kèm.', variant: 'warning' });
                                    return;
                                }

                                setReturnCreateSubmitting(true);
                                try {
                                    const payload: ReturnRequestCreate = {
                                        orderItemIds: returnCreateItemIds,
                                        reason: returnCreateReason.trim(),
                                        sendAddress: returnCreateSendAddress || undefined,
                                        sendDistrictId: Number(returnCreateSendDistrictId),
                                        sendWardId: Number(returnCreateSendWardId),
                                        sendPhone: returnCreateSendPhone.trim(),
                                    };
                                    await returnRequestApi.send(payload, returnCreateFiles);
                                    pushToast({ title: 'Gửi yêu cầu thành công', description: 'Yêu cầu trả hàng đã được gửi đến người bán.', variant: 'success' });
                                    setReturnCreateOpen(false);
                                    // Optionally reload returns tab if user is viewing it
                                    if (viewMode === 'RETURNS') await loadReturnRequests();
                                } catch (e) {
                                    const msg = e instanceof Error ? e.message : String(e ?? '');
                                    // Map lỗi GHN giống trang checkout + chi tiết hơn cho thiếu/sai tham số.
                                    if (/deadline exceeded/i.test(msg) || /client\\.timeout/i.test(msg) || /timeout/i.test(msg)) {
                                        pushToast({
                                            title: 'Gửi yêu cầu thất bại',
                                            description:
                                                'Không tính được phí ship trả hàng do GHN phản hồi quá chậm (timeout). Vui lòng thử lại sau vài chục giây hoặc kiểm tra lại thông tin địa chỉ gửi.',
                                            variant: 'error',
                                        });
                                    } else if (/route not found service/i.test(msg) || /calculate fee/i.test(msg)) {
                                        const { provinceName, districtName, wardName } = parseAddressParts(returnCreateSendAddress || '');
                                        pushToast({
                                            title: 'Không tìm được tuyến vận chuyển',
                                            description:
                                                [
                                                    'GHN không có tuyến vận chuyển phù hợp với địa chỉ gửi hiện tại.',
                                                    provinceName || districtName || wardName
                                                        ? `Địa chỉ đang gửi: Tỉnh/TP: ${provinceName || '—'}, Quận/Huyện: ${districtName || '—'}, Phường/Xã (nếu có): ${wardName || '—'}.`
                                                        : '',
                                                    'Hãy kiểm tra lại Quận/Huyện (Send District Id), địa chỉ gửi và thử lại.',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' '),
                                            variant: 'error',
                                        });
                                    } else if (/from_district_id/i.test(msg) || /to_district_id/i.test(msg)) {
                                        pushToast({
                                            title: 'Thiếu hoặc sai Quận/Huyện',
                                            description:
                                                'Thông tin quận/huyện gửi hoặc nhận bị thiếu hoặc không hợp lệ. Vui lòng kiểm tra lại Send District Id và địa chỉ trong hồ sơ, sau đó thử gửi lại yêu cầu trả hàng.',
                                            variant: 'error',
                                        });
                                    } else if (/to_ward_code/i.test(msg)) {
                                        pushToast({
                                            title: 'Thiếu hoặc sai Phường/Xã',
                                            description:
                                                'Thông tin phường/xã nhận hàng bị thiếu hoặc không hợp lệ trên GHN. Vui lòng cập nhật lại địa chỉ/phường/xã rồi thử gửi lại yêu cầu.',
                                            variant: 'error',
                                        });
                                    } else if (/service_id/i.test(msg) || /service_type_id/i.test(msg)) {
                                        pushToast({
                                            title: 'Không chọn được dịch vụ vận chuyển',
                                            description:
                                                'GHN báo lỗi service_id/service_type_id. Vui lòng thử lại sau hoặc kiểm tra lại thông tin địa chỉ; nếu vẫn lỗi, liên hệ admin để cấu hình lại dịch vụ GHN.',
                                            variant: 'error',
                                        });
                                    } else {
                                        pushToast({
                                            title: 'Gửi yêu cầu thất bại',
                                            description: msg || 'Gửi yêu cầu thất bại.',
                                            variant: 'error',
                                        });
                                    }
                                } finally {
                                    setReturnCreateSubmitting(false);
                                }
                            }}
                        >
                            {returnCreateSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Order detail dialog by orderId (BUY tab) - full màn hình, chỉ nội dung bên trong cuộn */}
            <Dialog open={!!detailOrderId} onOpenChange={(open) => { if (!open) { setDetailOrderId(null); } }}>
                <DialogContent className="w-[92vw] max-w-5xl h-[88vh] max-h-[88vh] flex flex-col overflow-hidden p-4 gap-0">
                    <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                        <DialogTitle>
                            Chi tiết đơn hàng #{detailOrderId?.slice(0, 8)}
                        </DialogTitle>
                        <DialogDescription>
                            Sản phẩm, shipment và trạng thái giao hàng cho đơn này.
                        </DialogDescription>
                    </DialogHeader>
                    {detailLoading ? (
                        <div className="flex-1 flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Đang tải chi tiết đơn hàng...
                        </div>
                    ) : detailItems.length === 0 && !(detailBlindBoxCards && detailBlindBoxCards.length > 0) ? (
                        (() => {
                            const summary = buyOrders.find(
                                (o) => String(o.orderId) === String(detailOrderId || ''),
                            );
                            const isBlindBoxOrder = !!summary?.blindBoxId;
                            return (
                                <div className="flex-1 flex items-center justify-center py-6 text-sm text-muted-foreground text-center px-4">
                                    {isBlindBoxOrder
                                        ? 'Đây là đơn giao thẻ từ Hộp bí ẩn. Hiện backend chưa trả chi tiết thẻ cho màn Đơn mua, nên không thể hiển thị danh sách thẻ. Bạn vẫn có thể xem lịch sử thẻ trong trang Hộp bí ẩn.'
                                        : 'Không tìm thấy order item cho đơn này.'}
                                </div>
                            );
                        })()
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-4">
                        <div className="space-y-6 text-sm">
                            {/* Thông tin đơn hàng (tóm tắt) */}
                            {(() => {
                                const summary = buyOrders.find(
                                    (o) => String(o.orderId) === String(detailOrderId || ''),
                                );
                                const orderStatus = summary?.status as OrderStatus | undefined;

                                let shipmentStatus: ShippingStatus | undefined;
                                if (detailBlindBoxShipment) {
                                    shipmentStatus = detailBlindBoxShipment.shipmentStatus as ShippingStatus;
                                } else if (firstDetailShipmentId) {
                                    const allShipments = Object.values(detailShipments).flat() as Array<{
                                        shipmentId?: string;
                                        status?: string;
                                    }>;
                                    const firstShipment = allShipments.find(
                                        (s) =>
                                            String(s.shipmentId || '') === String(firstDetailShipmentId || ''),
                                    );
                                    shipmentStatus = firstShipment?.status as ShippingStatus | undefined;
                                }

                                let currentStep = 1;
                                if (orderStatus && orderStatus !== 'CREATED') {
                                    currentStep = Math.max(currentStep, 2);
                                }
                                if (
                                    shipmentStatus &&
                                    ['ASIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(shipmentStatus)
                                ) {
                                    currentStep = Math.max(currentStep, 3);
                                }
                                if (
                                    shipmentStatus &&
                                    ['DELIVERED', 'RECEIVED'].includes(shipmentStatus)
                                ) {
                                    currentStep = Math.max(currentStep, 4);
                                }
                                if (
                                    orderStatus &&
                                    ['COMPLETED', 'PARTIAL_COMPLETED'].includes(orderStatus)
                                ) {
                                    currentStep = Math.max(currentStep, 5);
                                }

                                const steps = [
                                    { key: 1, label: 'Đơn hàng đã đặt' as const },
                                    { key: 2, label: 'Đơn hàng đã thanh toán' as const },
                                    { key: 3, label: 'Đã giao cho ĐVVC' as const },
                                    { key: 4, label: 'Đã nhận được hàng' as const },
                                    { key: 5, label: 'Đánh giá' as const },
                                ];

                                // Nếu được mở từ nút "Đánh giá" trên list Đơn mua: auto bật form đánh giá cho item đầu
                                if (pendingFeedbackOrderId && String(pendingFeedbackOrderId) === String(detailOrderId)) {
                                    const firstItem = detailItems[0];
                                    if (firstItem?.orderItemId) {
                                        setTimeout(() => {
                                            setFeedbackEditingId(String(firstItem.orderItemId));
                                            setFeedbackRating(5);
                                            setFeedbackComment('');
                                            const el = document.getElementById(
                                                `order-item-${String(firstItem.orderItemId)}`
                                            );
                                            if (el) {
                                                el.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'center',
                                                });
                                            }
                                            setPendingFeedbackOrderId(null);
                                        }, 0);
                                    } else {
                                        setPendingFeedbackOrderId(null);
                                    }
                                }

                                return (
                                    <div className="border border-white/10 rounded-lg p-3 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Mã đơn hàng</div>
                                                <div className="font-mono text-xs">
                                                    {detailOrderId ? `#${detailOrderId.slice(0, 8)}` : '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">Trạng thái đơn</div>
                                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-white/5 border-white/20">
                                                    <Package className="w-3 h-3" />
                                                    {orderStatus
                                                        ? ORDER_STATUS_LABELS[orderStatus] || orderStatus
                                                        : '—'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Đặt lúc</div>
                                                <div>
                                                    {summary?.orderDate
                                                        ? new Date(summary.orderDate).toLocaleString('vi-VN')
                                                        : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-white/10">
                                            <div className="flex items-center justify-between gap-2">
                                                {steps.map((step, index) => {
                                                    const isActive = currentStep >= step.key;
                                                    const isCompleted = currentStep > step.key;
                                                    return (
                                                        <div
                                                            key={step.key}
                                                            className="flex-1 flex flex-col items-center text-center"
                                                        >
                                                            <div className="flex items-center w-full">
                                                                {index > 0 && (
                                                                    <div
                                                                        className={`flex-1 h-0.5 ${
                                                                            currentStep > step.key
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-white/10'
                                                                        }`}
                                                                    />
                                                                )}
                                                                <div
                                                                    className={`flex items-center justify-center rounded-full border-2 w-8 h-8 text-[11px] shrink-0 ${
                                                                        isActive
                                                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                            : 'border-white/30 text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {step.key}
                                                                </div>
                                                                {index < steps.length - 1 && (
                                                                    <div
                                                                        className={`flex-1 h-0.5 ${
                                                                            isCompleted
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-white/10'
                                                                        }`}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="mt-1 text-[11px] text-muted-foreground max-w-[80px]">
                                                                {step.label}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Khối sản phẩm + vận chuyển */}
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
                                                <span>
                                                    {SHIPPING_STATUS_LABELS[
                                                        detailBlindBoxShipment.shipmentStatus as ShippingStatus
                                                    ] || detailBlindBoxShipment.shipmentStatus}
                                                </span>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailItems.map((it) => {
                                        const id = String(it.orderItemId);
                                        const name = it.cardName || 'Thẻ';
                                        const image = it.cardImageUrl;
                                        const isReceived =
                                            it.orderItemStatus === 'RECIEVED' ||
                                            it.orderItemStatus === 'RECEIVED';
                                        const hasFeedback = it.feedbackRating != null;
                                        const isEditing = feedbackEditingId === it.orderItemId;
                                        return (
                                            <tr
                                                key={id}
                                                id={`order-item-${id}`}
                                                className="border-b border-white/5 align-top"
                                            >
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
                                                <td className="p-2 text-right">
                                                    {(() => {
                                                        const raw = String(it.orderItemStatus || '').toUpperCase();
                                                        if (!raw) return '—';
                                                        if (raw === 'PENDING_CONFIRM') return 'Chờ xác nhận';
                                                        if (raw === 'PENDING_PREPARE') return 'Chờ chuẩn bị hàng';
                                                        if (raw === 'PENDING_SHIP') return 'Chờ giao';
                                                        if (raw === 'SHIPPING') return 'Đang giao';
                                                        if (raw === 'RECIEVED' || raw === 'RECEIVED') return 'Đã nhận';
                                                        if (raw === 'CANCELLED') return 'Đã hủy';
                                                        if (raw === 'RETURNING') return 'Đang trả hàng';
                                                        if (raw === 'RETURNED') return 'Đã trả hàng';
                                                        return raw;
                                                    })()}
                                                    {viewMode === 'BUY' && (
                                                        <div className="mt-1">
                                                            {hasFeedback ? (
                                                                <div className="inline-flex flex-col items-end text-xs">
                                                                    <span className="flex items-center gap-0.5 text-yellow-400">
                                                                        {[1, 2, 3, 4, 5].map((i) => (
                                                                            <Star
                                                                                key={i}
                                                                                className={`h-3 w-3 ${
                                                                                    i <= (it.feedbackRating ?? 0)
                                                                                        ? 'fill-current'
                                                                                        : ''
                                                                                }`}
                                                                            />
                                                                        ))}
                                                                    </span>
                                                                    {it.feedbackComment && (
                                                                        <p className="text-muted-foreground mt-0.5 max-w-[220px] line-clamp-2">
                                                                            {it.feedbackComment}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : isReceived ? (
                                                                isEditing ? (
                                                                    <div className="mt-1 space-y-1">
                                                                        <div className="flex items-center justify-end gap-0.5">
                                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                                <button
                                                                                    key={i}
                                                                                    type="button"
                                                                                    onClick={() => setFeedbackRating(i)}
                                                                                    className="p-0.5"
                                                                                >
                                                                                    <Star
                                                                                        className={`h-4 w-4 ${
                                                                                            i <= feedbackRating
                                                                                                ? 'fill-yellow-400 text-yellow-400'
                                                                                                : 'text-white/30'
                                                                                        }`}
                                                                                    />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Nhận xét (tùy chọn)"
                                                                            value={feedbackComment}
                                                                            onChange={(e) =>
                                                                                setFeedbackComment(e.target.value)
                                                                            }
                                                                            className="w-full px-2 py-1 rounded text-xs bg-white/5 border border-white/10"
                                                                        />
                                                                        <div className="flex justify-end gap-1">
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-6 text-xs"
                                                                                disabled={feedbackSubmitting}
                                                                                onClick={async () => {
                                                                                    if (!it.orderItemId) return;
                                                                                    setFeedbackSubmitting(true);
                                                                                    try {
                                                                                        await orderApi.createFeedback(
                                                                                            it.orderItemId,
                                                                                            feedbackRating,
                                                                                            feedbackComment,
                                                                                        );
                                                                                        setDetailItems((prev) =>
                                                                                            prev.map((x) =>
                                                                                                x.orderItemId ===
                                                                                                it.orderItemId
                                                                                                    ? {
                                                                                                          ...x,
                                                                                                          feedbackRating:
                                                                                                              feedbackRating,
                                                                                                          feedbackComment:
                                                                                                              feedbackComment,
                                                                                                          feedbackCreatedAt:
                                                                                                              new Date().toISOString(),
                                                                                                      }
                                                                                                    : x,
                                                                                            ),
                                                                                        );
                                                                                        setFeedbackEditingId(null);
                                                                                        setFeedbackComment('');
                                                                                        setFeedbackRating(5);
                                                                                    } catch (err) {
                                                                                        alert(
                                                                                            err instanceof Error
                                                                                                ? err.message
                                                                                                : 'Gửi đánh giá thất bại.',
                                                                                        );
                                                                                    } finally {
                                                                                        setFeedbackSubmitting(false);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Gửi
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 text-xs"
                                                                                onClick={() => {
                                                                                    setFeedbackEditingId(null);
                                                                                    setFeedbackComment('');
                                                                                    setFeedbackRating(5);
                                                                                }}
                                                                            >
                                                                                Hủy
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-[11px] mt-1"
                                                                        onClick={() => {
                                                                            setFeedbackEditingId(it.orderItemId || null);
                                                                            setFeedbackRating(5);
                                                                            setFeedbackComment('');
                                                                        }}
                                                                    >
                                                                        Đánh giá
                                                                    </Button>
                                                                )
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            )}
                            {/* Tóm tắt tiền kiểu Shopee (dialog chi tiết theo orderId) */}
                            {(() => {
                                const summary = buyOrders.find((o) => String(o.orderId) === String(detailOrderId || ''));
                                const itemsTotal = detailItems.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0);
                                const totalAmount = Number(summary?.totalAmount ?? 0);
                                const shippingFee = Math.max(totalAmount - itemsTotal, 0);
                                const shipDiscount = 0;
                                const voucherDiscount = 0;
                                return (
                                    <div className="mt-6 pt-4 text-sm">
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Tổng tiền hàng</span>
                                            <span>{itemsTotal.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Phí vận chuyển (ước tính)</span>
                                            <span>{shippingFee.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground inline-flex items-center gap-1">
                                                Giảm giá phí vận chuyển
                                                <span title="Áp dụng khi có chương trình giảm phí ship" className="text-muted-foreground/80 cursor-help">
                                                    <Info className="h-3.5 w-3.5 inline" />
                                                </span>
                                            </span>
                                            <span className={shipDiscount > 0 ? 'text-green-400' : ''}>{shipDiscount > 0 ? '-' : ''}{shipDiscount.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Voucher</span>
                                            <span className={voucherDiscount > 0 ? 'text-green-400' : ''}>{voucherDiscount > 0 ? '-' : ''}{voucherDiscount.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-t border-dotted border-white/20">
                                            <span className="font-semibold">Thành tiền</span>
                                            <span className="text-lg font-bold text-orange-400">{totalAmount.toLocaleString('vi-VN')}₫</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                            <span className="text-muted-foreground">Phương thức thanh toán</span>
                                            <span className="font-medium">Ví MystiCard</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="mt-4 flex justify-end gap-2" />
                        </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Return request detail dialog (Shopee-like) */}
            <Dialog open={!!selectedReturn} onOpenChange={(open) => { if (!open) setSelectedReturn(null); }}>
                <DialogContent className="w-[96vw] max-w-3xl max-h-[85vh] overflow-y-auto">
                    {selectedReturn && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Chi tiết yêu cầu trả hàng
                                    <span className="font-mono text-xs text-muted-foreground">
                                        #{String(selectedReturn.returnRequestId).slice(0, 8)}
                                    </span>
                                </DialogTitle>
                                <DialogDescription>
                                    Lý do, danh sách sản phẩm, ảnh minh chứng và shipment trả hàng.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-3 space-y-4 text-sm">
                                {/* Header: trạng thái, thời gian, mã yêu cầu */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Trạng thái</div>
                                        <div className="font-semibold">
                                            {RETURN_STATUS_LABELS[selectedReturn.status as ReturnRequestStatus] || selectedReturn.status}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Đã yêu cầu lúc</div>
                                        <div>{selectedReturn.createdAt ? new Date(selectedReturn.createdAt).toLocaleString('vi-VN') : '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Mã yêu cầu</div>
                                        <div className="font-mono text-xs break-all">{selectedReturn.returnRequestId}</div>
                                    </div>
                                </div>

                                {/* Thông tin người bán (ưu tiên dữ liệu BE trả về trực tiếp) */}
                                {selectedReturn && (
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">Người bán</div>
                                        <div className="glass-card p-3 rounded-lg border border-white/10">
                                            {selectedReturn.sellerName ||
                                                selectedReturn.orderItems?.[0]?.cardResponse?.sellerName ||
                                                selectedReturn.orderItems?.[0]?.cardResponse?.seller?.name ||
                                                'Người bán'}
                                        </div>
                                    </div>
                                )}

                                {/* Sản phẩm + tổng tiền hàng + chi tiết hoàn tiền */}
                                {(selectedReturn.orderItems?.length ?? 0) > 0 && (() => {
                                    const items = selectedReturn.orderItems || [];
                                    const goodsTotal = items.reduce((sum: number, it: any) => {
                                        const qty = Number(it.quantity ?? 0);
                                        const price = Number(it.price ?? 0);
                                        return sum + qty * price;
                                    }, 0);
                                    return (
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-2">Sản phẩm</div>
                                                <div className="space-y-2">
                                                    {items.map((it: any) => {
                                                        const name = it.cardName || it.cardResponse?.name || 'Thẻ';
                                                        const img =
                                                            it.cardImageUrl ||
                                                            (it.cardResponse ? getCardImageUrl(it.cardResponse) : '') ||
                                                            '';
                                                        const qty = Number(it.quantity ?? 0);
                                                        const price = Number(it.price ?? 0);
                                                        return (
                                                            <div key={String(it.orderItemId)} className="flex items-center gap-3 border border-white/10 rounded-lg p-2">
                                                                {img ? (
                                                                    <img src={img} alt={name} className="w-14 h-20 rounded bg-white/5 object-cover" />
                                                                ) : (
                                                                    <div className="w-14 h-20 rounded bg-white/5 flex items-center justify-center text-xl">🎴</div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium line-clamp-1">{name}</div>
                                                                    <div className="text-xs text-muted-foreground font-mono">
                                                                        #{String(it.orderItemId || '').slice(0, 8)} · x{qty}
                                                                    </div>
                                                                </div>
                                                                <div className="font-semibold">{(price * qty).toLocaleString('vi-VN')} đ</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="border border-white/10 rounded-lg p-3 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Tổng tiền hàng</span>
                                                    <span className="font-semibold">{goodsTotal.toLocaleString('vi-VN')} đ</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="text-xs text-primary-300 underline mt-1"
                                                    onClick={() => setReturnShowRefundDetail((v) => !v)}
                                                >
                                                    {returnShowRefundDetail ? 'Thu gọn chi tiết hoàn tiền' : 'Xem chi tiết hoàn tiền'}
                                                </button>
                                                {returnShowRefundDetail && (
                                                    <div className="mt-2 space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Số tiền hàng</span>
                                                            <span className="font-semibold">{goodsTotal.toLocaleString('vi-VN')} đ</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Phương thức hoàn tiền</span>
                                                            <span className="font-semibold">Ví Wallet</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Proposed Refund Amount</span>
                                                            <span className="font-semibold">{goodsTotal.toLocaleString('vi-VN')} đ</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Số tiền hoàn được nhận</span>
                                                            <span className="font-semibold">{goodsTotal.toLocaleString('vi-VN')} đ</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Lý do + xem chi tiết (kèm ảnh minh chứng) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-muted-foreground">Lý do hàng trả/hoàn tiền</div>
                                        <button
                                            type="button"
                                            className="text-xs text-primary-300 underline"
                                            onClick={() => setReturnShowReasonDetail((v) => !v)}
                                        >
                                            {returnShowReasonDetail ? 'Thu gọn' : 'Xem chi tiết'}
                                        </button>
                                    </div>
                                    <div className="glass-card p-3 rounded-lg border border-white/10 text-sm line-clamp-2">
                                        {selectedReturn.reason || '—'}
                                    </div>
                                    {returnShowReasonDetail && (
                                        <div className="space-y-2 mt-1">
                                            <div className="text-xs text-muted-foreground">Lý do chi tiết</div>
                                            <div className="glass-card p-3 rounded-lg border border-white/10">
                                                {selectedReturn.reason || '—'}
                                            </div>
                                            {(selectedReturn.listImages?.length ?? 0) > 0 && (
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-2">Ảnh minh chứng</div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {(selectedReturn.listImages || []).map((img: any, idx: number) => {
                                                            const url = img.imageUrl || img.url;
                                                            if (!url) return null;
                                                            return (
                                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                                                                    <img
                                                                        src={url}
                                                                        alt={`img-${idx}`}
                                                                        className="w-full h-32 object-cover rounded-lg border border-white/10"
                                                                    />
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Shipment trả hàng + theo dõi hành trình */}
                                {selectedReturn.shipmentResponse?.shipmentId && (
                                    <div className="border-t border-white/10 pt-3 space-y-2">
                                        <div className="text-xs text-muted-foreground mb-1">Shipment trả hàng</div>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-mono text-xs">
                                                #{String(selectedReturn.shipmentResponse.shipmentId).slice(0, 8)}
                                            </div>
                                            <div className="text-xs">
                                                Trạng thái:{' '}
                                                <span className="font-semibold">
                                                    {SHIPPING_STATUS_LABELS[
                                                        selectedReturn.shipmentResponse
                                                            .shipmentStatus as ShippingStatus
                                                    ] || selectedReturn.shipmentResponse.shipmentStatus}
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                Phí ship:{' '}
                                                <span className="font-semibold">
                                                    {Number(selectedReturn.shipmentResponse.shipmentFee ?? 0).toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>
                                        </div>
                                        {Array.isArray(selectedReturn.shipmentResponse.trackingResponses) &&
                                            selectedReturn.shipmentResponse.trackingResponses.length > 0 && (
                                                <div className="mt-2 space-y-1 text-xs">
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                        Theo dõi đơn trả hàng
                                                    </div>
                                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                                        {[...selectedReturn.shipmentResponse.trackingResponses]
                                                            .slice()
                                                            .sort((a, b) =>
                                                                (a.createAt || '').localeCompare(b.createAt || ''),
                                                            )
                                                            .map((tr) => (
                                                                <div
                                                                    key={tr.trackingId}
                                                                    className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-white/5 border border-white/10"
                                                                >
                                                                    <span className="font-mono">
                                                                        {tr.createAt
                                                                            ? new Date(tr.createAt).toLocaleString('vi-VN')
                                                                            : '—'}
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        {tr.shippingStatus
                                                                            ? SHIPPING_STATUS_LABELS[
                                                                                  tr.shippingStatus as ShippingStatus
                                                                              ] || tr.shippingStatus
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => setSelectedReturn(null)}>
                                    Đóng
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            {/* Confirm dialog (replaces window.confirm) */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{confirmDialog.title}</DialogTitle>
                        {confirmDialog.description && <DialogDescription>{confirmDialog.description}</DialogDescription>}
                    </DialogHeader>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}>
                            Không
                        </Button>
                        <Button size="sm" onClick={() => confirmDialog.onConfirm?.()}>
                            Đồng ý
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Toast notifications (replaces window.alert) */}
            {toasts.map((t) => (
                <Toast
                    key={t.id}
                    variant={t.variant}
                    duration={3500}
                    onOpenChange={(open) => {
                        if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                >
                    <div className="grid gap-1">
                        <ToastTitle>{t.title}</ToastTitle>
                        {t.description && <ToastDescription>{t.description}</ToastDescription>}
                    </div>
                    <ToastClose />
                </Toast>
            ))}
            <ToastViewport />
        </div>
        </ToastProvider>
    );
};

