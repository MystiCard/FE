import { useState } from 'react';
import { Gift, Sparkles, Star, Zap } from 'lucide-react';

// Replaced Figma asset with local public image
const moonlightLillieImg = '/mystery.png';

type BoxType = {
    id: string;
    name: string;
    price: number;
    description: string;
    color: string;
    icon?: string;
    image?: string;
    rarity: {
        common: number;
        uncommon: number;
        rare: number;
        ultraRare: number;
        secretRare: number;
    };
};

type Card = {
    name: string;
    rarity: string;
    value: number;
    image: string;
    flipped: boolean;
};

const boxTypes: BoxType[] = [
    {
        id: 'moonlight',
        name: 'Moonlight Lillie Mystery Pack',
        price: 500000,
        description: '10 thẻ đặc biệt từ bộ sưu tập Moonlight Lillie - Khám phá điều kỳ diệu dưới ánh trăng!',
        color: 'from-[#3D7DCA] via-[#FFCB05] to-[#3D7DCA]',
        image: moonlightLillieImg,
        rarity: { common: 35, uncommon: 30, rare: 20, ultraRare: 12, secretRare: 3 },
    },
];

const cardPool: Card[] = [
    { name: 'Lillie Full Art', rarity: 'Secret Rare', value: 4200000, image: '🌙', flipped: false },
    { name: 'Cosmog Shiny', rarity: 'Ultra Rare', value: 1890000, image: '✨', flipped: false },
    { name: 'Lunala GX', rarity: 'Ultra Rare', value: 2100000, image: '🦇', flipped: false },
    { name: 'Solgaleo GX', rarity: 'Ultra Rare', value: 1950000, image: '🦁', flipped: false },
    { name: 'Nebby Promo', rarity: 'Rare', value: 680000, image: '☁️', flipped: false },
    { name: 'Moon Ball Trainer', rarity: 'Rare', value: 450000, image: '🌕', flipped: false },
    { name: 'Starry Night Stadium', rarity: 'Uncommon', value: 180000, image: '⭐', flipped: false },
    { name: 'Clefairy Holo', rarity: 'Uncommon', value: 120000, image: '🧚', flipped: false },
    { name: 'Alolan Vulpix', rarity: 'Common', value: 45000, image: '🦊', flipped: false },
    { name: 'Energy Card - Psychic', rarity: 'Common', value: 15000, image: '💜', flipped: false },
    { name: 'Lillie Supporter', rarity: 'Rare', value: 520000, image: '👧', flipped: false },
    { name: 'Twilight GX Attack', rarity: 'Ultra Rare', value: 1650000, image: '🌌', flipped: false },
    { name: 'Pokémon Center Lady', rarity: 'Uncommon', value: 95000, image: '🏥', flipped: false },
    { name: 'Ultra Ball Reverse', rarity: 'Common', value: 35000, image: '⚪', flipped: false },
];

export function MysteryBox() {
    const [selectedBox, setSelectedBox] = useState<BoxType | null>(null);
    const [isTearing, setIsTearing] = useState(false);
    const [openedCards, setOpenedCards] = useState<Card[]>([]);
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

    const getRarityColor = (rarity: string) => {
        const colors: { [key: string]: string } = {
            'Common': 'text-[#E0E0E0]/80 bg-[#E0E0E0]/20',
            'Uncommon': 'text-[#A020F0] bg-[#A020F0]/20',
            'Rare': 'text-[#D4AF37] bg-[#D4AF37]/20',
            'Ultra Rare': 'text-[#A020F0] bg-gradient-to-r from-[#A020F0]/30 to-[#D4AF37]/30',
            'Secret Rare': 'text-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/30 to-[#FFD700]/30',
        };
        return colors[rarity] || 'text-[#E0E0E0]/80 bg-[#E0E0E0]/20';
    };

    const generateRandomCards = (box: BoxType, count: number): Card[] => {
        const cards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const rand = Math.random() * 100;
            let selectedRarity = 'Common';

            if (rand < box.rarity.secretRare) {
                selectedRarity = 'Secret Rare';
            } else if (rand < box.rarity.secretRare + box.rarity.ultraRare) {
                selectedRarity = 'Ultra Rare';
            } else if (rand < box.rarity.secretRare + box.rarity.ultraRare + box.rarity.rare) {
                selectedRarity = 'Rare';
            } else if (rand < box.rarity.secretRare + box.rarity.ultraRare + box.rarity.rare + box.rarity.uncommon) {
                selectedRarity = 'Uncommon';
            }

            const availableCards = cardPool.filter(c => c.rarity === selectedRarity);
            if (availableCards.length > 0) {
                const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
                // Deep copy needed since we modify 'flipped'
                cards.push({ ...randomCard, flipped: false });
            }
        }
        return cards;
    };

    const openBox = (box: BoxType) => {
        setSelectedBox(box);
        setShowInteractiveBag(true);
        setShowResults(false);
        setCardsReady(false);
        setTearProgress(0);
        setDragOffset({ x: 0, y: 0 });
        setOpenedCards([]);
        setIsTearing(false);
    };

    const handleBagClick = () => {
        if (!showInteractiveBag || isTearing) return;

        setIsTearing(true);
        setShowInteractiveBag(false);
        setTearProgress(0);

        const tearInterval = setInterval(() => {
            setTearProgress(prev => {
                if (prev >= 100) {
                    clearInterval(tearInterval);
                    return 100;
                }
                return prev + 8;
            });
        }, 50);

        setTimeout(() => {
            clearInterval(tearInterval);
            setIsTearing(false);

            const cards = generateRandomCards(selectedBox!, 10);
            setOpenedCards(cards);

            setIsCardsFlying(true);

            setTimeout(() => {
                setIsCardsFlying(false);
                setCardsReady(true);
            }, 5000);
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
                    const total = newCards.reduce((sum, card) => sum + card.value, 0);
                    setTotalValue(total);
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
                const total = newCards.reduce((sum, card) => sum + card.value, 0);
                setTotalValue(total);
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
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-[#FFCB05]/20 rounded-full flex items-center justify-center border-2 border-[#FFCB05]/50">
                        <Gift className="w-7 h-7 text-[#3D7DCA]" />
                    </div>
                    <div>
                        <h3
                            className="font-bold text-2xl flex items-center gap-2 bg-gradient-to-r from-[#3D7DCA] to-[#FFCB05] bg-clip-text text-transparent"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            Moonlight Lillie Mystery Pack
                            <Sparkles className="w-6 h-6 text-[#FFCB05] animate-pulse" />
                        </h3>
                        <p
                            className="text-gray-700"
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            Khám phá những thẻ bài kỳ diệu dưới ánh trăng!
                        </p>
                    </div>
                </div>
            </div>

            {/* Box Selection */}
            {!selectedBox && !showInteractiveBag && !showResults && (
                <div className="grid grid-cols-1 gap-6">
                    {boxTypes.map((box) => (
                        <div
                            key={box.id}
                            className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-2xl shadow-[0_0_20px_rgba(160,32,240,0.2)] overflow-hidden border-2 border-[#D4AF37]/30 hover:border-[#A020F0] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all group"
                        >
                            <div className={`bg-gradient-to-br ${box.color} p-8 relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <img
                                            src={box.image}
                                            alt={box.name}
                                            className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.5)] group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="flex-1 text-white">
                                        <h4
                                            className="text-3xl font-bold mb-2 flex items-center gap-2"
                                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                        >
                                            {box.name}
                                            <Star className="w-7 h-7 text-[#D4AF37] animate-pulse" />
                                        </h4>
                                        <p
                                            className="text-[#E0E0E0]/90 mb-4 text-lg"
                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                        >
                                            {box.description}
                                        </p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <span
                                                className="text-4xl font-bold text-[#D4AF37]"
                                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                            >
                                                {box.price.toLocaleString('vi-VN')}₫
                                            </span>
                                        </div>
                                        <div className="bg-[#0B0112]/40 backdrop-blur-sm rounded-lg p-4 mb-4 border border-[#D4AF37]/20">
                                            <h5
                                                className="font-semibold mb-2 flex items-center gap-2 text-[#D4AF37]"
                                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                                            >
                                                <Zap className="w-5 h-5" />
                                                Tỷ lệ độ hiếm:
                                            </h5>
                                            <div
                                                className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm"
                                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                                            >
                                                <div className="bg-[#E0E0E0]/20 px-3 py-1 rounded border border-[#E0E0E0]/30">Common: {box.rarity.common}%</div>
                                                <div className="bg-[#A020F0]/20 px-3 py-1 rounded border border-[#A020F0]/30">Uncommon: {box.rarity.uncommon}%</div>
                                                <div className="bg-[#D4AF37]/20 px-3 py-1 rounded border border-[#D4AF37]/30">Rare: {box.rarity.rare}%</div>
                                                <div className="bg-[#A020F0]/30 px-3 py-1 rounded border border-[#A020F0]/50">Ultra Rare: {box.rarity.ultraRare}%</div>
                                                <div className="bg-[#D4AF37]/30 px-3 py-1 rounded border border-[#D4AF37]/50">Secret Rare: {box.rarity.secretRare}%</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openBox(box)}
                                            className="w-full md:w-auto bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0B0112] px-8 py-3 rounded-full font-bold text-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:scale-105 flex items-center gap-2 justify-center"
                                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                                        >
                                            <Gift className="w-6 h-6" />
                                            Mở Túi Ngay!
                                        </button>
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
                                className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
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
                                className="text-3xl font-bold text-[#D4AF37] mb-3 flex items-center gap-3 justify-center animate-pulse"
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
                                    className="text-[#D4AF37] font-semibold mt-2 animate-bounce"
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
                                    transition: dragStart ? 'none' : 'transform 0.3s ease-out'
                                }}
                            >
                                {tearProgress > 20 && (
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${selectedBox?.color} rounded-3xl blur-2xl opacity-60`}
                                        style={{
                                            transform: `translate(${-dragOffset.x * 0.5}px, ${-dragOffset.y * 0.5}px)`,
                                        }}
                                    />
                                )}

                                <div
                                    className={`w-80 h-80 bg-gradient-to-br ${selectedBox?.color} rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(160,32,240,0.5)] relative border-4 border-[#D4AF37]/30 overflow-hidden`}
                                    style={{
                                        filter: `brightness(${1 + tearProgress / 150})`,
                                    }}
                                >
                                    <img
                                        src={selectedBox?.image}
                                        alt={selectedBox?.name}
                                        className="w-full h-full object-cover"
                                    />

                                    <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-pulse"></div>

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
                                                    className="absolute w-6 h-6 text-[#D4AF37] animate-ping"
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
                                                className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] transition-all duration-150 relative"
                                                style={{ width: `${tearProgress}%` }}
                                            >
                                                <div className="h-full bg-white/40 animate-pulse"></div>
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
                                className="px-6 py-2 bg-[#1a0a2e] hover:bg-[#0B0112] text-[#E0E0E0] border border-[#D4AF37]/30 rounded-lg transition-colors"
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
                                    className={`absolute w-80 h-96 bg-gradient-to-br ${selectedBox?.color} rounded-3xl border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] transition-all duration-500 overflow-hidden`}
                                    style={{
                                        opacity: Math.max(0, 1 - (tearProgress / 70)),
                                    }}
                                >
                                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                        <img
                                            src={selectedBox?.image}
                                            alt=""
                                            className="w-80 h-96 object-cover"
                                        />
                                    </div>
                                </div>

                                {/* Opening Top Flap - Left */}
                                <div
                                    className={`absolute w-40 h-20 bg-gradient-to-br ${selectedBox?.color} border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] transition-all duration-700 overflow-hidden`}
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
                                            src={selectedBox?.image}
                                            alt=""
                                            className="w-80 h-96 object-cover"
                                            style={{ transform: 'translateX(80px) translateY(188px)' }}
                                        />
                                    </div>
                                </div>

                                {/* Opening Top Flap - Right */}
                                <div
                                    className={`absolute w-40 h-20 bg-gradient-to-br ${selectedBox?.color} border-4 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(160,32,240,0.5)] transition-all duration-700 overflow-hidden`}
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
                                            src={selectedBox?.image}
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
                                            className="absolute w-6 h-6 text-[#D4AF37] transition-all duration-500"
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
                                                transition: `all ${0.4 + Math.random() * 0.3}s ease-out`,
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
                            className="text-2xl font-bold text-[#D4AF37] animate-pulse"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                            Đang mở túi...
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
                                        animation: 'cardFly 5s ease-in-out forwards',
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
                            <Sparkles className="w-8 h-8 text-[#A020F0] animate-spin" />
                            Vuốt để lật thẻ!
                            <Sparkles className="w-8 h-8 text-[#A020F0] animate-spin" />
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
                                    transition: isFlipping ? 'all 0.6s ease-out' : cardDragStart ? 'none' : 'transform 0.3s ease-out',
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
                                            className="absolute w-6 h-6 text-[#D4AF37] animate-pulse"
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
                            className="px-6 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#FFD700] hover:to-[#D4AF37] text-[#0B0112] rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)]"
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
                                        className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-xl shadow-[0_0_20px_rgba(160,32,240,0.3)] overflow-hidden hover:scale-105 transition-transform border-2 border-[#D4AF37]/30 animate-slideInFromLeft"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="bg-gradient-to-br from-[#A020F0] to-[#D4AF37] p-6 text-center">
                                            <div className="text-6xl mb-2">{card.image}</div>
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
                                <Star className="w-8 h-8 animate-spin" />
                                Kết Quả Mở Túi!
                                <Star className="w-8 h-8 animate-spin" />
                            </h3>
                            <p
                                className="text-xl mb-4 text-white"
                                style={{ fontFamily: "'Open Sans', sans-serif" }}
                            >
                                Tổng giá trị: {totalValue.toLocaleString('vi-VN')}₫
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <span
                                    className="px-4 py-2 bg-white/20 rounded-lg text-white"
                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                >
                                    {openedCards.length} thẻ
                                </span>
                                <span
                                    className="px-4 py-2 bg-white/20 rounded-lg text-white"
                                    style={{ fontFamily: "'Open Sans', sans-serif" }}
                                >
                                    Lời: {(totalValue - (selectedBox?.price || 0)).toLocaleString('vi-VN')}₫
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {openedCards.map((card, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-b from-[#1a0a2e] to-[#0B0112] rounded-xl shadow-[0_0_20px_rgba(160,32,240,0.3)] overflow-hidden hover:scale-105 transition-transform border-2 border-[#D4AF37]/30"
                            >
                                <div className="bg-gradient-to-br from-[#A020F0] to-[#D4AF37] p-6 text-center">
                                    <div className="text-6xl mb-2">{card.image}</div>
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
                            className="px-8 py-3 bg-gradient-to-r from-[#A020F0] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#A020F0] text-white rounded-full font-bold text-lg shadow-[0_0_25px_rgba(160,32,240,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.5)] transition-all"
                            style={{ fontFamily: "'Open Sans', sans-serif" }}
                        >
                            Mở Túi Mới
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
