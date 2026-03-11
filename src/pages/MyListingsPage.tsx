import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tag, ArrowLeft, Package, Star, Trash2, Loader2 } from 'lucide-react';
import { listSellerApi, ListingItem } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_IMG =
    'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';

const formatVND = (value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    return n.toLocaleString('vi-VN') + ' đ';
};

const formatRarity = (rarity: string) =>
    rarity
        ? rarity
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
        : '';

export const MyListingsPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [myListings, setMyListings] = useState<ListingItem[]>([]);
    const [myListingsLoading, setMyListingsLoading] = useState(false);
    const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
    const [editPrice, setEditPrice] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const loadMyListings = async () => {
        if (!isAuthenticated) return;
        setMyListingsLoading(true);
        try {
            const res = await listSellerApi.getMyListings(0, 100);
            setMyListings(res.content ?? []);
        } catch {
            setMyListings([]);
        } finally {
            setMyListingsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadMyListings();
        }
    }, [isAuthenticated]);

    const openListingDetail = (item: ListingItem) => {
        setSelectedListing(item);
        setEditPrice(String(item.price));
        setEditQuantity(String(item.quantity));
        setEditError('');
    };

    const handleSaveListing = async () => {
        if (!selectedListing) return;
        setEditError('');

        const priceStr = editPrice.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
        const priceNum = parseFloat(priceStr);
        const qtyNum = parseInt(editQuantity, 10);

        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setEditError('Nhập giá hợp lệ.');
            return;
        }
        if (!Number.isInteger(qtyNum) || qtyNum < 0) {
            setEditError('Số lượng phải là số nguyên không âm.');
            return;
        }

        setEditSaving(true);
        try {
            await listSellerApi.updateMyListing(selectedListing.listSellerId, {
                price: priceNum,
                quantity: qtyNum,
            });
            await loadMyListings();
            setSelectedListing(null);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : 'Không cập nhật được bài đăng. Thử lại sau.',
            );
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteListing = async () => {
        if (!selectedListing) return;
        setEditSaving(true);
        setEditError('');
        try {
            // Không có API xoá cứng → set quantity = 0 để ẩn khỏi Sàn giao dịch
            await listSellerApi.updateMyListing(selectedListing.listSellerId, {
                price: selectedListing.price,
                quantity: 0,
            });
            await loadMyListings();
            setSelectedListing(null);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : 'Không ẩn được bài đăng. Thử lại sau.',
            );
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex items-center text-primary-400 hover:text-primary-300 px-0"
                            onClick={() => navigate('/marketplace')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Về Sàn giao dịch
                        </Button>
                        <h1 className="text-3xl font-bold font-serif gradient-text mt-2">
                            Bài đăng bán của tôi
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Quản lý tất cả tin đăng bán thẻ của bạn trên Sàn giao dịch.
                        </p>
                    </div>
                    <Button variant="premium" onClick={() => navigate('/post-listing')}>
                        Đăng thêm thẻ
                    </Button>
                </div>

                <Card className="glass-card-strong">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary-400" />
                            Bài đăng bán của tôi
                            {myListings.length > 0 && (
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({myListings.length} tin)
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {myListingsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : myListings.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-10 w-10 mx-auto mb-3 text-primary-400/60" />
                                <p className="text-sm text-muted-foreground">
                                    Bạn chưa có bài đăng bán nào.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Vào &quot;Đăng bán&quot; để tạo tin đăng đầu tiên.
                                </p>
                                <Button
                                    className="mt-4"
                                    variant="premium"
                                    onClick={() => navigate('/post-listing')}
                                >
                                    Đăng bán ngay
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {myListings.map((item) => {
                                    const soldOut = item.quantity <= 0;
                                    return (
                                        <button
                                            key={item.listSellerId}
                                            type="button"
                                            onClick={() => openListingDetail(item)}
                                            className="text-left rounded-xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-colors relative bg-black/40"
                                        >
                                            <div className="aspect-[2.5/3.5] relative">
                                                <img
                                                    src={item.imageUrl || PLACEHOLDER_IMG}
                                                    alt={item.cardName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = PLACEHOLDER_IMG;
                                                    }}
                                                />
                                                {soldOut && (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                        <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/90 text-white uppercase">
                                                            Hết hàng
                                                        </span>
                                                    </div>
                                                )}
                                                {!soldOut && (
                                                    <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-500/80 text-center">
                                                        SL: {item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-medium truncate">
                                                    {item.cardName}
                                                </p>
                                                <p className="text-xs font-semibold text-yellow-400">
                                                    {formatVND(item.price)}
                                                </p>
                                                {item.sellerFeedbackCount != null &&
                                                    item.sellerFeedbackCount > 0 && (
                                                        <p className="text-[10px] text-amber-400/90 mt-0.5 flex items-center gap-0.5 flex-wrap">
                                                            <Star className="h-3 w-3 fill-amber-400 shrink-0" />
                                                            <span>
                                                                {Number(
                                                                    item.sellerAverageRating ?? 0,
                                                                ).toFixed(1)}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                (
                                                                {item.sellerFeedbackCount} đánh giá)
                                                            </span>
                                                        </p>
                                                    )}
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Xem / Chỉnh sửa
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog
                    open={!!selectedListing}
                    onOpenChange={(open: boolean) => !open && setSelectedListing(null)}
                >
                    <DialogContent className="max-w-md">
                        {selectedListing && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Tag className="h-5 w-5 text-primary-400" />
                                        Chi tiết bài đăng
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-2">
                                    <div className="flex gap-4 p-3 rounded-lg bg-white/5">
                                        <img
                                            src={selectedListing.imageUrl || PLACEHOLDER_IMG}
                                            alt={selectedListing.cardName}
                                            className="w-24 h-32 object-cover rounded-lg shrink-0"
                                            onError={(e) => {
                                                e.currentTarget.src = PLACEHOLDER_IMG;
                                            }}
                                        />
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div>
                                                <h3 className="font-semibold text-sm line-clamp-2">
                                                    {selectedListing.cardName}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedListing.categoryName || '—'} ·{' '}
                                                    {formatRarity(selectedListing.rarity)}
                                                </p>
                                                {selectedListing.quantity <= 0 && (
                                                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold bg-red-500/90 text-white">
                                                        Hết hàng
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 space-y-1 text-xs">
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Tên thẻ</span>
                                                    <span className="font-medium text-right truncate">
                                                        {selectedListing.cardName}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Danh mục</span>
                                                    <span className="font-medium text-right truncate">
                                                        {selectedListing.categoryName || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Độ hiếm</span>
                                                    <span className="font-medium text-right">
                                                        {formatRarity(selectedListing.rarity)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Giá hiện tại</span>
                                                    <span className="font-medium text-right text-yellow-400">
                                                        {formatVND(selectedListing.price)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <span className="text-muted-foreground">Số lượng hiện tại</span>
                                                    <span className="font-medium text-right">
                                                        {selectedListing.quantity}
                                                    </span>
                                                </div>
                                                {(selectedListing.minPrice != null ||
                                                    selectedListing.maxPrice != null) && (
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-muted-foreground">
                                                            Giá tham khảo (min ~ max)
                                                        </span>
                                                        <span className="font-medium text-right">
                                                            {formatVND(
                                                                selectedListing.minPrice ??
                                                                    selectedListing.price
                                                            )}{' '}
                                                            ~{' '}
                                                            {formatVND(
                                                                selectedListing.maxPrice ??
                                                                    selectedListing.price
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Giá bán (VNĐ)
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                                placeholder="50 000"
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Số lượng
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                        {editError && (
                                            <div className="p-2 rounded bg-red-500/10 border border-red-500/40 text-xs text-red-300">
                                                {editError}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-1">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={handleDeleteListing}
                                                disabled={editSaving}
                                            >
                                                {editSaving ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3" />
                                                )}
                                                Ẩn bài đăng
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedListing(null)}
                                                    disabled={editSaving}
                                                >
                                                    Đóng
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="premium"
                                                    size="sm"
                                                    className="gap-1.5"
                                                    onClick={handleSaveListing}
                                                    disabled={editSaving}
                                                >
                                                    {editSaving ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : null}
                                                    Lưu thay đổi
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

