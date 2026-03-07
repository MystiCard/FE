import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { orderApi, QuoteOrderRequest, OrderQuoteResponse, shipmentApi, userApi, UserProfile, transactionApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, User, Truck } from 'lucide-react';

type CheckoutItem = {
    listSellerId: string;
    quantity: number;
    cardId: string;
    cardName: string;
    imageUrl?: string;
    sellerId: string;
    sellerName?: string;
    unitPrice: number;
};

interface LocationState {
    items?: CheckoutItem[];
    paymentMethod?: 'WALLET' | 'MOMO';
    fromCart?: boolean;
}

export const MarketplaceCheckoutPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useMarketplaceCart();

    const state = (location.state || {}) as LocationState;
    const items = state.items ?? [];

    const itemsBySeller = useMemo(() => {
        const map = new Map<
            string,
            {
                sellerId: string;
                sellerName: string;
                items: CheckoutItem[];
            }
        >();
        for (const it of items) {
            const key = it.sellerId || it.listSellerId;
            const existing = map.get(key);
            if (existing) {
                existing.items.push(it);
            } else {
                map.set(key, {
                    sellerId: it.sellerId,
                    sellerName: it.sellerName || 'Người bán',
                    items: [it],
                });
            }
        }
        return Array.from(map.values());
    }, [items]);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [buyerAddress, setBuyerAddress] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [toDistrictId, setToDistrictId] = useState<number>(3695);
    const [toWardId, setToWardId] = useState<number>(90752);
    const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'MOMO'>(state.paymentMethod ?? 'WALLET');

    const [quote, setQuote] = useState<OrderQuoteResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [quoting, setQuoting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // GHN master data (optional): giúp user đổi quận/phường trong checkout
    const [provinces, setProvinces] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [provinceId, setProvinceId] = useState<number | ''>('');

    const canQuote = useMemo(() => {
        return items.length > 0 && Number.isFinite(toDistrictId) && Number.isFinite(toWardId);
    }, [items.length, toDistrictId, toWardId]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (!items.length) {
            navigate('/marketplace');
            return;
        }

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const p = await userApi.getMyProfile();
                setProfile(p);
                setBuyerAddress(p.address || '');
                setBuyerPhone(p.phone || '');
                setToDistrictId(p.districtId ? Number(p.districtId) : 3695);
                setToWardId(p.wardId ? Number(p.wardId) : 90752);

                // Load provinces list (best-effort; nếu lỗi vẫn checkout được với mã district/ward hiện có)
                try {
                    const prov = await shipmentApi.getProvinces();
                    setProvinces(Array.isArray(prov) ? prov : []);
                } catch {
                    setProvinces([]);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được thông tin checkout.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthenticated, navigate, items.length]);

    // Load districts when province changes
    useEffect(() => {
        if (!provinceId) {
            setDistricts([]);
            return;
        }
        const load = async () => {
            try {
                const d = await shipmentApi.getDistricts(Number(provinceId));
                setDistricts(Array.isArray(d) ? d : []);
            } catch {
                setDistricts([]);
            }
        };
        load();
    }, [provinceId]);

    // Load wards when district changes
    useEffect(() => {
        if (!toDistrictId) {
            setWards([]);
            return;
        }
        const load = async () => {
            try {
                const w = await shipmentApi.getWards(Number(toDistrictId));
                setWards(Array.isArray(w) ? w : []);
            } catch {
                setWards([]);
            }
        };
        load();
    }, [toDistrictId]);

    // Quote whenever destination changes
    useEffect(() => {
        if (!canQuote) return;
        const run = async () => {
            setQuoting(true);
            setError(null);
            try {
                const payload: QuoteOrderRequest = {
                    toDistrictId: Number(toDistrictId),
                    toWardId: Number(toWardId),
                    orderItemsList: items.map((it) => ({ listSellerId: it.listSellerId, quantity: it.quantity })),
                };
                const q = await orderApi.quoteOrder(payload);
                setQuote(q);
            } catch (e) {
                setQuote(null);
                setError(e instanceof Error ? e.message : 'Không tính được phí ship. Vui lòng thử lại.');
            } finally {
                setQuoting(false);
            }
        };
        run();
    }, [canQuote, items, toDistrictId, toWardId]);

    const handleConfirm = async () => {
        if (!items.length) return;
        setSubmitting(true);
        setError(null);
        try {
            if (!buyerAddress.trim() || !buyerPhone.trim()) {
                setError('Vui lòng nhập địa chỉ và số điện thoại nhận hàng.');
                return;
            }

            const order = await orderApi.createOrder({
                buyerAddress: buyerAddress.trim(),
                buyerPhone: buyerPhone.trim(),
                toDistrictId: Number(toDistrictId),
                toWardId: Number(toWardId),
                orderItemsList: items.map((it) => ({ listSellerId: it.listSellerId, quantity: it.quantity })),
            });

            const totalShipFee = order.orderItems?.reduce((sum, oi) => sum + (oi.shipfee ?? 0), 0) ?? 0;
            const totalItems =
                order.orderItems?.reduce(
                    (sum, oi) =>
                        sum +
                        oi.orderDetailResponseList.reduce((s, d) => s + d.quantity * d.price, 0),
                    0,
                ) ?? 0;

            if (paymentMethod === 'WALLET') {
                await transactionApi.payOrderWithWallet(order.orderId);
                window.dispatchEvent(new CustomEvent('wallet-updated'));
                alert(
                    [
                        'Đặt mua & thanh toán bằng Ví MystiCard thành công.',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng thanh toán: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            } else {
                alert(
                    [
                        'Đã tạo đơn mua thẻ (thanh toán MoMo sẽ được bổ sung sau).',
                        `Mã đơn: ${order.orderId.slice(0, 8)}`,
                        `Tiền hàng: ${totalItems.toLocaleString('vi-VN')}đ`,
                        `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                        `Tổng tiền đơn: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                    ].join('\n'),
                );
            }

            if (state.fromCart) clearCart();
            navigate('/orders');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tạo/thanh toán đơn. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isAuthenticated) return null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
                    <div className="text-xl text-yellow-200">Đang chuẩn bị trang checkout...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-serif mb-1 gradient-text flex items-center gap-2">
                        <Truck className="w-7 h-7 text-yellow-300" />
                        Checkout sàn giao dịch
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Xem phí vận chuyển theo địa chỉ nhận hàng trước khi thanh toán.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/marketplace')} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại sàn
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="w-5 h-5 text-yellow-300" />
                                Địa chỉ nhận hàng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold">{profile?.name || '—'}</span>
                            </div>

                            <label className="block text-xs text-muted-foreground">Số điện thoại</label>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <input
                                    value={buyerPhone}
                                    onChange={(e) => setBuyerPhone(e.target.value)}
                                    className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/40 border border-white/10"
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>

                            <label className="block text-xs text-muted-foreground">Địa chỉ (số nhà, đường...)</label>
                            <textarea
                                value={buyerAddress}
                                onChange={(e) => setBuyerAddress(e.target.value)}
                                className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/40 border border-white/10 min-h-[72px]"
                                placeholder="Nhập địa chỉ nhận hàng"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Tỉnh/TP</label>
                                    <select
                                        value={provinceId}
                                        onChange={(e) => {
                                            const v = e.target.value ? Number(e.target.value) : '';
                                            setProvinceId(v);
                                        }}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/60 border border-white/10"
                                    >
                                        <option value="">-- Chọn tỉnh/TP --</option>
                                        {provinces.map((p) => (
                                            <option key={p?.ProvinceID ?? p?.provinceId ?? p?.id} value={p?.ProvinceID}>
                                                {p?.ProvinceName ?? '—'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Quận/Huyện</label>
                                    <select
                                        value={toDistrictId}
                                        onChange={(e) => setToDistrictId(Number(e.target.value))}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/60 border border-white/10"
                                    >
                                        {/* Nếu chưa load được district list, vẫn cho chọn “giữ nguyên” */}
                                        {districts.length === 0 ? (
                                            <option value={toDistrictId}>Giữ nguyên (ID: {toDistrictId})</option>
                                        ) : (
                                            districts.map((d) => (
                                                <option key={d?.DistrictID} value={d?.DistrictID}>
                                                    {d?.DistrictName ?? '—'}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Phường/Xã</label>
                                    <select
                                        value={toWardId}
                                        onChange={(e) => setToWardId(Number(e.target.value))}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/60 border border-white/10"
                                    >
                                        {wards.length === 0 ? (
                                            <option value={toWardId}>Giữ nguyên (ID: {toWardId})</option>
                                        ) : (
                                            wards.map((w) => (
                                                <option key={w?.WardCode} value={Number(w?.WardCode)}>
                                                    {w?.WardName ?? '—'}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Địa chỉ mặc định lấy từ <span className="underline">My Info</span>. Bạn có thể chỉnh tại đây để xem lại phí ship trước khi thanh toán.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Danh sách sản phẩm theo seller (layout giống Shopee: shop -> bảng sản phẩm) */}
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-base">Sản phẩm</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            {itemsBySeller.length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    Không có sản phẩm nào trong đơn. Vui lòng quay lại sàn để chọn thẻ.
                                </div>
                            ) : (
                                itemsBySeller.map((group) => {
                                    const headerName =
                                        group.sellerName ||
                                        quote?.sellerQuotes?.find((sq) => sq.sellerId === group.sellerId)?.sellerName ||
                                        'Người bán';

                                    return (
                                        <div
                                            key={group.sellerId}
                                            className="border border-white/5 rounded-lg overflow-hidden mb-1 bg-black/20"
                                        >
                                            {/* Header: tên shop + tiêu đề cột */}
                                            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between text-xs">
                                                <span className="font-semibold">
                                                    Người bán: {headerName}
                                                </span>
                                                <div className="hidden md:grid grid-cols-3 gap-4 text-right text-muted-foreground">
                                                    <span>Đơn giá</span>
                                                    <span>SL</span>
                                                    <span>Thành tiền</span>
                                                </div>
                                            </div>
                                        <div className="divide-y divide-white/5">
                                            {group.items.map((it) => {
                                                const lineTotal = Number(it.unitPrice * it.quantity);
                                                const unitPrice = Number(it.unitPrice);
                                                return (
                                                    <div
                                                        key={it.listSellerId + it.cardId}
                                                        className="px-3 py-2 text-xs"
                                                    >
                                                        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-14 h-20 rounded-md overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                                                                    {it.imageUrl ? (
                                                                        <img
                                                                            src={it.imageUrl}
                                                                            alt={it.cardName}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-2xl">🎴</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold line-clamp-2">
                                                                        {it.cardName}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right font-semibold text-yellow-300">
                                                                {unitPrice.toLocaleString('vi-VN')}đ
                                                            </div>
                                                            <div className="text-center text-muted-foreground">
                                                                {it.quantity}
                                                            </div>
                                                            <div className="text-right font-semibold text-green-300">
                                                                {lineTotal.toLocaleString('vi-VN')}đ
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-base">Phí ship theo người bán</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            {quoting && (
                                <div className="text-xs text-muted-foreground">Đang tính phí ship...</div>
                            )}
                            {quote?.sellerQuotes?.length ? (
                                quote.sellerQuotes.map((sq) => (
                                    <div key={sq.sellerId} className="flex justify-between border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                                        <div className="min-w-0 pr-3">
                                            <div className="font-medium line-clamp-1">{sq.sellerName || 'Người bán'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Tiền hàng: {Number(sq.itemsSubtotal ?? 0).toLocaleString('vi-VN')}đ
                                            </div>
                                        </div>
                                        <div className="text-right font-semibold text-yellow-300">
                                            {Number(sq.shippingFee ?? 0).toLocaleString('vi-VN')}đ
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Không có dữ liệu phí ship (hãy thử đổi quận/phường hoặc tải lại).
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="glass-card border-white/10">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-base">Tóm tắt đơn hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tiền hàng</span>
                                <span className="font-semibold">
                                    {Number(quote?.itemsTotal ?? 0).toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phí vận chuyển</span>
                                <span className="font-semibold">
                                    {Number(quote?.shippingTotal ?? 0).toLocaleString('vi-VN')}đ
                                </span>
                            </div>

                            <div className="pt-2 border-t border-white/10 space-y-2">
                                <span className="text-sm font-semibold block mb-1">Phương thức thanh toán</span>
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
                                        Ví MystiCard
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
                                    {Number(quote?.grandTotal ?? 0).toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-lg hover:from-yellow-400 hover:to-orange-400"
                        size="lg"
                        disabled={submitting || quoting || !quote}
                        onClick={handleConfirm}
                    >
                        {submitting ? 'Đang tạo đơn...' : 'Thanh toán'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

