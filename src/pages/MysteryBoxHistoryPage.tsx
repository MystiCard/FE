import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blindBoxApi, BlindBoxHistoryItem, getCardImageUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, History, ArrowLeft } from 'lucide-react';

export const MysteryBoxHistoryPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<BlindBoxHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [boxFilter, setBoxFilter] = useState<string>(''); // '' = tất cả hộp

    useEffect(() => {
        const load = async () => {
            if (!isAuthenticated) {
                navigate('/login');
                return;
            }
            try {
                const data = await blindBoxApi.getMyHistory();
                setItems(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được lịch sử mở hộp bí ẩn');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [isAuthenticated, navigate]);

    const hasSelection = selectedIds.length > 0;

    const filteredItems = useMemo(() => {
        if (!boxFilter) return items;
        return items.filter((i) => (i.blindBoxName || 'Hộp bí ẩn') === boxFilter);
    }, [items, boxFilter]);

    const uniqueBoxNames = useMemo(() => {
        const set = new Set<string>();
        items.forEach((i) => set.add(i.blindBoxName || 'Hộp bí ẩn'));
        return Array.from(set);
    }, [items]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Thẻ đang/đã giao về nhà hoặc đã giao buyer → không được chọn giao lần nữa
    // Thẻ đang đăng bán cũng không được yêu cầu giao (để tránh xung đột với sàn giao dịch)
    const canShip = (item: BlindBoxHistoryItem) =>
        !item.shipped && !item.soldAndDeliveredToBuyer && !item.listedForSale;
    // Chỉ được chọn khi còn đủ điều kiện giao về nhà
    const selectable = (item: BlindBoxHistoryItem) => canShip(item);

    const handleSelectAll = () => {
        const selectableItems = filteredItems.filter(i => selectable(i));
        if (selectedIds.length === selectableItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableItems.map(i => i.blindBoxResultId));
        }
    };

    /** Nhãn trạng thái theo ưu tiên: Đã giao buyer → Đang đăng bán → Đã giao (về nhà) → Đã yêu cầu giao/Đang giao */
    const getStatusLabel = (item: BlindBoxHistoryItem): string => {
        if (item.soldAndDeliveredToBuyer) return 'Đã giao buyer';
        if (item.listedForSale) return 'Đang đăng bán';
        if (item.shipped) {
            return item.shippedToHomeDelivered ? 'Đã giao' : 'Đã yêu cầu giao';
        }
        return '';
    };

    const handleBulkShip = async () => {
        if (selectedIds.length === 0) return;
        sessionStorage.setItem('mysteryCheckoutResultIds', JSON.stringify(selectedIds));
        navigate('/mystery-box/checkout', {
            state: { resultIds: selectedIds },
        });
    };

    const handleSingleShip = async (id: string) => {
        sessionStorage.setItem('mysteryCheckoutResultIds', JSON.stringify([id]));
        navigate('/mystery-box/checkout', {
            state: { resultIds: [id] },
        });
    };

    if (!isAuthenticated) return null;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <div className="text-xl text-yellow-200">Đang tải lịch sử mở hộp bí ẩn...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-red-400 text-xl mb-2">{error}</div>
                    <Button onClick={() => window.location.reload()}>Thử lại</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12 space-y-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2 gradient-text flex items-center gap-2">
                        <History className="w-7 h-7 text-yellow-300" />
                        Lịch sử mở Hộp bí ẩn
                    </h1>
                    <p className="text-muted-foreground">
                        Xem lại các thẻ bạn đã mở từ Hộp bí ẩn.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/mystery-box')} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại Hộp bí ẩn
                </Button>
            </div>

            {items.length === 0 ? (
                <Card className="glass-card p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                    </div>
                    <p className="text-muted-foreground mb-2">Bạn chưa mở Hộp bí ẩn nào.</p>
                    <Button variant="outline" onClick={() => navigate('/mystery-box')}>
                        Đến Hộp bí ẩn
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                                Đã mở{' '}
                                <span className="font-semibold text-yellow-300">{items.length}</span> thẻ từ Hộp bí ẩn.
                            </div>
                            <div>
                                Đang hiển thị{' '}
                                <span className="font-semibold text-yellow-300">{filteredItems.length}</span> thẻ
                                {boxFilter && (
                                    <>
                                        {' '}trong hộp{' '}
                                        <span className="font-semibold text-yellow-300">{boxFilter}</span>
                                    </>
                                )}
                                {!boxFilter && ' từ tất cả các hộp.'}
                            </div>
                            {hasSelection && (
                                <>
                                    {' '}
                                    Đã chọn{' '}
                                    <span className="font-semibold text-green-300">{selectedIds.length}</span> thẻ.
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {uniqueBoxNames.length > 1 && (
                                <select
                                    value={boxFilter}
                                    onChange={(e) => {
                                        setBoxFilter(e.target.value);
                                        setSelectedIds([]);
                                    }}
                                    className="text-xs rounded-md bg-black/40 border border-white/20 px-2 py-1 text-white"
                                >
                                    <option value="">Tất cả Hộp bí ẩn</option>
                                    {uniqueBoxNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={handleSelectAll}
                            >
                                {selectedIds.length === filteredItems.length && filteredItems.length > 0
                                    ? 'Bỏ chọn tất cả'
                                    : 'Chọn tất cả'}
                            </Button>
                            {hasSelection && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-green-400/60 text-green-300 hover:bg-green-500/10"
                                    onClick={handleBulkShip}
                                >
                                    Giao về nhà ({selectedIds.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => {
                            const hasOpenedAt =
                                !!item.openedAt &&
                                !Number.isNaN(Date.parse(item.openedAt));
                            const dateStr = hasOpenedAt
                                ? new Date(item.openedAt).toLocaleString('vi-VN')
                                : '—';
                            const hasPriceInfo =
                                typeof item.drawPrice === 'number' &&
                                typeof item.profitOrLoss === 'number' &&
                                !Number.isNaN(item.drawPrice) &&
                                !Number.isNaN(item.profitOrLoss) &&
                                (item.drawPrice !== 0 || item.profitOrLoss !== 0);
                            const profitPositive = hasPriceInfo ? item.profitOrLoss >= 0 : false;
                            const hasBasePrice =
                                typeof item.card.basePrice === 'number' &&
                                item.card.basePrice > 0;
                            const checked = selectedIds.includes(item.blindBoxResultId);
                            const canSelect = selectable(item);
                            const shipDisabled = !canShip(item);
                            const statusLabel = getStatusLabel(item);

                            return (
                                <Card
                                    key={item.blindBoxResultId}
                                    className="glass-card p-4 flex flex-col gap-3 border border-white/10 hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Thời gian</p>
                                            <p className="text-sm font-semibold text-yellow-200">{dateStr}</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Hộp</p>
                                                <p className="text-sm font-semibold">
                                                    {item.blindBoxName || 'Hộp bí ẩn'}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={!canSelect}
                                                onChange={() => canSelect && toggleSelect(item.blindBoxResultId)}
                                                className="mt-1 w-4 h-4 rounded border-white/40 bg-black/40 disabled:opacity-40"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-center">
                                        <div className="w-20 h-28 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                                            {getCardImageUrl(item.card) ? (
                                                <img
                                                    src={getCardImageUrl(item.card)}
                                                    alt={item.card.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl">🎴</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold text-white line-clamp-2">
                                                {item.card.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Độ hiếm: <span className="font-semibold">{item.card.rarity}</span>
                                            </p>
                                            {hasBasePrice ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Giá thẻ:{' '}
                                                    <span className="font-semibold text-yellow-300">
                                                        {item.card.basePrice.toLocaleString('vi-VN')} VND
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Giá thẻ: —
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2 border-t border-white/10 text-sm">
                                        {hasPriceInfo ? (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Giá đã trả</p>
                                                    <p className="font-semibold text-red-300">
                                                        {item.drawPrice.toLocaleString('vi-VN')} VND
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Kết quả</p>
                                                    <p
                                                        className={`font-semibold ${
                                                            profitPositive ? 'text-green-400' : 'text-red-400'
                                                        }`}
                                                    >
                                                        {profitPositive ? 'Lời' : 'Lỗ'}{' '}
                                                        {Math.abs(item.profitOrLoss).toLocaleString('vi-VN')} VND
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                Thông tin giá chưa khả dụng cho lượt mở này.
                                            </p>
                                        )}
                                        {statusLabel && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">Trạng thái:</span>
                                                <span className="text-xs font-semibold text-yellow-300">
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2 justify-end flex-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={shipDisabled}
                                                    className="text-xs px-3 py-1 border-green-400/60 text-green-300 hover:bg-green-500/10 disabled:opacity-40"
                                                    onClick={() => handleSingleShip(item.blindBoxResultId)}
                                                >
                                                    Giao về nhà
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

