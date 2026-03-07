import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus,
    Search,
    Trash2,
    Package,
    Gift,
    DollarSign,
    X,
    Eye,
    Percent,
    ShoppingBag,
    Grid,
    Check,
    AlertCircle
} from 'lucide-react';
import { blindBoxApi, cardApi, categoryApi, rateConfigApi, BlindBox, BlindBoxCardInBox, Card as CardType, BlindBoxProbability, Category, RateConfig, getCardImageUrl } from '@/utils/api';

export const AdminBlindBoxesPage: React.FC = () => {
    // --- State: List View ---
    const [searchQuery, setSearchQuery] = useState('');
    const [blindBoxes, setBlindBoxes] = useState<BlindBox[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // --- State: Create/Edit View ---
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newBox, setNewBox] = useState({
        name: '',
        description: '',
        imageUrl: '',
        cardIds: [] as string[],
    });

    // --- State: Card Selection ---
    const [availableCards, setAvailableCards] = useState<CardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRarity, setSelectedRarity] = useState<string>('all');
    const [rateConfigs, setRateConfigs] = useState<RateConfig[]>([]);

    // --- State: Details View ---
    const [viewingBox, setViewingBox] = useState<BlindBox | null>(null);
    const [boxCards, setBoxCards] = useState<BlindBoxCardInBox[]>([]);
    const [boxProbabilities, setBoxProbabilities] = useState<BlindBoxProbability[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const formatCurrencyVND = (value: number) => {
        const safe = Number.isFinite(value) ? value : 0;
        return safe.toLocaleString('vi-VN') + ' VND';
    };

    // --- Load Data ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [boxes, cards, cats, configs] = await Promise.all([
                blindBoxApi.getAllBlindBoxes(),
                cardApi.getAllCards(),
                categoryApi.getAllCategories(),
                rateConfigApi.getAllRateConfigs().catch(() => []),
            ]);

            const mappedBoxes = boxes.map((item: any) => ({
                ...item,
                blindBoxId: item.blindBoxId || item.id
            }));

            setBlindBoxes(mappedBoxes);
            setAvailableCards(cards);
            setCategories(cats);
            setRateConfigs(Array.isArray(configs) ? configs : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers: Create Box ---
    const handleCreateBox = async () => {
        // Validation
        if (!newBox.name.trim()) {
            alert('Vui lòng nhập tên hộp bí ẩn.');
            return;
        }
        if (newBox.cardIds.length === 0) {
            alert('Vui lòng chọn ít nhất một thẻ cho hộp bí ẩn.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: newBox.name,
                description: newBox.description,
                imageUrl: newBox.imageUrl || undefined,
                cardIds: newBox.cardIds,
            };

            await blindBoxApi.createBlindBox(payload);

            // Reset and reload
            setNewBox({
                name: '',
                description: '',
                imageUrl: '',
                cardIds: [],
            });
            setIsCreating(false);
            await loadData(); // Reload all data to refresh list
            alert('Đã tạo hộp bí ẩn thành công!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Tạo hộp bí ẩn thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCardSelection = (cardId: string) => {
        setNewBox(prev => {
            const isSelected = prev.cardIds.includes(cardId);
            return {
                ...prev,
                cardIds: isSelected
                    ? prev.cardIds.filter(id => id !== cardId)
                    : [...prev.cardIds, cardId]
            };
        });
    };

    const toggleSelectAllFilteredCards = () => {
        const filteredIds = filteredCards.map(c => c.cardId);
        const allSelected = filteredIds.every(id => newBox.cardIds.includes(id));
        setNewBox(prev => ({
            ...prev,
            cardIds: allSelected
                ? prev.cardIds.filter(id => !filteredIds.includes(id))
                : [...new Set([...prev.cardIds, ...filteredIds])]
        }));
    };

    // --- Handlers: Delete Box ---
    const handleDeleteBox = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn xóa hộp bí ẩn này?')) return;

        try {
            await blindBoxApi.deleteBlindBox(id);
            // Optimistic update
            setBlindBoxes(prev => prev.filter(b => b.blindBoxId !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Xóa hộp bí ẩn thất bại');
            loadData(); // Revert on failure
        }
    };

    // --- Handlers: View Details ---
    const handleViewDetails = async (box: BlindBox) => {
        setViewingBox(box);
        setIsLoadingDetails(true);
        try {
            // Fetch cards and probabilities in parallel
            const [cards, probs] = await Promise.all([
                blindBoxApi.getBlindBoxCards(box.blindBoxId).catch(() => []),
                blindBoxApi.getBlindBoxProbabilities(box.blindBoxId).catch(() => [])
            ]);
            setBoxCards(Array.isArray(cards) ? cards : []);
            setBoxProbabilities(Array.isArray(probs) ? probs : []);
        } catch (err) {
            console.error('Failed to load box details:', err);
            setBoxCards([]);
            setBoxProbabilities([]);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // --- Filtering ---
    const filteredBoxes = blindBoxes.filter(box =>
        box.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        box.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCards = availableCards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(cardSearchQuery.toLowerCase());

        let matchesCategory = true;
        if (selectedCategory !== 'all') {
            const catName = categories.find(c => c.categoryId === selectedCategory)?.categoryName;
            matchesCategory = card.categoryName === catName;
        }

        let matchesRarity = true;
        if (selectedRarity !== 'all') {
            matchesRarity = card.rarity === selectedRarity;
        }

        return matchesSearch && matchesCategory && matchesRarity;
    });

    // --- UI Helpers ---
    const getBoxPrice = (box: BlindBox): number => {
        const p = box?.drawPrice;
        if (p == null) return 0;
        const n = typeof p === 'string' ? parseFloat(p) : Number(p);
        return Number.isFinite(n) ? n : 0;
    };

    const getAllBoxPrice = (box: BlindBox): number => {
        const p = box?.allBoxPrice;
        if (p == null) return 0;
        const n = typeof p === 'string' ? parseFloat(p) : Number(p);
        return Number.isFinite(n) ? n : 0;
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'COMMON': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
            case 'UNCOMMON': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'RARE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'ULTRA_RARE': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'SUPER_RARE': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'SECRET_RARE': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-muted-foreground bg-white/5 border-white/10';
        }
    };

    /** Tỷ lệ dự kiến theo Rate Config khi chọn thẻ (cùng công thức BE). */
    const getRatePreviewFromSelection = (): { rarity: string; probability: number; cardCount: number; ratePerCard: number }[] => {
        const selectedCards = availableCards.filter(c => newBox.cardIds.includes(c.cardId));
        if (selectedCards.length === 0 || rateConfigs.length === 0) return [];
        const activeRarities = new Set(selectedCards.map(c => (c.rarity || 'COMMON').toUpperCase()));
        const totalActiveWeight = rateConfigs
            .filter(rc => activeRarities.has((rc.rarity || '').toUpperCase()))
            .reduce((sum, rc) => sum + (rc.rate || 0), 0);
        if (totalActiveWeight <= 0) return [];
        const countByRarity: Record<string, number> = {};
        selectedCards.forEach(c => {
            const r = (c.rarity || 'COMMON').toUpperCase();
            countByRarity[r] = (countByRarity[r] || 0) + 1;
        });
        const configByRarity: Record<string, RateConfig> = {};
        rateConfigs.forEach(rc => { configByRarity[(rc.rarity || '').toUpperCase()] = rc; });
        return Array.from(activeRarities).map(rarity => {
            const config = configByRarity[rarity];
            const dropRate = config ? (config.rate || 0) : 0;
            const probability = totalActiveWeight > 0 ? (dropRate / totalActiveWeight) * 100 : 0;
            const cardCount = countByRarity[rarity] || 0;
            const ratePerCard = cardCount > 0 ? probability / cardCount : 0;
            return { rarity, probability, cardCount, ratePerCard };
        }).filter(x => x.cardCount > 0).sort((a, b) => b.probability - a.probability);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text flex items-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-primary-400" />
                        Quản lý hộp bí ẩn
                    </h1>
                    <p className="text-muted-foreground mt-1">Tạo và quản lý hộp bí ẩn cho cửa hàng.</p>
                </div>
                {!isCreating && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        variant="premium"
                        className="shadow-lg shadow-primary-500/20"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Tạo hộp mới
                    </Button>
                )}
            </div>

            {/* --- Error Display --- */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* --- Main Content Area --- */}
            {isCreating ? (
                // === CREATE MODE ===
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] overflow-hidden">
                    {/* Left: Box Configuration Form */}
                    <Card className="lg:col-span-4 glass-card-strong flex flex-col h-full overflow-hidden border-primary-500/30">
                        <CardHeader className="border-b border-white/10 bg-white/5 pb-4">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl">Cấu hình hộp</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <CardDescription>Nhập thông tin cho hộp bí ẩn mới.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-200">Tên hộp</label>
                                    <Input
                                        placeholder="Ví dụ: Hộp Rồng Huyền Thoại"
                                        value={newBox.name}
                                        onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
                                        className="glass-card bg-black/40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-200">URL ảnh (tùy chọn)</label>
                                    <Input
                                        placeholder="https://..."
                                        value={newBox.imageUrl}
                                        onChange={(e) => setNewBox({ ...newBox, imageUrl: e.target.value })}
                                        className="glass-card bg-black/40"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-200">Mô tả</label>
                                    <Textarea
                                        placeholder="Mô tả nội dung hộp bí ẩn..."
                                        rows={4}
                                        value={newBox.description}
                                        onChange={(e) => setNewBox({ ...newBox, description: e.target.value })}
                                        className="glass-card bg-black/40 resize-none"
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-sm">
                                    <span className="text-muted-foreground">Giá trị cơ bản ước tính:</span>
                                    <span className="font-bold text-accent-400">
                                        {formatCurrencyVND(
                                            availableCards
                                                .filter(c => newBox.cardIds.includes(c.cardId))
                                                .reduce((sum, c) => sum + (c.basePrice || 0), 0)
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Selection Summary */}
                            <div className="mt-8 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                <h3 className="font-semibold text-primary-300 mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Tóm tắt lựa chọn
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Số thẻ đã chọn:</span>
                                        <span className="font-bold">{newBox.cardIds.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tổng giá trị ước tính:</span>
                                        <span className="font-bold text-accent-400">
                                            {formatCurrencyVND(
                                                availableCards
                                                    .filter(c => newBox.cardIds.includes(c.cardId))
                                                    .reduce((sum, c) => sum + (c.basePrice || 0), 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tỷ lệ dự kiến (Rate Config) — tính ngay khi chọn thẻ */}
                            {newBox.cardIds.length > 0 && (
                                <div className="mt-4 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
                                    <h3 className="font-semibold text-accent-300 mb-2 flex items-center gap-2">
                                        <Percent className="h-4 w-4" />
                                        Tỷ lệ dự kiến (Rate Config BE)
                                    </h3>
                                    {rateConfigs.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Chưa có cấu hình tỷ lệ. Vào Rate Configs để thêm.</p>
                                    ) : getRatePreviewFromSelection().length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Không có Rarity trùng với Rate Config. Kiểm tra card_rarity trong bảng RateConfig.</p>
                                    ) : (
                                        <div className="space-y-2 text-sm">
                                            {getRatePreviewFromSelection().map(({ rarity, probability, cardCount, ratePerCard }) => (
                                                <div key={rarity} className={`flex justify-between items-center py-1.5 px-2 rounded-lg border ${getRarityColor(rarity)}`}>
                                                    <span className="font-medium">{rarity}</span>
                                                    <span className="tabular-nums">
                                                        {probability.toFixed(1)}% nhóm · {cardCount} thẻ · {ratePerCard.toFixed(2)}%/thẻ
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <div className="p-4 border-t border-white/10 bg-white/5">
                            <Button
                                className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white shadow-lg shadow-primary-500/25"
                                size="lg"
                                onClick={handleCreateBox}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang tạo...' : 'Tạo hộp bí ẩn'}
                            </Button>
                        </div>
                    </Card>

                    {/* Right: Card Selector */}
                    <div className="lg:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
                        {/* Filters */}
                        <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm thẻ theo tên..."
                                    value={cardSearchQuery}
                                    onChange={(e) => setCardSearchQuery(e.target.value)}
                                    className="pl-9 glass-card bg-black/40 border-white/10"
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full sm:w-[200px] px-4 py-2 glass-card rounded-lg text-sm bg-black/60 border-white/10 focus:ring-primary-500/50"
                            >
                                <option value="all">Tất cả danh mục</option>
                                {categories.map((cat) => (
                                    <option key={cat.categoryId} value={cat.categoryId}>
                                        {cat.categoryName}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedRarity}
                                onChange={(e) => setSelectedRarity(e.target.value)}
                                className="w-full sm:w-[200px] px-4 py-2 glass-card rounded-lg text-sm bg-black/60 border-white/10 focus:ring-primary-500/50"
                            >
                                <option value="all">Tất cả độ hiếm</option>
                                <option value="COMMON">Thường</option>
                                <option value="UNCOMMON">Hiếm nhẹ</option>
                                <option value="RARE">Hiếm</option>
                                <option value="ULTRA_RARE">Cực hiếm</option>
                                <option value="SUPER_RARE">Siêu hiếm</option>
                                <option value="SECRET_RARE">Bí mật</option>
                            </select>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAllFilteredCards}
                                disabled={filteredCards.length === 0}
                                className="whitespace-nowrap border-primary-500/30 text-primary-300 hover:bg-primary-500/20 hover:text-primary-200"
                            >
                                {filteredCards.length > 0 && filteredCards.every(c => newBox.cardIds.includes(c.cardId))
                                    ? 'Bỏ chọn tất cả'
                                    : 'Chọn tất cả'}
                            </Button>
                        </div>

                        {/* Card Grid */}
                        <div className="flex-1 overflow-y-auto glass-card rounded-xl p-4 border border-white/10 bg-black/20">
                            {filteredCards.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                    <Search className="h-12 w-12 mb-2" />
                                    <p>Không tìm thấy thẻ phù hợp</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredCards.map(card => {
                                        const isSelected = newBox.cardIds.includes(card.cardId);
                                        return (
                                            <div
                                                key={card.cardId}
                                                onClick={() => toggleCardSelection(card.cardId)}
                                                className={`
                                                    group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-[1.02]
                                                    border-2 ${isSelected ? 'border-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/5 hover:border-white/20'}
                                                    bg-gray-900/40 backdrop-blur-sm
                                                `}
                                            >
                                                {/* Selection Indicator */}
                                                <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-500 text-white' : 'bg-black/50 text-white/30 border border-white/20'}`}>
                                                    {isSelected && <Check className="w-4 h-4" />}
                                                </div>

                                                {/* Image */}
                                                <div className="aspect-[2/3] w-full bg-black/50 relative overflow-hidden">
                                                    <img
                                                        src={getCardImageUrl(card) || 'https://via.placeholder.com/200x300?text=No+Image'}
                                                        alt={card.name}
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                                                    />
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                                                            <div className="flex justify-between items-end">
                                                                <div className="text-white text-xs font-bold truncate pr-2">{card.name}</div>
                                                                <div className="text-accent-400 font-mono text-xs">
                                                                    {formatCurrencyVND(card.basePrice)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // === LIST MODE ===
                <div className="space-y-6">
                    {/* Stats or Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass-card-strong border-l-4 border-l-primary-500">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-primary-500/20 rounded-xl text-primary-400">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Tổng số hộp</span>
                                    <span className="text-2xl font-bold">{blindBoxes.length}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="glass-card-strong border-l-4 border-l-accent-500">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-accent-500/20 rounded-xl text-accent-400">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Giá cao nhất</span>
                                    <span className="text-2xl font-bold">
                                        {blindBoxes.length > 0
                                            ? formatCurrencyVND(Math.max(0, ...blindBoxes.map(b => getBoxPrice(b))))
                                            : formatCurrencyVND(0)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm hộp..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 glass-card"
                        />
                    </div>

                    {/* Grid of Boxes */}
                    {isLoading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse">Đang tải hộp bí ẩn...</div>
                    ) : filteredBoxes.length === 0 ? (
                        <div className="text-center py-20 glass-card rounded-xl border-dashed border-2 border-white/10">
                            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-medium">Chưa có hộp bí ẩn nào</h3>
                            <p className="text-muted-foreground mb-4">Bắt đầu bằng cách tạo hộp bí ẩn đầu tiên.</p>
                            <Button variant="premium" onClick={() => setIsCreating(true)}>Tạo hộp</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredBoxes.map((box) => (
                                <Card
                                    key={box.blindBoxId}
                                    className="group glass-card hover:border-primary-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col h-full"
                                >
                                    <div className="aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden flex items-center justify-center">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                        {box.imageUrl ? (
                                            <img
                                                src={box.imageUrl}
                                                alt={box.name}
                                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <Gift className="h-16 w-16 text-white/10 group-hover:text-primary-400/50 transition-colors transform group-hover:scale-110 duration-500" />
                                        )}

                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80" onClick={() => handleViewDetails(box)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={(e) => handleDeleteBox(box.blindBoxId, e)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-5 flex-1 flex flex-col">
                                        <h3 className="font-bold text-lg mb-1 truncate" title={box.name}>{box.name}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                            {box.description || 'Chưa có mô tả.'}
                                        </p>
                                        <div className="flex flex-col gap-1 pt-4 border-t border-white/10 mt-auto">
                                            <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Giá mở / lần</span>
                                    <span className="text-xl font-bold text-accent-400 font-mono">
                                        {formatCurrencyVND(getBoxPrice(box))}
                                    </span>
                                            </div>
                                            {getAllBoxPrice(box) > 0 && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Tổng giá trị hộp</span>
                                        <span className="font-mono text-primary-300">
                                            {formatCurrencyVND(getAllBoxPrice(box))}
                                        </span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- View Details Modal --- */}
            {viewingBox && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <Card className="glass-card-strong w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border-primary-500/20 shadow-2xl">
                        <CardHeader className="border-b border-white/10 flex-shrink-0 bg-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-serif">{viewingBox.name}</CardTitle>
                                    <p className="text-accent-400 font-bold text-xl mt-1">
                                        {formatCurrencyVND(getBoxPrice(viewingBox))}{' '}
                                        <span className="text-sm font-normal text-muted-foreground">/ lần mở</span>
                                    </p>
                                    {getAllBoxPrice(viewingBox) > 0 && (
                                        <p className="text-primary-300 text-sm mt-0.5">
                                            Tổng giá trị hộp: {formatCurrencyVND(getAllBoxPrice(viewingBox))}
                                        </p>
                                    )}
                                </div>
                                <Button variant="ghost" className="hover:bg-white/10" onClick={() => setViewingBox(null)}>
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            {isLoadingDetails ? (
                                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
                                    <p>Đang tải chi tiết hộp...</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-2">Mô tả</h3>
                                        <p className="text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                            {viewingBox.description || 'Chưa có mô tả.'}
                                        </p>
                                    </div>

                                    {/* Probabilities Section */}
                                    {(boxProbabilities?.length ?? 0) > 0 && (
                                        <div>
                                            <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                                                <Percent className="h-4 w-4" /> Tỷ lệ độ hiếm
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {(boxProbabilities ?? []).map((prob, idx) => (
                                                    <div key={idx} className={`p-4 rounded-xl border ${getRarityColor(prob.rarity)} flex flex-col items-center text-center`}>
                                                        <span className="text-xs font-bold opacity-70 mb-1">{prob.rarity}</span>
                                                        <span className="text-2xl font-black">{(Number(prob.probability ?? 0)).toFixed(1)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cards Grid */}
                                    <div>
                                        <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
                                            <Grid className="h-4 w-4" /> Thẻ trong hộp
                                        </h3>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            {(boxCards ?? []).filter(c => c.status).length} còn trong hộp · {(boxCards ?? []).filter(c => c.status === false).length} đã mở
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(boxCards ?? []).map((card, idx) => (
                                                <div key={card.cardId || card.blindBoxCardId || `card-${idx}`} className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                    {/* Badge "Đã mở" khi thẻ đã được mở ra khỏi hộp */}
                                                    {card.status === false && (
                                                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wide">
                                                            Đã mở
                                                        </div>
                                                    )}
                                                    <div className="aspect-[2/3]">
                                                        <img
                                                            src={getCardImageUrl(card) || card.imageUrl || 'https://via.placeholder.com/150?text=Card'}
                                                            alt={card.name || ''}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                                        <p className="text-xs font-bold text-white truncate">{card.name || '—'}</p>
                                                        <p className="text-[10px] text-gray-400">{card.rarity || '—'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
