import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles, Star, Zap } from 'lucide-react';
import { blindBoxApi, userApi, BlindBox } from '@/utils/api';

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

const BOX_GRADIENT = 'from-[#3D7DCA] via-[#FFCB05] to-[#3D7DCA]';

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
    const [tearProgress, setTearProgress] = useState(0);
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

    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        blindBoxApi.getAllBlindBoxes()
            .then(async (list) => {
                if (cancelled) return;
                setBlindBoxes(list);
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
    };

    const handleBagClick = async () => {
        if (!showInteractiveBag || isTearing || !selectedBox || isBuying) return;

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
                alert(`Số dư ví không đủ (cần ${requiredBalance.toLocaleString('vi-VN')}₫, hiện có ${balance.toLocaleString('vi-VN')}₫). Vui lòng nạp thêm vào ví.`);
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

        const tearInterval = setInterval(() => {
            setTearProgress(prev => {
                if (prev >= 100) return 100;
                return prev + 8;
            });
        }, 50);

        setTimeout(async () => {
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
                            image: c?.imageUrl ?? '🎴',
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

                // Sau khi mua/mở xong, refetch số dư ví và phát sự kiện để Header cập nhật realtime
                try {
                    const profileAfter = await userApi.getMyProfile();
                    const newBalance = profileAfter?.walletResponse?.balance ?? 0;
                    window.dispatchEvent(new CustomEvent('wallet-balance-updated', { detail: { balance: newBalance } }));
                } catch {
                    // Nếu lỗi thì bỏ qua, không chặn flow mở thẻ
                }
            } catch (err) {
                const raw = err instanceof Error ? err.message : String(err);
                const isEmptyBox = /empty|refill/i.test(raw);
                const msg = isEmptyBox
                    ? 'Hộp đã hết thẻ. Vui lòng liên hệ admin để nạp thêm.'
                    : raw || 'Mua / mở hộp thất bại. Kiểm tra ví hoặc đăng nhập.';
                alert(msg);
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
        }, 1500);
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
        <div className="space-y-6">
            {/* Header */}
            <div className="pokemon-header rounded-2xl p-6 shadow-lg backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#FFCB05]/20 rounded-full flex items-center justify-center border-2 border-[#FFCB05]/50">
                            <Gift className="w-7 h-7 text-[#3D7DCA]" />
                        </div>
                        <div>
                            <h3
                                className="font-bold text-2xl flex items-center gap-2 bg-gradient-to-r from-[#3D7DCA] to-[#FFCB05] bg-clip-text text-transparent"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                Hộp bí ẩn
                                <Sparkles className="w-6 h-6 text-[#FFCB05]" />
                            </h3>
                            <p
                                className="text-gray-700"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Mua hộp, mở thẻ ngẫu nhiên — giá trị thẻ có thể cao hơn giá mua!
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/mystery-box/history')}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[#D4AF37]/40 text-sm font-semibold text-[#D4AF37] bg-white/5 hover:bg-[#D4AF37]/10 transition-colors"
                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                    >
                        <Star className="w-4 h-4 mr-2" />
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
                            className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-2xl shadow-[0_0_20px_rgba(160,32,240,0.2)] overflow-hidden border-2 border-[#D4AF37]/30 hover:border-[#A020F0] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] group"
                        >
                            <div className={`bg-gradient-to-br ${BOX_GRADIENT} p-8 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <img
                                            src={box.imageUrl || defaultBoxImage}
                                            alt={box.name}
                                            className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.5)] group-hover:scale-110"
                                            onError={(e) => { (e.target as HTMLImageElement).src = defaultBoxImage; }}
                                        />
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
                                            className="text-[#E0E0E0]/90 mb-4 text-lg"
                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                        >
                                            {box.description || 'Mở 1 thẻ ngẫu nhiên từ hộp.'}
                                        </p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <span
                                                className="text-4xl font-bold text-[#D4AF37]"
                                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                            >
                                                {getBoxPrice(box).toLocaleString('vi-VN')}₫
                                            </span>
                                            <span className="text-[#E0E0E0]/70">/ 1 lần mở</span>
                                        </div>
                                        {boxProbabilities[box.blindBoxId]?.length > 0 && (
                                            <div className="bg-[#0B0112]/40 backdrop-blur-sm rounded-lg p-3 mb-4 border border-[#D4AF37]/20">
                                                <p className="text-[#D4AF37] font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                                                    <Zap className="w-4 h-4" />
                                                    Tỷ lệ độ hiếm
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {boxProbabilities[box.blindBoxId].map(({ rarity, probability }) => (
                                                        <span
                                                            key={rarity}
                                                            className={`text-xs px-2.5 py-1 rounded-full border ${getRarityColor(rarity)}`}
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
                                                Hết hàng — Liên hệ admin để nạp thêm
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
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
                                                    className="w-full md:w-auto px-6 py-3 rounded-full font-semibold text-sm border-2 border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                >
                                                    Mở 10 thẻ
                                                </button>
                                                <button
                                                    onClick={() => openBox(box, 'ALL')}
                                                    className="w-full md:w-auto px-6 py-3 rounded-full font-semibold text-sm border-2 border-[#A020F0]/60 text-[#A020F0] hover:bg-[#A020F0]/10"
                                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                                >
                                                    Mua hết hộp
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

            {/* Interactive Bag */}
            {showInteractiveBag && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden select-none">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 bg-[#D4AF37] rounded-full"
                                style={{
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 3}s`,
                                    animationDuration: `${1 + Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10">
                        <div className="text-center mb-8">
                            <h4
                                className="text-3xl font-bold text-[#D4AF37] mb-3 flex items-center gap-3 justify-center"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                <Sparkles className="w-8 h-8 text-[#A020F0]" />
                                Chạm hoặc kéo túi để xé!
                                <Sparkles className="w-8 h-8 text-[#A020F0]" />
                            </h4>
                            <p
                                className="text-[#E0E0E0]/80 text-lg"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Click vào túi hoặc kéo mạnh để mở
                            </p>
                            {tearProgress > 0 && tearProgress < 80 && (
                                <p
                                    className="text-[#D4AF37] font-semibold mt-2"
                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                >
                                    Tiếp tục kéo... {Math.round(tearProgress)}%
                                </p>
                            )}
                        </div>

                        <div className="flex justify-center items-center min-h-[400px]">
                            <div
                                className="relative cursor-pointer touch-none"
                                onClick={handleBagClick}
                                onMouseDown={handleDragStart}
                                onMouseMove={handleDragMove}
                                onMouseUp={handleDragEnd}
                                onMouseLeave={handleDragEnd}
                                onTouchStart={handleDragStart}
                                onTouchMove={handleDragMove}
                                onTouchEnd={handleDragEnd}
                                style={{
                                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.15}deg) scale(${1 + tearProgress / 300})`,
                                    transition: dragStart ? 'none' : 'transform 0.3s '
                                }}
                            >
                                {tearProgress > 20 && (
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${BOX_GRADIENT} rounded-3xl blur-2xl opacity-60`}
                                        style={{
                                            transform: `translate(${-dragOffset.x * 0.5}px, ${-dragOffset.y * 0.5}px)`,
                                        }}
                                    />
                                )}

                                <div
                                    className={`w-80 h-80 bg-gradient-to-br ${BOX_GRADIENT} rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(160,32,240,0.5)] relative border-4 border-[#D4AF37]/30 overflow-hidden`}
                                    style={{
                                        filter: `brightness(${1 + tearProgress / 150})`,
                                    }}
                                >
                                    <img
                                        src={selectedBox?.imageUrl || defaultBoxImage}
                                        alt={selectedBox?.name ?? ''}
                                        className="w-full h-full object-cover"
                                    />

                                    <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>

                                    {tearProgress > 30 && (
                                        <>
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/50"
                                                    style={{
                                                        width: '2px',
                                                        height: `${tearProgress * 1.2}%`,
                                                        top: '0',
                                                        left: `${20 + i * 15}%`,
                                                        transform: `rotate(${-10 + i * 5}deg)`,
                                                        opacity: tearProgress / 100
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}

                                    {tearProgress > 0 && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            {[...Array(8)].map((_, i) => (
                                                <Sparkles
                                                    key={i}
                                                    className="absolute w-6 h-6 text-[#D4AF37]"
                                                    style={{
                                                        top: `${10 + (i % 4) * 25}%`,
                                                        left: `${10 + Math.floor(i / 4) * 70}%`,
                                                        animationDelay: `${i * 0.15}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {tearProgress > 0 && (
                                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-56">
                                        <div className="h-4 bg-[#0B0112] rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] relative"
                                                style={{ width: `${tearProgress}%` }}
                                            >
                                                <div className="h-full bg-white/40"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-center mt-16 space-y-3">
                            <div
                                className="flex items-center justify-center gap-8 text-[#E0E0E0]/80"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-[#1a0a2e] border border-[#D4AF37]/30 rounded-full flex items-center justify-center text-xl">
                                        👆
                                    </div>
                                    <span>Click để xé</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-[#1a0a2e] border border-[#D4AF37]/30 rounded-full flex items-center justify-center text-xl">
                                        👉
                                    </div>
                                    <span>Hoặc kéo mạnh</span>
                                </div>
                            </div>
                            <button
                                onClick={resetBox}
                                className="px-6 py-2 bg-[#1a0a2e] hover:bg-[#0B0112] text-[#E0E0E0] border border-[#D4AF37]/30 rounded-lg "
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Opening Animation */}
            {isTearing && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-80 h-96">
                            {/* Main Bag Body */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className={`absolute w-80 h-96 bg-gradient-to-br ${BOX_GRADIENT} rounded-3xl border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] overflow-hidden`}
                                    style={{
                                        opacity: Math.max(0, 1 - (tearProgress / 70)),
                                    }}
                                >
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedBox?.imageUrl || defaultBoxImage}
                                            alt=""
                                            className="w-80 h-96 object-cover"
                                        />
                                    </div>
                                </div>

                                {/* Opening Top Flap - Left */}
                                <div
                                    className={`absolute w-40 h-20 bg-gradient-to-br ${BOX_GRADIENT} border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] overflow-hidden`}
                                    style={{
                                        top: '0',
                                        left: '50%',
                                        marginLeft: '-160px',
                                        transformOrigin: 'bottom right',
                                        transform: `rotateZ(${-tearProgress * 0.8}deg) translateX(${-tearProgress * 0.5}px)`,
                                        opacity: tearProgress > 10 ? 1 : 0,
                                        borderRadius: '24px 0 0 0',
                                    }}
                                >
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedBox?.imageUrl || defaultBoxImage}
                                            alt=""
                                            className="w-80 h-96 object-cover"
                                            style={{ transform: 'translateX(80px) translateY(188px)' }}
                                        />
                                    </div>
                                </div>

                                {/* Opening Top Flap - Right */}
                                <div
                                    className={`absolute w-40 h-20 bg-gradient-to-br ${BOX_GRADIENT} border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] overflow-hidden`}
                                    style={{
                                        top: '0',
                                        right: '50%',
                                        marginRight: '-160px',
                                        transformOrigin: 'bottom left',
                                        transform: `rotateZ(${tearProgress * 0.8}deg) translateX(${tearProgress * 0.5}px)`,
                                        opacity: tearProgress > 10 ? 1 : 0,
                                        borderRadius: '0 24px 0 0',
                                    }}
                                >
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedBox?.imageUrl || defaultBoxImage}
                                            alt=""
                                            className="w-80 h-96 object-cover"
                                            style={{ transform: 'translateX(-80px) translateY(188px)' }}
                                        />
                                    </div>
                                </div>

                                {/* Rope/String Effect */}
                                {tearProgress > 5 && (
                                    <>
                                        <div
                                            className="absolute w-1 bg-gradient-to-b from-[#D4AF37] to-transparent"
                                            style={{
                                                top: `-${tearProgress * 2}px`,
                                                left: 'calc(50% - 20px)',
                                                height: `${Math.min(tearProgress * 3, 100)}px`,
                                                opacity: Math.max(0, 1 - (tearProgress / 50)),
                                            }}
                                        />
                                        <div
                                            className="absolute w-1 bg-gradient-to-b from-[#D4AF37] to-transparent"
                                            style={{
                                                top: `-${tearProgress * 2}px`,
                                                left: 'calc(50% + 20px)',
                                                height: `${Math.min(tearProgress * 3, 100)}px`,
                                                opacity: Math.max(0, 1 - (tearProgress / 50)),
                                            }}
                                        />
                                    </>
                                )}

                                {/* Light Beam from Opening */}
                                {tearProgress > 30 && (
                                    <div
                                        className="absolute top-0 left-1/2 transform -translate-x-1/2"
                                        style={{
                                            width: `${tearProgress * 3}px`,
                                            height: `${tearProgress * 4}px`,
                                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(212,175,55,0.4), transparent)',
                                            opacity: Math.max(0, 0.9 - (tearProgress / 80)),
                                            filter: 'blur(10px)',
                                        }}
                                    />
                                )}
                            </div>

                            {/* Sparkles bursting from opening */}
                            <div className="absolute inset-0 pointer-events-none">
                                {[...Array(20)].map((_, i) => {
                                    const angle = -90 + (i * 10) - 100; // Spread upward and outward
                                    const distance = 80 + (tearProgress / 100) * 150;
                                    const x = Math.cos((angle * Math.PI) / 180) * distance;
                                    const y = Math.sin((angle * Math.PI) / 180) * distance;

                                    return (
                                        <Sparkles
                                            key={i}
                                            className="absolute w-6 h-6 text-[#D4AF37] "
                                            style={{
                                                top: '10%',
                                                left: '50%',
                                                transform: tearProgress > 20
                                                    ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${tearProgress * 5}deg) scale(${Math.min(tearProgress / 40, 1)})`
                                                    : 'translate(-50%, -50%) scale(0)',
                                                opacity: tearProgress > 20 ? Math.max(0, 1 - (tearProgress / 70)) : 0,
                                                filter: `drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))`
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Confetti shooting up from bag */}
                            <div className="absolute inset-0 pointer-events-none">
                                {[...Array(30)].map((_, i) => {
                                    const spreadAngle = -90 + ((i % 10) - 5) * 8; // Upward cone
                                    const distance = 60 + (tearProgress / 100) * (100 + Math.random() * 80);
                                    const x = Math.cos((spreadAngle * Math.PI) / 180) * distance;
                                    const y = Math.sin((spreadAngle * Math.PI) / 180) * distance;
                                    const colors = ['bg-[#D4AF37]', 'bg-[#A020F0]', 'bg-[#FFD700]', 'bg-[#E040FB]', 'bg-white'];
                                    const color = colors[Math.floor(Math.random() * colors.length)];

                                    return (
                                        <div
                                            key={i}
                                            className={`absolute w-2 h-2 ${color} rounded-full`}
                                            style={{
                                                top: '10%',
                                                left: '50%',
                                                transform: tearProgress > 30
                                                    ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${Math.random() * 360}deg)`
                                                    : 'translate(-50%, -50%) scale(0)',
                                                opacity: tearProgress > 30 ? Math.max(0, 1 - (tearProgress / 60)) : 0,
                                                transition: `all ${0.4 + Math.random() * 0.3}s `,
                                                boxShadow: tearProgress > 30 ? `0 0 10px currentColor` : 'none'
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Glow effect */}
                            {tearProgress > 20 && (
                                <div
                                    className="absolute top-0 left-1/2 transform -translate-x-1/2 rounded-full"
                                    style={{
                                        width: `${tearProgress * 3}px`,
                                        height: `${tearProgress * 3}px`,
                                        background: 'radial-gradient(circle, rgba(255,255,255,0.8), rgba(212,175,55,0.4), transparent)',
                                        opacity: Math.max(0, 0.7 - (tearProgress / 60)),
                                        filter: 'blur(20px)',
                                    }}
                                />
                            )}
                        </div>

                        <h4
                            className="text-2xl font-bold text-[#D4AF37]"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            {isBuying ? 'Đang mua & mở thẻ...' : 'Đang mở túi...'}
                        </h4>
                    </div>
                </div>
            )}

            {/* Cards Flying Animation */}
            {isCardsFlying && openedCards.length > 0 && (
                <div className="bg-gradient-to-br from-[#0B0112] to-[#1a0a2e] rounded-2xl p-12 shadow-[0_0_50px_rgba(160,32,240,0.4)] border-4 border-[#D4AF37] relative overflow-hidden min-h-[600px]">
                    <div className="relative w-full h-[500px]">
                        {openedCards.map((card, index) => {
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
                                                {card.value.toLocaleString('vi-VN')}₫
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
                                Giá trị thẻ: {totalValue.toLocaleString('vi-VN')}₫
                            </p>
                            {lastDrawResult != null && (
                                <>
                                    <p
                                        className="text-lg mb-1 text-white/90"
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        Giá đã trả: {Number(lastDrawResult.drawPrice).toLocaleString('vi-VN')}₫
                                    </p>
                                    <p
                                        className={`text-lg font-bold ${lastDrawResult.profitOrLoss >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}
                                        style={{ fontFamily: "'Open Sans', sans-serif" }}
                                    >
                                        {lastDrawResult.profitOrLoss >= 0 ? 'Lời' : 'Lỗ'}: {Math.abs(lastDrawResult.profitOrLoss).toLocaleString('vi-VN')}₫
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
                                        {card.value.toLocaleString('vi-VN')}₫
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
