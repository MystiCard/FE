import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shipmentApi, transactionApi } from "@/utils/api";

export function MarketplaceCheckoutPage() {

    const navigate = useNavigate();
    const location = useLocation();
const { order: initOrder, user } = location.state || {};

const [orderState, setOrderState] = useState(initOrder);
    if ( !user) {
        return <div className="text-white p-10">Không có dữ liệu checkout</div>;
    }
    const [provinces, setProvinces] = useState<any[]>([]);
    const [districts, setDistricts] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<number>();
    const [selectedDistrict, setSelectedDistrict] = useState<number>();
    const [selectedWard, setSelectedWard] = useState<string>();

    const [address, setAddress] = useState(
        user.address ? user.address.split(",")[0].trim() : ""
    );

    const [shipFee, setShipFee] = useState(
        orderState.orderItems.reduce((sum: number, i: any) => sum + (i.shipfee || 0), 0)
    );

    const totalItemPrice = orderState.orderItems
        .flatMap((i: any) => i.orderDetailResponseList)
        .reduce((sum: number, d: any) => sum + d.price * d.quantity, 0);

    const total = totalItemPrice + shipFee;
    const buildFullAddress = () => {
        const provinceName =
            provinces.find((p) => p.ProvinceID === selectedProvince)?.ProvinceName || "";

        const districtName =
            districts.find((d) => d.DistrictID === selectedDistrict)?.DistrictName || "";

        const wardName =
            wards.find((w) => w.WardCode === selectedWard)?.WardName || "";

        return `${address}, ${wardName}, ${districtName}, ${provinceName}`;
    };
    // load provinces
    useEffect(() => {

        const load = async () => {

            const prov = await shipmentApi.getProvinces().catch(() => []);
            const list = Array.isArray(prov) ? prov : [];

            setProvinces(list);

            if (!user?.districtId) return;

            for (const p of list) {

                const d = await shipmentApi.getDistricts(p.ProvinceID);
                const districts = Array.isArray(d) ? d : [];

                const found = districts.find(
                    (x: any) => x.DistrictID == user.districtId
                );

                if (found) {

                    setSelectedProvince(p.ProvinceID);
                    setDistricts(districts);
                    setSelectedDistrict(Number(user.districtId));

                    const w = await shipmentApi.getWards(Number(user.districtId));
                    const wards = Array.isArray(w) ? w : [];

                    setWards(wards);
                    setSelectedWard(user.wardId);

                    break;

                }

            }

        };

        load();

    }, []);

    // load districts
    useEffect(() => {
        if (!selectedProvince) return;

        const load = async () => {
            const d = await shipmentApi.getDistricts(Number(selectedProvince));
            const list = Array.isArray(d) ? d : [];
            setDistricts(list);
        };

        load();
    }, [selectedProvince]);

    // load wards
    useEffect(() => {
        if (!selectedDistrict) return;

        const load = async () => {
            const w = await shipmentApi.getWards(Number(selectedDistrict));
            const list = Array.isArray(w) ? w : [];
            setWards(list);
        };

        load();
    }, [selectedDistrict]);

    // default district ward from profile
    useEffect(() => {
        if (user.districtId) setSelectedDistrict(Number(user.districtId));
        if (user.wardId) setSelectedWard(user.wardId);
    }, [user]);

   useEffect(() => {

    if (!selectedDistrict || !selectedWard || !selectedProvince) return;

    const recalc = async () => {

        try {

            const newAddress = buildFullAddress();

            const newOrder = await shipmentApi.recalculateFee({
                orderId: orderState.orderId,
                toDistrictId: selectedDistrict,
                toWardId: Number(selectedWard),
                newAddress: newAddress
            });
 console.log("New order ",newOrder)
            // update order -> toàn bộ UI render lại
            setOrderState(newOrder.data);

            // tính lại ship fee
            const newFee = newOrder.data.orderItems.reduce(
                (sum: number, i: any) => sum + (i.shipfee || 0),
                0
            );

            setShipFee(newFee);

        } catch (err) {

            console.log("Recalculate fee error", err);

        }

    };

    recalc();

}, [selectedWard, selectedDistrict]);
    const handlePayment = async () => {

        try {

            await transactionApi.payOrderWithWallet(orderState.orderId);

            navigate("/orders");

        } catch (err) {

            alert("Thanh toán thất bại");

        }

    };

    return (

        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6 text-white">

            {/* LEFT */}

            <div className="col-span-2 space-y-6">

                {/* ADDRESS */}

                <div className="bg-blue-900 p-5 rounded">

                    <h2 className="text-lg font-bold mb-4">
                        Địa chỉ nhận hàng
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">

                        {/* NAME */}
                        <div>
                            <p className="text-xs text-gray-400 mt-1">
                                Tên người nhận
                            </p>
                            <input
                                value={user.name}
                                readOnly
                                className="w-full p-2 bg-blue-800 rounded text-sm"
                            />

                        </div>

                        {/* PHONE */}
                        <div>
                            <p className="text-xs text-gray-400 mt-1">
                                Số điện thoại
                            </p>
                            <input
                                value={user.phone}
                                readOnly
                                className="w-full p-2 bg-blue-800 rounded text-sm"
                            />

                        </div>

                    </div>

                    {/* STREET ADDRESS */}

                    <div className="mb-4">
                        <p className="text-xs text-gray-400 mt-1">
                            Số nhà / tên đường
                        </p>
                        <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full p-2 bg-blue-800 rounded text-sm"
                        />



                    </div>

                    <div className="grid grid-cols-3 gap-3">

                        <select
                            value={selectedProvince || ""}
                            onChange={(e) => setSelectedProvince(Number(e.target.value))}
                            className="p-2 bg-blue-800 rounded"
                        >

                            <option>Chọn tỉnh</option>

                            {provinces.map((p) => (
                                <option
                                    key={p.ProvinceID}
                                    value={p.ProvinceID}
                                >
                                    {p.ProvinceName}
                                </option>
                            ))}

                        </select>

                        <select
                            value={selectedDistrict}
                            onChange={(e) =>
                                setSelectedDistrict(Number(e.target.value))
                            }
                            className="p-2 bg-blue-800 rounded"
                        >

                            <option>Quận/Huyện</option>

                            {districts.map((d) => (
                                <option
                                    key={d.DistrictID}
                                    value={d.DistrictID}
                                >
                                    {d.DistrictName}
                                </option>
                            ))}

                        </select>

                        <select
                            value={selectedWard}
                            onChange={(e) =>
                                setSelectedWard(e.target.value)
                            }
                            className="p-2 bg-blue-800 rounded"
                        >

                            <option>Phường/Xã</option>

                            {wards.map((w) => (
                                <option
                                    key={w.WardCode}
                                    value={w.WardCode}
                                >
                                    {w.WardName}
                                </option>
                            ))}

                        </select>

                    </div>
                </div>

                {/* PRODUCTS GROUP BY SHIPMENT */}

                { orderState.orderItems.map((item: any, index: number) => {

                    const shipment = item.shipmentResponse;

                    return (

                        <div
                            key={index}
                            className="bg-blue-900 p-5 rounded"
                        >

                            {/* shipment header */}

                            <div className="flex justify-between text-sm text-gray-300 mb-3">

                                <span>
                                    Shipment #{shipment?.shipmentId?.slice(0, 8)}
                                </span>

                                <span>
                                    {shipment?.toAddress}
                                </span>

                            </div>

                            {/* products */}

                            {item.orderDetailResponseList.map((detail: any) => {

                                const img =
                                    detail.cardResponse.imageUrl?.[0]?.imageUrl;

                                return (

                                    <div
                                        key={detail.orderItemId}
                                        className="flex justify-between items-center py-2 border-b border-blue-800"
                                    >

                                        <div className="flex gap-3 items-center">

                                            <img
                                                src={img}
                                                className="w-14 h-16 object-cover rounded"
                                            />

                                            <div>
                                                <p>
                                                    {detail.cardResponse.name}
                                                </p>

                                                <p className="text-sm text-gray-400">
                                                    x{detail.quantity}
                                                </p>
                                            </div>

                                        </div>

                                        <p>
                                            {detail.price.toLocaleString()}đ
                                        </p>

                                    </div>

                                );

                            })}

                            {/* shipment fee */}

                            <div className="flex justify-between mt-3 text-sm">

                                <span className="text-gray-400">
                                    Phí vận chuyển
                                </span>

                                <span>
                                    {item.shipfee?.toLocaleString()}đ
                                </span>

                            </div>

                        </div>

                    );

                })}

            </div>

            {/* RIGHT SUMMARY */}

            <div className="bg-blue-900 p-5 rounded h-fit">

                <h2 className="font-bold mb-4">
                    Tóm tắt đơn hàng
                </h2>

                <div className="flex justify-between">
                    <span>Tiền hàng</span>
                    <span>
                        {totalItemPrice.toLocaleString()}đ
                    </span>
                </div>

                <div className="flex justify-between mt-2">
                    <span>Phí vận chuyển</span>
                    <span>
                        {shipFee.toLocaleString()}đ
                    </span>
                </div>

                <div className="flex justify-between mt-4 text-lg font-bold">
                    <span>Tổng</span>
                    <span>
                        {total.toLocaleString()}đ
                    </span>
                </div>

                <button
                    onClick={handlePayment}
                    className="mt-4 w-full bg-yellow-500 text-black py-3 rounded font-bold"
                >
                    Thanh toán
                </button>

            </div>

        </div>

    );

}