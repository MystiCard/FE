import React, { useEffect, useState } from 'react';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';
import { listSellerApi, orderApi, OrderItemResponse, OrderDetailResponse, ShippingStatus, transactionApi, OrderSummaryResponse, OrderStatus, shipmentApi, TrackingResponse, cardApi, Card, getCardImageUrl, getFullImageUrl, returnRequestApi, ReturnRequestItem, ReturnRequestStatus, ReturnRequestCreate, userApi, UserProfile } from '@/utils/api';
import { AlertCircle, Package, Search, Truck, MapPin, Phone, CreditCard, Star, Info, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type UserShippingFilter = ShippingStatus | 'ALL';
type BuyStatusTab = 'ALL' | OrderStatus;

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

const BUY_STATUS_TABS: { value: BuyStatusTab; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'CREATED', label: 'Chưa thanh toán' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PARTIAL_COMPLETED', label: 'Hoàn tất 1 phần' },
    { value: 'COMPLETED', label: 'Hoàn tất' },
    { value: 'PARTIAL_CANCELLED', label: 'Hủy 1 phần' },
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

/** Chỉ order item có status này mới được chọn trong form trả hàng (BE có thể trả RECIEVED typo) */
const RETURN_ALLOWED_ORDER_ITEM_STATUSES = ['RECEIVED', 'RECIEVED'];

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
    const [buyStatusTab, setBuyStatusTab] = useState<BuyStatusTab>('ALL');
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
    const [detailOrderSummary, setDetailOrderSummary] = useState<OrderSummaryResponse | null>(null);
    const [detailItems, setDetailItems] = useState<(OrderItemResponse['orderDetailResponseList'][number] & { cardName?: string; cardImageUrl?: string })[]>([]);
    const [detailShipments, setDetailShipments] = useState<Record<string, { shipmentId: string; status: string }[]>>({});
    const [detailTrackings, setDetailTrackings] = useState<Record<string, TrackingResponse[]>>({});
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailCanReturnByShipmentId, setDetailCanReturnByShipmentId] = useState<Record<string, boolean>>({});
    const [detailCheckingCanReturn, setDetailCheckingCanReturn] = useState(false);
    // Per-shipment: can confirm? (checked via orderApi.canConfirmShipment)
    const [detailCanConfirmByShipmentId, setDetailCanConfirmByShipmentId] = useState<Record<string, boolean>>({});
    // Per-order-item: can cancel? (checked via orderApi.canCancelOrderItem)
    const [detailCanCancelByItemId, setDetailCanCancelByItemId] = useState<Record<string, boolean>>({});
    // Per-order: can cancel whole order? (checked via orderApi.canCancelOrder)
    const [buyCanCancelByOrderId, setBuyCanCancelByOrderId] = useState<Record<string, boolean>>({});

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
    const [rejectingOrderItemId, setRejectingOrderItemId] = useState<string | null>(null);
    const [confirmReceiveShipmentId, setConfirmReceiveShipmentId] = useState<string | null>(null);
    const [detailTrackingShipmentId, setDetailTrackingShipmentId] = useState<string | null>(null);
    const [trackingDetailList, setTrackingDetailList] = useState<TrackingResponse[]>([]);
    const [trackingDetailLoading, setTrackingDetailLoading] = useState(false);
    const [trackingImagePreviewUrl, setTrackingImagePreviewUrl] = useState<string | null>(null);
    // Chi tiết đơn theo getByShippingStatus (Shopee style) + paging (page 1-based, size 2)
    const [detailShippingStatusFilter, setDetailShippingStatusFilter] = useState<ShippingStatus | 'ALL'>('ALL');
    const [detailByStatusContent, setDetailByStatusContent] = useState<OrderItemResponse[]>([]);
    const [detailByStatusLoading, setDetailByStatusLoading] = useState(false);
    const [detailByStatusPage, setDetailByStatusPage] = useState(1);
    const [detailByStatusTotalPages, setDetailByStatusTotalPages] = useState(1);
    const [returnShowReasonDetail, setReturnShowReasonDetail] = useState(false);
    /** Lightbox ảnh minh chứng trả hàng: { urls, index } hoặc null khi đóng */
    const [returnImageLightbox, setReturnImageLightbox] = useState<{ urls: string[]; index: number } | null>(null);
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

    // Khi chọn quận/huyện gửi, load danh sách phường/xã GHN (shipmentApi) và gợi ý sendWardId từ địa chỉ
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
                if (returnParsedAddress.wardName && list.length > 0) {
                    const wardNameNorm = returnParsedAddress.wardName.toLowerCase().trim();
                    const found = list.find((x) => (x.WardName || '').toLowerCase().trim() === wardNameNorm || (x.WardName || '').toLowerCase().includes(wardNameNorm));
                    if (found && found.WardCode != null) {
                        const code = Number(found.WardCode);
                        if (!Number.isNaN(code)) setReturnCreateSendWardId(code);
                    }
                }
            } catch {
                setReturnWards([]);
            }
        };
        void load();
    }, [returnCreateSendDistrictId, returnParsedAddress.wardName]);

    // Khi mở modal trả hàng: load provinces từ shipment API nếu chưa có, pre-fill từ myProfile
    useEffect(() => {
        if (!returnCreateOpen) return;
        const load = async () => {
            if (returnProvinces.length > 0) return;
            try {
                const prov = await shipmentApi.getProvinces().catch(() => []);
                const list = Array.isArray(prov) ? prov : [];
                setReturnProvinces(list);
                if (myProfile?.address) {
                    const parts = parseAddressParts(myProfile.address);
                    setReturnParsedAddress(parts);
                    const pid = findProvinceIdByName(list, parts.provinceName);
                    if (pid !== '') setReturnProvinceId(pid);
                }
            } catch {
                setReturnProvinces([]);
            }
        };
        void load();
    }, [returnCreateOpen, returnProvinces.length, myProfile]);

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
                const orderStatusFilter: OrderStatus | undefined = buyStatusTab === 'ALL' ? undefined : buyStatusTab;
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

    /** Load chi tiết đơn: tab ALL = không gửi shippingStatus (get all), tab khác = gửi shippingStatus. Page 1-based. */
    const DETAIL_PAGE_SIZE = 2;
    const loadDetailByShippingStatus = async (orderId: string, statusFilter: ShippingStatus | 'ALL', pageOneBased: number = 1) => {
        setDetailByStatusLoading(true);
        setDetailByStatusContent([]);
        try {
            const page = Math.max(1, Math.min(pageOneBased, 999));
            const res =
                statusFilter === 'ALL'
                    ? await orderApi.getOrderItemsByOrderId(orderId, undefined, page, DETAIL_PAGE_SIZE)
                    : await orderApi.getByShippingStatus(orderId, statusFilter, page, DETAIL_PAGE_SIZE);
            const content = res.content ?? [];
            setDetailByStatusContent(content);
            const totalEl = res.totalElements ?? 0;
            const fromBackend = res.totalPages ?? 0;
            const fromElements = totalEl > 0 ? Math.ceil(totalEl / DETAIL_PAGE_SIZE) : 0;
            let totalPages = fromBackend > 0 ? fromBackend : (fromElements > 0 ? fromElements : 1);
            if (page > 1 && content.length === 0) totalPages = page;
            setDetailByStatusTotalPages(Math.max(1, totalPages));
        } catch (e) {
            setDetailByStatusContent([]);
            setDetailByStatusTotalPages(1);
        } finally {
            setDetailByStatusLoading(false);
        }
    };

    const loadOrderDetail = async (orderId: string, options?: { forFeedback?: boolean; summary?: OrderSummaryResponse }) => {
        setDetailOrderId(orderId);
        const summary = options?.summary ?? buyOrders.find((o) => String(o.orderId) === String(orderId)) ?? null;
        setDetailOrderSummary(summary);
        if (options?.forFeedback) {
            setPendingFeedbackOrderId(orderId);
        }
        setDetailShippingStatusFilter('ALL');
        setDetailByStatusContent([]);
        setDetailByStatusPage(1);
        setDetailItems([]);
        setDetailShipments({});
        setDetailTrackings({});
        setDetailCanReturnByShipmentId({});

        setDetailByStatusLoading(true);
        loadDetailByShippingStatus(orderId, 'ALL', 1);
    };

    // Khi mở dialog chi tiết đơn mua (BUY), kiểm tra can-return theo từng shipment (từ detailShipments hoặc detailByStatusContent)
    useEffect(() => {
        if (!detailOrderId) return;
        const shipmentIds = new Set<string>();
        for (const itemId of Object.keys(detailShipments)) {
            const ships = detailShipments[itemId] || [];
            for (const s of ships) {
                if (s?.shipmentId) shipmentIds.add(String(s.shipmentId));
            }
        }
        detailByStatusContent.forEach((oi) => {
            const sid = oi.shipmentResponse?.shipmentId;
            if (sid) shipmentIds.add(String(sid));
        });
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
    }, [detailOrderId, detailShipments, detailByStatusContent]);

    // Per-order: check canCancelOrder for each order in the BUY list
    useEffect(() => {
        if (viewMode !== 'BUY' || buyOrders.length === 0) return;
        const ids = buyOrders.map((o) => String(o.orderId));
        Promise.all(
            ids.map(async (orderId) => {
                try {
                    const can = await orderApi.canCancelOrder(orderId);
                    return [orderId, !!can] as const;
                } catch {
                    return [orderId, false] as const;
                }
            })
        ).then((pairs) => {
            const next: Record<string, boolean> = {};
            for (const [id, can] of pairs) next[id] = can;
            setBuyCanCancelByOrderId(next);
        });
    }, [buyOrders, viewMode]);

    // Per-order-item in detail: check canCancelOrderItem (từ detailItems hoặc detailByStatusContent)
    useEffect(() => {
        const fromDetailItems = detailItems.map((it) => String(it.orderItemId)).filter(Boolean);
        const fromByStatus = detailByStatusContent.flatMap((o) =>
            (o.orderDetailResponseList || []).map((d) => String(d.orderItemId)).filter(Boolean),
        );
        const ids = [...new Set([...fromDetailItems, ...fromByStatus])];
        if (ids.length === 0) {
            setDetailCanCancelByItemId({});
            return;
        }
        Promise.all(
            ids.map(async (id) => {
                try {
                    const can = await orderApi.canCancelOrderItem(id);
                    return [id, !!can] as const;
                } catch {
                    return [id, false] as const;
                }
            }),
        ).then((pairs) => {
            const next: Record<string, boolean> = {};
            for (const [id, ok] of pairs) next[id] = ok;
            setDetailCanCancelByItemId(next);
        });
    }, [detailOrderId, detailItems, detailByStatusContent]);

    // Per-shipment từ detailByStatusContent: check canConfirmShipment
    useEffect(() => {
        const fromDetailShipments = new Set<string>();
        Object.values(detailShipments).forEach((ships) => {
            (ships || []).forEach((s) => {
                if (s?.shipmentId) fromDetailShipments.add(String(s.shipmentId));
            });
        });
        const fromByStatus = detailByStatusContent
            .map((o) => o.shipmentResponse?.shipmentId)
            .filter(Boolean)
            .map(String);
        const sids = [...new Set([...fromDetailShipments, ...fromByStatus])];
        if (sids.length === 0) {
            setDetailCanConfirmByShipmentId({});
            return;
        }
        Promise.all(
            sids.map(async (sid) => {
                try {
                    const can = await orderApi.canConfirmShipment(sid);
                    return [sid, !!can] as const;
                } catch {
                    return [sid, false] as const;
                }
            }),
        ).then((pairs) => {
            const next: Record<string, boolean> = {};
            for (const [sid, ok] of pairs) next[sid] = ok;
            setDetailCanConfirmByShipmentId(next);
        });
    }, [detailOrderId, detailShipments, detailByStatusContent]);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadOrders(page, status, viewMode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status, viewMode, buyStatusTab, isAuthenticated]);

    // Khi mở dialog chi tiết tracking, gọi API lấy danh sách tracking theo shipmentId
    useEffect(() => {
        if (!detailTrackingShipmentId) {
            setTrackingDetailList([]);
            return;
        }
        setTrackingDetailLoading(true);
        setTrackingDetailList([]);
        shipmentApi
            .getTrackingsByShipmentId(detailTrackingShipmentId)
            .then((list: TrackingResponse[]) => setTrackingDetailList(list || []))
            .catch(() => setTrackingDetailList([]))
            .finally(() => setTrackingDetailLoading(false));
    }, [detailTrackingShipmentId]);

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
                    const page = await orderApi.getOrderItemsByOrderId(orderId, undefined, 1, 1);
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
                                    {BUY_STATUS_TABS.map((f) => (
                                        <Button
                                            key={f.value}
                                            type="button"
                                            size="sm"
                                            variant={buyStatusTab === f.value ? 'default' : 'outline'}
                                            className="text-xs"
                                            onClick={() => {
                                                setPage(0);
                                                setBuyStatusTab(f.value);
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

                                        // Server-side filtering via OrderStatus tabs — no client-side filter needed

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
                                                                onClick={() => loadOrderDetail(orderId, { summary: o })}
                                                            >
                                                                Xem thêm sản phẩm / chi tiết đơn
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        {/* Xem chi tiết — always shown */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => loadOrderDetail(orderId, { summary: o })}
                                                        >
                                                            Xem chi tiết
                                                        </Button>
                                                        {/* Thanh toán — only for CREATED (unpaid) orders */}
                                                        {o.status === 'CREATED' && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    setActionLoading(true);
                                                                    try {
                                                                        const map = loadOrderItemsMap();
                                                                        const draftItems = map[orderId] as DraftOrderItem[] | undefined;
                                                                        if (draftItems && draftItems.length > 0) {
                                                                            const check = await precheckListingAvailability(draftItems);
                                                                            if (!check.ok) {
                                                                                pushToast({ title: 'Không thể thanh toán', description: check.message, variant: 'error' });
                                                                                return;
                                                                            }
                                                                        }
                                                                        await transactionApi.payOrderWithWallet(orderId);
                                                                        try { window.dispatchEvent(new Event('wallet-updated')); } catch { /* ignore */ }
                                                                        pushToast({ title: 'Thanh toán thành công!', variant: 'success' });
                                                                        await loadOrders(page, status, viewMode);
                                                                    } catch (err) {
                                                                        pushToast({ title: 'Thanh toán thất bại', description: err instanceof Error ? err.message : 'Có lỗi xảy ra.', variant: 'error' });
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                Thanh toán
                                                            </Button>
                                                        )}
                                                        {/* Hủy đơn — only when canCancelOrder returned true */}
                                                        {buyCanCancelByOrderId[orderId] && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-400 border-red-400/50 hover:bg-red-500/10"
                                                                disabled={actionLoading}
                                                                onClick={async () => {
                                                                    if (!confirm(`Hủy đơn #${orderId.slice(0, 8)}?`)) return;
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await orderApi.cancelOrder(orderId);
                                                                        pushToast({ title: 'Đã hủy đơn hàng', variant: 'success' });
                                                                        await loadOrders(page, status, viewMode);
                                                                    } catch (err) {
                                                                        pushToast({ title: 'Không thể hủy đơn', description: err instanceof Error ? err.message : 'Có lỗi xảy ra.', variant: 'error' });
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                Hủy
                                                            </Button>
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
                                                            {ORDER_STATUS_LABELS[o.status as OrderStatus] || o.status}
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
                                                    const isRejecting = rejectingOrderItemId === id;
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
                                                                    {item.orderItemStatus === 'PENDING_CONFIRM' ? 'Chờ xác nhận' : item.orderItemStatus === 'CONFIRMED' ? 'Đã xác nhận' : item.orderItemStatus || 'Chờ xác nhận'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                                        disabled={isApproving || isRejecting || item.orderItemStatus !== 'PENDING_CONFIRM'}
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
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                                        disabled={isApproving || isRejecting || item.orderItemStatus !== 'PENDING_CONFIRM'}
                                                                        onClick={async () => {
                                                                            if (!confirm('Bạn có chắc muốn từ chối order item này? Đơn sẽ bị hủy phần tương ứng.')) return;
                                                                            setRejectingOrderItemId(id);
                                                                            try {
                                                                                await orderApi.cancelOrderItem(id);
                                                                                await loadOrders(page, status, viewMode);
                                                                                pushToast({
                                                                                    title: 'Đã từ chối',
                                                                                    description: 'Order item đã được từ chối.',
                                                                                    variant: 'success',
                                                                                });
                                                                            } catch (e) {
                                                                                const msg = e instanceof Error ? e.message : String(e ?? '');
                                                                                pushToast({
                                                                                    title: 'Lỗi',
                                                                                    description: msg || 'Không thể từ chối.',
                                                                                    variant: 'error',
                                                                                });
                                                                            } finally {
                                                                                setRejectingOrderItemId(null);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {isRejecting ? 'Đang xử lý...' : 'Từ chối'}
                                                                    </Button>
                                                                </div>
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
                    <DialogContent className="max-w-none w-[95vw] md:w-[60vw] lg:w-[45vw] h-auto max-h-[85vh] flex flex-col overflow-hidden p-5 md:p-6 gap-0 rounded-2xl">
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
                                                : 0;
                                        const shipFee = Number(selectedShipment.shipfee || 0);
                                        const shipDiscount = 0;
                                        const voucherDiscount = 0;
                                        const total = itemsTotal + shipFee - shipDiscount - voucherDiscount;
                                        return (
                                            <div className="mt-6 pt-4 text-sm">
                                                <div className="flex justify-between items-center py-2.5 border-t border-dotted border-white/20">
                                                    <span className="text-muted-foreground">
                                                        Tổng tiền hàng
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
                                                        const list = (selectedShipment.orderDetailResponseList || []).filter(
                                                            (d) => RETURN_ALLOWED_ORDER_ITEM_STATUSES.includes(String((d as any).orderItemStatus ?? '').toUpperCase()),
                                                        );
                                                        const items = list.map((d) => ({
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
                                                            // Check if shipment can be confirmed
                                                            if (selectedShipment?.shipmentResponse?.shipmentId) {
                                                                const canConfirm = await orderApi.canConfirmShipment(
                                                                    String(selectedShipment.shipmentResponse.shipmentId),
                                                                );
                                                                if (!canConfirm) {
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
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Create return request dialog (buyer) */}
                <Dialog open={returnCreateOpen} onOpenChange={(open) => { if (!open) setReturnCreateOpen(false); }}>
                    <DialogContent className="max-w-5xl w-[82vw] max-h-[90vh] overflow-y-auto p-6 md:p-8">
                        <DialogHeader>
                            <DialogTitle>Gửi yêu cầu trả hàng</DialogTitle>
                            {/* <DialogDescription>
                                Chọn item cần trả trong shipment, nhập lý do và thông tin gửi hàng (theo `ReturnRequestdto`).
                            </DialogDescription> */}
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
                                    <div className="text-xs text-muted-foreground mb-1">Lý do trả hàng <span className="text-red-500">*</span></div>
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
                                    <div className="text-xs text-muted-foreground mb-1">SĐT gửi <span className="text-red-500">*</span></div>
                                    <input
                                        value={returnCreateSendPhone}
                                        onChange={(e) => setReturnCreateSendPhone(e.target.value)}
                                        className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
                                        placeholder="0xxxxxxxxx"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Tỉnh/Thành gửi (GHN) <span className="text-red-500">*</span></div>
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
                                    <div className="text-xs text-muted-foreground mb-1">Quận/Huyện gửi (GHN) <span className="text-red-500">*</span></div>
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
                                    <div className="text-xs text-muted-foreground mb-1">Phường/Xã gửi (GHN) <span className="text-red-500">*</span></div>
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
                                <div className="text-xs text-muted-foreground mb-1">Ảnh đính kèm <span className="text-red-500">*</span></div>
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

                {/* Order detail dialog – 2/3 màn hình, luôn có thanh trạng thái giao */}
                <Dialog open={!!detailOrderId} onOpenChange={(open) => { if (!open) { setDetailOrderId(null); setDetailOrderSummary(null); } }}>
                    <DialogContent className="max-w-none w-[66.67vw] h-[85vh] max-h-[85vh] flex flex-col overflow-hidden p-5 gap-0 rounded-xl border border-white/10 shadow-2xl">
                        <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                            <DialogTitle className="text-lg flex items-center gap-2 flex-wrap">
                                <Package className="w-5 h-5 text-primary-400 shrink-0" />
                                <span>Chi tiết đơn hàng #{detailOrderId?.slice(0, 8)}</span>
                                {(() => {
                                    const st = detailOrderSummary?.status ?? buyOrders.find((o) => String(o.orderId) === String(detailOrderId || ''))?.status;
                                    return st != null ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-primary-400/20 bg-primary-500/10 text-primary-200">
                                            {ORDER_STATUS_LABELS[st as OrderStatus] || st}
                                        </span>
                                    ) : null;
                                })()}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Sản phẩm, shipment và trạng thái giao hàng cho đơn này.
                            </DialogDescription>
                        </DialogHeader>
                        {detailLoading ? (
                            <div className="flex-1 flex items-center justify-center py-6 text-sm text-muted-foreground">
                                Đang tải chi tiết đơn hàng...
                            </div>
                        ) : detailByStatusLoading ? (
                            <div className="flex-1 flex items-center justify-center py-6 text-sm text-muted-foreground">
                                Đang tải theo trạng thái giao hàng...
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 mt-4 overscroll-contain">
                                <div className="space-y-6 text-sm">
                                    {/* Thông tin đơn hàng (tóm tắt) — dùng detailOrderSummary hoặc fallback buyOrders */}
                                    {(() => {
                                        const summary = detailOrderSummary ?? buyOrders.find((o) => String(o.orderId) === String(detailOrderId || ''));
                                        const orderStatus = summary?.status as OrderStatus | undefined;
                                        return (
                                            <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-0.5">Mã đơn hàng</div>
                                                        <div className="font-mono text-sm font-medium text-primary-300">
                                                            {detailOrderId ? `#${detailOrderId.slice(0, 8)}` : '—'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-0.5">Trạng thái đơn</div>
                                                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-primary-400/20 bg-primary-500/10 text-primary-200">
                                                            <Package className="w-3.5 h-3.5" />
                                                            {orderStatus != null
                                                                ? (ORDER_STATUS_LABELS[orderStatus] || orderStatus)
                                                                : '—'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-muted-foreground mb-0.5">Đặt lúc</div>
                                                        <div className="text-sm font-medium">
                                                            {summary?.orderDate
                                                                ? new Date(summary.orderDate).toLocaleString('vi-VN')
                                                                : '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Thanh trạng thái giao: luôn hiện để có thể đổi tab */}
                                    {<>
                                            <div className="flex flex-wrap items-center gap-2 py-3 border-b border-white/10 bg-white/[0.02] rounded-lg px-3 -mx-1">
                                                <span className="text-xs text-muted-foreground shrink-0 font-medium">Trạng thái giao:</span>
                                                <Button
                                                    size="sm"
                                                    variant={detailShippingStatusFilter === 'ALL' ? 'default' : 'outline'}
                                                    className="text-xs"
                                                    onClick={() => {
                                                        setDetailShippingStatusFilter('ALL');
                                                        setDetailByStatusPage(1);
                                                        if (detailOrderId) loadDetailByShippingStatus(detailOrderId, 'ALL', 1);
                                                    }}
                                                >
                                                    Tất cả
                                                </Button>
                                                {ALL_SHIPPING_STATUSES.map((st) => (
                                                    <Button
                                                        key={st}
                                                        size="sm"
                                                        variant={detailShippingStatusFilter === st ? 'default' : 'outline'}
                                                        className="text-xs"
                                                        onClick={() => {
                                                            setDetailShippingStatusFilter(st);
                                                            setDetailByStatusPage(1);
                                                            if (detailOrderId) loadDetailByShippingStatus(detailOrderId, st, 1);
                                                        }}
                                                    >
                                                        {SHIPPING_STATUS_LABELS[st] || st}
                                                    </Button>
                                                ))}
                                            </div>
                                            {detailByStatusLoading ? (
                                                <div className="py-10 text-center text-sm text-muted-foreground">
                                                    Đang tải theo trạng thái giao hàng...
                                                </div>
                                            ) : detailByStatusContent.length > 0 ? (
                                            <div className="space-y-4 pt-3">
                                                {detailByStatusContent.map((oi) => {
                                                    const ship = oi.shipmentResponse;
                                                    const sid = ship?.shipmentId ? String(ship.shipmentId) : '';
                                                    const statusLabel = ship?.shipmentStatus
                                                        ? (SHIPPING_STATUS_LABELS[ship.shipmentStatus as ShippingStatus] || ship.shipmentStatus)
                                                        : '—';
                                                    const items = oi.orderDetailResponseList || [];
                                                    return (
                                                        <div key={sid || Math.random()} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden shadow-lg hover:bg-white/[0.05] transition-colors">
                                                            <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02]">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-muted-foreground text-xs font-medium">Shipment</span>
                                                                    <span className="font-mono text-xs font-semibold text-primary-300">#{sid.slice(0, 8) || '—'}</span>
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border border-primary-400/20 bg-primary-500/10 text-primary-200">
                                                                        <Truck className="w-3 h-3" />
                                                                        {statusLabel}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                        onClick={() => setDetailTrackingShipmentId(sid || null)}
                                                                    >
                                                                        Xem tracking
                                                                    </Button>
                                                                    {sid && detailCanConfirmByShipmentId[sid] && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                                            disabled={actionLoading}
                                                                            onClick={async () => {
                                                                                if (!sid) return;
                                                                                setActionLoading(true);
                                                                                try {
                                                                                    await orderApi.confirmReceive(sid);
                                                                                    if (detailOrderId) loadDetailByShippingStatus(detailOrderId, detailShippingStatusFilter, detailByStatusPage);
                                                                                    pushToast({ title: 'Đã xác nhận đã nhận hàng', variant: 'success' });
                                                                                } catch (e) {
                                                                                    pushToast({ title: 'Không thể xác nhận', description: e instanceof Error ? e.message : '', variant: 'error' });
                                                                                } finally {
                                                                                    setActionLoading(false);
                                                                                }
                                                                            }}
                                                                        >
                                                                            Xác nhận đã nhận
                                                                        </Button>
                                                                    )}
                                                                    {sid && detailCanReturnByShipmentId[sid] && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                                                                            onClick={() => {
                                                                                setReturnCreateShipmentId(sid);
                                                                                const list = (oi.orderDetailResponseList || []).filter((d) =>
                                                                                    RETURN_ALLOWED_ORDER_ITEM_STATUSES.includes(String((d as any).orderItemStatus ?? '').toUpperCase()),
                                                                                );
                                                                                const itemList = list.map((d) => ({
                                                                                    orderItemId: String(d.orderItemId),
                                                                                    cardName: (d as any).cardName || (d as any).cardResponse?.name || 'Thẻ',
                                                                                    cardImageUrl: (d as any).cardImageUrl || ((d as any).cardResponse ? getCardImageUrl((d as any).cardResponse) : undefined),
                                                                                    quantity: Number(d.quantity ?? 0),
                                                                                    price: Number(d.price ?? 0),
                                                                                }));
                                                                                setReturnCreateItems(itemList);
                                                                                setReturnCreateItemIds(itemList.map((x) => x.orderItemId));
                                                                                if (myProfile) {
                                                                                    setReturnCreateSendPhone(myProfile.phone || '');
                                                                                    setReturnCreateSendAddress(myProfile.address || '');
                                                                                    setReturnCreateAddressPreset('PROFILE');
                                                                                }
                                                                                setReturnCreateOpen(true);
                                                                            }}
                                                                        >
                                                                            Trả hàng
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="p-3">
                                                                <table className="w-full text-sm">
                                                                    <thead>
                                                                        <tr className="border-b border-white/10">
                                                                            <th className="text-left p-2">Sản phẩm</th>
                                                                            <th className="text-right p-2">SL</th>
                                                                            <th className="text-right p-2">Đơn giá</th>
                                                                            <th className="text-right p-2">Trạng thái</th>
                                                                            <th className="text-right p-2">Thao tác</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {items.map((d) => {
                                                                            const oid = String(d.orderItemId);
                                                                            const name = (d as any).cardName || (d as any).cardResponse?.name || 'Thẻ';
                                                                            const img = (d as any).cardImageUrl || ((d as any).cardResponse ? getCardImageUrl((d as any).cardResponse) : undefined);
                                                                            const itemStatus = (d as any).orderItemStatus ?? '—';
                                                                            return (
                                                                                <tr key={oid} className="border-b border-white/5">
                                                                                    <td className="p-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {img ? (
                                                                                                <img src={img} alt={name} className="w-12 h-16 rounded object-cover bg-white/5" />
                                                                                            ) : (
                                                                                                <div className="w-12 h-16 rounded bg-white/5 flex items-center justify-center text-lg">🎴</div>
                                                                                            )}
                                                                                            <span className="text-sm line-clamp-2">{name}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-2 text-right">{Number(d.quantity ?? 0)}</td>
                                                                                    <td className="p-2 text-right">{Number(d.price ?? 0).toLocaleString('vi-VN')} đ</td>
                                                                                    <td className="p-2 text-right">
                                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/10 text-primary-200">
                                                                                            {itemStatus}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-2 text-right">
                                                                                        {detailCanCancelByItemId[oid] && (
                                                                                            <Button
                                                                                                size="sm"
                                                                                                variant="outline"
                                                                                                className="h-7 text-[11px] text-red-400 border-red-400/50 hover:bg-red-500/10"
                                                                                                disabled={actionLoading}
                                                                                                onClick={async () => {
                                                                                                    if (!confirm(`Hủy sản phẩm #${oid.slice(0, 8)}?`)) return;
                                                                                                    setActionLoading(true);
                                                                                                    try {
                                                                                                        await orderApi.cancelOrderItem(oid);
                                                                                                        pushToast({ title: 'Đã hủy sản phẩm', variant: 'success' });
                                                                                                        if (detailOrderId) loadDetailByShippingStatus(detailOrderId, detailShippingStatusFilter, detailByStatusPage);
                                                                                                    } catch (err) {
                                                                                                        pushToast({ title: 'Không thể hủy', description: err instanceof Error ? err.message : '', variant: 'error' });
                                                                                                    } finally {
                                                                                                        setActionLoading(false);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                Hủy
                                                                                            </Button>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            ) : (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    Chưa có shipment nào với trạng thái này.
                                                </div>
                                            )}
                                            {/* Paging: hiện khi chọn 1 trạng thái (không phải Tất cả), page 1..totalPages */}
                                            <div className="flex items-center justify-between pt-4 border-t border-white/10 text-sm">
                                                <span className="text-muted-foreground">
                                                    Trang {detailByStatusPage} / {detailByStatusTotalPages}
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={detailByStatusPage <= 1 || detailByStatusLoading}
                                                        onClick={() => {
                                                            const next = Math.max(1, detailByStatusPage - 1);
                                                            setDetailByStatusPage(next);
                                                            if (detailOrderId) loadDetailByShippingStatus(detailOrderId, detailShippingStatusFilter, next);
                                                        }}
                                                    >
                                                        Trước
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={detailByStatusPage >= detailByStatusTotalPages || detailByStatusLoading}
                                                        onClick={() => {
                                                            const next = detailByStatusPage + 1;
                                                            setDetailByStatusPage(next);
                                                            if (detailOrderId) loadDetailByShippingStatus(detailOrderId, detailShippingStatusFilter, next);
                                                        }}
                                                    >
                                                        Sau
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    }

                                    {detailItems.length > 0 ? (
                                        (() => {
                                            // Nhóm product theo shipmentId (luồng cũ khi có detailItems)
                                            const shipmentForItem: Record<
                                                string,
                                                { shipmentId: string; status?: string }
                                            > = {};
                                            Object.entries(detailShipments).forEach(([itemId, ships]) => {
                                                const first = (ships || [])[0];
                                                if (first?.shipmentId) {
                                                    shipmentForItem[itemId] = {
                                                        shipmentId: String(first.shipmentId),
                                                        status: first.status,
                                                    };
                                                }
                                            });

                                            const grouped: Record<
                                                string,
                                                {
                                                    shipmentId: string;
                                                    status?: string;
                                                    items: typeof detailItems;
                                                }
                                            > = {};

                                            detailItems.forEach((it) => {
                                                const id = String(it.orderItemId);
                                                const ship = shipmentForItem[id];
                                                const key = ship?.shipmentId ?? '_NO_SHIPMENT_';
                                                if (!grouped[key]) {
                                                    grouped[key] = {
                                                        shipmentId: ship?.shipmentId ?? '',
                                                        status: ship?.status,
                                                        items: [],
                                                    };
                                                }
                                                grouped[key].items.push(it);
                                            });

                                            const shipmentIds = Object.keys(grouped).filter(
                                                (k) => k !== '_NO_SHIPMENT_',
                                            );
                                            const noShipmentGroup = grouped['_NO_SHIPMENT_'];

                                            const renderItemRow = (it: typeof detailItems[number]) => {
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
                                                        <td className="p-2 text-right whitespace-nowrap">{Number(it.quantity ?? 0)}</td>
                                                        <td className="p-2 text-right whitespace-nowrap">
                                                            {Number(it.price ?? 0).toLocaleString('vi-VN')} đ
                                                        </td>
                                                        <td className="p-2 text-right min-w-[160px] overflow-visible">
                                                            <span className="whitespace-nowrap inline-block">
                                                                {(() => {
                                                                    const raw = String(it.orderItemStatus || '').toUpperCase();
                                                                    if (!raw) return '—';
                                                                    if (raw === 'PENDING_CONFIRM') return 'Chờ xác nhận';
                                                                    if (raw === 'CONFIRMED') return 'Đã xác nhận';
                                                                    if (raw === 'PENDING_PREPARE') return 'Chờ chuẩn bị hàng';
                                                                    if (raw === 'PENDING_SHIP') return 'Chờ giao';
                                                                    if (raw === 'SHIPPING') return 'Đang giao';
                                                                    if (raw === 'RECIEVED' || raw === 'RECEIVED') return 'Đã nhận';
                                                                    if (raw === 'CANCELLED') return 'Đã hủy';
                                                                    if (raw === 'RETURNING') return 'Đang trả hàng';
                                                                    if (raw === 'RETURNED') return 'Đã trả hàng';
                                                                    return raw;
                                                                })()}
                                                            </span>
                                                            {/* Nút hủy order item — chỉ hiện khi canCancelOrderItem = true */}
                                                            {detailCanCancelByItemId[id] && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="mt-1 h-6 text-[11px] text-red-400 border-red-400/50 hover:bg-red-500/10"
                                                                    disabled={actionLoading}
                                                                    onClick={async () => {
                                                                        if (!confirm(`Hủy sản phẩm #${id.slice(0, 8)}?`)) return;
                                                                        setActionLoading(true);
                                                                        try {
                                                                            await orderApi.cancelOrderItem(id);
                                                                            pushToast({ title: 'Đã hủy sản phẩm', variant: 'success' });
                                                                            if (detailOrderId) await loadOrderDetail(detailOrderId);
                                                                        } catch (err) {
                                                                            pushToast({ title: 'Không thể hủy sản phẩm', description: err instanceof Error ? err.message : 'Có lỗi xảy ra.', variant: 'error' });
                                                                        } finally {
                                                                            setActionLoading(false);
                                                                        }
                                                                    }}
                                                                >
                                                                    Hủy item
                                                                </Button>
                                                            )}
                                                            {viewMode === 'BUY' && (
                                                                <div className="mt-1">
                                                                    {hasFeedback ? (
                                                                        <div className="inline-flex flex-col items-end text-xs">
                                                                            <span className="flex items-center gap-0.5 text-yellow-400">
                                                                                {[1, 2, 3, 4, 5].map((i) => (
                                                                                    <Star
                                                                                        key={i}
                                                                                        className={`h-3 w-3 ${i <= (it.feedbackRating ?? 0)
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
                                                                                                className={`h-4 w-4 ${i <= feedbackRating
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
                                            };

                                            const renderShipmentCard = (key: string) => {
                                                const g = grouped[key];
                                                const trackings = detailTrackings[g.shipmentId] || [];
                                                const latestTracking =
                                                    trackings.length > 0 ? trackings[trackings.length - 1] : undefined;
                                                const shippingStatus = (latestTracking?.shippingStatus ||
                                                    g.status) as ShippingStatus | undefined;
                                                let shipmentStep = 1;
                                                if (
                                                    shippingStatus &&
                                                    ['ASIGNED', 'PICKED_UP'].includes(shippingStatus)
                                                ) {
                                                    shipmentStep = 2;
                                                }
                                                if (shippingStatus === 'IN_TRANSIT') {
                                                    shipmentStep = 3;
                                                }
                                                if (
                                                    shippingStatus &&
                                                    ['DELIVERED', 'RECEIVED'].includes(shippingStatus)
                                                ) {
                                                    shipmentStep = 4;
                                                }
                                                const shipmentSteps = [
                                                    { key: 1, label: 'Chờ xác nhận' as const },
                                                    { key: 2, label: 'Chờ lấy hàng' as const },
                                                    { key: 3, label: 'Đang giao' as const },
                                                    { key: 4, label: 'Đã nhận' as const },
                                                ];
                                                const FALLBACK_SHIPPING_LABELS: Record<string, string> = {
                                                    PENDING_APPROVED: 'Chờ xác nhận',
                                                };
                                                const labelStatus = shippingStatus
                                                    ? SHIPPING_STATUS_LABELS[shippingStatus as ShippingStatus] ||
                                                    FALLBACK_SHIPPING_LABELS[String(shippingStatus)] ||
                                                    shippingStatus
                                                    : '—';

                                                return (
                                                    <div
                                                        key={key}
                                                        className="glass-card-strong border border-white/10 rounded-xl overflow-hidden"
                                                    >
                                                        <div className="p-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => setDetailTrackingShipmentId(g.shipmentId)}
                                                                className="flex items-center gap-2 text-xs text-left hover:opacity-90 transition-opacity rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
                                                            >
                                                                <span className="text-muted-foreground">Shipment</span>
                                                                <span className="font-mono">
                                                                    #{g.shipmentId.slice(0, 8) || '—'}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border bg-white/5 border-white/20 whitespace-nowrap">
                                                                    <Truck className="w-3 h-3 shrink-0" />
                                                                    {labelStatus}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground underline">Xem chi tiết</span>
                                                            </button>
                                                            <div className="text-xs text-muted-foreground">
                                                                {g.items.length} sản phẩm
                                                            </div>
                                                        </div>
                                                        <div className="px-3 pt-3 pb-1 border-b border-white/10">
                                                            <div className="flex items-center justify-between gap-2">
                                                                {shipmentSteps.map((step, index) => {
                                                                    const isActive = shipmentStep >= step.key;
                                                                    const isCompleted = shipmentStep > step.key;
                                                                    return (
                                                                        <div
                                                                            key={step.key}
                                                                            className="flex-1 flex flex-col items-center text-center"
                                                                        >
                                                                            <div className="flex items-center w-full">
                                                                                {index > 0 && (
                                                                                    <div
                                                                                        className={`flex-1 h-0.5 ${shipmentStep > step.key
                                                                                            ? 'bg-emerald-500'
                                                                                            : 'bg-white/10'
                                                                                            }`}
                                                                                    />
                                                                                )}
                                                                                <div
                                                                                    className={`flex items-center justify-center rounded-full border-2 w-7 h-7 text-[10px] shrink-0 ${isActive
                                                                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                        : 'border-white/30 text-muted-foreground'
                                                                                        }`}
                                                                                >
                                                                                    {step.key}
                                                                                </div>
                                                                                {index < shipmentSteps.length - 1 && (
                                                                                    <div
                                                                                        className={`flex-1 h-0.5 ${isCompleted
                                                                                            ? 'bg-emerald-500'
                                                                                            : 'bg-white/10'
                                                                                            }`}
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            <div className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                                                                {step.label}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="p-3">
                                                            <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
                                                                <colgroup>
                                                                    <col style={{ minWidth: 0 }} />
                                                                    <col style={{ width: '1%', whiteSpace: 'nowrap' }} />
                                                                    <col style={{ width: '1%', whiteSpace: 'nowrap' }} />
                                                                    <col style={{ minWidth: '160px' }} />
                                                                </colgroup>
                                                                <thead>
                                                                    <tr className="border-b border-white/10">
                                                                        <th className="text-left p-2">Sản phẩm</th>
                                                                        <th className="text-right p-2 whitespace-nowrap">Số lượng</th>
                                                                        <th className="text-right p-2 whitespace-nowrap">Đơn giá</th>
                                                                        <th className="text-right p-2 whitespace-nowrap min-w-[160px]">Trạng thái</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>{g.items.map((it) => renderItemRow(it))}</tbody>
                                                            </table>
                                                            {trackings.length > 0 && (
                                                                <div className="mt-2 space-y-1 text-[11px] max-h-32 overflow-y-auto pr-1">
                                                                    <div className="text-muted-foreground mb-1">
                                                                        Lịch sử trạng thái shipment
                                                                    </div>
                                                                    {[...trackings]
                                                                        .slice()
                                                                        .sort((a, b) =>
                                                                            (a.createAt || '').localeCompare(
                                                                                b.createAt || '',
                                                                            ),
                                                                        )
                                                                        .map((tr) => (
                                                                            <div
                                                                                key={tr.trackingId}
                                                                                className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/20 border border-white/10"
                                                                            >
                                                                                <span className="font-mono">
                                                                                    {tr.createAt
                                                                                        ? new Date(
                                                                                            tr.createAt,
                                                                                        ).toLocaleString('vi-VN')
                                                                                        : '—'}
                                                                                </span>
                                                                                <span className="font-semibold">
                                                                                    {tr.shippingStatus
                                                                                        ? SHIPPING_STATUS_LABELS[
                                                                                        tr.shippingStatus as ShippingStatus
                                                                                        ] ||
                                                                                        FALLBACK_SHIPPING_LABELS[
                                                                                        String(tr.shippingStatus)
                                                                                        ] ||
                                                                                        tr.shippingStatus
                                                                                        : '—'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            )}
                                                            {viewMode === 'BUY' &&
                                                                g.shipmentId &&
                                                                detailCanConfirmByShipmentId[g.shipmentId] && (
                                                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-end gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                                            disabled={actionLoading}
                                                                            onClick={async () => {
                                                                                if (!detailOrderId) return;
                                                                                try {
                                                                                    setActionLoading(true);
                                                                                    await orderApi.confirmReceive(g.shipmentId);
                                                                                    try {
                                                                                        window.dispatchEvent(
                                                                                            new Event('wallet-updated'),
                                                                                        );
                                                                                    } catch {
                                                                                        // ignore
                                                                                    }
                                                                                    await loadOrderDetail(detailOrderId);
                                                                                    pushToast({
                                                                                        title: 'Đã xác nhận đã nhận hàng',
                                                                                        description: 'Tiền sẽ được chuyển cho người bán.',
                                                                                        variant: 'success',
                                                                                    });
                                                                                } catch (e) {
                                                                                    pushToast({
                                                                                        title: 'Không thể xác nhận nhận hàng',
                                                                                        description: e instanceof Error ? e.message : 'Có lỗi xảy ra.',
                                                                                        variant: 'error',
                                                                                    });
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
                                                                                const firstItem = g.items[0];
                                                                                if (!firstItem?.orderItemId) return;
                                                                                setFeedbackEditingId(
                                                                                    firstItem.orderItemId || null,
                                                                                );
                                                                                setFeedbackRating(5);
                                                                                setFeedbackComment('');
                                                                                const el = document.getElementById(
                                                                                    `order-item-${String(firstItem.orderItemId)}`,
                                                                                );
                                                                                if (el) {
                                                                                    el.scrollIntoView({
                                                                                        behavior: 'smooth',
                                                                                        block: 'center',
                                                                                    });
                                                                                }
                                                                            }}
                                                                        >
                                                                            Đánh giá
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            {viewMode === 'BUY' &&
                                                                shippingStatus === 'RECEIVED' &&
                                                                g.shipmentId &&
                                                                g.items.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-end gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                // Mở form tạo yêu cầu trả hàng — chỉ item có status RECEIVED/RECIEVED mới được chọn
                                                                                const allowed = g.items.filter((it) =>
                                                                                    RETURN_ALLOWED_ORDER_ITEM_STATUSES.includes(String((it as any).orderItemStatus ?? '').toUpperCase()),
                                                                                );
                                                                                const items = allowed.map((it) => ({
                                                                                    orderItemId: String(it.orderItemId),
                                                                                    cardName: it.cardName,
                                                                                    cardImageUrl: it.cardImageUrl,
                                                                                    quantity: it.quantity,
                                                                                    price: it.price,
                                                                                }));
                                                                                const ids = items.map((x) => x.orderItemId).filter(Boolean) as string[];
                                                                                setReturnCreateShipmentId(g.shipmentId);
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
                                                                            Trả hàng / Hoàn tiền
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                // Bật form đánh giá cho item đầu tiên trong shipment
                                                                                const firstItem = g.items[0];
                                                                                if (firstItem?.orderItemId) {
                                                                                    setFeedbackEditingId(String(firstItem.orderItemId));
                                                                                    setFeedbackRating(5);
                                                                                    setFeedbackComment('');
                                                                                    const el = document.getElementById(
                                                                                        `order-item-${String(firstItem.orderItemId)}`,
                                                                                    );
                                                                                    if (el) {
                                                                                        el.scrollIntoView({
                                                                                            behavior: 'smooth',
                                                                                            block: 'center',
                                                                                        });
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            Đánh giá
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                );
                                            };

                                            return (
                                                <div className="space-y-4">
                                                    {shipmentIds.map((sid) => renderShipmentCard(sid))}
                                                    {noShipmentGroup && noShipmentGroup.items.length > 0 && (
                                                        <div className="glass-card-strong border border-white/10 rounded-xl overflow-hidden">
                                                            <div className="p-3 border-b border-white/10 text-xs text-muted-foreground">
                                                                Sản phẩm chưa có shipment
                                                            </div>
                                                            <div className="p-3">
                                                                <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
                                                                    <colgroup>
                                                                        <col style={{ minWidth: 0 }} />
                                                                        <col style={{ width: '1%', whiteSpace: 'nowrap' }} />
                                                                        <col style={{ width: '1%', whiteSpace: 'nowrap' }} />
                                                                        <col style={{ minWidth: '160px' }} />
                                                                    </colgroup>
                                                                    <thead>
                                                                        <tr className="border-b border-white/10">
                                                                            <th className="text-left p-2">Sản phẩm</th>
                                                                            <th className="text-right p-2 whitespace-nowrap">Số lượng</th>
                                                                            <th className="text-right p-2 whitespace-nowrap">Đơn giá</th>
                                                                            <th className="text-right p-2 whitespace-nowrap min-w-[160px]">Trạng thái</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {noShipmentGroup.items.map((it) =>
                                                                            renderItemRow(it),
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : null}
                                    {/* Tóm tắt tiền: chỉ hiện khi có nội dung (có shipment/blind box/detail items), không hiện khi trạng thái không có gì */}
                                    {(detailByStatusContent.length > 0 || detailItems.length > 0) && (() => {
                                        const summary = buyOrders.find((o) => String(o.orderId) === String(detailOrderId || ''));
                                        const fromDetailItems = detailItems.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0), 0);
                                        const fromByStatus = detailByStatusContent.flatMap((o) => o.orderDetailResponseList || []).reduce(
                                            (s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0),
                                            0,
                                        );
                                        const itemsTotal = fromByStatus > 0 ? fromByStatus : fromDetailItems;
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

                {/* Tracking – modal to, timeline so le trái phải */}
                <Dialog open={!!detailTrackingShipmentId} onOpenChange={(open) => { if (!open) { setDetailTrackingShipmentId(null); setTrackingImagePreviewUrl(null); } }}>
                    <DialogContent className="max-w-4xl w-[90vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-6 gap-0 rounded-2xl border border-white/10 shadow-2xl">
                        <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <Truck className="w-6 h-6 text-primary-400" />
                                Chi tiết tracking
                                {detailTrackingShipmentId && (
                                    <span className="font-mono text-sm text-muted-foreground font-normal">
                                        Shipment #{detailTrackingShipmentId.slice(0, 8)}
                                    </span>
                                )}
                            </DialogTitle>
                            <DialogDescription>
                                Lịch sử cập nhật trạng thái, thời gian và ảnh đính kèm (bấm ảnh để xem lớn).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-4 pr-1 overscroll-contain">
                            {trackingDetailLoading ? (
                                <p className="text-sm text-muted-foreground py-12 text-center">
                                    Đang tải chi tiết tracking...
                                </p>
                            ) : detailTrackingShipmentId && (() => {
                                const list = trackingDetailList;
                                const sorted = [...list].sort((a, b) =>
                                    (a.createAt || '').localeCompare(b.createAt || ''),
                                );
                                const FALLBACK: Record<string, string> = { PENDING_APPROVED: 'Chờ xác nhận' };
                                if (sorted.length === 0) {
                                    return (
                                        <p className="text-sm text-muted-foreground py-12 text-center">
                                            Chưa có lịch sử tracking cho shipment này.
                                        </p>
                                    );
                                }
                                return (
                                    <div className="relative">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary-500/70 via-primary-400/30 to-white/10 rounded-full" />
                                        {sorted.map((tr, index) => {
                                            const statusLabel = tr.shippingStatus
                                                ? (SHIPPING_STATUS_LABELS[tr.shippingStatus as ShippingStatus] ||
                                                    FALLBACK[String(tr.shippingStatus)] ||
                                                    tr.shippingStatus)
                                                : '—';
                                            const dateStr = tr.createAt
                                                ? new Date(tr.createAt).toLocaleString('vi-VN', {
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                })
                                                : '—';
                                            const images = tr.images || [];
                                            const isLeft = index % 2 === 0;
                                            const contentBox = (
                                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 w-full shadow-lg hover:bg-white/[0.07] transition-colors">
                                                    <div className="font-mono text-sm text-primary-300/90">{dateStr}</div>
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-primary-400/30 bg-primary-500/10 mt-2">
                                                        <Truck className="w-4 h-4" />
                                                        {statusLabel}
                                                    </div>
                                                    {tr.note && (
                                                        <p className="text-sm text-muted-foreground mt-2">{tr.note}</p>
                                                    )}
                                                    {images.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {images.map((img: { imageId?: string; url?: string; imageUrl?: string }, i: number) => {
                                                                const rawUrl = img.imageUrl || img.url || '';
                                                                const fullUrl = getFullImageUrl(rawUrl);
                                                                return (
                                                                    <button
                                                                        key={img.imageId || i}
                                                                        type="button"
                                                                        onClick={() => fullUrl && setTrackingImagePreviewUrl(fullUrl)}
                                                                        className="rounded-xl overflow-hidden border-2 border-white/20 hover:border-primary-400/50 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition-colors"
                                                                    >
                                                                        {rawUrl ? (
                                                                            <img
                                                                                src={fullUrl}
                                                                                alt={`Tracking ${index + 1}`}
                                                                                className="w-24 h-24 object-cover cursor-pointer"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-24 h-24 bg-white/10 flex items-center justify-center">
                                                                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                            <span className="text-xs text-muted-foreground w-full block mt-1">Bấm ảnh để xem lớn</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                            return (
                                                <div key={tr.trackingId} className="relative flex items-start pb-8 min-h-[80px]">
                                                    <div className="w-[calc(50%-24px)] flex justify-end pr-3">
                                                        {isLeft ? contentBox : <div className="min-h-[60px] w-full" aria-hidden />}
                                                    </div>
                                                    <div className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary-500 border-4 border-background shrink-0 top-4 shadow-md z-10" />
                                                    <div className="w-[calc(50%-24px)] pl-3">
                                                        {!isLeft ? contentBox : <div className="min-h-[60px] w-full" aria-hidden />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Xem ảnh tracking phóng to */}
                <Dialog open={!!trackingImagePreviewUrl} onOpenChange={(open) => { if (!open) setTrackingImagePreviewUrl(null); }}>
                    <DialogContent className=" max-w-none  max-w-[90vw] max-h-[90vh] w-auto overflow-hidden p-2 flex items-center justify-center">
                        {trackingImagePreviewUrl && (
                            <img
                                src={trackingImagePreviewUrl}
                                alt="Ảnh tracking"
                                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded"
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* Return request detail dialog (Shopee-like) */}
                <Dialog open={!!selectedReturn} onOpenChange={(open) => { if (!open) { setSelectedReturn(null); setReturnImageLightbox(null); } }}>
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
                                                        <span className="text-xs text-muted-foreground">Tiền hàng (được hoàn)</span>
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
                                                                <span className="text-muted-foreground">Số tiền được hoàn</span>
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

                                    {/* Tiền ship phải trả: luôn hiện (từ shipment hoặc return level) */}
                                    <div className="border border-white/10 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Tiền ship (bạn phải trả)</span>
                                            <span className="font-semibold">
                                                {Number(
                                                    selectedReturn.shipmentResponse?.shipmentFee ??
                                                        (selectedReturn as any).returnShipmentFee ??
                                                        (selectedReturn as any).shipmentFee ??
                                                        0
                                                ).toLocaleString('vi-VN')}{' '}
                                                đ
                                            </span>
                                        </div>
                                    </div>

                                    {/* Địa chỉ lấy hàng (From address - nơi shipper đến lấy hàng) */}
                                    {(selectedReturn.shipmentResponse?.fromAddress ?? (selectedReturn as any).pickupAddress ?? (selectedReturn as any).fromAddress) && (
                                        <div className="border border-white/10 rounded-lg p-3">
                                            <div className="text-xs text-muted-foreground mb-1">Địa chỉ lấy hàng</div>
                                            <div className="text-sm">
                                                {selectedReturn.shipmentResponse?.fromAddress ??
                                                    (selectedReturn as any).pickupAddress ??
                                                    (selectedReturn as any).fromAddress}
                                            </div>
                                            {selectedReturn.shipmentResponse?.fromPhone && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    SĐT: {selectedReturn.shipmentResponse.fromPhone}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Lý do + ảnh minh chứng (luôn hiện ảnh nếu có) */}
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
                                            </div>
                                        )}
                                    </div>
                                    {/* Ảnh minh chứng: luôn hiện khi có, click mở lightbox (đóng + Trước/Sau) */}
                                    {(() => {
                                        const raw = selectedReturn.listImages ?? (selectedReturn as any).images ?? (selectedReturn as any).imageUrls ?? [];
                                        const imgs = Array.isArray(raw) ? raw : [];
                                        const urls = imgs
                                            .map((img: any) => (typeof img === 'string' ? img : img?.imageUrl ?? img?.url))
                                            .filter(Boolean) as string[];
                                        if (!urls.length) return null;
                                        return (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-2">Ảnh minh chứng (ấn vào ảnh để xem phóng to, chuyển ảnh)</div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {urls.map((url, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className="block text-left rounded-lg border border-white/10 overflow-hidden focus:ring-2 focus:ring-primary focus:outline-none"
                                                            onClick={() => setReturnImageLightbox({ urls, index: idx })}
                                                        >
                                                            <img
                                                                src={url}
                                                                alt={`Ảnh ${idx + 1}`}
                                                                className="w-full h-32 object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

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

                {/* Lightbox ảnh minh chứng: ảnh nhỏ vừa đủ nhìn, căn giữa màn hình */}
                <Dialog open={!!returnImageLightbox} onOpenChange={(open) => { if (!open) setReturnImageLightbox(null); }}>
                    <DialogContent className="max-w-[min(480px,92vw)] max-h-[90vh] w-auto overflow-hidden p-4 flex flex-col items-center justify-center gap-3">
                        {returnImageLightbox && returnImageLightbox.urls[returnImageLightbox.index] && (
                            <>
                                <div className="flex items-center justify-center min-h-[200px] w-full">
                                    <img
                                        src={returnImageLightbox.urls[returnImageLightbox.index]}
                                        alt={`Ảnh ${returnImageLightbox.index + 1}`}
                                        className="max-w-[min(420px,85vw)] max-h-[55vh] w-auto h-auto object-contain rounded"
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={returnImageLightbox.index <= 0}
                                        onClick={() =>
                                            setReturnImageLightbox((prev) =>
                                                prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev
                                            )
                                        }
                                    >
                                        ← Trước
                                    </Button>
                                    <span className="text-sm text-muted-foreground px-2">
                                        {returnImageLightbox.index + 1} / {returnImageLightbox.urls.length}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={returnImageLightbox.index >= returnImageLightbox.urls.length - 1}
                                        onClick={() =>
                                            setReturnImageLightbox((prev) =>
                                                prev && prev.index < prev.urls.length - 1
                                                    ? { ...prev, index: prev.index + 1 }
                                                    : prev
                                            )
                                        }
                                    >
                                        Sau →
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setReturnImageLightbox(null)}>
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

