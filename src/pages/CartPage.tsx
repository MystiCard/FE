import React, { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartApi, listSellerApi, getCardImageUrl, Card, SellResponse,CreateOrderRequest,userApi,orderApi } from "@/utils/api";
import { useNavigate } from "react-router-dom";

interface CartItem {
    id: string;
    card: Card;
    seller: SellResponse;
    quantity: number;
    sellers?: SellResponse[];
}

export const CartPage: React.FC = () => {
    const navigate = useNavigate();

    const [items, setItems] = useState<CartItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    useEffect(() => {
        loadCart();
    }, [currentPage]);
    const handleCheckout = async () => {
        
        if (selectedItems.size === 0) return;

        try {
           
            const profile = await userApi.getMyProfile();

            if (!profile.address || !profile.phone || !profile.districtId || !profile.wardId) {
                alert("Vui lòng cập nhật đầy đủ địa chỉ và số điện thoại trong hồ sơ trước khi thanh toán.");
                navigate("/profile");
                return;
            }
            console.log("Profile ",profile)
            // 3. Lọc sản phẩm đã chọn và chuẩn bị Payload
            const selectedProducts = items.filter(item => selectedItems.has(item.id));

            const orderPayload: CreateOrderRequest = {
                buyerAddress: profile.address,
                buyerPhone: profile.phone,
                toDistrictId: Number(profile.districtId),
                toWardId: Number(profile.wardId),
                orderItemsList: selectedProducts.map(item => ({
                    listSellerId: item.seller.listSellerId,
                    quantity: item.quantity > item.seller.quantity ? item.seller.quantity : item.quantity
                }))
            };

            // 4. Gọi API tạo đơn hàng
            // Giả sử orderApi được import từ @/utils/api
            const orderResponse = await orderApi.createOrder2(orderPayload);
            console.log("Order response",orderResponse.data);
            // 5. Chuyển hướng sang trang marketcheckoutPage cùng với dữ liệu đơn hàng
            navigate("/marketplace/checkout", {
                state: {
                    order: orderResponse.data,
                    user: profile// Có thể gửi kèm profile để hiển thị lại thông tin người nhận
                }
            });

        } catch (error) {
            console.error("Lỗi quá trình thanh toán:", error);
            alert("Đã có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.");
        }
    };
    const loadCart = async () => {
        try {
            const res = await cartApi.getAllCarts(currentPage, pageSize);
            const carts = res.data.content;

            setTotalPages(res.data.totalPages);
            setTotalElements(res.data.totalElements);

            const result: CartItem[] = await Promise.all(
                carts.map(async (c: any) => {
                    const sellersRes = await listSellerApi.getListingsByCardId(
                        c.cardResponse.cardId
                    );

                    const sellers = sellersRes.content.sort(
                        (a: SellResponse, b: SellResponse) => a.price - b.price
                    );

                    return {
                        id: c.cartId,
                        card: c.cardResponse,
                        seller: c.sellResponse,
                        quantity: c.quantity,
                        sellers
                    };
                })
            );

            setItems(result);
        } catch (error) {
            console.error("Lỗi khi tải giỏ hàng:", error);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === items.length && items.length > 0) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const updateQuantity = async (item: CartItem, q: number) => {
        // KIỂM TRA CHẶT CHẼ: Giới hạn số lượng không vượt quá tồn kho
        const maxStock = item.seller.quantity;
        let finalQuantity = q;

        if (finalQuantity > maxStock) {
            finalQuantity = maxStock;
        }
        if (finalQuantity <= 0) return;

        // Nếu số lượng không đổi (bị block do quá tồn kho) thì không gọi API nữa
        if (finalQuantity === item.quantity) return;

        await cartApi.updateCart(item.id, {
            listSellerId: item.seller.listSellerId,
            quantity: finalQuantity
        });

        setItems(prev =>
            prev.map(i =>
                i.id === item.id ? { ...i, quantity: finalQuantity } : i
            )
        );
    };

    const removeItem = async (id: string) => {
        await cartApi.deleteCart(id);
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        loadCart();
    };

    const changeSeller = async (item: CartItem, sellerId: string) => {
        const seller = item.sellers?.find(s => s.listSellerId === sellerId);
        if (!seller) return;

        await cartApi.updateCart(item.id, {
            listSellerId: sellerId,
            quantity: 1
        });

        setItems(prev =>
            prev.map(i =>
                i.id === item.id ? { ...i, seller, quantity: 1 } : i
            )
        );
    };

    const formatCurrency = (v: number) => {
        return v.toLocaleString("vi-VN") + " đ";
    };

    // Tính tổng tiền dựa trên số lượng được chặn tối đa (phòng hờ trường hợp dữ liệu cũ)
    const subtotal = items
        .filter(i => selectedItems.has(i.id))
        .reduce((sum, i) => {
            const validQuantity = i.quantity > i.seller.quantity ? i.seller.quantity : i.quantity;
            return sum + validQuantity * i.seller.price;
        }, 0);

    return (
        <div className="max-w-5xl mx-auto py-8 px-6">
            <div className="flex items-center gap-3 mb-8">
                <ShoppingCart className="w-8 h-8 text-blue-500" />
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Giỏ hàng của bạn <span className="text-gray-400 text-lg font-normal">({totalElements} sản phẩm)</span>
                </h1>
            </div>

            {/* Select all */}
            {items.length > 0 && (
                <div className="flex items-center gap-3 mb-4 px-2">
                    <input
                        type="checkbox"
                        checked={selectedItems.size === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 accent-blue-500 cursor-pointer focus:ring-0"
                    />
                    <span className="text-gray-300 font-medium cursor-pointer" onClick={toggleSelectAll}>
                        Chọn tất cả
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-16 bg-[#202946] rounded-2xl border border-[#35426B]">
                        <p className="text-gray-400 text-lg">Giỏ hàng của bạn đang trống.</p>
                    </div>
                ) : (
                    items.map(item => {
                        const isSelected = selectedItems.has(item.id);
                        // Đảm bảo UI hiển thị số lượng không bao giờ lố kho
                        const displayQuantity = item.quantity > item.seller.quantity ? item.seller.quantity : item.quantity;

                        return (
                            <div
                                key={item.id}
                                /* ĐÃ SỬA MÀU: Tone nền sáng hơn xíu (bg-[#202946]) và viền rõ hơn (border-[#35426B]) */
                                className={`flex flex-col sm:flex-row items-center gap-6 p-5 rounded-xl border transition-all duration-200
                                ${isSelected
                                        ? "bg-[#27345A] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                                        : "bg-[#202946] border-[#35426B] hover:border-[#526296]"
                                    }`}
                            >
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(item.id)}
                                    className="w-5 h-5 rounded border-gray-500 accent-blue-500 cursor-pointer shrink-0"
                                />

                                {/* Image - Đã fix lỗi chớp ảnh */}
                                <div className="w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-md overflow-hidden bg-[#151A2E] flex items-center justify-center relative border border-[#35426B]">
                                    <span className="text-gray-500 text-xs absolute text-center px-1 font-medium">
                                        No Image
                                    </span>
                                    <img
                                        src={getCardImageUrl(item.card)}
                                        onError={(e: any) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.removeAttribute('src');
                                            e.currentTarget.style.display = 'none';
                                        }}
                                        alt={item.card.name}
                                        className="w-full h-full object-cover relative z-10"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 flex flex-col w-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                                {item.card.name}
                                            </h3>
                                            <span className="inline-block px-2 py-1 bg-[#1A2238] text-xs text-gray-300 rounded font-medium tracking-wide">
                                                {item.card.rarity?.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                            title="Xóa sản phẩm"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Seller Select */}
                                    <div className="mt-4 flex flex-wrap items-center gap-4">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={item.seller.listSellerId}
                                                onChange={(e) => changeSeller(item, e.target.value)}
                                                className="bg-[#151A2E] border border-gray-600 text-white rounded-lg px-3 py-2 text-sm min-w-[200px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                            >
                                                {item.sellers?.map(s => (
                                                    <option key={s.listSellerId} value={s.listSellerId}>
                                                        {s.sellerName} - {formatCurrency(s.price)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1 ml-4">
                                            <span className="text-sm text-gray-400 py-2">
                                                Tồn kho: <span className="font-semibold text-gray-200">{item.seller.quantity}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-5 w-full">
                                        {/* Price */}
                                        <div className="text-xl font-bold text-blue-400">
                                            {formatCurrency(item.seller.price * displayQuantity)}
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center bg-[#151A2E] rounded-lg border border-gray-600 overflow-hidden">
                                            <button
                                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-10 text-center text-sm font-semibold text-white">
                                                {displayQuantity}
                                            </span>

                                            {/* NÚT CỘNG: Đã thêm disabled khi chạm mốc tồn kho */}
                                            <button
                                                onClick={() => updateQuantity(item, item.quantity + 1)}
                                                disabled={item.quantity >= item.seller.quantity}
                                                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8 items-center">
                    <Button
                        variant="outline"
                        className="bg-[#202946] border-[#35426B] text-white hover:bg-[#27345A] hover:text-white disabled:opacity-50"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-gray-300 font-medium px-4">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        className="bg-[#202946] border-[#35426B] text-white hover:bg-[#27345A] hover:text-white disabled:opacity-50"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            )}

            {/* Sticky Total Bar */}
            {items.length > 0 && (
                <div className="sticky bottom-4 mt-8 p-5 bg-[#202946] rounded-xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex flex-wrap justify-between items-center border border-[#35426B] z-10">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Tổng thanh toán ({selectedItems.size} sản phẩm)</p>
                        <div className="text-2xl font-bold text-white">
                            <span className="text-blue-400">{formatCurrency(subtotal)}</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        disabled={selectedItems.size === 0}
                        className="bg-[#1C3FAA] hover:bg-blue-600 text-white font-semibold px-8 h-12 rounded-lg transition-all disabled:opacity-50 disabled:shadow-none"
                        onClick={handleCheckout}
                    >
                        Mua hàng ngay
                    </Button>
                </div>
            )}
        </div>
    );
};