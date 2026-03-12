import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Package, Sparkles, Star, Zap } from 'lucide-react';
import { blindBoxApi, userApi, BlindBox, getCardImageUrl } from '@/utils/api';

const defaultBoxImage = '/mystery.png';

/** Card dùng cho hiển thị (sau khi mở từ BE). */
type Card = {
    name: string;
    rarity: string;
    value: number;
    image: string;
    flipped: boolean;
};

/** Giá hiển thị của 1 hộp (từ BE). */
function getBoxPrice(box: BlindBox): number {
    const p = box?.drawPrice ?? box?.allBoxPrice ?? 0;
    return typeof p === 'number' ? p : Number(p) || 0;
}

function isSoldOut(box: BlindBox | null | undefined): boolean {
    const s = box?.blindBoxStatus;
    if (!s) return false;
    return String(s).toUpperCase() === 'OUT_OF_STOCK';
}

/** Nền tối tím đậm dễ đọc, viền vàng nhẹ giữ cảm giác hộp bí ẩn */
const BOX_GRADIENT = 'from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e]';

export function MysteryBox() {
    const [blindBoxes, setBlindBoxes] = useState<BlindBox[]>([]);
    const [isLoadingBoxes, setIsLoadingBoxes] = useState(true);
    const [boxError, setBoxError] = useState<string | null>(null);
    const [selectedBox, setSelectedBox] = useState<BlindBox | null>(null);
    const [isTearing, setIsTearing] = useState(false);
    const [openedCards, setOpenedCards] = useState<Card[]>([]);
    const [lastDrawResult, setLastDrawResult] = useState<{ drawPrice: number; profitOrLoss: number } | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [totalValue, setTotalValue] = useState(0);
    const [_tearProgress, setTearProgress] = useState(0);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showInteractiveBag, setShowInteractiveBag] = useState(false);
    const [cardsReady, setCardsReady] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [cardDragStart, setCardDragStart] = useState<{ x: number; y: number } | null>(null);
    const [cardDragOffset, setCardDragOffset] = useState({ x: 0, y: 0 });
    const [isFlipping, setIsFlipping] = useState(false);
    const [isCardsFlying, setIsCardsFlying] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    /** Tỉ lệ theo rarity cho từng hộp (blindBoxId -> [{ rarity, probability }]). */
    const [boxProbabilities, setBoxProbabilities] = useState<Record<string, { rarity: string; probability: number }[]>>({});
    const [drawMode, setDrawMode] = useState<'ONE' | 'TEN' | 'ALL'>('ONE');
    /** Phase cho hiệu ứng mở hộp kiểu blind box: shake → lid open → light → done */
    const [boxOpenPhase, setBoxOpenPhase] = useState<'shake' | 'lid' | 'light' | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        blindBoxApi.getAllBlindBoxes()
            .then(async (list) => {
                if (cancelled) return;
                setBlindBoxes(list);

                // FE-only: xác định SOLD OUT ngay trên danh sách (không cần bấm mua)
                // Dựa vào API /blind-boxes/{id}/cards: nếu không còn card.status=true => SOLD OUT
                try {
                    const CONCURRENCY = 4;
                    const next = [...list];
                    for (let i = 0; i < list.length; i += CONCURRENCY) {
                        const batch = list.slice(i, i + CONCURRENCY);
                        const results = await Promise.all(
                            batch.map(async (box) => {
                                try {
                                    const cards = await blindBoxApi.getBlindBoxCards(box.blindBoxId);
                                    const hasAny = Array.isArray(cards) && cards.some((c) => c.status);
                                    return { id: box.blindBoxId, soldOut: !hasAny };
                                } catch {
                                    // Nếu lỗi thì không tự phán sold out (giữ nguyên theo BE)
                                    return { id: box.blindBoxId, soldOut: false };
                                }
                            })
                        );
                        for (const r of results) {
                            const idx = next.findIndex((b) => b.blindBoxId === r.id);
                            if (idx >= 0 && r.soldOut) {
                                next[idx] = { ...next[idx], blindBoxStatus: 'OUT_OF_STOCK' };
                            }
                        }
                        if (!cancelled) setBlindBoxes([...next]);
                    }
                } catch {
                    // ignore
                }

                const probs: Record<string, { rarity: string; probability: number }[]> = {};
                await Promise.all(
                    list.map(async (box) => {
                        try {
                            const arr = await blindBoxApi.getBlindBoxProbabilities(box.blindBoxId);
                            if (!cancelled && Array.isArray(arr) && arr.length > 0) {
                                probs[box.blindBoxId] = arr.map((p: { rarity: string; probability: number }) => ({
                                    rarity: p.rarity ?? '',
                                    probability: Number(p.probability ?? 0),
                                }));
                            }
                        } catch {
                            // bỏ qua nếu 1 hộp lỗi
                        }
                    })
                );
                if (!cancelled) setBoxProbabilities(prev => ({ ...prev, ...probs }));
            })
            .catch((e) => { if (!cancelled) setBoxError(e?.message || 'Không tải được danh sách hộp bí ẩn'); })
            .finally(() => { if (!cancelled) setIsLoadingBoxes(false); });
        return () => { cancelled = true; };
    }, []);

    const getRarityColor = (rarity: string) => {
        const r = (rarity || '').toUpperCase();
        const colors: Record<string, string> = {
            'COMMON': 'text-[#E0E0E0]/80 bg-[#E0E0E0]/20',
            'UNCOMMON': 'text-[#A020F0] bg-[#A020F0]/20',
            'RARE': 'text-[#D4AF37] bg-[#D4AF37]/20',
            'SUPER_RARE': 'text-[#A020F0] bg-[#A020F0]/30',
            'ULTRA_RARE': 'text-[#A020F0] bg-gradient-to-r from-[#A020F0]/30 to-[#D4AF37]/30',
            'SECRET_RARE': 'text-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/30 to-[#FFD700]/30',
            'Common': 'text-[#E0E0E0]/80 bg-[#E0E0E0]/20',
            'Uncommon': 'text-[#A020F0] bg-[#A020F0]/20',
            'Rare': 'text-[#D4AF37] bg-[#D4AF37]/20',
            'Ultra Rare': 'text-[#A020F0] bg-gradient-to-r from-[#A020F0]/30 to-[#D4AF37]/30',
            'Secret Rare': 'text-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/30 to-[#FFD700]/30',
        };
        return colors[r] || colors[rarity] || 'text-[#E0E0E0]/80 bg-[#E0E0E0]/20';
    };

    const openBox = (box: BlindBox, mode: 'ONE' | 'TEN' | 'ALL' = 'ONE') => {
        if (isSoldOut(box)) {
            alert('Hộp đã SOLD OUT. Vui lòng chọn hộp khác.');
            return;
        }
        setSelectedBox(box);
        setDrawMode(mode);
        setShowInteractiveBag(true);
        setShowResults(false);
        setCardsReady(false);
        setTearProgress(0);
        setDragOffset({ x: 0, y: 0 });
        setOpenedCards([]);
        setLastDrawResult(null);
        setIsTearing(false);
        setIsBuying(false);
        setBoxOpenPhase(null);
    };

    const handleBagClick = async () => {
        if (!showInteractiveBag || isTearing || !selectedBox || isBuying) return;
        if (isSoldOut(selectedBox)) {
            alert('Hộp đã SOLD OUT. Vui lòng chọn hộp khác.');
            resetBox();
            return;
        }

        const pricePerDraw = getBoxPrice(selectedBox);
        let requiredBalance = pricePerDraw;
        if (drawMode === 'TEN') {
            requiredBalance = pricePerDraw * 10;
        } else if (drawMode === 'ALL') {
            const boxTotal =
                typeof selectedBox.allBoxPrice === 'number'
                    ? Number(selectedBox.allBoxPrice)
                    : 0;
            requiredBalance = boxTotal > 0 ? boxTotal : pricePerDraw * 10;
        }

        try {
            const profile = await userApi.getMyProfile();
            const balance = profile?.walletResponse?.balance ?? 0;
            if (balance < requiredBalance) {
                alert(`Số dư ví không đủ (cần ${requiredBalance.toLocaleString('vi-VN')} VND, hiện có ${balance.toLocaleString('vi-VN')} VND). Vui lòng nạp thêm vào ví.`);
                navigate('/wallet');
                return;
            }
        } catch {
            alert('Vui lòng đăng nhập để mở hộp bí ẩn.');
            navigate('/login');
            return;
        }

        setIsTearing(true);
        setShowInteractiveBag(false);
        setTearProgress(0);
        setBoxOpenPhase('shake');

        // Hiệu ứng blind box: rung → nắp mở → tia sáng (tổng ~2s) rồi mới gọi API
        const phaseTimeouts: ReturnType<typeof setTimeout>[] = [];
        phaseTimeouts.push(setTimeout(() => setBoxOpenPhase('lid'), 700));
        phaseTimeouts.push(setTimeout(() => setBoxOpenPhase('light'), 1400));
        phaseTimeouts.push(setTimeout(() => setBoxOpenPhase(null), 2000));

        const tearInterval = setInterval(() => {
            setTearProgress(prev => {
                if (prev >= 100) return 100;
                return prev + 5;
            });
        }, 40);

        setTimeout(async () => {
            phaseTimeouts.forEach(t => clearTimeout(t));
            clearInterval(tearInterval);
            setIsBuying(true);
            try {
                const cards: Card[] = [];
                let totalPaid = 0;

                const maxDraws =
                    drawMode === 'ONE' ? 1 :
                    drawMode === 'TEN' ? 10 :
                    999;

                for (let i = 0; i < maxDraws; i++) {
                    try {
                        const order = await blindBoxApi.buyBlindBox(selectedBox.blindBoxId);
                        const result = await blindBoxApi.drawCard(order.orderId);
                        const c = result.card;
                        const card: Card = {
                            name: c?.name ?? 'Thẻ bí ẩn',
                            rarity: (c?.rarity as string) ?? 'COMMON',
                            value: typeof c?.basePrice === 'number' ? c.basePrice : Number(c?.basePrice) || 0,
                            image: getCardImageUrl(c) || '🎴',
                            flipped: false,
                        };
                        cards.push(card);
                        totalPaid += Number(result.drawPrice ?? 0);
                    } catch (err) {
                        const rawInner = err instanceof Error ? err.message : String(err);
                        const isEmptyBoxInner = /empty|refill/i.test(rawInner);
                        // Nếu hộp hết thẻ trong lúc đang mở nhiều thẻ, dừng vòng lặp và dùng những thẻ đã mở được
                        if (isEmptyBoxInner && cards.length > 0) {
                            break;
                        }
                        throw err;
                    }
                }

                if (cards.length === 0) {
                    throw new Error('Mua / mở hộp thất bại. Kiểm tra ví hoặc đăng nhập.');
                }

                setOpenedCards(cards);
                const totalBaseValue = cards.reduce((sum, card) => sum + card.value, 0);
                setLastDrawResult({
                    drawPrice: totalPaid,
                    profitOrLoss: totalBaseValue - totalPaid,
                });

                // Sau khi mua/mở xong, refetch số dư ví và phát sự kiện để Header + Wallet cập nhật realtime
                try {
                    const profileAfter = await userApi.getMyProfile();
                    const newBalance = profileAfter?.walletResponse?.balance ?? 0;
                    window.dispatchEvent(new CustomEvent('wallet-balance-updated', { detail: { balance: newBalance } }));
                    window.dispatchEvent(new CustomEvent('wallet-updated'));
                } catch {
                    // Nếu lỗi thì bỏ qua, không chặn flow mở thẻ
                }
            } catch (err) {
                const raw = err instanceof Error ? err.message : String(err);
                const isEmptyBox = /empty|refill/i.test(raw);
                const msg = isEmptyBox
                    ? 'Hộp đã SOLD OUT.'
                    : raw || 'Mua / mở hộp thất bại. Kiểm tra ví hoặc đăng nhập.';
                alert(msg);
                if (isEmptyBox && selectedBox?.blindBoxId) {
                    setBlindBoxes((prev) =>
                        prev.map((b) =>
                            b.blindBoxId === selectedBox.blindBoxId
                                ? { ...b, blindBoxStatus: 'OUT_OF_STOCK' }
                                : b
                        )
                    );
                }
                setIsTearing(false);
                setIsBuying(false);
                setSelectedBox(null);
                setShowInteractiveBag(false);
                return;
            }
            setIsBuying(false);
            setIsTearing(false);
            setIsCardsFlying(true);
            setTimeout(() => {
                setIsCardsFlying(false);
                setCardsReady(true);
            }, 2500);
        }, 2000);
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!showInteractiveBag || isTearing) return;

        // Check if it's a touch or mouse event
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setDragStart({ x: clientX, y: clientY });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragStart || !showInteractiveBag || isTearing) return;

        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const offsetX = clientX - dragStart.x;
        const offsetY = clientY - dragStart.y;

        setDragOffset({ x: offsetX, y: offsetY });

        // Only track downward drag for opening bag
        const downwardDistance = Math.max(0, offsetY);
        const progress = Math.min((downwardDistance / 150) * 100, 100);
        setTearProgress(progress);
    };

    const handleDragEnd = () => {
        if (!dragStart || !showInteractiveBag || isTearing) return;

        // Check if dragged down enough to open
        const downwardDistance = Math.max(0, dragOffset.y);

        if (downwardDistance > 100) {
            handleBagClick();
        } else {
            setDragOffset({ x: 0, y: 0 });
            setTearProgress(0);
        }

        setDragStart(null);
    };

    const resetBox = () => {
        setSelectedBox(null);
        setLastDrawResult(null);
        setShowResults(false);
        setOpenedCards([]);
        setTotalValue(0);
        setTearProgress(0);
        setShowInteractiveBag(false);
        setCardsReady(false);
        setDragOffset({ x: 0, y: 0 });
        setDragStart(null);
        setIsTearing(false);
        setCurrentCardIndex(0);
        setCardDragOffset({ x: 0, y: 0 });
        setCardDragStart(null);
        setIsFlipping(false);
        setIsCardsFlying(false);
        setBoxOpenPhase(null);
    };

    const handleCardDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!cardsReady || isFlipping || currentCardIndex >= openedCards.length) return;

        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        setCardDragStart({ x: clientX, y: clientY });
    };

    const handleCardDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!cardDragStart || !cardsReady || isFlipping) return;

        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const offsetX = clientX - cardDragStart.x;
        const offsetY = clientY - cardDragStart.y;

        setCardDragOffset({ x: offsetX, y: offsetY });
    };

    const handleCardDragEnd = () => {
        if (!cardDragStart || !cardsReady || isFlipping) return;

        const distance = Math.sqrt(cardDragOffset.x * cardDragOffset.x + cardDragOffset.y * cardDragOffset.y);

        if (distance > 100) {
            setIsFlipping(true);

            setTimeout(() => {
                const newCards = [...openedCards];
                newCards[currentCardIndex] = { ...newCards[currentCardIndex], flipped: true };
                setOpenedCards(newCards);
                setCurrentCardIndex(prev => prev + 1);
                setCardDragOffset({ x: 0, y: 0 });
                setIsFlipping(false);

                if (currentCardIndex + 1 >= openedCards.length) {
                    setTotalValue(newCards.reduce((sum, card) => sum + card.value, 0));
                    setTimeout(() => {
                        setShowResults(true);
                        setCardsReady(false);
                    }, 500);
                }
            }, 600);
        } else {
            setCardDragOffset({ x: 0, y: 0 });
        }

        setCardDragStart(null);
    };

    const flipCard = (index: number) => {
        if (!cardsReady) return;

        const newCards = [...openedCards];
        // Safety check
        if (index >= newCards.length) return;

        if (!newCards[index].flipped) {
            newCards[index] = { ...newCards[index], flipped: true };
            setOpenedCards(newCards);

            const allFlipped = newCards.every(card => card.flipped);
            if (allFlipped) {
                setTotalValue(newCards.reduce((sum, card) => sum + card.value, 0));
                setTimeout(() => {
                    setShowResults(true);
                    setCardsReady(false);
                }, 800);
            }
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">
            {/* Header */}
            <div className="rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-md backdrop-blur-md bg-[#1a0a2e]/90 border border-[#D4AF37]/20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center border border-[#D4AF37]/50">
                            <Gift className="w-5 h-5 md:w-6 md:h-6 text-[#D4AF37]" />
                        </div>
                        <div>
                            <h3
                                className="font-bold text-lg md:text-xl flex items-center gap-1.5 md:gap-2 text-white"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                Hộp bí ẩn
                                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#D4AF37]" />
                            </h3>
                            <p
                                className="text-xs md:text-sm text-[#E0E0E0]/90"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Mua hộp, mở thẻ ngẫu nhiên — giá trị thẻ có thể cao hơn giá mua!
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/mystery-box/history')}
                        className="inline-flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-[#D4AF37]/40 text-xs md:text-sm font-semibold text-[#D4AF37] bg-white/5 hover:bg-[#D4AF37]/10 transition-colors"
                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                    >
                        <Star className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                        Lịch sử mở hộp
                    </button>
                </div>
            </div>

            {/* Box Selection */}
            {!selectedBox && !showInteractiveBag && !showResults && (
                <div className="grid grid-cols-1 gap-6">
                    {isLoadingBoxes && (
                        <div className="text-center py-12 text-[#D4AF37]">Đang tải danh sách hộp bí ẩn...</div>
                    )}
                    {boxError && (
                        <div className="rounded-2xl p-6 bg-red-500/10 border border-red-500/30 text-red-200">
                            {boxError}
                        </div>
                    )}
                    {!isLoadingBoxes && !boxError && blindBoxes.length === 0 && (
                        <div className="text-center py-12 text-[#E0E0E0]/80">Chưa có hộp bí ẩn nào. Admin hãy tạo hộp trước.</div>
                    )}
                    {!isLoadingBoxes && blindBoxes.map((box) => (
                        <div
                            key={box.blindBoxId}
                            className={`bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-2xl shadow-[0_0_20px_rgba(160,32,240,0.2)] overflow-hidden border-2 border-[#D4AF37]/30 group ${
                                isSoldOut(box)
                                    ? 'opacity-80'
                                    : 'hover:border-[#A020F0] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]'
                            }`}
                        >
                            <div className={`bg-gradient-to-br ${BOX_GRADIENT} p-8 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <div className="relative">
                                            <img
                                                src={box.imageUrl || defaultBoxImage}
                                                alt={box.name}
                                                className={`w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.5)] ${
                                                    isSoldOut(box) ? '' : 'group-hover:scale-110'
                                                }`}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = defaultBoxImage;
                                                }}
                                            />
                                            {isSoldOut(box) && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="px-3 py-1 rounded-full bg-black/60 border border-[#D4AF37]/40 text-[#FFD700] font-bold text-sm">
                                                        SOLD OUT
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-white">
                                        <h4
                                            className="text-3xl font-bold mb-2 flex items-center gap-2"
                                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                        >
                                            {box.name}
                                            <Star className="w-7 h-7 text-[#D4AF37]" />
                                        </h4>
                                        <p
                                            className="text-[#E8E8E8] mb-4 text-lg"
                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                        >
                                            {box.description || 'Mở 1 thẻ ngẫu nhiên từ hộp.'}
                                        </p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <span
                                                className="text-4xl font-bold text-[#D4AF37]"
                                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                            >
                                                {getBoxPrice(box).toLocaleString('vi-VN')} VND
                                            </span>
                                            <span className="text-[#E0E0E0]">/ 1 lần mở</span>
                                        </div>
                                        {boxProbabilities[box.blindBoxId]?.length > 0 && (
                                            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 mb-4 border border-[#D4AF37]/30">
                                                <p className="text-[#D4AF37] font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                                                    <Zap className="w-4 h-4" />
                                                    Tỷ lệ độ hiếm
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {boxProbabilities[box.blindBoxId].map(({ rarity, probability }) => (
                                                        <span
                                                            key={rarity}
                                                            className={`text-xs px-2.5 py-1 rounded-full border border-white/20 ${getRarityColor(rarity)}`}
                                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                        >
                                                            {rarity}: {probability.toFixed(1)}%
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {box.blindBoxStatus === 'OUT_OF_STOCK' ? (
                                            <div className="w-full md:w-auto px-8 py-3 rounded-full font-bold text-lg bg-[#1a0a2e] text-[#E0E0E0]/70 border-2 border-[#D4AF37]/30 cursor-not-allowed inline-flex items-center gap-2 justify-center">
                                                SOLD OUT
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-3 items-center">
                                                <button
                                                    onClick={() => openBox(box, 'ONE')}
                                                    className="w-full md:w-auto bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0B0112] px-8 py-3 rounded-full font-bold text-lg hover:from-[#FFD700] hover:to-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center gap-2 justify-center"
                                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                >
                                                    <Gift className="w-6 h-6" />
                                                    Mở 1 thẻ
                                                </button>
                                                <button
                                                    onClick={() => openBox(box, 'TEN')}
                                                    className="w-full md:w-auto px-6 py-3 rounded-full font-semibold text-base border-2 border-[#D4AF37] text-[#E8E8E8] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-2 justify-center"
                                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                >
                                                    <Gift className="w-5 h-5 text-[#D4AF37]" />
                                                    Mua 10 thẻ
                                                </button>
                                                <button
                                                    onClick={() => openBox(box, 'ALL')}
                                                    className="w-full md:w-auto px-6 py-3 rounded-full font-semibold text-base border-2 border-[#A020F0] text-[#E8E8E8] bg-[#A020F0]/10 hover:bg-[#A020F0]/20 transition-colors flex items-center gap-2 justify-center"
                                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                >
                                                    <Package className="w-5 h-5 text-[#A020F0]" />
                                                    Mua hết thẻ trong hộp
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Màn chạm để mở — hộp 3D kiểu video unboxing */}
            {showInteractiveBag && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden select-none">
                    <div className="relative z-10">
                        <div className="text-center mb-6">
                            <h4
                                className="text-3xl font-bold text-[#D4AF37] mb-2 flex items-center gap-3 justify-center"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                <Sparkles className="w-8 h-8 text-[#A020F0]" />
                                Chạm vào hộp để mở
                                <Sparkles className="w-8 h-8 text-[#A020F0]" />
                            </h4>
                            <p className="text-[#E0E0E0]/80 text-lg" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                                Tap to open — giống unboxing video
                            </p>
                        </div>

                        <div className="flex justify-center items-center min-h-[380px]" style={{ perspective: '700px' }}>
                            <div
                                className="relative cursor-pointer touch-none active:scale-[0.98] transition-transform duration-100"
                                onClick={handleBagClick}
                                onMouseDown={handleDragStart}
                                onMouseMove={handleDragMove}
                                onMouseUp={handleDragEnd}
                                onMouseLeave={handleDragEnd}
                                onTouchStart={handleDragStart}
                                onTouchMove={handleDragMove}
                                onTouchEnd={handleDragEnd}
                                style={{
                                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                                    transition: dragStart ? 'none' : 'transform 0.25s ease',
                                }}
                            >
                                {/* Hộp kín (thân + nắp) — giống frame đầu video unboxing */}
                                <div className="relative w-56 h-[240px] flex flex-col items-center">
                                    {/* Thân hộp */}
                                    <div
                                        className={`absolute bottom-0 w-56 h-56 bg-gradient-to-b ${BOX_GRADIENT} rounded-t-2xl border-4 border-[#D4AF37]/50 border-b-0 shadow-[0_0_35px_rgba(160,32,240,0.4)] overflow-hidden`}
                                        style={{ left: 0 }}
                                    >
                                        <img
                                            src={selectedBox?.imageUrl || defaultBoxImage}
                                            alt=""
                                            className="w-full h-full object-cover opacity-95"
                                        />
                                    </div>
                                    {/* Nắp hộp (đóng) */}
                                    <div
                                        className="absolute w-56 h-16 rounded-t-2xl border-4 border-[#D4AF37]/60 border-b-0 shadow-lg overflow-hidden bg-gradient-to-b from-[#D4AF37]/50 to-[#1a0a2e]"
                                        style={{
                                            bottom: '224px',
                                            left: 0,
                                            transformOrigin: 'center bottom',
                                        }}
                                    >
                                        <img
                                            src={selectedBox?.imageUrl || defaultBoxImage}
                                            alt=""
                                            className="w-full h-full object-cover object-top opacity-90"
                                        />
                                    </div>
                                    {/* Vệt sáng nhẹ trên nắp (cảm giác seal) */}
                                    <div
                                        className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent"
                                        style={{ bottom: '223px' }}
                                    />
                                </div>

                                <p className="text-center text-[#D4AF37]/90 text-sm mt-6 font-medium" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                                    👆 Chạm hoặc kéo nhẹ để mở
                                </p>
                            </div>
                        </div>

                        <div className="text-center mt-8">
                            <button
                                onClick={resetBox}
                                className="px-6 py-2 bg-[#1a0a2e] hover:bg-[#0B0112] text-[#E0E0E0] border border-[#D4AF37]/30 rounded-lg"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Opening Animation — Blind box style: rung → nắp mở → tia sáng vàng */}
            {isTearing && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden">
                    <style>{`
                      @keyframes blindBoxShake {
                        0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
                        10% { transform: translate(calc(-50% - 8px), -50%) rotate(-3deg); }
                        20% { transform: translate(calc(-50% + 8px), -50%) rotate(3deg); }
                        30% { transform: translate(calc(-50% - 6px), -50%) rotate(-2deg); }
                        40% { transform: translate(calc(-50% + 6px), -50%) rotate(2deg); }
                        50% { transform: translate(calc(-50% - 4px), -50%) rotate(-1deg); }
                        60% { transform: translate(calc(-50% + 4px), -50%) rotate(1deg); }
                        70%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
                      }
                      @keyframes lidOpen {
                        0% { transform: rotateX(0deg); }
                        100% { transform: rotateX(-110deg); }
                      }
                      @keyframes lightBurst {
                        0% { opacity: 0; transform: translate(-50%, 0) scaleY(0); }
                        30% { opacity: 1; transform: translate(-50%, 0) scaleY(1); }
                        100% { opacity: 0.4; transform: translate(-50%, -20px) scaleY(1.2); }
                      }
                      .blind-box-shake { animation: blindBoxShake 0.7s ease-in-out; }
                      .blind-box-lid-open { animation: lidOpen 0.6s ease-out forwards; transform-origin: bottom center; }
                      .blind-box-light { animation: lightBurst 0.6s ease-out forwards; }
                    `}</style>
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-72 h-80 flex items-center justify-center" style={{ perspective: '600px' }}>
                            {/* Hộp chính (thân hộp blind box) */}
                            <div
                                className={`absolute bottom-0 w-56 h-56 bg-gradient-to-b ${BOX_GRADIENT} rounded-t-2xl border-4 border-[#D4AF37]/50 border-b-0 shadow-[0_0_40px_rgba(160,32,240,0.4)] overflow-hidden ${boxOpenPhase === 'shake' ? 'blind-box-shake' : ''}`}
                                style={{
                                    transform: 'translate(-50%, 0)',
                                    left: '50%',
                                    transition: boxOpenPhase === 'lid' || boxOpenPhase === 'light' ? 'transform 0.1s' : 'none',
                                }}
                            >
                                <img
                                    src={selectedBox?.imageUrl || defaultBoxImage}
                                    alt=""
                                    className="w-full h-full object-cover opacity-90"
                                />
                            </div>

                            {/* Nắp hộp (mở ra phía sau, có perspective) */}
                            <div
                                className="absolute w-56 h-16 rounded-t-2xl border-4 border-[#D4AF37]/60 border-b-0 shadow-lg overflow-hidden bg-gradient-to-b from-[#D4AF37]/50 to-[#1a0a2e]"
                                style={{
                                    bottom: '224px',
                                    left: '50%',
                                    marginLeft: '-112px',
                                    transformOrigin: 'center bottom',
                                    transform: boxOpenPhase === 'lid' || boxOpenPhase === 'light'
                                        ? 'translateX(-50%) rotateX(-105deg)'
                                        : 'translateX(-50%) rotateX(0deg)',
                                    transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <div className="w-full h-full flex items-center justify-center">
                                    <img
                                        src={selectedBox?.imageUrl || defaultBoxImage}
                                        alt=""
                                        className="w-full h-full object-cover object-top opacity-90"
                                    />
                                </div>
                            </div>

                            {/* Tia sáng vàng từ trong hộp (khi nắp mở) */}
                            {(boxOpenPhase === 'light' || boxOpenPhase === 'lid') && (
                                <div
                                    className="blind-box-light absolute bottom-[230px] left-1/2 w-32 h-40 pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(to top, rgba(255,255,255,0.15), rgba(255,215,0,0.5) 20%, rgba(212,175,55,0.3) 50%, transparent 70%)',
                                        filter: 'blur(8px)',
                                        borderRadius: '50% 50% 0 0',
                                    }}
                                />
                            )}
                            {boxOpenPhase === 'light' && (
                                <>
                                    <div
                                        className="absolute bottom-[220px] left-1/2 w-48 h-56 pointer-events-none opacity-80"
                                        style={{
                                            background: 'linear-gradient(to top, transparent, rgba(255,215,0,0.4) 30%, rgba(255,255,255,0.6) 60%, transparent)',
                                            filter: 'blur(12px)',
                                            transform: 'translateX(-50%)',
                                            animation: 'lightBurst 0.6s ease-out',
                                        }}
                                    />
                                    {[...Array(12)].map((_, i) => (
                                        <Sparkles
                                            key={i}
                                            className="absolute w-8 h-8 text-[#FFD700] pointer-events-none"
                                            style={{
                                                bottom: '200px',
                                                left: '50%',
                                                transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(-${40 + (i % 3) * 25}px)`,
                                                opacity: 0.9,
                                                filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))',
                                                animation: 'lightBurst 0.5s ease-out',
                                            }}
                                        />
                                    ))}
                                </>
                            )}
                        </div>

                        <h4
                            className="text-2xl font-bold text-[#D4AF37]"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            {isBuying ? 'Đang mua & mở thẻ...' : (boxOpenPhase === 'light' ? 'Sắp ra thẻ...' : 'Đang mở hộp...')}
                        </h4>
                    </div>
                </div>
            )}

            {/* Cards Flying Animation */}
            {isCardsFlying && openedCards.length > 0 && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden min-h-[600px]">
                    <div className="relative w-full h-[500px]">
                        {openedCards.map((_card, index) => {
                            const angle = (360 / openedCards.length) * index;
                            const burstRadius = 250;
                            const burstX = Math.cos((angle * Math.PI) / 180) * burstRadius;
                            const burstY = Math.sin((angle * Math.PI) / 180) * burstRadius;

                            const circleRadius = 200;
                            const circleX = Math.cos((angle * Math.PI) / 180) * circleRadius;
                            const circleY = Math.sin((angle * Math.PI) / 180) * circleRadius - 50;

                            const stackOffset = index * 3;

                            return (
                                <div
                                    key={index}
                                    className="absolute top-1/2 left-1/2 w-32 h-44 bg-gradient-to-br from-[#A020F0] to-[#D4AF37] rounded-lg shadow-[0_0_30px_rgba(160,32,240,0.5)] border-4 border-[#D4AF37] flex items-center justify-center text-5xl"
                                    style={{
                                        animation: 'cardFly 5s forwards',
                                        animationDelay: `${index * 0.05}s`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: openedCards.length - index,
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg"></div>
                                    <span className="relative z-10">🎴</span>

                                    <style>{`
                    @keyframes cardFly {
                      0% {
                        transform: translate(-50%, -50%) rotate(0deg) scale(0);
                        opacity: 0;
                      }
                      20% {
                        transform: translate(calc(-50% + ${burstX}px), calc(-50% + ${burstY}px)) rotate(${Math.random() * 360}deg) scale(1);
                        opacity: 1;
                      }
                      40% {
                        transform: translate(calc(-50% + ${burstX}px), calc(-50% + ${burstY}px)) rotate(${Math.random() * 360}deg) scale(1);
                      }
                      60% {
                        transform: translate(calc(-50% + ${circleX}px), calc(-50% + ${circleY}px)) rotate(${angle}deg) scale(1);
                      }
                      80%, 100% {
                        transform: translate(calc(-50% + ${stackOffset}px), calc(-50% + 150px + ${stackOffset}px)) rotate(${Math.random() * 10 - 5}deg) scale(1);
                      }
                    }
                  `}</style>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Card Flipping Interface */}
            {cardsReady && !showResults && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37]">
                    <div className="text-center mb-8">
                        <h4
                            className="text-3xl font-bold text-[#D4AF37] mb-3 flex items-center gap-3 justify-center"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            <Sparkles className="w-8 h-8 text-[#A020F0] " />
                            Vuốt để lật thẻ!
                            <Sparkles className="w-8 h-8 text-[#A020F0] " />
                        </h4>
                        <p
                            className="text-[#E0E0E0]/80"
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            Thẻ {currentCardIndex + 1} / {openedCards.length}
                        </p>
                    </div>

                    <div className="relative min-h-[400px] flex items-center justify-center">
                        {currentCardIndex < openedCards.length && (
                            <div
                                className="relative cursor-grab active:cursor-grabbing touch-none"
                                onMouseDown={handleCardDragStart}
                                onMouseMove={handleCardDragMove}
                                onMouseUp={handleCardDragEnd}
                                onMouseLeave={() => {
                                    if (cardDragStart) handleCardDragEnd();
                                }}
                                onTouchStart={handleCardDragStart}
                                onTouchMove={handleCardDragMove}
                                onTouchEnd={handleCardDragEnd}
                                style={{
                                    transform: isFlipping
                                        ? `translate(${cardDragOffset.x * 3}px, ${cardDragOffset.y * 3}px) rotate(${cardDragOffset.x}deg) scale(0.5)`
                                        : `translate(${cardDragOffset.x}px, ${cardDragOffset.y}px) rotate(${cardDragOffset.x * 0.2}deg)`,
                                    transition: isFlipping ? 'all 0.6s ' : cardDragStart ? 'none' : 'transform 0.3s ',
                                    opacity: isFlipping ? 0 : 1
                                }}
                            >
                                <div className="w-64 h-80 bg-gradient-to-br from-[#A020F0] to-[#D4AF37] rounded-2xl shadow-[0_0_40px_rgba(160,32,240,0.5)] border-4 border-[#D4AF37] flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                                    <div className="relative z-10 text-center">
                                        <div className="text-8xl mb-4">🎴</div>
                                        <p
                                            className="text-white font-bold text-xl"
                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                        >
                                            Kéo để lật
                                        </p>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                    {[...Array(5)].map((_, i) => (
                                        <Sparkles
                                            key={i}
                                            className="absolute w-6 h-6 text-[#D4AF37]"
                                            style={{
                                                top: `${20 + i * 15}%`,
                                                left: `${10 + (i % 2) * 70}%`,
                                                animationDelay: `${i * 0.2}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stacked cards preview in background */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {openedCards.slice(currentCardIndex + 1, currentCardIndex + 4).map((_, index) => (
                                <div
                                    key={index}
                                    className="absolute w-64 h-80 bg-gradient-to-br from-[#1a0a2e] to-[#0B0112] rounded-2xl border-4 border-[#D4AF37]/30 opacity-40"
                                    style={{
                                        transform: `translateY(${(index + 1) * -10}px) scale(${1 - (index + 1) * 0.05})`,
                                        zIndex: -index - 1
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center mt-8 space-y-4">
                        <p
                            className="text-[#D4AF37] font-semibold"
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            💡 Kéo thẻ sang trái hoặc phải để lật!
                        </p>
                        <button
                            onClick={() => flipCard(currentCardIndex)}
                            className="px-6 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#FFD700] hover:to-[#D4AF37] text-[#0B0112] rounded-lg font-bold shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            Hoặc click để lật
                        </button>
                    </div>

                    {/* Flipped Cards Display */}
                    {openedCards.filter(card => card.flipped).length > 0 && (
                        <div className="mt-8">
                            <h5
                                className="text-[#D4AF37] text-xl font-bold mb-4 text-center"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                Thẻ đã lật:
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {openedCards.filter(card => card.flipped).map((card, index) => (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-xl shadow-[0_0_20px_rgba(160,32,240,0.3)] overflow-hidden border-2 border-[#D4AF37]/30"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="bg-gradient-to-br from-[#A020F0] to-[#D4AF37] p-6 text-center min-h-[100px] flex items-center justify-center">
                                            {card.image.startsWith('http') ? (
                                                <img src={card.image} alt={card.name} className="max-h-20 w-full object-contain rounded" />
                                            ) : (
                                                <div className="text-6xl mb-2">{card.image}</div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h5
                                                className="font-bold text-sm mb-1 text-[#E0E0E0]"
                                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                                            >
                                                {card.name}
                                            </h5>
                                            <div
                                                className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${getRarityColor(card.rarity)}`}
                                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                                            >
                                                {card.rarity}
                                            </div>
                                            <p
                                                className="text-[#D4AF37] font-bold text-sm"
                                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                                            >
                                                {card.value.toLocaleString('vi-VN')} VND
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results */}
            {showResults && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-[#A020F0] via-[#D4AF37] to-[#A020F0] rounded-2xl p-6 shadow-[0_0_40px_rgba(160,32,240,0.5)] border border-[#D4AF37]">
                        <div className="text-center">
                            <h3
                                className="text-3xl font-bold mb-2 flex items-center gap-2 justify-center text-white"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                <Star className="w-8 h-8 " />
                                Kết quả mở thẻ
                                <Star className="w-8 h-8 " />
                            </h3>
                            <p
                                className="text-xl mb-2 text-white"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Giá trị thẻ: {totalValue.toLocaleString('vi-VN')} VND
                            </p>
                            {lastDrawResult != null && (
                                <>
                                    <p
                                        className="text-lg mb-1 text-white/90"
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        Giá đã trả: {Number(lastDrawResult.drawPrice).toLocaleString('vi-VN')} VND
                                    </p>
                                    <p
                                        className={`text-lg font-bold ${lastDrawResult.profitOrLoss >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        {lastDrawResult.profitOrLoss >= 0 ? 'Lời' : 'Lỗ'}: {Math.abs(lastDrawResult.profitOrLoss).toLocaleString('vi-VN')} VND
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
                        {openedCards.map((card, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-xl shadow-[0_0_20px_rgba(160,32,240,0.3)] overflow-hidden border-2 border-[#D4AF37]/30 w-full max-w-[200px]"
                            >
                                <div className="bg-gradient-to-br from-[#A020F0] to-[#D4AF37] p-6 text-center min-h-[140px] flex items-center justify-center">
                                    {card.image.startsWith('http') ? (
                                        <img src={card.image} alt={card.name} className="max-h-32 w-full object-contain rounded" />
                                    ) : (
                                        <div className="text-6xl">{card.image}</div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h5
                                        className="font-bold text-sm mb-1 text-[#E0E0E0]"
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        {card.name}
                                    </h5>
                                    <div
                                        className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${getRarityColor(card.rarity)}`}
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        {card.rarity}
                                    </div>
                                    <p
                                        className="text-[#D4AF37] font-bold text-sm"
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        {card.value.toLocaleString('vi-VN')} VND
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <button
                            onClick={resetBox}
                            className="px-8 py-3 bg-gradient-to-r from-[#A020F0] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#A020F0] text-white rounded-full font-bold text-lg shadow-[0_0_25px_rgba(160,32,240,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] "
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            Mở hộp khác
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
