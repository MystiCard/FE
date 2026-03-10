import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listSellerApi, orderApi, shipmentApi, userApi, UserProfile, transactionApi, OrderCardResponse } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Phone, User, Truck } from 'lucide-react';

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = window.setTimeout(() => reject(new Error(timeoutMessage)), ms);
        promise
            .then((v) => {
                window.clearTimeout(t);
                resolve(v);
            })
            .catch((e) => {
                window.clearTimeout(t);
                reject(e);
            });
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => window.setTimeout(r, ms));
}

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

function saveOrderItemsMap(map: Record<string, DraftOrderItem[]>) {
    try {
        localStorage.setItem(ORDER_ITEMS_STORAGE_KEY, JSON.stringify(map));
    } catch {
        // ignore
    }
}

async function precheckListingAvailability(items: DraftOrderItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
    // Group by cardId to reuse listing fetch
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

/** Kết quả tách chuỗi địa chỉ: tỉnh, quận/huyện, phường/xã (để gợi ý dropdown GHN). */
function parseAddressParts(address: string): { provinceName: string; districtName: string; wardName: string } {
    const empty = { provinceName: '', districtName: '', wardName: '' };
    if (!address || !address.trim()) return empty;
    const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
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

/** Tìm provinceId GHN từ tên tỉnh. */
function findProvinceIdByName(provinces: { ProvinceID?: number; ProvinceName?: string }[], name: string): number | '' {
    if (!name || !provinces.length) return '';
    const normalized = name.toLowerCase().trim();
    const found = provinces.find((p) => {
        const pName = (p.ProvinceName ?? '').trim().toLowerCase();
        return pName === normalized || pName.includes(normalized) || normalized.includes(pName);
    });
    return found != null && found.ProvinceID != null ? Number(found.ProvinceID) : '';
}

/** Tìm districtId GHN từ tên quận/huyện. */
function findDistrictIdByName(
    districts: { DistrictID?: number; DistrictName?: string }[],
    name: string
): number | '' {
    if (!name || !districts.length) return '';
    const normalized = name.toLowerCase().trim();
    const found = districts.find((d) => {
        const dName = (d.DistrictName ?? '').trim().toLowerCase();
        return dName === normalized || dName.includes(normalized) || normalized.includes(dName);
    });
    return found != null && found.DistrictID != null ? Number(found.DistrictID) : '';
}

/** Tìm ward code GHN từ tên phường/xã. */
function findWardCodeByName(wards: { WardCode?: string | number; WardName?: string }[], name: string): number | '' {
    if (!name || !wards.length) return '';
    const normalized = name.toLowerCase().trim();
    const found = wards.find((w) => {
        const wName = (w.WardName ?? '').trim().toLowerCase();
        return wName === normalized || wName.includes(normalized) || normalized.includes(wName);
    });
    if (found == null) return '';
    const code = found.WardCode;
    return code != null ? Number(code) : '';
}

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
    // Không set mặc định "magic numbers" vì dễ gây GHN route-not-found khi BE tính phí ship.
    // Chỉ tạo order khi user có district/ward hợp lệ (lấy từ My Info hoặc chọn từ GHN dropdown).
    const [toDistrictId, setToDistrictId] = useState<number>(0);
    const [toWardId, setToWardId] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'MOMO'>(state.paymentMethod ?? 'WALLET');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Đơn đã tạo (shipment status null) — hiện phí ship; ấn Thanh toán mới pay và chuyển shipment sang PENDING
    const [order, setOrder] = useState<OrderCardResponse | null>(null);
    const [creatingOrder, setCreatingOrder] = useState(false);
    const createOrderReqIdRef = useRef(0);
    // Chặn “kẹt” do auto tạo order liên tục khi BE/GHN lỗi:
    // - Nếu cùng 1 input (địa chỉ + district/ward + items) mà tạo order fail, sẽ dừng auto-run cho tới khi user bấm “Thử lại”
    //   hoặc thay đổi địa chỉ/district/ward/items.
    const [lastCreateKey, setLastCreateKey] = useState<string>('');
    const [lastCreateFailed, setLastCreateFailed] = useState(false);
    const [createNonce, setCreateNonce] = useState(0);

    // GHN master data
    const [provinces, setProvinces] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [provinceId, setProvinceId] = useState<number | ''>('');
    /** Đã tách từ địa chỉ để gợi ý tỉnh/quận/phường (user chọn hoặc giữ nguyên). */
    const [parsedAddress, setParsedAddress] = useState<{
        provinceName: string;
        districtName: string;
        wardName: string;
    }>({ provinceName: '', districtName: '', wardName: '' });

    const itemsTotal = useMemo(
        () => items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
        [items],
    );

    // Tổng phí ship và tổng thanh toán từ đơn đã tạo (hoặc ước tính nếu chưa tạo)
    const orderShipTotal = useMemo(() => {
        if (!order?.orderItems?.length) return 0;
        return order.orderItems.reduce((sum, oi) => sum + Number(oi.shipfee ?? 0), 0);
    }, [order]);
    const orderItemsTotal = useMemo(() => {
        if (!order?.orderItems?.length) return itemsTotal;
        return order.orderItems.reduce(
            (sum, oi) =>
                sum + (oi.orderDetailResponseList ?? []).reduce((s, d) => s + d.quantity * d.price, 0),
            0
        );
    }, [order, itemsTotal]);
    const orderGrandTotal = order ? Number(order.totalAmount) : itemsTotal + orderShipTotal;

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
                const dId = p.districtId != null && String(p.districtId).trim() ? Number(p.districtId) : 0;
                const wId = p.wardId != null && String(p.wardId).trim() ? Number(p.wardId) : 0;
                setToDistrictId(Number.isFinite(dId) ? dId : 0);
                setToWardId(Number.isFinite(wId) ? wId : 0);

                const prov = await shipmentApi.getProvinces().catch(() => []);
                const list = Array.isArray(prov) ? prov : [];
                setProvinces(list);
                // Tách chuỗi địa chỉ lấy tỉnh / quận / phường → gợi ý dropdown (user chọn hoặc giữ nguyên)
                const parts = parseAddressParts(p.address || '');
                setParsedAddress(parts);
                const pid = findProvinceIdByName(list, parts.provinceName);
                if (pid !== '') setProvinceId(pid);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được thông tin checkout.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthenticated, navigate, items.length]);

    // Load districts when province changes; gợi ý quận/huyện từ chuỗi địa chỉ nếu có
    useEffect(() => {
        if (!provinceId) {
            setDistricts([]);
            return;
        }
        const load = async () => {
            try {
                const d = await shipmentApi.getDistricts(Number(provinceId));
                const list = Array.isArray(d) ? d : [];
                setDistricts(list);
                if (parsedAddress.districtName && list.length > 0) {
                    const suggestedId = findDistrictIdByName(list, parsedAddress.districtName);
                    if (suggestedId !== '') setToDistrictId(suggestedId);
                }
            } catch {
                setDistricts([]);
            }
        };
        load();
    }, [provinceId, parsedAddress.districtName]);

    // Load wards when district changes; gợi ý phường/xã từ chuỗi địa chỉ nếu có
    useEffect(() => {
        if (!toDistrictId) {
            setWards([]);
            return;
        }
        const load = async () => {
            try {
                const w = await shipmentApi.getWards(Number(toDistrictId));
                const list = Array.isArray(w) ? w : [];
                setWards(list);
                if (parsedAddress.wardName && list.length > 0) {
                    const suggestedCode = findWardCodeByName(list, parsedAddress.wardName);
                    if (suggestedCode !== '') setToWardId(suggestedCode);
                }
            } catch {
                setWards([]);
            }
        };
        load();
    }, [toDistrictId, parsedAddress.wardName]);

    // Khi vào checkout (ấn Mua): tạo đơn ngay để hiện phí ship; shipment status lúc này null. User có thể đổi địa chỉ rồi mới Thanh toán.
    useEffect(() => {
        if (!profile || !items.length || order != null || creatingOrder) return;
        if (!buyerAddress.trim() || !buyerPhone.trim()) return;
        // Chặn tạo order nếu chưa có đủ district/ward hợp lệ → tránh BE gọi GHN bị 400 route not found.
        if (!Number.isFinite(toDistrictId) || toDistrictId <= 0) return;
        if (!Number.isFinite(toWardId) || toWardId <= 0) return;

        const key = JSON.stringify({
            buyerAddress: buyerAddress.trim(),
            buyerPhone: buyerPhone.trim(),
            toDistrictId: Number(toDistrictId),
            toWardId: Number(toWardId),
            items: items.map((it) => ({ listSellerId: it.listSellerId, quantity: it.quantity })),
        });

        // Nếu trước đó đã fail và input không đổi → dừng auto tạo order để không “kẹt”.
        if (lastCreateFailed && lastCreateKey === key) return;

        const reqId = ++createOrderReqIdRef.current;
        setCreatingOrder(true);
        setError(null);
        const createPayload = {
            buyerAddress: buyerAddress.trim(),
            buyerPhone: buyerPhone.trim(),
            toDistrictId: Number(toDistrictId),
            toWardId: Number(toWardId),
            orderItemsList: items.map((it) => ({ listSellerId: it.listSellerId, quantity: it.quantity })),
        };
        // Debug nhanh khi GHN fail: xem payload order tạo phí ship
        console.log('[MarketplaceCheckout] createOrder payload', createPayload);
        const run = async () => {
            // Retry nhẹ khi GHN timeout (BE gọi GHN bị chậm)
            const maxAttempts = 3;
            let lastErr: unknown;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    // attempt 1: 15s, attempt 2+: 20s (cho GHN thêm thời gian)
                    const timeoutMs = attempt === 1 ? 15000 : 20000;
                    return await withTimeout(
                        orderApi.createOrder(createPayload),
                        timeoutMs,
                        'Tạo đơn quá lâu. Vui lòng kiểm tra kết nối hoặc thử lại.'
                    );
                } catch (e) {
                    lastErr = e;
                    const msg = e instanceof Error ? e.message : String(e ?? '');
                    const isTimeout =
                        /deadline exceeded/i.test(msg) ||
                        /timeout/i.test(msg) ||
                        /timed out/i.test(msg);
                    if (!isTimeout || attempt === maxAttempts) break;
                    // backoff: 600ms, 1200ms...
                    await sleep(600 * attempt);
                }
            }
            throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? 'Không thể tạo đơn.'));
        };

        run()
            .then((res) => {
                if (createOrderReqIdRef.current === reqId) {
                    setOrder(res);
                    setLastCreateFailed(false);
                    setLastCreateKey(key);
                    // Lưu mapping orderId -> listSellerId/cardId/quantity để có thể kiểm tra tồn kho trước khi thanh toán lại.
                    try {
                        const map = loadOrderItemsMap();
                        map[String(res.orderId)] = items.map((it) => ({
                            listSellerId: String(it.listSellerId),
                            cardId: String(it.cardId),
                            quantity: Number(it.quantity),
                        }));
                        saveOrderItemsMap(map);
                    } catch {
                        // ignore
                    }
                }
            })
            .catch((e) => {
                if (createOrderReqIdRef.current === reqId) {
                    const msg = e instanceof Error ? e.message : 'Không thể tạo đơn.';
                    setLastCreateFailed(true);
                    setLastCreateKey(key);
                    // Lỗi GHN “route not found service” (BE tính phí ship thất bại)
                    if (/deadline exceeded/i.test(msg) || /client\\.timeout/i.test(msg) || /timeout/i.test(msg)) {
                        setError(
                            [
                                'Không tính được phí ship do GHN phản hồi quá chậm (timeout).',
                                'Vui lòng thử lại sau 10–30 giây hoặc bấm “Thử lại tạo đơn”.',
                                `Thông tin đang gửi: toDistrictId=${Number(toDistrictId)}, toWardId=${Number(toWardId)}.`,
                            ].join(' ')
                        );
                    } else if (/route not found service/i.test(msg) || /calculate fee/i.test(msg)) {
                        setError(
                            [
                                'Không tính được phí ship (GHN không tìm thấy tuyến).',
                                `Thông tin đang gửi: toDistrictId=${Number(toDistrictId)}, toWardId=${Number(toWardId)}.`,
                                'Hãy thử chọn lại Quận/Huyện và Phường/Xã khác, hoặc kiểm tra My Info của người bán có địa chỉ/quận/phường hợp lệ.',
                            ].join(' ')
                        );
                    } else {
                        setError(msg);
                    }
                }
            })
            .finally(() => {
                // Luôn clear loading cho request mới nhất để tránh bị “kẹt” khi effect cleanup giữa chừng.
                if (createOrderReqIdRef.current === reqId) setCreatingOrder(false);
            });
        return () => {
            // Nếu dependencies đổi (user đổi địa chỉ/quận/phường), request cũ coi như lỗi thời.
            // Không set loading ở đây; request mới nhất sẽ tự quản lý loading.
        };
    }, [
        profile,
        items,
        buyerAddress,
        buyerPhone,
        toDistrictId,
        toWardId,
        order,
        creatingOrder,
        lastCreateFailed,
        lastCreateKey,
        createNonce,
    ]);

    const canCreateOrder = !!buyerAddress.trim() && !!buyerPhone.trim() && toDistrictId > 0 && toWardId > 0 && items.length > 0;
    const retryCreateOrder = async () => {
        if (!canCreateOrder) {
            setError('Vui lòng nhập địa chỉ, số điện thoại và chọn Quận/Huyện + Phường/Xã hợp lệ.');
            return;
        }
        setError(null);
        setOrder(null);
        setLastCreateFailed(false);
        setCreateNonce((n) => n + 1);
        // effect sẽ tự chạy lại vì order == null
    };

    /** Tính lại phí ship khi user đổi địa chỉ (trước khi thanh toán). */
    const handleRecalcFee = async () => {
        if (!order || !order.orderItems?.length || itemsBySeller.length !== order.orderItems.length) return;
        setRecalcLoading(true);
        setError(null);
        try {
            const newFees: number[] = [];
            for (let i = 0; i < order.orderItems.length; i++) {
                const oi = order.orderItems[i];
                const listSellerId = itemsBySeller[i]?.items?.[0]?.listSellerId;
                if (!listSellerId) continue;
                const totalPrice = (oi.orderDetailResponseList ?? []).reduce((s, d) => s + d.quantity * d.price, 0);
                const newFee = await shipmentApi.recalculateFee({
                    orderId: order.orderId,
                    listSellerId,
                    toDistrictId: Number(toDistrictId),
                    toWardId: Number(toWardId),
                    oldShipmentFee: Number(oi.shipfee ?? 0),
                    totalPrice,
                });
                newFees.push(newFee);
            }
            const totalShip = newFees.reduce((a, b) => a + b, 0);
            const totalItemsSum = order.orderItems.reduce(
                (sum, oi) =>
                    sum + (oi.orderDetailResponseList ?? []).reduce((s, d) => s + d.quantity * d.price, 0),
                0
            );
            setOrder({
                ...order,
                orderItems: order.orderItems.map((oi, idx) => ({
                    ...oi,
                    shipfee: newFees[idx] ?? oi.shipfee,
                })),
                totalAmount: totalItemsSum + totalShip,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tính lại phí ship.');
        } finally {
            setRecalcLoading(false);
        }
    };

    /** Chỉ thanh toán: shipment chuyển PENDING, trừ số lượng list seller. */
    const handleConfirm = async () => {
        if (!order) {
            setError('Vui lòng chờ tạo đơn xong hoặc kiểm tra địa chỉ.');
            return;
        }
        if (!buyerAddress.trim() || !buyerPhone.trim()) {
            setError('Vui lòng nhập địa chỉ và số điện thoại nhận hàng.');
            return;
        }
        if (!Number.isFinite(toDistrictId) || toDistrictId <= 0 || !Number.isFinite(toWardId) || toWardId <= 0) {
            setError('Vui lòng chọn Quận/Huyện và Phường/Xã hợp lệ để hệ thống tính phí ship.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            // Precheck tồn kho theo đúng listSellerId trước khi thanh toán (giảm rủi ro out-of-stock).
            const check = await precheckListingAvailability(
                items.map((it) => ({ listSellerId: String(it.listSellerId), cardId: String(it.cardId), quantity: Number(it.quantity) }))
            );
            if (!check.ok) {
                setError(check.message);
                return;
            }

            const tx = await transactionApi.payOrderWithWallet(order.orderId);
            window.dispatchEvent(new CustomEvent('wallet-updated'));
            const totalShipFee = order.orderItems?.reduce((sum, oi) => sum + (oi.shipfee ?? 0), 0) ?? 0;
            const totalItemsVal =
                order.orderItems?.reduce(
                    (sum, oi) =>
                        sum + (oi.orderDetailResponseList ?? []).reduce((s, d) => s + d.quantity * d.price, 0),
                    0
                ) ?? 0;
            const status = tx?.statusTransaction || 'PENDING';
            alert(
                [
                    status === 'SUCCESS'
                        ? 'Thanh toán bằng Ví MystiCard thành công.'
                        : status === 'PENDING'
                        ? 'Giao dịch đang xử lý. Nếu số dư đã trừ, hệ thống sẽ cập nhật trạng thái trong lịch sử giao dịch.'
                        : 'Giao dịch chưa hoàn tất. Vui lòng kiểm tra lịch sử giao dịch trong Ví.',
                    `Mã đơn: ${order.orderId.slice(0, 8)}`,
                    `Tiền hàng: ${totalItemsVal.toLocaleString('vi-VN')}đ`,
                    `Phí ship: ${totalShipFee.toLocaleString('vi-VN')}đ`,
                    `Tổng: ${order.totalAmount.toLocaleString('vi-VN')}đ`,
                ].join('\n')
            );
            if (state.fromCart) clearCart();
            // Thanh toán xong thì xoá mapping để tránh lưu rác
            try {
                const map = loadOrderItemsMap();
                delete map[String(order.orderId)];
                saveOrderItemsMap(map);
            } catch {
                // ignore
            }
            navigate('/orders');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể thanh toán. Vui lòng thử lại.');
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
                        Đơn đã được tạo và hiện phí ship bên dưới. Bạn có thể đổi địa chỉ rồi bấm &quot;Tính lại phí ship&quot; nếu cần. Xác nhận thì bấm Thanh toán.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/marketplace')} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại sàn
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-200 space-y-2">
                    <p>{error}</p>
                    {(/insufficient|không đủ|số dư/i.test(error)) && (
                        <div className="space-y-1 text-xs">
                            <p>
                                Có vẻ như số dư Ví MystiCard của bạn không đủ để thanh toán đơn này.
                                Vui lòng nạp thêm tiền hoặc giảm số lượng sản phẩm rồi thử lại.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-yellow-400 text-yellow-200 hover:bg-yellow-500/10"
                                onClick={() => navigate('/wallet')}
                            >
                                Đi tới ví để nạp tiền
                            </Button>
                        </div>
                    )}
                    {(/ghn|route not found|tuyến/i.test(error)) && (
                        <div className="text-xs text-red-100/90 space-y-1">
                            <div className="font-semibold">Gợi ý xử lý nhanh</div>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Đổi lại Quận/Huyện hoặc Phường/Xã (chọn từ dropdown GHN).</li>
                                <li>Nếu vẫn lỗi, seller có thể đang thiếu/sai Quận/Huyện/Phường/Xã trong My Info.</li>
                                <li>Sau khi đổi, bấm “Thử lại tạo đơn”.</li>
                            </ul>
                        </div>
                    )}
                </div>
            )}
            {/* Nhắc user chọn đúng district/ward nếu thiếu */}
            {(!toDistrictId || !toWardId) && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200">
                    Chưa có đủ thông tin Quận/Huyện và Phường/Xã để tính phí ship. Vui lòng chọn ở phần Địa chỉ nhận hàng
                    (hoặc cập nhật trong My Info), rồi hệ thống sẽ tự tạo đơn và hiển thị phí ship.
                </div>
            )}
            {order == null && !creatingOrder && canCreateOrder && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <div className="text-muted-foreground">
                        {lastCreateFailed
                            ? 'Tạo đơn thất bại nên chưa có phí ship. Hãy đổi Quận/Huyện/Phường/Xã hoặc kiểm tra seller, rồi bấm thử lại.'
                            : 'Phí ship sẽ hiển thị sau khi tạo đơn. Nếu đang lỗi, bấm thử lại.'}
                    </div>
                    <Button variant="outline" size="sm" onClick={retryCreateOrder}>
                        Thử lại tạo đơn
                    </Button>
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
                                        disabled={provinces.length === 0}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/60 border border-white/10 disabled:opacity-60"
                                    >
                                        {provinces.length === 0 ? (
                                            <option value="">Giữ nguyên (không đổi)</option>
                                        ) : (
                                            <>
                                                <option value="">-- Chọn tỉnh/TP --</option>
                                                {provinces.map((p) => (
                                                    <option
                                                        key={p?.ProvinceID ?? p?.provinceId ?? p?.id}
                                                        value={p?.ProvinceID}
                                                    >
                                                        {p?.ProvinceName ?? '—'}
                                                    </option>
                                                ))}
                                            </>
                                        )}
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
                                            <option value={toDistrictId || 0}>
                                                {toDistrictId ? 'Giữ nguyên (theo My Info)' : '— Chưa có —'}
                                            </option>
                                        ) : (
                                            <>
                                                {/* Nếu mã quận hiện tại (theo My Info) không có trong list GHN, vẫn hiển thị option giữ nguyên */}
                                                {!districts.some((d) => Number(d?.DistrictID) === Number(toDistrictId)) &&
                                                    toDistrictId && (
                                                        <option value={toDistrictId}>
                                                            Giữ nguyên (theo My Info)
                                                        </option>
                                                    )}
                                                {districts.map((d) => (
                                                    <option key={d?.DistrictID} value={d?.DistrictID}>
                                                        {d?.DistrictName ?? '—'}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Phường/Xã</label>
                                    <select
                                        value={toWardId}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setToWardId(Number.isFinite(v) ? v : 0);
                                        }}
                                        className="w-full px-3 py-2 glass-card rounded-lg text-sm bg-black/60 border border-white/10"
                                    >
                                        {wards.length === 0 ? (
                                            <option value={toWardId || 0}>
                                                {toWardId ? 'Giữ nguyên (theo My Info)' : '— Chưa có —'}
                                            </option>
                                        ) : (
                                            <>
                                                {/* Tương tự quận/huyện: nếu mã phường hiện tại không có trong list GHN, vẫn cho giữ nguyên theo My Info */}
                                                {!wards.some((w) => Number(w?.WardCode) === Number(toWardId)) &&
                                                    toWardId && (
                                                        <option value={toWardId}>
                                                            Giữ nguyên (theo My Info)
                                                        </option>
                                                    )}
                                                {wards.map((w) => (
                                                    <option key={w?.WardCode} value={Number(w?.WardCode)}>
                                                        {w?.WardName ?? '—'}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Địa chỉ lấy từ <span className="underline">My Info</span>. Tỉnh / Quận-Huyện / Phường-Xã được gợi ý từ chuỗi địa chỉ — bạn chọn hoặc giữ nguyên rồi truyền tính ship. Đổi xong bấm &quot;Tính lại phí ship&quot; rồi Thanh toán.
                            </p>
                            {order != null && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 border-yellow-400 text-yellow-200 hover:bg-yellow-500/10"
                                    disabled={recalcLoading}
                                    onClick={handleRecalcFee}
                                >
                                    {recalcLoading ? 'Đang tính lại...' : 'Tính lại phí ship'}
                                </Button>
                            )}
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
                                    const headerName = group.sellerName || 'Người bán';

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
                            <CardTitle className="text-base">Phí vận chuyển</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2 text-sm">
                            {creatingOrder && (
                                <p className="text-amber-400">Đang tạo đơn và tính phí ship...</p>
                            )}
                            {order != null && order.orderItems?.length > 0 && (
                                <div className="space-y-1">
                                    {order.orderItems.map((oi, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Shipment {oi.shipmentResponse?.shipmentId?.slice(0, 8) ?? idx + 1}
                                            </span>
                                            <span className="font-semibold text-yellow-300">
                                                {Number(oi.shipfee ?? 0).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-1 border-t border-white/10 font-semibold">
                                        <span>Tổng phí ship</span>
                                        <span className="text-yellow-300">
                                            {orderShipTotal.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                </div>
                            )}
                            {!creatingOrder && order == null && (
                                <p className="text-xs text-muted-foreground">
                                    Đang tạo đơn, phí ship sẽ hiển thị sau vài giây.
                                </p>
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
                                    {(order ? orderItemsTotal : itemsTotal).toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phí vận chuyển</span>
                                <span className="font-semibold">
                                    {order != null
                                        ? `${orderShipTotal.toLocaleString('vi-VN')}đ`
                                        : creatingOrder
                                        ? 'Đang tính...'
                                        : '—'}
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
                                <div className="text-right">
                                    <span className="text-lg font-bold text-green-300 block">
                                        {orderGrandTotal.toLocaleString('vi-VN')}đ
                                    </span>
                                    {order == null && !creatingOrder && (
                                        <span className="text-[11px] text-muted-foreground">
                                            Đang tạo đơn...
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold shadow-lg hover:from-yellow-400 hover:to-orange-400"
                        size="lg"
                        disabled={submitting || creatingOrder || order == null}
                        onClick={handleConfirm}
                    >
                        {submitting ? 'Đang thanh toán...' : creatingOrder ? 'Đang tạo đơn...' : order == null ? 'Chờ tạo đơn...' : 'Thanh toán'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

