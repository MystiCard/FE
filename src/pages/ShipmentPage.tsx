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
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, MapPin, Phone, Calendar, RefreshCw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const STATUS_LABEL: Record<ShippingStatus, string> = {
    PENDING: 'Chờ giao',
    ASIGNED: 'Đã phân shipper',
    PICKED_UP: 'Đã lấy hàng',
    IN_TRANSIT: 'Đang giao',
    DELIVERED: 'Đã giao',
    FAILED: 'Thất bại'
};

const STATUS_OPTIONS: ShippingStatus[] = [
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
                                                {STATUS_LABEL[s.shipmentStatus] ?? s.shipmentStatus}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
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
                                        {s.shipmentStatus !== 'DELIVERED' && s.shipmentStatus !== 'RECEIVED' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => handleOpenUpdate(s)}
                                            >
                                                Cập nhật trạng thái
                                            </Button>
                                        )}
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
                <DialogContent className="glass-card border-white/20 bg-gray-900/95">
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
                                <select
                                    className="w-full rounded-md border border-white/20 bg-black/30 text-foreground px-3 py-2"
                                    value={updateStatus}
                                    onChange={(e) => setUpdateStatus(e.target.value as ShippingStatus)}
                                >
                                    {STATUS_OPTIONS.map((st) => (
                                        <option key={st} value={st}>
                                            {STATUS_LABEL[st]}
                                        </option>
                                    ))}
                                </select>
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
        </div>
    );
};

