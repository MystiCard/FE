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
import { blindBoxApi, cardApi, categoryApi, BlindBox, Card as CardType, BlindBoxProbability, Category } from '@/utils/api';
import { parse } from 'node:path';

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
        price: '',
        drawPrice: '',
        cardIds: [] as string[],
    });

    // --- State: Card Selection ---
    const [availableCards, setAvailableCards] = useState<CardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRarity, setSelectedRarity] = useState<string>('all');

    // --- State: Details View ---
    const [viewingBox, setViewingBox] = useState<BlindBox | null>(null);
    const [boxCards, setBoxCards] = useState<CardType[]>([]);
    const [boxProbabilities, setBoxProbabilities] = useState<BlindBoxProbability[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // --- Load Data ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [boxes, cards, cats] = await Promise.all([
                blindBoxApi.getAllBlindBoxes(),
                cardApi.getAllCards(),
                categoryApi.getAllCategories()
            ]);

            // Map 'id' to 'blindBoxId' if needed
            const mappedBoxes = boxes.map((item: any) => ({
                ...item,
                blindBoxId: item.blindBoxId || item.id
            }));

            setBlindBoxes(mappedBoxes);
            setAvailableCards(cards);
            setCategories(cats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers: Create Box ---
    const handleCreateBox = async () => {
        const price = parseFloat(newBox.price);
        const  drawPrice = parseFloat(newBox.drawPrice);

        // Validation
        if (!newBox.name.trim()) {
            alert('Please enter a name for the Blind Box.');
            return;
        }
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid price greater than 0.');
            return;
        }
        if (newBox.cardIds.length === 0) {
            alert('Please select at least one card for the Blind Box.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                name: newBox.name,
                description: newBox.description,
                price: price,
                drawPrice: drawPrice,
                cardIds: newBox.cardIds
            };

            await blindBoxApi.createBlindBox(payload);

            // Reset and reload
            setNewBox({
                name: '',
                description: '',
                price: '',
                drawPrice: '',
                cardIds: [],
            });
            setIsCreating(false);
            await loadData(); // Reload all data to refresh list
            alert('Blind Box created successfully!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create blind box');
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
        if (!confirm('Are you sure you want to delete this blind box?')) return;

        try {
            await blindBoxApi.deleteBlindBox(id);
            // Optimistic update
            setBlindBoxes(prev => prev.filter(b => b.blindBoxId !== id));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete blind box');
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
        const p = box?.price;
        const d = box?.drawPrice;
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* --- Header Section --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text flex items-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-primary-400" />
                        Quản lý hộp bí ẩn
                    </h1>
                    <p className="text-muted-foreground mt-1">Create and manage mystery blind boxes for your store.</p>
                </div>
                {!isCreating && (
                    <Button
                        onClick={() => setIsCreating(true)}
                        variant="premium"
                        className="shadow-lg shadow-primary-500/20"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create New Box
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
                                <CardTitle className="text-xl">Box Configuration</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <CardDescription>Set the details for your new mystery box.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-200">Box Name</label>
                                    <Input
                                        placeholder="e.g. Legendary Dragon Mystery Box"
                                        value={newBox.name}
                                        onChange={(e) => setNewBox({ ...newBox, name: e.target.value })}
                                        className="glass-card bg-black/40"
                                    />
                                </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Price:</span>
                                        <span className="font-bold text-accent-400">
                                            ${availableCards
                                                .filter(c => newBox.cardIds.includes(c.cardId))
                                                .reduce((sum, c) => sum + (c.basePrice*1.3 || 0), 0)
                                                .toFixed(2)}
                                        </span>
                                    </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-200">Description</label>
                                    <Textarea
                                        placeholder="What exciting treasures are hidden inside?"
                                        rows={4}
                                        value={newBox.description}
                                        onChange={(e) => setNewBox({ ...newBox, description: e.target.value })}
                                        className="glass-card bg-black/40 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Selection Summary */}
                            <div className="mt-8 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                <h3 className="font-semibold text-primary-300 mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Selection Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Selected Cards:</span>
                                        <span className="font-bold">{newBox.cardIds.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tổng giá trị ước tính:</span>
                                        <span className="font-bold text-accent-400">
                                            ${availableCards
                                                .filter(c => newBox.cardIds.includes(c.cardId))
                                                .reduce((sum, c) => sum + (c.basePrice || 0), 0)
                                                .toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
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
                                <option value="all">All Categories</option>
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
                                <option value="all">All Rarities</option>
                                <option value="COMMON">Common</option>
                                <option value="UNCOMMON">Uncommon</option>
                                <option value="RARE">Rare</option>
                                <option value="ULTRA_RARE">Ultra Rare</option>
                                <option value="SUPER_RARE">Super Rare</option>
                                <option value="SECRET_RARE">Secret Rare</option>
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
                                                        src={card.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image'}
                                                        alt={card.name}
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                                                        <div className="flex justify-between items-end">
                                                            <div className="text-white text-xs font-bold truncate pr-2">{card.name}</div>
                                                            <div className="text-accent-400 font-mono text-xs">${card.basePrice}</div>
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
                                    <span className="text-sm text-muted-foreground">Highest Price</span>
                                    <span className="text-2xl font-bold">
                                        ${blindBoxes.length > 0
                                            ? Math.max(0, ...blindBoxes.map(b => getBoxPrice(b))).toFixed(2)
                                            : '0.00'}
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
                            <h3 className="text-lg font-medium">No Blind Boxes Found</h3>
                            <p className="text-muted-foreground mb-4">Get started by creating your first mystery box.</p>
                            <Button variant="premium" onClick={() => setIsCreating(true)}>Create Box</Button>
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
                                        <Gift className="h-16 w-16 text-white/10 group-hover:text-primary-400/50 transition-colors transform group-hover:scale-110 duration-500" />

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
                                            {box.description || 'No description provided.'}
                                        </p>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
                                            <span className="text-2xl font-bold text-accent-400 font-mono">${getBoxPrice(box).toFixed(2)}</span>
                                            {/* Could add a badge for number of cards if available in list view */}
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
                                    <p className="text-accent-400 font-bold text-xl mt-1">${getBoxPrice(viewingBox).toFixed(2)}</p>
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
                                    <p>Opening the box details...</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-2">DESCRIPTION</h3>
                                        <p className="text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                            {viewingBox.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {/* Probabilities Section */}
                                    {(boxProbabilities?.length ?? 0) > 0 && (
                                        <div>
                                            <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                                                <Percent className="h-4 w-4" /> RARITY PROBABILITIES
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
                                        <h3 className="text-sm font-uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                                            <Grid className="h-4 w-4" /> INCLUDED CARDS
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(boxCards ?? []).map((card, idx) => (
                                                <div key={card.cardId || `card-${idx}`} className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                    <div className="aspect-[2/3]">
                                                        <img
                                                            src={card.imageUrl || 'https://via.placeholder.com/150?text=Card'}
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
