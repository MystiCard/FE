import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shipmentApi, transactionApi, orderApi } from "@/utils/api";

export function MarketplaceCheckoutPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderIdFromQuery = searchParams.get("orderId")?.trim() || null;

    // --- State chính ---
    const [orderState, setOrderState] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // --- State địa chỉ ---
    const [provinces, setProvinces] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<number>();
    const [selectedDistrict, setSelectedDistrict] = useState<number>();
    const [selectedWard, setSelectedWard] = useState<string>();

    const [address, setAddress] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [recipientPhone, setRecipientPhone] = useState("");

    const [shipFee, setShipFee] = useState(0);
    const [recalcLoading, setRecalcLoading] = useState(false);

    // --- Helper: Xây dựng địa chỉ đầy đủ ---
    const buildFullAddress = useCallback(() => {
        const provinceName = provinces.find((p) => Number(p.ProvinceID) === Number(selectedProvince))?.ProvinceName || "";
        const districtName = districts.find((d) => Number(d.DistrictID) === Number(selectedDistrict))?.DistrictName || "";
        const wardName = wards.find((w) => String(w.WardCode) === String(selectedWard))?.WardName || "";
        
        return [address, wardName, districtName, provinceName]
            .filter(part => part && part.trim() !== "")
            .join(", ");
    }, [address, selectedProvince, selectedDistrict, selectedWard, provinces, districts, wards]);

    // --- Core Logic: Hàm cập nhật và tính lại phí ship ---
    const handleUpdateAndRecalculate = async (isManual = false) => {
        const currentOrderId = orderState?.orderId || orderIdFromQuery;
        
        // Điều kiện cần để gọi API
        if (!currentOrderId || !selectedDistrict || !selectedWard) return;

        if (isManual) setRecalcLoading(true);
        
        try {
            const res: any = await shipmentApi.recalculateFee({
                orderId: currentOrderId,
                toDistrictId: Number(selectedDistrict),
                toWardId: String(selectedWard),
                newAddress: buildFullAddress(),
                toName: recipientName.trim() || undefined,
                toPhone: recipientPhone.trim() || undefined,
            });

            const data = res?.data ?? res;
            if (data?.orderItems) {
                // RENDER LẠI: Spread object để React nhận diện state mới
                setOrderState({ ...data }); 
                const totalFee = data.orderItems.reduce((sum: number, i: any) => sum + (i.shipfee || 0), 0);
                setShipFee(totalFee);
            }
        } catch (err) {
            console.error("Recalculate error:", err);
            if (isManual) alert("Cập nhật thông tin thất bại.");
        } finally {
            if (isManual) setRecalcLoading(false);
        }
    };

    // 1. Load dữ liệu ban đầu (Initial Load)
    useEffect(() => {
        if (!orderIdFromQuery) {
            setLoadError("Thiếu orderId.");
            setLoading(false);
            return;
        }

        const init = async () => {
            try {
                setLoading(true);
                const orderRes = await orderApi.getByOrderId(orderIdFromQuery);
                setOrderState(orderRes);

                // Điền thông tin cũ vào form nếu có
                const ship = orderRes?.orderItems?.[0]?.shipmentResponse;
                if (ship) {
                    setRecipientName(ship.toName || "");
                    setRecipientPhone(ship.toPhone || "");
                    setAddress(ship.toAddress ? ship.toAddress.split(",")[0].trim() : "");
                    if (ship.toDistrictId) setSelectedDistrict(Number(ship.toDistrictId));
                    if (ship.toWardId) setSelectedWard(String(ship.toWardId));
                }
                
                // Load tỉnh
                const provList = await shipmentApi.getProvinces();
                setProvinces(Array.isArray(provList) ? provList : []);

                // Nếu đơn hàng có sẵn districtId, phải tìm ngược lại provinceId
                if (ship?.toDistrictId) {
                    for (const p of (provList as any[])) {
                        const ds = await shipmentApi.getDistricts(p.ProvinceID);
                        if (ds.some((d: any) => Number(d.DistrictID) === Number(ship.toDistrictId))) {
                            setSelectedProvince(p.ProvinceID);
                            setDistricts(ds);
                            const ws = await shipmentApi.getWards(Number(ship.toDistrictId));
                            setWards(ws);
                            break;
                        }
                    }
                }
            } catch (e) {
                setLoadError("Không thể tải đơn hàng.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [orderIdFromQuery]);

    // 2. Load Districts khi đổi Province
    useEffect(() => {
        if (selectedProvince) {
            shipmentApi.getDistricts(selectedProvince).then(setDistricts);
            setWards([]); // Reset phường xã khi đổi tỉnh
        }
    }, [selectedProvince]);

    // 3. Load Wards khi đổi District
    useEffect(() => {
        if (selectedDistrict) {
            shipmentApi.getWards(selectedDistrict).then(setWards);
        }
    }, [selectedDistrict]);

    // 4. TỰ ĐỘNG CẬP NHẬT (DEBOUNCE)
    useEffect(() => {
        // Chỉ auto-call khi đã chọn đủ thông tin nhận hàng cơ bản
        if (!selectedDistrict || !selectedWard) return;

        const delayDebounceFn = setTimeout(() => {
            handleUpdateAndRecalculate(false);
        }, 600); // 0.6s sau khi user ngừng thao tác

        return () => clearTimeout(delayDebounceFn);
    }, [recipientName, recipientPhone, address, selectedDistrict, selectedWard]);

    // --- Tính toán tổng tiền hàng ---
    const totalItemPrice = (orderState?.orderItems || [])
        .flatMap((i: any) => i.orderDetailResponseList || [])
        .reduce((sum: number, d: any) => sum + (d.price || 0) * (d.quantity || 0), 0);

    const hasValidAddress = !!(selectedProvince && selectedDistrict && selectedWard && recipientName && recipientPhone);

    const handlePayment = async () => {
        if (!hasValidAddress) return alert("Vui lòng điền đủ địa chỉ.");
        try {
            await handleUpdateAndRecalculate(true); // Cập nhật lần cuối trước khi trả tiền
            await transactionApi.payOrderWithWallet(orderState.orderId);
            navigate("/orders");
        } catch (err) {
            alert("Thanh toán thất bại");
        }
    };

    if (loading) return <div className="text-white p-10">Đang tải đơn hàng...</div>;
    if (loadError || !orderState) return <div className="text-white p-10">{loadError || "Không có dữ liệu"}</div>;

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-white p-4">
            {/* LEFT: FORM ĐỊA CHỈ & DANH SÁCH SẢN PHẨM */}
            <div className="col-span-2 space-y-6">
                <div className="bg-blue-900 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        📍 Địa chỉ nhận hàng
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400">Tên người nhận</label>
                            <input
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="w-full p-2 bg-blue-800 rounded border border-blue-700 outline-none focus:border-yellow-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Số điện thoại</label>
                            <input
                                value={recipientPhone}
                                onChange={(e) => setRecipientPhone(e.target.value)}
                                className="w-full p-2 bg-blue-800 rounded border border-blue-700 outline-none focus:border-yellow-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="text-xs text-gray-400">Số nhà / Tên đường</label>
                        <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full p-2 bg-blue-800 rounded border border-blue-700 outline-none focus:border-yellow-500"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <select
                            value={selectedProvince || ""}
                            onChange={(e) => setSelectedProvince(Number(e.target.value))}
                            className="p-2 bg-blue-800 rounded border border-blue-700 outline-none"
                        >
                            <option value="">Chọn Tỉnh</option>
                            {provinces.map((p) => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                        </select>

                        <select
                            value={selectedDistrict || ""}
                            onChange={(e) => setSelectedDistrict(Number(e.target.value))}
                            className="p-2 bg-blue-800 rounded border border-blue-700 outline-none"
                        >
                            <option value="">Quận/Huyện</option>
                            {districts.map((d) => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
                        </select>

                        <select
                            value={selectedWard || ""}
                            onChange={(e) => setSelectedWard(e.target.value)}
                            className="p-2 bg-blue-800 rounded border border-blue-700 outline-none"
                        >
                            <option value="">Phường/Xã</option>
                            {wards.map((w) => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
                        </select>
                    </div>
                </div>

                {/* HIỂN THỊ DANH SÁCH ITEM THEO SHIPMENT */}
                {orderState.orderItems.map((item: any, idx: number) => (
                    <div key={idx} className="bg-blue-900 p-5 rounded-lg border border-blue-800">
                        <div className="flex justify-between border-b border-blue-800 pb-2 mb-4">
                            <span className="text-sm font-semibold text-blue-300">📦 Kiện hàng #{idx + 1}</span>
                        </div>
                        {item.orderDetailResponseList.map((detail: any) => (
                            <div key={detail.orderItemId} className="flex justify-between items-center py-2">
                                <div className="flex gap-3 items-center">
                                    <img 
                                        src={detail.cardResponse?.imageUrl?.[0]?.imageUrl} 
                                        className="w-12 h-12 object-cover rounded" 
                                    />
                                    <div>
                                        <p className="font-medium">{detail.cardResponse?.name}</p>
                                        <p className="text-xs text-gray-400">Số lượng: {detail.quantity}</p>
                                    </div>
                                </div>
                                <p className="font-semibold">{detail.price?.toLocaleString()}đ</p>
                            </div>
                        ))}
                        <div className="mt-3 pt-2 border-t border-dashed border-blue-700 flex justify-between text-sm">
                            <span className="text-gray-400">Phí vận chuyển kiện này:</span>
                            <span className="text-yellow-500 font-bold">{item.shipfee?.toLocaleString()}đ</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* RIGHT: TỔNG KẾT & THANH TOÁN */}
            <div className="bg-blue-900 p-6 rounded-lg shadow-lg h-fit sticky top-4">
                <h2 className="text-lg font-bold mb-6 border-b border-blue-800 pb-2">Tóm tắt đơn hàng</h2>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Tiền hàng</span>
                        <span>{totalItemPrice.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Tổng phí vận chuyển</span>
                        <span className={`${recalcLoading ? 'animate-pulse text-yellow-500' : ''}`}>
                            {shipFee.toLocaleString()}đ
                        </span>
                    </div>
                    <div className="border-t border-blue-700 pt-4 mt-4 flex justify-between text-xl font-bold">
                        <span>Tổng cộng</span>
                        <span className="text-yellow-400">{(totalItemPrice + shipFee).toLocaleString()}đ</span>
                    </div>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={!hasValidAddress || recalcLoading}
                    className="w-full mt-6 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-black font-bold py-4 rounded transition-all shadow-lg"
                >
                    {recalcLoading ? "ĐANG CẬP NHẬT..." : "THANH TOÁN NGAY"}
                </button>
                {!hasValidAddress && (
                    <p className="text-center text-red-400 text-xs mt-2">Vui lòng điền đủ thông tin để thanh toán</p>
                )}
            </div>
        </div>
    );
}