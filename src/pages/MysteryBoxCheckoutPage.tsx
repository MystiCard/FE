import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { blindBoxApi, BlindBoxHistoryItem, userApi, UserProfile, shipmentApi, transactionApi, getCardImageUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, User, Package, ArrowLeft } from 'lucide-react';

const STORAGE_KEY = 'mysteryCheckoutResultIds';

interface LocationState {
    resultIds?: string[];
}

function getResultIds(state: LocationState): string[] {
    const fromState = state.resultIds ?? [];
    if (fromState.length > 0) return fromState;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as string[];
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch {
        // ignore
    }
    return [];
}

export const MysteryBoxCheckoutPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const state = (location.state || {}) as LocationState;
    const resultIds = getResultIds(state);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [items, setItems] = useState<BlindBoxHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'MOMO'>('WALLET');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (!resultIds.length) {
            navigate('/mystery-box/history');
            return;
        }
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [p, history] = await Promise.all([
                    userApi.getMyProfile(),
                    blindBoxApi.getMyHistory(),
                ]);
                setProfile(p);
                const selected = history.filter((h) =>
                    resultIds.includes(h.blindBoxResultId) || resultIds.includes(String(h.blindBoxResultId))
                );
                setItems(selected);
                if (!selected.length) {
                    setError('Không tìm thấy thẻ nào khớp với lựa chọn. Vui lòng thử lại từ lịch sử.');
                }

                // Tự động tính phí ship. Nếu thiếu mã quận/xã, dùng mã mặc định để backend
                // fallback sang công thức nội bộ (không còn 0đ).
                const totalAmount = selected.reduce(
                    (sum, it) => sum + (it.card?.basePrice ?? 0),
                    0
                );
                try {
                    const toDistrictId = p?.districtId ? Number(p.districtId) : 3695;
                    const toWardId = p?.wardId || '90752';
                    const fee = await shipmentApi.calculateFeeDirect({
                        totalAmount,
                        fromDistrictId: 3695,
                        toDistrictId,
                        toWardId,
                    });
                    setShippingFee(fee);
                } catch {
                    // Nếu lỗi tính ship thì giữ 0, không chặn checkout
                    setShippingFee(0);
                }
            } catch (e) {
                setError(
                    e instanceof Error
                        ? e.message
                        : 'Không tải được dữ liệu checkout. Vui lòng thử lại.'
                );
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthenticated, navigate, resultIds]);

    if (!isAuthenticated) return null;

    const totalCards = items.length;
    const totalCardValue = items.reduce(
        (sum, it) => sum + (it.card?.basePrice ?? 0),
        0
    );
    const grandTotal = shippingFee;

    const handleConfirm = async () => {
        if (!resultIds.length) return;
        setSubmitting(true);
        setError(null);
        try {
            const shipment = await blindBoxApi.requestShipResults(resultIds);
            const shipmentIdStr = typeof shipment.shipmentId === 'string' ? shipment.shipmentId : String(shipment.shipmentId);

            if (paymentMethod === 'WALLET') {
                await transactionApi.payBlindBoxShipWithWallet(shipmentIdStr);
                // Thông báo UI + thông báo ví thay đổi để các màn hình khác (Profile, Wallet, ...) reload số dư.
                window.dispatchEvent(new CustomEvent('wallet-updated'));
                alert(
                    [
                        `Đã tạo đơn giao ${resultIds.length} thẻ về nhà.`,
                        `Mã đơn: ${shipmentIdStr.slice(0, 8)}`,
                        `Phí vận chuyển: ${(shipment.shipmentFee ?? 0).toLocaleString('vi-VN')} VND`,
                        `Thanh toán bằng: Ví MystiCard (đã trừ tiền trong ví).`,
                    ].join('\n'),
                );
                sessionStorage.removeItem(STORAGE_KEY);
                navigate('/orders');
                return;
            } else {
                alert(
                    [
                        `Đã tạo đơn giao ${resultIds.length} thẻ về nhà.`,
                        `Mã đơn: ${shipmentIdStr.slice(0, 8)}`,
                        `Phí vận chuyển (thanh toán qua MoMo sau): ${(shipment.shipmentFee ?? 0).toLocaleString('vi-VN')} VND`,
                        `Phương thức thanh toán: MoMo (chưa implement redirect).`,
                    ].join('\n'),
                );
                sessionStorage.removeItem(STORAGE_KEY);
                navigate('/orders');
                return;
            }
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Không thể tạo đơn giao hàng. Vui lòng thử lại.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
                    <div className="text-xl text-yellow-200">Đang chuẩn bị trang thanh toán...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-serif mb-1 gradient-text flex items-center gap-2">
                        <Package className="w-7 h-7 text-yellow-300" />
                        Thanh toán giao thẻ Hộp bí ẩn
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Xem lại địa chỉ và các thẻ sẽ được giao trước khi xác nhận.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        sessionStorage.removeItem(STORAGE_KEY);
                        navigate('/mystery-box/history');
                    }}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại lịch sử
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Địa chỉ giao hàng */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="w-5 h-5 text-yellow-300" />
                                Địa chỉ nhận hàng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2 text-sm">
                            {profile ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-semibold">
                                            {profile.name || 'Chưa có tên'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        <span>{profile.phone || 'Chưa có số điện thoại'}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                        <span className="whitespace-pre-line">
                                            {profile.address || 'Chưa có địa chỉ. Vui lòng cập nhật trong Hồ sơ.'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Muốn thay đổi địa chỉ? Vào mục{' '}
                                        <button
                                            className="underline text-yellow-300"
                                            type="button"
                                            onClick={() => navigate('/profile')}
                                        >
                                            Hồ sơ
                                        </button>{' '}
                                        để cập nhật, sau đó quay lại trang này.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Không tải được thông tin người dùng. Vui lòng đăng nhập lại.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Danh sách thẻ sẽ giao */}
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-base">
                                Sản phẩm ({totalCards} thẻ)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {items.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Không có thẻ nào để giao. Vui lòng quay lại lịch sử.
                                </p>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.blindBoxResultId}
                                        className="flex gap-3 items-center border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
                                    >
                                        <div className="w-16 h-24 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
                                            {getCardImageUrl(item.card) ? (
                                                <img
                                                    src={getCardImageUrl(item.card)}
                                                    alt={item.card.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-3xl">🎴</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold line-clamp-2">
                                                {item.card.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Độ hiếm: <span className="font-medium">{item.card.rarity}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm">
                                            <p className="font-semibold text-yellow-300">
                                                {item.card.basePrice.toLocaleString('vi-VN')} VND
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tóm tắt đơn hàng */}
                <div className="space-y-4">
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-base">Tóm tắt đơn hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số thẻ</span>
                                <span className="font-semibold">{totalCards}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tổng giá trị thẻ (tham khảo)</span>
                                <span className="font-semibold">
                                    {totalCardValue.toLocaleString('vi-VN')} VND
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phí vận chuyển</span>
                                <span className="font-semibold">
                                    {shippingFee.toLocaleString('vi-VN')} VND
                                </span>
                            </div>
                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <span className="text-sm font-semibold block mb-1">
                                    Phương thức thanh toán
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('WALLET')}
                                        className={`flex-1 px-3 py-2 rounded-md border text-xs md:text-sm ${
                                            paymentMethod === 'WALLET'
                                                ? 'border-yellow-400 bg-yellow-500/10 text-yellow-200'
                                                : 'border-white/10 text-muted-foreground hover:border-yellow-400'
                                        }`}
                                    >
                                        Ví MystiCard (mặc định)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('MOMO')}
                                        className={`flex-1 px-3 py-2 rounded-md border text-xs md:text-sm ${
                                            paymentMethod === 'MOMO'
                                                ? 'border-pink-400 bg-pink-500/10 text-pink-200'
                                                : 'border-white/10 text-muted-foreground hover:border-pink-400'
                                        }`}
                                    >
                                        MoMo
                                    </button>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                <span className="text-sm font-semibold">Tổng thanh toán</span>
                                <span className="text-lg font-bold text-green-300">
                                    {grandTotal.toLocaleString('vi-VN')} VND
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-lg hover:from-yellow-400 hover:to-orange-400"
                        size="lg"
                        disabled={submitting || !items.length}
                        onClick={handleConfirm}
                    >
                        {submitting ? 'Đang tạo đơn giao...' : 'Đặt giao về nhà'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

