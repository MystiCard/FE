import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    shipmentApi,
    ShipmentResponse,
    ShippingStatus,
    PageResponse,
    userApi,
    UserProfile,
    TrackingResponse,
    getFullImageUrl,
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, MapPin, Phone, Calendar, RefreshCw, Image as ImageIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Chờ giao',
    ASIGNED: 'Đã phân shipper',
    PICKED_UP: 'Đã lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    FAILED: 'Thất bại',
    RECEIVED: 'Đã nhận',
    LOST: 'Thất lạc',
    CANCELLED: 'Đã hủy',
    PENDING_APPROVED: 'Chờ xác nhận',
};

const STATUS_FLOW: ShippingStatus[] = [
    'PENDING_APPROVED',
    'PENDING',
    'ASIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'FAILED'
];

export const ShipmentPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'mine' | 'unassigned'>('mine');
    const [myShipments, setMyShipments] = useState<ShipmentResponse[]>([]);
    const [unassignedShipments, setUnassignedShipments] = useState<ShipmentResponse[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [pageMine, setPageMine] = useState(1);
    const [pageUnassigned, setPageUnassigned] = useState(1);
    const [totalPagesMine, setTotalPagesMine] = useState(1);
    const [totalPagesUnassigned, setTotalPagesUnassigned] = useState(1);
    const [completeFilter, setCompleteFilter] = useState(false);
    const [updateModal, setUpdateModal] = useState<ShipmentResponse | null>(null);
    const [updateStatus, setUpdateStatus] = useState<ShippingStatus>('PICKED_UP');
    const [updateNote, setUpdateNote] = useState('');
    const [updateFiles, setUpdateFiles] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [allowed, setAllowed] = useState(false);
    const [detailShipment, setDetailShipment] = useState<ShipmentResponse | null>(null);
    const [detailTrackingShipmentId, setDetailTrackingShipmentId] = useState<string | null>(null);
    const [trackingDetailList, setTrackingDetailList] = useState<TrackingResponse[]>([]);
    const [trackingDetailLoading, setTrackingDetailLoading] = useState(false);
    const [trackingImagePreviewUrl, setTrackingImagePreviewUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        const loadProfile = async () => {
            try {
                const p = await userApi.getMyProfile();
                setProfile(p);

            } catch (err) {
                const rawMessage = (err as Error).message || '';
                const normalized = rawMessage.toLowerCase();

                // Nếu BE trả 403 / USER_NOT_FOUND / không đủ quyền → thông báo rõ ràng và không crash
                if (
                    rawMessage.includes('FORBIDDEN') ||
                    rawMessage.includes('USER_NOT_FOUND') ||
                    normalized.includes('forbidden') ||
                    normalized.includes('user not found') ||
                    normalized.includes('access is denied')
                ) {
                    setMessage({
                        type: 'error',
                        text: 'Bạn không có quyền truy cập trang quản lý vận chuyển hoặc tài khoản không hợp lệ.',
                    });
                }

                setProfile(null);


            }
        };
        loadProfile();
    }, [isAuthenticated, navigate]);

    const loadMyShipments = async () => {
        setLoading(true);
        try {
            const res: PageResponse<ShipmentResponse> = await shipmentApi.getMyShipments(
                completeFilter,
                pageMine,
                10
            );
            console.log("My shipment ", res);
            setMyShipments(res.content ?? []);
            setTotalPagesMine(res.totalPages ?? 1);
        } catch (err) {
            const rawMessage = (err as Error).message || '';
            const normalized = rawMessage.toLowerCase();

            // Nếu BE trả USER_NOT_FOUND hoặc thông báo tương tự → coi như không có shipment nào
            if (rawMessage.includes('USER_NOT_FOUND') || normalized.includes('user not found')) {
                setMessage({
                    type: 'error',
                    text: 'Tài khoản hiện tại không phải shipper hoặc không tìm thấy thông tin user. Hiện chưa có đơn giao hàng nào.',
                });
                setMyShipments([]);
            } else {
                setMessage({ type: 'error', text: rawMessage || 'Không tải được danh sách đơn giao.' });
                setMyShipments([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadUnassigned = async () => {
        setLoading(true);
        try {
            const allowed = await shipmentApi.checkAllowReceive();
            setAllowed(allowed);
            const res = await shipmentApi.getNotAssignedShipments(pageUnassigned, 10);
            setUnassignedShipments(res.content ?? []);
            setTotalPagesUnassigned(res.totalPages ?? 1);
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
            setUnassignedShipments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        if (!profile) return;

        if (activeTab === 'mine') loadMyShipments();
        else loadUnassigned();
    }, [isAuthenticated, profile, activeTab, pageMine, pageUnassigned, completeFilter]);

    const handleAssignShipper = async (shipment: ShipmentResponse) => {
        if (!profile?.userId) {
            setMessage({ type: 'error', text: 'Không lấy được thông tin user.' });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            // const allowed = await shipmentApi.checkAllowReceive();
            // if (!allowed) {
            //     setMessage({
            //         type: 'error',
            //         text: 'Bạn hiện không được phép nhận shipment mới. Vui lòng kiểm tra lại quy tắc hệ thống.',
            //     });
            //     return;
            // }

            await shipmentApi.receiveShipment(String(shipment.shipmentId));
            setMessage({ type: 'success', text: 'Đã nhận đơn giao hàng.' });
            loadUnassigned();

        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenUpdate = (s: ShipmentResponse) => {
        setUpdateModal(s);
        setUpdateStatus(s.shipmentStatus);
        setUpdateNote('');
        setUpdateFiles([]);
    };

    const handleSubmitUpdate = async () => {
        if (!updateModal) return;
        setSubmitting(true);
        try {
            await shipmentApi.updateShipment(
                {
                    shipmentId: updateModal.shipmentId,
                    shippingStatus: updateStatus,
                    note: updateNote || undefined,
                },
                updateFiles.length ? updateFiles : undefined
            );
            setMessage({ type: 'success', text: 'Đã cập nhật trạng thái đơn.' });
            setUpdateModal(null);
            loadMyShipments();
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setSubmitting(false);
        }
    };

    // Load tracking cho modal chi tiết shipment
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

    if (!isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text flex items-center gap-2">
                        <Truck className="h-8 w-8" />
                        Quản lý vận chuyển
                    </h1>
                </div>

                {message && (
                    <div
                        className={`mb-4 rounded-lg px-4 py-2 text-sm ${message.type === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                    >
                        {message.text}
                    </div>
                )}
                <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
                    <Button
                        variant={activeTab === 'mine' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab('mine')}
                    >
                        <Package className="h-4 w-4 mr-2" />
                        Đơn của tôi
                    </Button>
                    <Button
                        variant={activeTab === 'unassigned' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab('unassigned')}
                    >
                        <Truck className="h-4 w-4 mr-2" />
                        Đơn chưa giao
                    </Button>
                </div>

                {activeTab === 'mine' && (
                    <div className="flex items-center gap-2 mb-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={completeFilter}
                                onChange={(e) => setCompleteFilter(e.target.checked)}
                                className="rounded border-white/20"
                            />
                            Chỉ đơn đã hoàn thành
                        </label>
                        <Button variant="ghost" size="icon" onClick={loadMyShipments} title="Tải lại">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
                    </div>
                ) : activeTab === 'mine' ? (
                    <div className="space-y-4">
                        {myShipments.length === 0 ? (
                            <Card className="glass-card border-white/10">
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Chưa có đơn vận chuyển nào.
                                </CardContent>
                            </Card>
                        ) : (
                            myShipments.map((s) => (
                                <Card key={s.shipmentId} className="glass-card border-white/10 hover:border-white/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-mono text-sm text-primary-400">
                                                #{s.shipmentId.slice(0, 8)}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs ${s.shipmentStatus === 'DELIVERED' || s.shipmentStatus === 'RECEIVED'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : s.shipmentStatus === 'CANCELLED'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : 'bg-amber-500/20 text-amber-400'
                                                    }`}
                                            >
                                                {STATUS_LABEL[s.shipmentStatus] || 'Không rõ'}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        {s.toName && (
                                            <p className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 shrink-0 text-primary-400" />
                                                <span className="font-semibold">Người nhận:</span> {s.toName}
                                            </p>
                                        )}
                                        {s.toAddress && (
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-primary-400" />
                                                {s.toAddress}
                                            </p>
                                        )}
                                        {s.toPhone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                                                {s.toPhone}
                                            </p>
                                        )}
                                        {s.createAt && (
                                            <p className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-4 w-4 shrink-0" />
                                                {new Date(s.createAt).toLocaleString('vi-VN')}
                                            </p>
                                        )}
                                        <p className="font-medium">
                                            Phí ship: {Number(s.shipmentFee).toLocaleString('vi-VN')} ₫
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setDetailShipment(s);
                                                }}
                                            >
                                                Xem chi tiết
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setDetailTrackingShipmentId(String(s.shipmentId));
                                                }}
                                            >
                                                Xem tracking
                                            </Button>
                                            {s.shipmentStatus !== 'DELIVERED' && s.shipmentStatus !== 'RECEIVED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenUpdate(s)}
                                                >
                                                    Cập nhật trạng thái
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                        {totalPagesMine > 1 && (
                            <div className="flex justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageMine <= 1}
                                    onClick={() => setPageMine((p) => Math.max(1, p - 1))}
                                >
                                    Trước
                                </Button>
                                <span className="flex items-center px-2 text-sm">
                                    {pageMine} / {totalPagesMine}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageMine >= totalPagesMine}
                                    onClick={() => setPageMine((p) => p + 1)}
                                >
                                    Sau
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {unassignedShipments.length === 0 ? (
                            <Card className="glass-card border-white/10">
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Không có đơn chưa phân shipper.
                                </CardContent>
                            </Card>
                        ) : !allowed ? (

                            <Card className="glass-card border-white/10">
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    Bạn có đơn hàng chưa hoàn thành
                                </CardContent>
                            </Card>
                        )
                            :
                            (
                                unassignedShipments.map((s) => (
                                    <Card key={s.shipmentId} className="glass-card border-white/10 hover:border-white/20">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-mono text-primary-400">
                                                #{s.shipmentId.slice(0, 8)}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            {s.toName && (
                                                <p className="flex items-center gap-2">
                                                    <Truck className="h-4 w-4 shrink-0 text-primary-400" />
                                                    <span className="font-semibold">Người nhận:</span> {s.toName}
                                                </p>
                                            )}
                                            {s.toAddress && (
                                                <p className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 shrink-0 text-primary-400" />
                                                    {s.toAddress}
                                                </p>
                                            )}
                                            {s.toPhone && (
                                                <p className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                                                    {s.toPhone}
                                                </p>
                                            )}
                                            <p className="font-medium">Phí ship: {Number(s.shipmentFee).toLocaleString('vi-VN')} ₫</p>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="mt-2"
                                                disabled={submitting}
                                                onClick={() => handleAssignShipper(s)}
                                            >
                                                Nhận đơn
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        {totalPagesUnassigned > 1 && (
                            <div className="flex justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageUnassigned <= 1}
                                    onClick={() => setPageUnassigned((p) => Math.max(1, p - 1))}
                                >
                                    Trước
                                </Button>
                                <span className="flex items-center px-2 text-sm">
                                    {pageUnassigned} / {totalPagesUnassigned}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pageUnassigned >= totalPagesUnassigned}
                                    onClick={() => setPageUnassigned((p) => p + 1)}
                                >
                                    Sau
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Dialog open={!!updateModal} onOpenChange={() => setUpdateModal(null)}>
                <DialogContent className="glass-card border-white/20 bg-gray-900/95 max-w-md w-[90vw] mx-auto">
                    <DialogHeader>
                        <DialogTitle>Cập nhật trạng thái đơn</DialogTitle>
                        <DialogDescription>
                            Cập nhật trạng thái giao hàng và đính kèm hình ảnh nếu cần.
                        </DialogDescription>
                    </DialogHeader>
                    {updateModal && (
                        <div className="space-y-4 py-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                                {(() => {
                                    const currentIndex = STATUS_FLOW.indexOf(updateModal.shipmentStatus);
                                    const allowedNext = currentIndex >= 0 ? STATUS_FLOW.slice(currentIndex) : STATUS_FLOW;
                                    return (
                                        <select
                                            className="w-full rounded-md border border-white/20 bg-black/30 text-foreground px-3 py-2"
                                            value={updateStatus}
                                            onChange={(e) => setUpdateStatus(e.target.value as ShippingStatus)}
                                        >
                                            {allowedNext.map((st) => (
                                                <option key={st} value={st}>
                                                    {STATUS_LABEL[st]}
                                                </option>
                                            ))}
                                        </select>
                                    );
                                })()}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ghi chú (tùy chọn)</label>
                                <textarea
                                    className="w-full rounded-md border border-white/20 bg-black/30 text-foreground px-3 py-2 min-h-[80px]"
                                    value={updateNote}
                                    onChange={(e) => setUpdateNote(e.target.value)}
                                    placeholder="Ghi chú cập nhật..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ảnh đính kèm (tùy chọn)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="w-full text-sm text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary/20 file:text-primary-400"
                                    onChange={(e) => setUpdateFiles(Array.from(e.target.files ?? []))}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateModal(null)}>
                            Hủy
                        </Button>
                        <Button disabled={submitting} onClick={handleSubmitUpdate}>
                            {submitting ? 'Đang xử lý...' : 'Cập nhật'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Chi tiết shipment cho shipper: người gửi/nhận + tracking giống OrdersPage */}
            <Dialog
                open={!!detailShipment}
                onOpenChange={(open) => {
                    if (!open) {
                        setDetailShipment(null);
                        setDetailTrackingShipmentId(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl w-[92vw] md:w-[58vw] max-h-[70vh] flex flex-col overflow-hidden p-4 gap-0 rounded-xl border border-white/10 shadow-2xl">
                    {detailShipment && (
                        <>
                            <DialogHeader className="shrink-0 pb-4 border-b border-white/10">
                                <DialogTitle className="flex items-center justify-between gap-2 flex-wrap text-lg">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-primary-400" />
                                        <span className="font-mono text-sm text-primary-300">
                                            Shipment #{String(detailShipment.shipmentId).slice(0, 8)}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-primary-400/20 bg-primary-500/10 text-primary-200">
                                        {STATUS_LABEL[detailShipment.shipmentStatus] || 'Không rõ'}
                                    </span>
                                </DialogTitle>
                                <DialogDescription>
                                    Thông tin người gửi / người nhận và lịch sử cập nhật trạng thái shipment.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-4 pr-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Người nhận
                                        </h3>
                                        <p className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 shrink-0 text-primary-400" />
                                            <span>{detailShipment.toName || '—'}</span>
                                        </p>
                                        {detailShipment.toPhone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                                                <span>{detailShipment.toPhone}</span>
                                            </p>
                                        )}
                                        {detailShipment.toAddress && (
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-primary-400" />
                                                <span>{detailShipment.toAddress}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Người gửi
                                        </h3>
                                        <p className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 shrink-0 text-primary-400" />
                                            <span>{detailShipment.fromName || '—'}</span>
                                        </p>
                                        {detailShipment.fromPhone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                                                <span>{detailShipment.fromPhone}</span>
                                            </p>
                                        )}
                                        {detailShipment.fromAddress && (
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 shrink-0 text-primary-400" />
                                                <span>{detailShipment.fromAddress}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal tracking riêng (giống OrdersPage) */}
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
                                            ? (STATUS_LABEL[tr.shippingStatus] || 'Không rõ')
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
                                                                    className="rounded-lg overflow-hidden border-2 border-white/20 hover:border-primary-400/50 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition-colors"
                                                                >
                                                                    {rawUrl ? (
                                                                        <img
                                                                            src={fullUrl}
                                                                            alt={`Tracking ${index + 1}`}
                                                                            className="w-20 h-20 object-cover cursor-pointer"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-20 h-20 bg-white/10 flex items-center justify-center">
                                                                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
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
                                            <div
                                                key={tr.trackingId}
                                                className={`relative flex items-center mb-8 ${isLeft ? 'justify-start' : 'justify-end'
                                                    }`}
                                            >
                                                <div
                                                    className={`w-1/2 ${isLeft ? 'pr-6' : 'pl-6'}`}
                                                >
                                                    {contentBox}
                                                </div>
                                                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary-400 border-2 border-gray-900" />
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
        </div>
    );
};

