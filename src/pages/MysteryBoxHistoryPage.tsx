import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    blindBoxApi,
    BlindBoxShipmentResponse,
    BlindBoxOpenResponse,
    BlindBoxResultResponse,
    BlindBoxResultStatus,
    getCardImageUrl,
    getFullImageUrl,
    orderApi,
    ShippingStatus,
    shipmentApi,
    TrackingResponse,
    transactionApi,
    userApi,
    GhnProvince,
    GhnDistrict,
    GhnWard,
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { History, ArrowLeft, Truck, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TabKey = 'BOXES' | 'ALL_RESULTS' | 'SHIPMENTS';

const RESULT_STATUS_FILTERS: { value: 'ALL' | BlindBoxResultStatus; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'NOT_RECEIVED', label: 'Chưa nhận' },
    { value: 'SHIPPING', label: 'Đang giao' },
    { value: 'RECEIVED', label: 'Đã nhận' },
];

const SHIPPING_STATUS_FILTERS: { value: 'ALL' | ShippingStatus; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ giao' },
    { value: 'ASIGNED', label: 'Đã phân shipper' },
    { value: 'PICKED_UP', label: 'Đã lấy hàng' },
    { value: 'IN_TRANSIT', label: 'Đang giao' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'RECEIVED', label: 'Đã nhận' },
    { value: 'FAILED', label: 'Thất bại' },
    { value: 'LOST', label: 'Thất lạc' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const SHIPPING_STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ giao',
    PENDING_APPROVED: 'Chờ giao',
    ASIGNED: 'Đã phân shipper',
    PICKED_UP: 'Đã lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    FAILED: 'Thất bại',
    RECEIVED: 'Đã nhận',
    LOST: 'Thất lạc',
    CANCELLED: 'Đã hủy',
};

const getResultStatusValue = (row: any): string => {
    return String(
        row?.resultStatus ??
        row?.status ??
        row?.resultstatus ??
        row?.result_status ??
        '',
    )
        .trim()
        .toUpperCase();
};

const resultStatusLabel = (status?: string) => {
    switch (String(status || '').trim().toUpperCase()) {
        case 'NOT_RECEIVED':
            return 'Chưa nhận';
        case 'SHIPPING':
            return 'Đang giao';
        case 'RECEIVED':
            return 'Đã nhận';
        default:
            return 'Chưa nhận';
    }
};

const toViDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
};

const toVnd = (value: unknown) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${n.toLocaleString('vi-VN')} đ`;
};

const parseAddressParts = (address: string): { streetDetail: string; provinceName: string; districtName: string; wardName: string } => {
    const empty = { streetDetail: '', provinceName: '', districtName: '', wardName: '' };
    if (!address || !address.trim()) return empty;
    const parts = address
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return empty;
    const provinceName = parts[parts.length - 1] ?? '';
    const districtName = parts.length >= 2 ? (parts[parts.length - 2] ?? '') : '';
    const wardName = parts.length >= 3 ? (parts[parts.length - 3] ?? '') : '';
    const streetDetail = parts.length >= 4 ? parts.slice(0, parts.length - 3).join(', ') : '';
    return { streetDetail, provinceName, districtName, wardName };
};

export const MysteryBoxHistoryPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>('BOXES');
    const [error, setError] = useState<string | null>(null);

    // Tab 1: blind box đã mua
    const [openedBoxes, setOpenedBoxes] = useState<BlindBoxOpenResponse[]>([]);
    const [openedBoxesPage, setOpenedBoxesPage] = useState(1);
    const [openedBoxesTotalPages, setOpenedBoxesTotalPages] = useState(1);
    const [openedBoxesLoading, setOpenedBoxesLoading] = useState(false);

    const [selectedBlindBox, setSelectedBlindBox] = useState<BlindBoxOpenResponse | null>(null);
    const [boxResults, setBoxResults] = useState<BlindBoxResultResponse[]>([]);
    const [boxResultsPage, setBoxResultsPage] = useState(1);
    const [boxResultsTotalPages, setBoxResultsTotalPages] = useState(1);
    const [boxResultsLoading, setBoxResultsLoading] = useState(false);
    const [boxResultStatusFilter, setBoxResultStatusFilter] = useState<'ALL' | BlindBoxResultStatus>('ALL');

    // Tab 2: tất cả kết quả
    const [allResults, setAllResults] = useState<BlindBoxResultResponse[]>([]);
    const [allResultsPage, setAllResultsPage] = useState(1);
    const [allResultsTotalPages, setAllResultsTotalPages] = useState(1);
    const [allResultsLoading, setAllResultsLoading] = useState(false);
    const [resultStatusFilter, setResultStatusFilter] = useState<'ALL' | BlindBoxResultStatus>('ALL');

    // Tab 3: shipments của blind box
    const [shipments, setShipments] = useState<BlindBoxShipmentResponse[]>([]);
    const [shipmentsPage, setShipmentsPage] = useState(1);
    const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
    const [shipmentsLoading, setShipmentsLoading] = useState(false);
    const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'ALL' | ShippingStatus>('ALL');
    const [selectedShipment, setSelectedShipment] = useState<BlindBoxShipmentResponse | null>(null);
    const [canCancelByOrderId, setCanCancelByOrderId] = useState<Record<string, boolean>>({});
    const [canConfirmByShipmentId, setCanConfirmByShipmentId] = useState<Record<string, boolean>>({});
    const [shipmentActionLoading, setShipmentActionLoading] = useState<Record<string, boolean>>({});
    const [detailTrackingShipmentId, setDetailTrackingShipmentId] = useState<string | null>(null);
    const [trackingDetailList, setTrackingDetailList] = useState<TrackingResponse[]>([]);
    const [trackingDetailLoading, setTrackingDetailLoading] = useState(false);
    const [trackingImagePreviewUrl, setTrackingImagePreviewUrl] = useState<string | null>(null);

    // UI enhancements
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Select ship flow
    const [shipSelectMode, setShipSelectMode] = useState(false);
    const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
    const [shipDialogOpen, setShipDialogOpen] = useState(false);
    const [shipSubmitting, setShipSubmitting] = useState(false);

    // Ship form (prefill from user profile)
    const [toName, setToName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [provinceId, setProvinceId] = useState<number | ''>('');
    const [districtId, setDistrictId] = useState<number | ''>('');
    const [wardId, setWardId] = useState<string>('');

    const [provinces, setProvinces] = useState<GhnProvince[]>([]);
    const [districts, setDistricts] = useState<GhnDistrict[]>([]);
    const [wards, setWards] = useState<GhnWard[]>([]);
    const [parsedAddress, setParsedAddress] = useState<{ streetDetail: string; provinceName: string; districtName: string; wardName: string }>({
        streetDetail: '',
        provinceName: '',
        districtName: '',
        wardName: '',
    });
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<{
        orderId: string;
        totalAmount: number;
        status?: string;
        amountLabel?: string;
        description?: string;
    } | null>(null);
    const [payingOrder, setPayingOrder] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!isAuthenticated || activeTab !== 'BOXES') return;
        setOpenedBoxesLoading(true);
        setError(null);
        blindBoxApi
            .getOpenedBlindBoxes(Math.max(0, openedBoxesPage - 1), 10)
            .then((res) => {
                const list = res.content || [];
                setOpenedBoxes(list);
                setOpenedBoxesTotalPages(Math.max(1, Number(res.totalPages || 1)));
                if (list.length > 0) {
                    const hasCurrentSelected = !!selectedBlindBox && list.some((b) => String(b.blindBoxId) === String(selectedBlindBox.blindBoxId));
                    if (!hasCurrentSelected) {
                        loadResultsByBlindBoxId(list[0], 1, boxResultStatusFilter);
                    }
                } else {
                    setSelectedBlindBox(null);
                    setBoxResults([]);
                }
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được danh sách blind box đã mua.'))
            .finally(() => setOpenedBoxesLoading(false));
    }, [isAuthenticated, activeTab, openedBoxesPage, boxResultStatusFilter]);

    useEffect(() => {
        if (!isAuthenticated || activeTab !== 'ALL_RESULTS') return;
        setAllResultsLoading(true);
        setError(null);
        blindBoxApi
            .getAllResultCardOpened(
                Math.max(0, allResultsPage - 1),
                10,
                resultStatusFilter === 'ALL' ? undefined : resultStatusFilter,
            )
            .then((res) => {
                setAllResults(res.content || []);
                setAllResultsTotalPages(Math.max(1, Number(res.totalPages || 1)));
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được tất cả kết quả mở hộp.'))
            .finally(() => setAllResultsLoading(false));
    }, [isAuthenticated, activeTab, allResultsPage, resultStatusFilter]);

    const loadShipments = async (
        page = shipmentsPage,
        status: 'ALL' | ShippingStatus = shipmentStatusFilter,
    ) => {
        setShipmentsLoading(true);
        setError(null);
        try {
            const res = await blindBoxApi.getBlindBoxShipments(
                Math.max(1, page),
                10,
                status === 'ALL' ? undefined : status,
            );
            const list = res.content || [];
            setShipments(list);
            setShipmentsTotalPages(Math.max(1, Number(res.totalPages || 1)));

            const permissionRows = await Promise.all(
                list.map(async (row) => {
                    const orderId = String(row.orderId || '');
                    const shipmentId = String(row.shipmentResponse?.shipmentId || '');
                    let canCancel = false;
                    let canConfirm = false;
                    try {
                        if (orderId) {
                            canCancel = await orderApi.canCancelOrder(orderId);
                        }
                    } catch {
                        canCancel = false;
                    }
                    try {
                        if (shipmentId) {
                            canConfirm = await orderApi.canConfirmShipment(shipmentId);
                        }
                    } catch {
                        canConfirm = false;
                    }
                    return { orderId, shipmentId, canCancel, canConfirm };
                }),
            );

            const cancelMap: Record<string, boolean> = {};
            const confirmMap: Record<string, boolean> = {};
            permissionRows.forEach((x) => {
                if (x.orderId) cancelMap[x.orderId] = x.canCancel;
                if (x.shipmentId) confirmMap[x.shipmentId] = x.canConfirm;
            });
            setCanCancelByOrderId(cancelMap);
            setCanConfirmByShipmentId(confirmMap);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách vận chuyển blind box.');
        } finally {
            setShipmentsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || activeTab !== 'SHIPMENTS') return;
        loadShipments(shipmentsPage, shipmentStatusFilter);
    }, [isAuthenticated, activeTab, shipmentsPage, shipmentStatusFilter]);

    useEffect(() => {
        if (!detailTrackingShipmentId) {
            setTrackingDetailList([]);
            return;
        }
        setTrackingDetailLoading(true);
        setTrackingDetailList([]);
        shipmentApi
            .getTrackingsByShipmentId(detailTrackingShipmentId)
            .then((list) => setTrackingDetailList(list || []))
            .catch(() => setTrackingDetailList([]))
            .finally(() => setTrackingDetailLoading(false));
    }, [detailTrackingShipmentId]);

    const loadResultsByBlindBoxId = (
        blindBox: BlindBoxOpenResponse,
        page = 1,
        status: 'ALL' | BlindBoxResultStatus = boxResultStatusFilter,
    ) => {
        setSelectedBlindBox(blindBox);
        setBoxResultsPage(page);
        setBoxResultsLoading(true);
        setError(null);
        blindBoxApi
            .getResultsByBlindBoxId(
                String(blindBox.blindBoxId),
                Math.max(0, page - 1),
                10,
                status === 'ALL' ? undefined : status,
            )
            .then((res) => {
                setBoxResults(res.content || []);
                setBoxResultsTotalPages(Math.max(1, Number(res.totalPages || 1)));
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được kết quả theo blind box.'))
            .finally(() => setBoxResultsLoading(false));
    };

    const activeResultList = useMemo(
        () => (activeTab === 'BOXES' ? boxResults : allResults),
        [activeTab, boxResults, allResults],
    );

    const getShipmentDetails = (shipment: BlindBoxShipmentResponse | null) => {
        if (!shipment) return [];
        const rows =
            shipment.blindBoxResults ||
            shipment.blinboxShipDetail ||
            shipment.blinboxShipDetails ||
            shipment.blindBoxShipDetails ||
            [];
        return Array.isArray(rows) ? rows : [];
    };

    const handlePayCreatedOrder = async () => {
        if (!createdOrder?.orderId) return;
        setPayingOrder(true);
        setError(null);
        try {
            await transactionApi.payOrderWithWallet(createdOrder.orderId);
            setPaymentDialogOpen(false);
            setCreatedOrder(null);
            setActiveTab('SHIPMENTS');
            setShipmentsPage(1);
            await loadShipments(1, shipmentStatusFilter);
            toast({
                title: 'Thanh toán thành công',
                description: 'Đã thanh toán bằng ví.',
                variant: 'success',
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể thanh toán bằng ví.');
        } finally {
            setPayingOrder(false);
        }
    };

    const getShipmentRowKey = (row: BlindBoxShipmentResponse, idx: number) =>
        `${String(row.orderId || 'order')}-${String(row.shipmentResponse?.shipmentId || idx)}`;

    const handleCancelShipmentOrder = async (row: BlindBoxShipmentResponse, idx: number) => {
        const orderId = String(row.orderId || '');
        if (!orderId) return;
        const key = getShipmentRowKey(row, idx);
        setShipmentActionLoading((prev) => ({ ...prev, [key]: true }));
        setError(null);
        try {
            await orderApi.cancelOrderResult(orderId);
            toast({
                title: 'Hủy đơn thành công',
                description: 'Đơn vận chuyển đã được hủy.',
                variant: 'success',
            });
            await loadShipments(shipmentsPage, shipmentStatusFilter);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể hủy đơn.');
        } finally {
            setShipmentActionLoading((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleConfirmShipmentReceive = async (row: BlindBoxShipmentResponse, idx: number) => {
        const shipmentId = String(row.shipmentResponse?.shipmentId || '');
        if (!shipmentId) return;
        const key = getShipmentRowKey(row, idx);
        setShipmentActionLoading((prev) => ({ ...prev, [key]: true }));
        setError(null);
        try {
            await orderApi.confirmReceiveBlindBoxResults(shipmentId);
            toast({
                title: 'Xác nhận thành công',
                description: 'Bạn đã xác nhận nhận thẻ.',
                variant: 'success',
            });
            await loadShipments(shipmentsPage, shipmentStatusFilter);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể xác nhận nhận thẻ.');
        } finally {
            setShipmentActionLoading((prev) => ({ ...prev, [key]: false }));
        }
    };

    const handleOpenPayShipmentFee = (row: BlindBoxShipmentResponse) => {
        const orderId = String(row.orderId || '');
        if (!orderId) return;
        setCreatedOrder({
            orderId,
            totalAmount: Number(row.shipmentResponse?.shipmentFee || 0),
            status: row.status ? String(row.status) : undefined,
            amountLabel: 'Phí ship',
            description: 'Shipment chưa có trạng thái. Bạn có muốn thanh toán phí ship bằng ví không?',
        });
        setPaymentDialogOpen(true);
    };

    const isResultSelectable = (r: BlindBoxResultResponse): boolean => getResultStatusValue(r) === 'NOT_RECEIVED';
    const selectedCount = selectedResultIds.length;

    const toggleResultSelect = (id: string) => {
        setSelectedResultIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const selectAllCurrentTabResults = () => {
        const selectableIds = activeResultList
            .filter((r) => isResultSelectable(r))
            .map((r) => String(r.blindBoxResultId));
        const allSelected =
            selectableIds.length > 0 && selectableIds.every((id) => selectedResultIds.includes(id));
        if (allSelected) {
            setSelectedResultIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
        } else {
            setSelectedResultIds((prev) => [...new Set([...prev, ...selectableIds])]);
        }
    };

    const openShipDialog = async () => {
        if (selectedResultIds.length === 0) return;
        try {
            const [profile, provs] = await Promise.all([
                userApi.getMyProfile(),
                shipmentApi.getProvinces(),
            ]);
            setToName(profile?.name || '');
            setBuyerPhone(profile?.phone || '');
            const parsed = parseAddressParts(profile?.address || '');
            setStreetAddress(parsed.streetDetail || '');
            setParsedAddress(parsed);
            setProvinceId('');
            setDistrictId(profile?.districtId ? Number(profile.districtId) : '');
            setWardId(profile?.wardId ? String(profile.wardId) : '');
            setDistricts([]);
            setWards([]);
            setProvinces(Array.isArray(provs) ? provs : []);
            setShipDialogOpen(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được thông tin giao hàng.');
        }
    };

    useEffect(() => {
        if (!shipDialogOpen || !provinces.length) return;
        if (provinceId) return;
        if (!parsedAddress.provinceName) return;
        const normalized = parsedAddress.provinceName.toLowerCase().trim();
        const p = provinces.find((x) => {
            const n = String(x.ProvinceName || '').toLowerCase().trim();
            return n === normalized || n.includes(normalized) || normalized.includes(n);
        });
        if (p?.ProvinceID != null) {
            setProvinceId(Number(p.ProvinceID));
        }
    }, [shipDialogOpen, provinces, provinceId, parsedAddress.provinceName]);

    useEffect(() => {
        if (!shipDialogOpen || !provinceId) {
            setDistricts([]);
            setDistrictId('');
            setWards([]);
            setWardId('');
            return;
        }
        shipmentApi
            .getDistricts(Number(provinceId))
            .then((list) => {
                const ds = Array.isArray(list) ? list : [];
                setDistricts(ds);
                if (districtId) {
                    const existed = ds.some((d) => Number(d.DistrictID) === Number(districtId));
                    if (!existed) setDistrictId('');
                    return;
                }
                if (parsedAddress.districtName) {
                    const normalized = parsedAddress.districtName.toLowerCase().trim();
                    const found = ds.find((d) => {
                        const n = String(d.DistrictName || '').toLowerCase().trim();
                        return n === normalized || n.includes(normalized) || normalized.includes(n);
                    });
                    if (found?.DistrictID != null) {
                        setDistrictId(Number(found.DistrictID));
                    }
                }
            })
            .catch(() => {
                setDistricts([]);
                setDistrictId('');
                setWards([]);
                setWardId('');
            });
    }, [shipDialogOpen, provinceId, parsedAddress.districtName]);

    useEffect(() => {
        if (!shipDialogOpen || !districtId) {
            setWards([]);
            setWardId('');
            return;
        }
        shipmentApi
            .getWards(Number(districtId))
            .then((list) => {
                const ws = Array.isArray(list) ? list : [];
                setWards(ws);
                if (wardId) {
                    const existed = ws.some((w) => String(w.WardCode) === String(wardId));
                    if (!existed) setWardId('');
                    return;
                }
                if (parsedAddress.wardName) {
                    const normalized = parsedAddress.wardName.toLowerCase().trim();
                    const found = ws.find((w) => {
                        const n = String(w.WardName || '').toLowerCase().trim();
                        return n === normalized || n.includes(normalized) || normalized.includes(n);
                    });
                    if (found?.WardCode) {
                        setWardId(String(found.WardCode));
                    }
                }
            })
            .catch(() => {
                setWards([]);
                setWardId('');
            });
    }, [shipDialogOpen, districtId, parsedAddress.wardName]);

    const submitCreateBlindBoxOrder = async () => {
        if (!selectedResultIds.length) {
            setError('Vui lòng chọn ít nhất 1 kết quả để ship.');
            return;
        }
        const districtName = districts.find((d) => Number(d.DistrictID) === Number(districtId))?.DistrictName || '';
        const wardName = wards.find((w) => String(w.WardCode) === String(wardId))?.WardName || '';
        const provinceName = provinces.find((p) => Number(p.ProvinceID) === Number(provinceId))?.ProvinceName || '';
        const composedAddress = [streetAddress.trim(), wardName, districtName, provinceName]
            .filter(Boolean)
            .join(', ');

        if (!toName.trim() || !buyerPhone.trim() || !streetAddress.trim() || !districtId || !wardId) {
            setError('Vui lòng nhập đủ tên, số điện thoại, địa chỉ, quận/huyện và phường/xã.');
            return;
        }
        setShipSubmitting(true);
        setError(null);
        try {
            const created = await orderApi.createBlindBoxOrder({
                toName: toName.trim(),
                buyerPhone: buyerPhone.trim(),
                buyerAddress: composedAddress,
                toDistrictId: Number(districtId),
                toWardId: Number(wardId),
                blindBoxResultIds: selectedResultIds,
            });
            setShipDialogOpen(false);
            setShipSelectMode(false);
            setSelectedResultIds([]);
            setCreatedOrder({
                orderId: String(created?.orderId || ''),
                totalAmount: Number(created?.totalAmount || 0),
                status: created?.status ? String(created.status) : undefined,
                amountLabel: 'Tổng tiền đơn hàng',
                description: 'Đơn đã tạo thành công. Bạn có muốn thanh toán ngay bằng ví không?',
            });
            setPaymentDialogOpen(true);
            // reload active tab
            if (activeTab === 'BOXES' && selectedBlindBox) {
                loadResultsByBlindBoxId(selectedBlindBox, boxResultsPage, boxResultStatusFilter);
            } else if (activeTab === 'ALL_RESULTS') {
                setAllResultsPage((p) => p); // keep page, trigger effect by changing filter toggled below
                setResultStatusFilter((s) => s);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tạo đơn ship thẻ.');
        } finally {
            setShipSubmitting(false);
        }
    };

    const renderOneBasedPaging = (
        currentPage: number,
        totalPages: number,
        onChange: (p: number) => void,
    ) => (
        <div className="flex items-center flex-wrap gap-2">
            <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => onChange(Math.max(1, currentPage - 1))}
            >
                Trước
            </Button>
            {Array.from({ length: Math.max(1, totalPages) }, (_, idx) => {
                const page = idx + 1;
                return (
                <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? 'default' : 'outline'}
                    onClick={() => onChange(page)}
                    className="min-w-9"
                >
                    {page}
                </Button>
            )})}
            <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
            >
                Sau
            </Button>
        </div>
    );

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen pb-12 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2 gradient-text flex items-center gap-2">
                        <History className="w-7 h-7 text-yellow-300" />
                        Lịch sử mở Hộp bí ẩn
                    </h1>
                    <p className="text-muted-foreground">Phân theo blind box đã mua và toàn bộ kết quả mở.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/mystery-box')} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại Hộp bí ẩn
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant={activeTab === 'BOXES' ? 'default' : 'outline'}
                    className={activeTab === 'BOXES' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                    onClick={() => setActiveTab('BOXES')}
                >
                    Hộp bí ẩn đã mua
                </Button>
                <Button
                    size="sm"
                    variant={activeTab === 'ALL_RESULTS' ? 'default' : 'outline'}
                    className={activeTab === 'ALL_RESULTS' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                    onClick={() => setActiveTab('ALL_RESULTS')}
                >
                    Tất cả kết quả
                </Button>
                <Button
                    size="sm"
                    variant={activeTab === 'SHIPMENTS' ? 'default' : 'outline'}
                    className={activeTab === 'SHIPMENTS' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                    onClick={() => setActiveTab('SHIPMENTS')}
                >
                    Vận chuyển
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {activeTab === 'BOXES' && (
                <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
                    <Card className="glass-card p-4 space-y-3 xl:sticky xl:top-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Hộp bí ẩn đã mua</div>
                            <div className="text-xs text-muted-foreground">
                                {openedBoxes.length} mục
                            </div>
                        </div>
                        {openedBoxesLoading ? (
                            <div className="text-sm text-muted-foreground">Đang tải...</div>
                        ) : openedBoxes.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Chưa có blind box nào.</div>
                        ) : (
                            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
                                {openedBoxes.map((b) => (
                                    <button
                                        key={String(b.blindBoxId)}
                                        type="button"
                                        onClick={() => loadResultsByBlindBoxId(b, 1, boxResultStatusFilter)}
                                        className={`w-full text-left rounded-lg border p-2 transition-colors ${
                                            selectedBlindBox?.blindBoxId === b.blindBoxId
                                                ? 'border-yellow-400/70 bg-yellow-500/15 shadow-[0_0_0_1px_rgba(250,204,21,0.25)]'
                                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-md overflow-hidden bg-white/10 shrink-0">
                                                {b.imageUrl ? (
                                                    <img
                                                        src={b.imageUrl}
                                                        alt={b.name || 'Blind box'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                                        BOX
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-yellow-100">{b.name || 'Hộp bí ẩn'}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {renderOneBasedPaging(openedBoxesPage, openedBoxesTotalPages, setOpenedBoxesPage)}
                    </Card>

                    <Card className="glass-card p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-white/10">
                            <div>
                                <div className="text-sm text-muted-foreground">Kết quả theo blind box</div>
                                <div className="font-semibold">
                                    {selectedBlindBox
                                        ? (selectedBlindBox.name || 'Hộp bí ẩn')
                                        : 'Chọn một blind box để xem kết quả'}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant={shipSelectMode ? 'default' : 'outline'}
                                className={shipSelectMode ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold' : 'border-white/20 text-muted-foreground hover:border-cyan-400/40 hover:text-cyan-200'}
                                onClick={() => {
                                    setShipSelectMode((v) => !v);
                                    if (shipSelectMode) setSelectedResultIds([]);
                                }}
                            >
                                {shipSelectMode ? 'Tắt chọn thẻ ship' : 'Chọn thẻ ship'}
                            </Button>
                            {shipSelectMode && (
                                <>
                                    <Button size="sm" variant="outline" className="border-violet-400/40 text-violet-200 hover:bg-violet-500/15" onClick={selectAllCurrentTabResults}>
                                        Chọn hết hợp lệ
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-semibold"
                                        disabled={selectedCount === 0}
                                        onClick={openShipDialog}
                                    >
                                        Xác nhận ({selectedCount})
                                    </Button>
                                </>
                            )}
                        </div>
                        {selectedBlindBox && (
                            <div className="flex flex-wrap items-center gap-2">
                                {RESULT_STATUS_FILTERS.map((f) => (
                                    <Button
                                        key={`box-filter-${f.value}`}
                                        size="sm"
                                        variant={boxResultStatusFilter === f.value ? 'default' : 'outline'}
                                        className={boxResultStatusFilter === f.value ? 'bg-yellow-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                                        onClick={() => {
                                            setBoxResultStatusFilter(f.value);
                                            if (selectedBlindBox) {
                                                loadResultsByBlindBoxId(selectedBlindBox, 1, f.value);
                                            }
                                        }}
                                    >
                                        {f.label}
                                    </Button>
                                ))}
                            </div>
                        )}
                        {!selectedBlindBox ? (
                            <div className="text-sm text-muted-foreground">Chưa chọn blind box.</div>
                        ) : boxResultsLoading ? (
                            <div className="text-sm text-muted-foreground">Đang tải kết quả...</div>
                        ) : boxResults.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Blind box này chưa có kết quả mở.</div>
                        ) : (
                            <div className="space-y-2">
                                {boxResults.map((r) => {
                                    const selected = selectedResultIds.includes(String(r.blindBoxResultId));
                                    const selectable = isResultSelectable(r);
                                    return (
                                    <div
                                        key={String(r.blindBoxResultId)}
                                        className={`rounded-xl border p-3 transition-colors ${
                                            selected
                                                ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
                                                : selectable
                                                    ? 'border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] hover:bg-white/10'
                                                    : 'border-white/10 bg-white/[0.03] opacity-90'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    {shipSelectMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedResultIds.includes(String(r.blindBoxResultId))}
                                                            disabled={!isResultSelectable(r)}
                                                            onChange={() => toggleResultSelect(String(r.blindBoxResultId))}
                                                            className="w-4 h-4 accent-yellow-400"
                                                        />
                                                    )}
                                                    <div className="font-semibold leading-tight text-yellow-100">{r.cardName || 'Thẻ bí ẩn'}</div>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Độ hiếm: <span className="text-foreground/90">{r.rarity || '—'}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Giá thẻ: <span className="text-emerald-300 font-semibold">{toVnd((r as any).cardPrice)}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Mở lúc: {toViDate(r.openedAt)}
                                                </div>
                                                <div className="text-xs">
                                                    <span className="px-2 py-0.5 rounded-full border border-yellow-400/40 bg-yellow-500/10 text-yellow-300">
                                                        {resultStatusLabel(getResultStatusValue(r))}
                                                    </span>
                                                </div>
                                            </div>
                                            {r.cardImageUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setImagePreviewUrl(r.cardImageUrl || null)}
                                                    className="rounded-lg border border-white/20 overflow-hidden hover:border-yellow-400/50"
                                                >
                                                    <img src={r.cardImageUrl} alt={r.cardName || 'card'} className="w-16 h-24 object-cover" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                        {selectedBlindBox &&
                            renderOneBasedPaging(boxResultsPage, boxResultsTotalPages, (p) => loadResultsByBlindBoxId(selectedBlindBox, p, boxResultStatusFilter))}
                    </Card>
                </div>
            )}

            {activeTab === 'ALL_RESULTS' && (
                <Card className="glass-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant={shipSelectMode ? 'default' : 'outline'}
                                className={shipSelectMode ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold' : 'border-white/20 text-muted-foreground hover:border-cyan-400/40 hover:text-cyan-200'}
                            onClick={() => {
                                setShipSelectMode((v) => !v);
                                if (shipSelectMode) setSelectedResultIds([]);
                            }}
                        >
                            {shipSelectMode ? 'Tắt chọn thẻ ship' : 'Chọn thẻ ship'}
                        </Button>
                        {shipSelectMode && (
                            <>
                                <Button size="sm" variant="outline" className="border-violet-400/40 text-violet-200 hover:bg-violet-500/15" onClick={selectAllCurrentTabResults}>
                                    Chọn hết hợp lệ
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-semibold"
                                    disabled={selectedCount === 0}
                                    onClick={openShipDialog}
                                >
                                    Xác nhận ({selectedCount})
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {RESULT_STATUS_FILTERS.map((f) => (
                                    <Button
                                key={f.value}
                                size="sm"
                                variant={resultStatusFilter === f.value ? 'default' : 'outline'}
                                        className={resultStatusFilter === f.value ? 'bg-yellow-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                                onClick={() => {
                                    setAllResultsPage(1);
                                    setResultStatusFilter(f.value);
                                }}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>

                    {allResultsLoading ? (
                        <div className="text-sm text-muted-foreground">Đang tải tất cả kết quả...</div>
                    ) : allResults.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Không có kết quả nào.</div>
                    ) : (
                        <div className="space-y-2">
                            {allResults.map((r) => {
                                const selected = selectedResultIds.includes(String(r.blindBoxResultId));
                                const selectable = isResultSelectable(r);
                                return (
                                <div
                                    key={String(r.blindBoxResultId)}
                                    className={`rounded-xl border p-3 transition-colors ${
                                        selected
                                            ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
                                            : selectable
                                                ? 'border-white/10 bg-white/5 hover:bg-white/10'
                                                : 'border-white/10 bg-white/[0.03] opacity-90'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {shipSelectMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedResultIds.includes(String(r.blindBoxResultId))}
                                                        disabled={!isResultSelectable(r)}
                                                        onChange={() => toggleResultSelect(String(r.blindBoxResultId))}
                                                        className="w-4 h-4 accent-yellow-400"
                                                    />
                                                )}
                                                <div className="font-semibold text-yellow-100">{r.cardName || 'Thẻ bí ẩn'}</div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Hộp: {r.blindBoxName || 'Hộp bí ẩn'} • {toViDate(r.openedAt)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Giá thẻ: <span className="text-emerald-300 font-semibold">{toVnd((r as any).cardPrice)}</span>
                                            </div>
                                            <div className="text-xs mt-1">
                                                <span className="px-2 py-0.5 rounded-full border border-yellow-400/40 bg-yellow-500/10 text-yellow-300">
                                                    {resultStatusLabel(getResultStatusValue(r))}
                                                </span>
                                            </div>
                                        </div>
                                        {r.cardImageUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setImagePreviewUrl(r.cardImageUrl || null)}
                                                className="rounded-lg border border-white/20 overflow-hidden hover:border-yellow-400/50"
                                            >
                                                <img src={r.cardImageUrl} alt={r.cardName || 'card'} className="w-14 h-20 object-cover rounded" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}

                    {renderOneBasedPaging(allResultsPage, allResultsTotalPages, setAllResultsPage)}
                </Card>
            )}

            {activeTab === 'SHIPMENTS' && (
                <Card className="glass-card p-4 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {SHIPPING_STATUS_FILTERS.map((f) => (
                            <Button
                                key={`shipment-filter-${f.value}`}
                                size="sm"
                                variant={shipmentStatusFilter === f.value ? 'default' : 'outline'}
                                className={shipmentStatusFilter === f.value ? 'bg-yellow-500 text-black font-semibold' : 'border-white/20 text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-200'}
                                onClick={() => {
                                    setShipmentsPage(1);
                                    setShipmentStatusFilter(f.value);
                                }}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>

                    {shipmentsLoading ? (
                        <div className="text-sm text-muted-foreground">Đang tải danh sách vận chuyển...</div>
                    ) : shipments.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Chưa có đơn vận chuyển nào cho blind box.</div>
                    ) : (
                        <div className="space-y-2">
                            {shipments.map((row, idx) => {
                                const shipment = row.shipmentResponse;
                                const orderId = String(row.orderId || '');
                                const shipmentId = String(shipment?.shipmentId || '');
                                const rowKey = getShipmentRowKey(row, idx);
                                const rowLoading = !!shipmentActionLoading[rowKey];
                                const canCancel = !!(orderId && canCancelByOrderId[orderId]);
                                const canConfirm = !!(shipmentId && canConfirmByShipmentId[shipmentId]);
                                const canPay = shipment?.shipmentStatus == null && !!orderId;
                                const createdAt = shipment?.createAt || row.orderDate;
                                const shipmentStatusLabel = shipment?.shipmentStatus
                                    ? (SHIPPING_STATUS_LABEL[shipment.shipmentStatus] || 'Không rõ')
                                    : 'Chưa thanh toán';
                                return (
                                    <div key={`${row.orderId || 'order'}-${shipment?.shipmentId || idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="font-semibold text-yellow-100">Đơn #{String(row.orderId || '—').slice(0, 8)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Ngày tạo: {toViDate(createdAt)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Phí ship: <span className="text-emerald-300 font-semibold">{toVnd(shipment?.shipmentFee)}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">Địa chỉ gửi: {shipment?.fromAddress || '—'}</div>
                                                <div className="text-xs text-muted-foreground">Địa chỉ nhận: {shipment?.toAddress || '—'}</div>
                                                <div className="text-xs">
                                                    <span className="px-2 py-0.5 rounded-full border border-yellow-400/40 bg-yellow-500/10 text-yellow-300">
                                                        {shipmentStatusLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setSelectedShipment(row)}>
                                                    Chi tiết
                                                </Button>
                                                {canPay && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-semibold"
                                                        disabled={rowLoading}
                                                        onClick={() => handleOpenPayShipmentFee(row)}
                                                    >
                                                        Thanh toán
                                                    </Button>
                                                )}
                                                {canCancel && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-400/50 text-red-200 hover:bg-red-500/15"
                                                        disabled={rowLoading}
                                                        onClick={() => handleCancelShipmentOrder(row, idx)}
                                                    >
                                                        Hủy
                                                    </Button>
                                                )}
                                                {canConfirm && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold hover:from-yellow-400 hover:to-amber-400"
                                                        disabled={rowLoading}
                                                        onClick={() => handleConfirmShipmentReceive(row, idx)}
                                                    >
                                                        Xác nhận nhận
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {renderOneBasedPaging(shipmentsPage, shipmentsTotalPages, setShipmentsPage)}
                </Card>
            )}

            <Dialog open={!!imagePreviewUrl} onOpenChange={(open) => { if (!open) setImagePreviewUrl(null); }}>
                <DialogContent className="max-w-none w-auto border-0 bg-transparent shadow-none p-0 flex items-center justify-center">
                    {imagePreviewUrl && (
                        <div className="relative inline-block">
                            <button
                                type="button"
                                onClick={() => setImagePreviewUrl(null)}
                                className="absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full border border-white/40 bg-black/70 text-white text-sm leading-none hover:bg-black/85"
                                aria-label="Đóng"
                            >
                                ✕
                            </button>
                            <img
                                src={imagePreviewUrl}
                                alt="Card preview"
                                className="max-w-[420px] w-auto max-h-[78vh] object-contain rounded-xl mx-auto"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={shipDialogOpen} onOpenChange={(open) => { if (!open) setShipDialogOpen(false); }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Tạo đơn ship thẻ đã chọn</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block mb-1 text-muted-foreground">Tên người nhận</label>
                                <input
                                    value={toName}
                                    onChange={(e) => setToName(e.target.value)}
                                    className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-muted-foreground">Số điện thoại</label>
                                <input
                                    value={buyerPhone}
                                    onChange={(e) => setBuyerPhone(e.target.value)}
                                    className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 text-muted-foreground">Số nhà, số đường / thôn</label>
                            <input
                                value={streetAddress}
                                onChange={(e) => setStreetAddress(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                placeholder="Ví dụ: 12 Nguyễn Trãi, Thôn 3"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block mb-1 text-muted-foreground">Tỉnh/Thành</label>
                                <select
                                    value={provinceId}
                                    onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                >
                                    <option value="">Chọn tỉnh/thành</option>
                                    {provinces.map((p) => (
                                        <option key={String(p.ProvinceID)} value={String(p.ProvinceID)}>
                                            {p.ProvinceName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-muted-foreground">Quận/Huyện</label>
                                <select
                                    value={districtId}
                                    onChange={(e) => setDistrictId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                >
                                    <option value="">Chọn quận/huyện</option>
                                    {districts.map((d) => (
                                        <option key={String(d.DistrictID)} value={String(d.DistrictID)}>
                                            {d.DistrictName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 text-muted-foreground">Phường/Xã</label>
                                <select
                                    value={wardId}
                                    onChange={(e) => setWardId(e.target.value)}
                                    className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2"
                                >
                                    <option value="">Chọn phường/xã</option>
                                    {wards.map((w) => (
                                        <option key={String(w.WardCode)} value={String(w.WardCode)}>
                                            {w.WardName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                            Địa chỉ gửi lên:{" "}
                            <span className="text-foreground">
                                {[
                                    streetAddress.trim(),
                                    wards.find((w) => String(w.WardCode) === String(wardId))?.WardName || '',
                                    districts.find((d) => Number(d.DistrictID) === Number(districtId))?.DistrictName || '',
                                    provinces.find((p) => Number(p.ProvinceID) === Number(provinceId))?.ProvinceName || '',
                                ].filter(Boolean).join(', ') || '—'}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Số thẻ đã chọn: <span className="font-semibold text-yellow-300">{selectedCount}</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShipDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button disabled={shipSubmitting} onClick={submitCreateBlindBoxOrder}>
                                {shipSubmitting ? 'Đang xử lý...' : 'OK'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!selectedShipment}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedShipment(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl w-[92vw] max-h-[78vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2">
                            <span>Chi tiết vận chuyển thẻ blind box</span>
                            {selectedShipment?.shipmentResponse?.shipmentStatus && (
                                <span className="text-xs px-2 py-1 rounded-full border border-yellow-400/40 bg-yellow-500/10 text-yellow-300">
                                    {SHIPPING_STATUS_LABEL[selectedShipment.shipmentResponse.shipmentStatus] || 'Không rõ'}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Danh sách thẻ trong shipment và thông tin giao hàng.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 text-sm">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                            <div>Đơn hàng: <span className="text-yellow-100 font-medium">#{String(selectedShipment?.orderId || '—').slice(0, 8)}</span></div>
                            <div>Ngày tạo shipment: <span>{toViDate(selectedShipment?.shipmentResponse?.createAt || selectedShipment?.orderDate)}</span></div>
                            <div>Trạng thái: <span>{selectedShipment?.shipmentResponse?.shipmentStatus ? (SHIPPING_STATUS_LABEL[selectedShipment.shipmentResponse.shipmentStatus] || 'Không rõ') : 'Chưa thanh toán'}</span></div>
                            <div>Phí ship: <span className="text-emerald-300 font-semibold">{toVnd(selectedShipment?.shipmentResponse?.shipmentFee)}</span></div>
                            <div>Địa chỉ gửi: <span>{selectedShipment?.shipmentResponse?.fromAddress || '—'}</span></div>
                            <div>Người nhận: <span>{selectedShipment?.shipmentResponse?.toName || '—'}</span></div>
                            <div>SĐT: <span>{selectedShipment?.shipmentResponse?.toPhone || '—'}</span></div>
                            <div>Địa chỉ nhận: <span>{selectedShipment?.shipmentResponse?.toAddress || '—'}</span></div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!selectedShipment?.shipmentResponse?.shipmentId}
                                onClick={() => {
                                    const shipmentId = selectedShipment?.shipmentResponse?.shipmentId;
                                    if (shipmentId) setDetailTrackingShipmentId(String(shipmentId));
                                }}
                            >
                                Xem tracking
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {getShipmentDetails(selectedShipment).length === 0 ? (
                                <div className="text-muted-foreground">Không có thẻ trong shipment này.</div>
                            ) : (
                                getShipmentDetails(selectedShipment).map((detail, idx) => {
                                    const img = getCardImageUrl(detail.cardResponse as any);
                                    const fullImg = getFullImageUrl(img);
                                    return (
                                        <div key={`${detail.blindBoxResultId || idx}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="font-medium text-yellow-100">{detail.cardResponse?.name || 'Thẻ bí ẩn'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Độ hiếm: {detail.cardResponse?.rarity || '—'} • Mở lúc: {toViDate(detail.openedAt)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Giá gốc thẻ: <span className="text-emerald-300 font-semibold">{toVnd(detail.cardResponse?.basePrice)}</span>
                                                    </div>
                                                </div>
                                                {fullImg ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setImagePreviewUrl(fullImg)}
                                                        className="rounded-lg border border-white/20 overflow-hidden hover:border-yellow-400/50"
                                                    >
                                                        <img src={fullImg} alt={detail.cardResponse?.name || 'card'} className="w-14 h-20 object-cover" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!detailTrackingShipmentId}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailTrackingShipmentId(null);
                        setTrackingDetailList([]);
                    }
                }}
            >
                <DialogContent className="max-w-4xl w-[90vw] h-[85vh] max-h-[85vh] flex flex-col overflow-hidden p-6 gap-0 rounded-2xl border border-white/10 shadow-2xl">
                    <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Truck className="w-5 h-5 text-primary-400" />
                            <span>Chi tiết tracking</span>
                        </DialogTitle>
                        <DialogDescription>
                            Lịch sử cập nhật trạng thái, thời gian và ảnh đính kèm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden mt-4 pr-1 overscroll-contain">
                        {trackingDetailLoading ? (
                            <p className="text-sm text-muted-foreground py-12 text-center">
                                Đang tải chi tiết tracking...
                            </p>
                        ) : (
                            (() => {
                                const sorted = [...trackingDetailList].sort((a, b) => (a.createAt || '').localeCompare(b.createAt || ''));
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
                                            const statusLabel = tr.shippingStatus ? (SHIPPING_STATUS_LABEL[tr.shippingStatus] || 'Không rõ') : '—';
                                            const dateStr = tr.createAt
                                                ? new Date(tr.createAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                                                : '—';
                                            const images = tr.images || [];
                                            const isLeft = index % 2 === 0;
                                            return (
                                                <div key={tr.trackingId || index} className={`relative flex items-center mb-8 ${isLeft ? 'justify-start' : 'justify-end'}`}>
                                                    <div className={`w-1/2 ${isLeft ? 'pr-6' : 'pl-6'}`}>
                                                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 w-full shadow-lg hover:bg-white/[0.07] transition-colors">
                                                            <div className="font-mono text-sm text-primary-300/90">{dateStr}</div>
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-primary-400/30 bg-primary-500/10 mt-2">
                                                                <Truck className="w-4 h-4" />
                                                                {statusLabel}
                                                            </div>
                                                            {tr.note && <p className="text-sm text-muted-foreground mt-2">{tr.note}</p>}
                                                            {images.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                    {images.map((img, i) => {
                                                                        const rawUrl = img.imageUrl || img.url || '';
                                                                        const fullUrl = getFullImageUrl(rawUrl);
                                                                        return (
                                                                            <button
                                                                                key={img.imageId || i}
                                                                                type="button"
                                                                                onClick={() => fullUrl && setTrackingImagePreviewUrl(fullUrl)}
                                                                                className="rounded-lg overflow-hidden border-2 border-white/20 hover:border-primary-400/50 transition-colors"
                                                                            >
                                                                                {rawUrl ? (
                                                                                    <img src={fullUrl} alt={`Tracking ${index + 1}`} className="w-20 h-20 object-cover" />
                                                                                ) : (
                                                                                    <div className="w-20 h-20 bg-white/10 flex items-center justify-center">
                                                                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary-400 border-2 border-gray-900" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!trackingImagePreviewUrl} onOpenChange={(open) => { if (!open) setTrackingImagePreviewUrl(null); }}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto overflow-hidden p-2 flex items-center justify-center">
                    {trackingImagePreviewUrl && (
                        <img
                            src={trackingImagePreviewUrl}
                            alt="Ảnh tracking"
                            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded"
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (!open) setPaymentDialogOpen(false); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận thanh toán đơn ship</DialogTitle>
                        <DialogDescription>
                            {createdOrder?.description || 'Bạn có muốn thanh toán bằng ví không?'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
                        {(createdOrder?.amountLabel || 'Số tiền cần thanh toán')}: <span className="font-semibold text-emerald-300">{toVnd(createdOrder?.totalAmount)}</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Để sau
                        </Button>
                        <Button disabled={payingOrder || !createdOrder?.orderId} onClick={handlePayCreatedOrder}>
                            {payingOrder ? 'Đang thanh toán...' : 'Thanh toán bằng ví'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

