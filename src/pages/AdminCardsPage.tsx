import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package,
    DollarSign,
    TrendingUp,
    AlertCircle,
    X,
    Upload,
    FileSpreadsheet,
    Eye
} from 'lucide-react';
import { cardApi, categoryApi, Card as CardType, Category, getCardImageUrl, cardRequiredApi, CardRequired } from '@/utils/api';

export const AdminCardsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [cards, setCards] = React.useState<CardType[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [filterCategory, setFilterCategory] = React.useState<string>('all');
    const [filterRarity, setFilterRarity] = React.useState<string>('all');
    const [editingCard, setEditingCard] = React.useState<CardType | null>(null);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false); // Import modal state
    const [importFile, setImportFile] = React.useState<File | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const [detailCard, setDetailCard] = React.useState<CardType | null>(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [requests, setRequests] = React.useState<CardRequired[]>([]);
    const [reqNote, setReqNote] = React.useState<Record<string, string>>({});
    const [reqImageFile, setReqImageFile] = React.useState<Record<string, File | null>>({});
    const [reqProcessing, setReqProcessing] = React.useState<string | null>(null);
    const [cardPage, setCardPage] = React.useState(1);
    const cardPageSize = 15;

    // Reset card page when filters change
    React.useEffect(() => {
        setCardPage(1);
    }, [searchQuery, filterCategory, filterRarity]);

    // Helper to format rarity for display
    const formatRarity = (rarity: string) => {
        return rarity ? rarity.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
    };

    // Helper to format price in VND
    const formatCurrencyVND = (value: number) => {
        const safe = Number.isFinite(value) ? value : 0;
        return safe.toLocaleString('vi-VN') + ' đ';
    };

    const getFilteredCards = () => {
        return cards.filter(card => {
            const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());

            // Robust Category Matching
            let cardCatId: string | undefined = undefined;
            if (card.categoryName) {
                const foundCat = categories.find(c => c.categoryName.toLowerCase() === card.categoryName?.toLowerCase());
                if (foundCat) cardCatId = foundCat.categoryId;
            }
            const matchesCategory = filterCategory === 'all' || cardCatId === filterCategory;

            // Robust Rarity Matching
            const cardRarityNormalized = card.rarity ? card.rarity.toString().toUpperCase().replace(/ /g, '_') : '';
            const matchesRarity = filterRarity === 'all' || cardRarityNormalized === filterRarity;

            return matchesSearch && matchesCategory && matchesRarity;
        });
    };

    const filteredCards = getFilteredCards();
    const totalCardPages = Math.max(1, Math.ceil(filteredCards.length / cardPageSize));
    const currentCardPage = Math.min(cardPage, totalCardPages);
    const pagedCards = filteredCards.slice(
        (currentCardPage - 1) * cardPageSize,
        currentCardPage * cardPageSize
    );

    const buildCardPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalCardPages <= 7) {
            for (let i = 1; i <= totalCardPages; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        const left = Math.max(2, currentCardPage - 1);
        const right = Math.min(totalCardPages - 1, currentCardPage + 1);
        if (left > 2) pages.push('ellipsis');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalCardPages - 1) pages.push('ellipsis');
        pages.push(totalCardPages);
        return pages;
    };

    const [newCard, setNewCard] = React.useState({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        categoryId: '',
        rarity: 'COMMON' as 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE',
    });

    // Load cards and categories on mount
    React.useEffect(() => {
        loadCards();
        loadCategories();
        loadRequests();
    }, []);
    const loadRequests = async () => {
        try {
            const res = await cardRequiredApi.getAllRequiredCardsAdmin(0, 50);
            setRequests(res.content ?? []);
        } catch {
            setRequests([]);
        }
    };

    const loadCards = async () => {
        try {
            setIsLoading(true);
            const data = await cardApi.getAllCards();
            console.log('Loaded cards data:', data); // DEBUG: Check data structure
            setCards(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách thẻ');
        } finally {
            setIsLoading(false);
        }
    };

    /** Lấy ảnh để gửi khi duyệt: ưu tiên ảnh Admin chọn, không thì fetch từ imageUrl user đã gửi. */
    const getImageFileForApprove = async (r: CardRequired): Promise<File | undefined> => {
        const chosen = reqImageFile[r.cardRequiredId];
        if (chosen && chosen.size > 0) return chosen;
        if (!r.imageUrl || !r.imageUrl.startsWith('http')) return undefined;
        try {
            const res = await fetch(r.imageUrl, { mode: 'cors' });
            if (!res.ok) return undefined;
            const blob = await res.blob();
            const type = blob.type || 'image/png';
            return new File([blob], 'card-from-user.png', { type });
        } catch {
            return undefined;
        }
    };

    const approveRequest = async (r: CardRequired) => {
        setReqProcessing(r.cardRequiredId);
        try {
            const imageFile = await getImageFileForApprove(r);
            await cardRequiredApi.approveRequiredCard(
                r.cardRequiredId,
                reqNote[r.cardRequiredId] ?? null,
                imageFile
            );
            setReqImageFile((prev) => ({ ...prev, [r.cardRequiredId]: null }));
            await loadRequests();
            await loadCards();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Duyệt yêu cầu thất bại');
        } finally {
            setReqProcessing(null);
        }
    };

    const rejectRequest = async (r: CardRequired) => {
        setReqProcessing(r.cardRequiredId);
        try {
            await cardRequiredApi.rejectRequiredCard(r.cardRequiredId, reqNote[r.cardRequiredId] ?? null);
            await loadRequests();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Từ chối yêu cầu thất bại');
        } finally {
            setReqProcessing(null);
        }
    };
    const loadCategories = async () => {
        try {
            const data = await categoryApi.getAllCategories();
            setCategories(data);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    };

    const totalValue = cards.reduce((sum, card) => sum + (card.basePrice || 0), 0);
    const avgValue = cards.length > 0 ? totalValue / cards.length : 0;

    const stats = [
        {
            title: 'Tổng thẻ',
            value: cards.length.toString(),
            icon: Package,
            color: 'from-primary-500 to-primary-300',
            change: `${cards.length} thẻ`
        },
        {
            title: 'Tổng giá trị',
            value: formatCurrencyVND(totalValue),
            icon: DollarSign,
            color: 'from-accent-500 to-accent-300',
            change: 'Kho'
        },
        {
            title: 'Giá trung bình',
            value: cards.length > 0 ? formatCurrencyVND(avgValue) : '0 đ',
            icon: TrendingUp,
            color: 'from-secondary-500 to-secondary-300',
            change: 'Mỗi thẻ'
        },
        {
            title: 'Danh mục',
            value: new Set(cards.map(c => c.categoryName).filter(Boolean)).size.toString(),
            icon: AlertCircle,
            color: 'from-red-500 to-orange-500',
            change: 'Loại'
        },
    ];



    const handleAddCard = async () => {
        const normalizedPrice = newCard.price.toString().replace(/,/g, '.');
        const price = parseFloat(normalizedPrice);

        if (!newCard.name || isNaN(price)) {
            alert('Vui lòng nhập tên thẻ và giá hợp lệ');
            return;
        }

        try {
            const payload = {
                name: newCard.name,
                description: newCard.description || null,
                basePrice: price,
                imageUrl: newCard.imageUrl || null,
                categoryId: newCard.categoryId || null,
                rarity: newCard.rarity,
            };
            console.log('Creating Payload:', payload);
            await cardApi.createCard(payload);

            await loadCards();

            setIsAddModalOpen(false);
            setNewCard({
                name: '',
                description: '',
                price: '',
                imageUrl: '',
                categoryId: '',
                rarity: 'COMMON',
            });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Thêm thẻ thất bại');
        }
    };

    const handleEditCard = async () => {
        if (!editingCard) return;

        const normalizedPrice = newCard.price.toString().replace(/,/g, '.');
        const price = parseFloat(normalizedPrice);

        if (!newCard.name || isNaN(price)) {
            alert('Vui lòng nhập tên thẻ và giá hợp lệ');
            return;
        }

        try {
            const payload = {
                name: newCard.name,
                description: newCard.description || null,
                basePrice: price,
                imageUrl: newCard.imageUrl || null,
                categoryId: newCard.categoryId || null,
                rarity: newCard.rarity,
            };
            console.log('Sending Update Payload:', payload);

            const updatedCard = await cardApi.updateCard(editingCard.cardId, payload);

            console.log('Update response:', updatedCard);

            // Update local state immediately with response data
            if (updatedCard) {
                setCards(prev => prev.map(c => c.cardId === editingCard.cardId ? updatedCard : c));
            }

            // Also reload from server to be sure
            await loadCards();

            alert('Card updated successfully!');

            setEditingCard(null);
            setNewCard({
                name: '',
                description: '',
                price: '',
                imageUrl: '',
                categoryId: '',
                rarity: 'COMMON',
            });
        } catch (err) {
            console.error('Update failed:', err);
            alert(err instanceof Error ? err.message : 'Cập nhật thẻ thất bại');
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm('Are you sure you want to delete this card?')) return;

        try {
            await cardApi.deleteCard(cardId);
            await loadCards();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Xóa thẻ thất bại');
        }
    };

    const handleImportCards = async () => {
        if (!importFile) {
            alert('Vui lòng chọn file để nhập');
            return;
        }

        try {
            setIsImporting(true);
            await cardApi.importCards(importFile);
            await loadCards();
            setIsImportModalOpen(false);
            setImportFile(null);
            alert('Cards imported successfully!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Nhập thẻ thất bại');
        } finally {
            setIsImporting(false);
        }
    };

    const openEditModal = (card: CardType) => {
        setEditingCard(card);

        // Find category ID from name
        let catId = '';
        if (card.categoryName) {
            const found = categories.find(c => c.categoryName.toLowerCase() === card.categoryName?.toLowerCase());
            if (found) catId = found.categoryId;
        }

        setNewCard({
            name: card.name,
            description: card.description || '',
            price: card.basePrice.toString(),
            imageUrl: getCardImageUrl(card) || '',
            categoryId: catId,
            rarity: card.rarity,
        });
    };

    const openDetailModal = async (card: CardType) => {
        setDetailCard(card);
        setDetailLoading(true);
        try {
            const full = await cardApi.getCardById(card.cardId);
            setDetailCard(full);
        } catch {
            // Keep showing list data if fetch fails
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý thẻ</h1>
                    <p className="text-muted-foreground mt-1">Quản lý kho thẻ</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="h-4 w-4" />
                        Nhập thẻ
                    </Button>
                    <Button
                        variant="premium"
                        className="gap-2"
                        onClick={() => {
                            setEditingCard(null);
                            setNewCard({
                                name: '',
                                description: '',
                                price: '',
                                imageUrl: '',
                                categoryId: '',
                                rarity: 'COMMON',
                            });
                            setIsAddModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm thẻ mới
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="glass-card-strong ">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <span className="text-xs text-green-400 font-medium">{stat.change}</span>
                                </div>
                                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.title}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search and Filters */}
            <Card className="glass-card-strong">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                        >
                            <option value="all">Tất cả danh mục</option>
                            {categories.map((category) => (
                                <option key={category.categoryId} value={category.categoryId}>
                                    {category.categoryName}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterRarity}
                            onChange={(e) => setFilterRarity(e.target.value)}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer bg-black/60"
                        >
                            <option value="all">Tất cả độ hiếm</option>
                            <option value="COMMON">Thường</option>
                            <option value="UNCOMMON">Hiếm nhẹ</option>
                            <option value="RARE">Hiếm</option>
                            <option value="ULTRA_RARE">Cực hiếm</option>
                            <option value="SUPER_RARE">Siêu hiếm</option>
                            <option value="SECRET_RARE">Bí mật</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Seller Card Requests (Card Not In System) */}
            <Card className="glass-card-strong">
                <CardHeader className="pb-2">
                    <CardTitle>Yêu cầu thêm thẻ từ Seller</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Flow: Seller gửi yêu cầu → Admin duyệt → hệ thống cập nhật catalog → Seller đăng bán.
                    </p>
                </CardHeader>
                <CardContent>
                    {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                        <p className="text-sm text-muted-foreground">Không có yêu cầu nào đang chờ.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Ảnh</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Thẻ</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Danh mục</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Set</th>
                                        <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Giá base</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Người gửi</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Ảnh thẻ (khi duyệt)</th>
                                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Ghi chú</th>
                                        <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.filter(r => r.status === 'PENDING').map((r) => {
                                        const catName = r.categoryName || '—';
                                        return (
                                            <tr key={r.cardRequiredId} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3">
                                                    <div className="w-12 h-16 rounded-md overflow-hidden bg-white/5 border border-white/10">
                                                        {r.imageUrl ? (
                                                            <img
                                                                src={r.imageUrl}
                                                                alt={r.cardName}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.src =
                                                                        'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-lg">
                                                                🎴
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                        <div className="font-medium">{r.cardName}</div>
                                                        <div className="text-xs text-muted-foreground">{formatRarity(r.rate)}</div>
                                                </td>
                                                <td className="p-3 text-sm">{catName}</td>
                                                <td className="p-3 text-sm">{catName}</td>
                                                <td className="p-3 text-right font-semibold text-accent-400">
                                                    {formatCurrencyVND(r.basePrice)}
                                                </td>
                                                <td className="p-3 text-sm text-muted-foreground">
                                                    <div>{r.userName || '—'}</div>
                                                </td>
                                                <td className="p-3">
                                                    <label className="block">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                setReqImageFile((m) => ({ ...m, [r.cardRequiredId]: f ?? null }));
                                                            }}
                                                        />
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs cursor-pointer hover:bg-white/10">
                                                            <Upload className="h-3.5 w-3.5" />
                                                            {reqImageFile[r.cardRequiredId]
                                                                ? reqImageFile[r.cardRequiredId]!.name
                                                                : 'Chọn ảnh'}
                                                        </span>
                                                    </label>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        value={reqNote[r.cardRequiredId] ?? ''}
                                                        onChange={(e) => setReqNote((m) => ({ ...m, [r.cardRequiredId]: e.target.value }))}
                                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
                                                        placeholder="Ghi chú cho seller (optional)"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="premium"
                                                            disabled={reqProcessing === r.cardRequiredId}
                                                            onClick={() => approveRequest(r)}
                                                        >
                                                            {reqProcessing === r.cardRequiredId ? 'Đang duyệt...' : 'Duyệt'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={reqProcessing === r.cardRequiredId}
                                                            onClick={() => rejectRequest(r)}
                                                        >
                                                            Từ chối
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <span>Thẻ ({filteredCards.length})</span>
                        {filteredCards.length > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                Trang {currentCardPage}/{totalCardPages}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải thẻ...</div>
                        </div>
                    ) : filteredCards.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Chưa có thẻ nào. Thêm thẻ đầu tiên để bắt đầu!
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Thẻ</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Danh mục</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Độ hiếm</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Giá</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedCards.map((card) => (
                                        <tr key={card.cardId} className="border-b border-white/5 hover:bg-white/5 ">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={getCardImageUrl(card) || 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80'}
                                                        alt={card.name}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80';
                                                        }}
                                                    />
                                                    <div className="font-medium">{card.name}</div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">{card.categoryName || 'N/A'}</td>
                                            <td className="p-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${card.rarity === 'SECRET_RARE' ? 'bg-purple-500/20 text-purple-400' :
                                                    card.rarity === 'ULTRA_RARE' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        card.rarity === 'SUPER_RARE' ? 'bg-orange-500/20 text-orange-400' :
                                                            card.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                                                                card.rarity === 'UNCOMMON' ? 'bg-green-500/20 text-green-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {formatRarity(card.rarity)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-semibold text-accent-400">
                                                {formatCurrencyVND(card.basePrice)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openDetailModal(card)}
                                                        className="p-2 hover:bg-primary-500/20 rounded-md text-primary-400"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(card)}
                                                        className="p-2 hover:bg-primary-500/20 rounded-md text-primary-400"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCard(card.cardId)}
                                                        className="p-2 hover:bg-red-500/20 rounded-md text-red-400"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalCardPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full px-3 h-8 text-xs"
                                    disabled={currentCardPage === 1}
                                    onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                                >
                                    ‹
                                </Button>
                                <div className="flex items-center gap-1">
                                    {buildCardPageNumbers().map((item, idx) =>
                                        item === 'ellipsis' ? (
                                            <span key={`e-${idx}`} className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">...</span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setCardPage(item)}
                                                className={`w-7 h-7 rounded-full text-[11px] font-medium border transition-colors ${
                                                    item === currentCardPage
                                                        ? 'bg-primary-500 text-white border-primary-500'
                                                        : 'border-white/10 text-muted-foreground hover:bg-white/10'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full px-3 h-8 text-xs"
                                    disabled={currentCardPage === totalCardPages}
                                    onClick={() => setCardPage((p) => Math.min(totalCardPages, p + 1))}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Card Modal */}
            {(isAddModalOpen || editingCard) && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 "
                        onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingCard(null);
                        }}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <Card className="glass-card-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto ">
                            <CardHeader className="border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl gradient-text">
                                        {editingCard ? 'Chỉnh sửa thẻ' : 'Thêm thẻ mới'}
                                    </CardTitle>
                                    <button
                                        onClick={() => {
                                            setIsAddModalOpen(false);
                                            setEditingCard(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg "
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Card Name */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Tên thẻ *</label>
                                        <input
                                            type="text"
                                            value={newCard.name}
                                            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                                            placeholder="Nhập tên thẻ"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Mô tả</label>
                                        <textarea
                                            value={newCard.description}
                                            onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                                            placeholder="Nhập mô tả thẻ"
                                            rows={3}
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Danh mục</label>
                                        <select
                                            value={newCard.categoryId}
                                            onChange={(e) => setNewCard({ ...newCard, categoryId: e.target.value })}
                                            className="w-full px-4 py-2 bg-primary-900/50 backdrop-blur-sm border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="">Chọn danh mục (tùy chọn)</option>
                                            {categories.map((category) => (
                                                <option key={category.categoryId} value={category.categoryId}>
                                                    {category.categoryName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Rarity */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Độ hiếm</label>
                                        <select
                                            value={newCard.rarity}
                                            onChange={(e) => setNewCard({ ...newCard, rarity: e.target.value as any })}
                                            className="w-full px-4 py-2 bg-primary-900/50 backdrop-blur-sm border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="COMMON">Thường</option>
                                            <option value="UNCOMMON">Không hiếm</option>
                                            <option value="RARE">Hiếm</option>
                                            <option value="ULTRA_RARE">Cực hiếm</option>
                                            <option value="SUPER_RARE">Siêu hiếm</option>
                                            <option value="SECRET_RARE">Bí mật hiếm</option>
                                        </select>
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Giá (VND) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newCard.price}
                                            onChange={(e) => setNewCard({ ...newCard, price: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">URL ảnh</label>
                                        <input
                                            type="text"
                                            value={newCard.imageUrl}
                                            onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="premium"
                                            className="flex-1"
                                            onClick={editingCard ? handleEditCard : handleAddCard}
                                        >
                                            {editingCard ? 'Cập nhật thẻ' : 'Thêm thẻ'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="flex-1"
                                            onClick={() => {
                                                setIsAddModalOpen(false);
                                                setEditingCard(null);
                                            }}
                                        >
                                            Hủy
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Card Detail Modal */}
            {detailCard && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => setDetailCard(null)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <Card className="glass-card-strong w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <CardHeader className="border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl gradient-text">Chi tiết thẻ</CardTitle>
                                    <button
                                        onClick={() => setDetailCard(null)}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {detailLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                                        <div className="rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent animate-spin" />
                                        <span className="text-sm text-muted-foreground">Đang tải...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex justify-center">
                                            <img
                                                src={getCardImageUrl(detailCard) || 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80'}
                                                alt={detailCard.name}
                                                className="w-48 h-64 rounded-xl object-cover border border-white/10"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Tên thẻ</div>
                                            <div className="font-semibold text-lg">{detailCard.name}</div>
                                        </div>
                                        {detailCard.description && (
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Mô tả</div>
                                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detailCard.description}</div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Danh mục</div>
                                                <div className="text-sm font-medium">{detailCard.categoryName || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Độ hiếm</div>
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${detailCard.rarity === 'SECRET_RARE' ? 'bg-purple-500/20 text-purple-400' :
                                                    detailCard.rarity === 'ULTRA_RARE' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        detailCard.rarity === 'SUPER_RARE' ? 'bg-orange-500/20 text-orange-400' :
                                                            detailCard.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-400' :
                                                                detailCard.rarity === 'UNCOMMON' ? 'bg-green-500/20 text-green-400' :
                                                                    'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {formatRarity(detailCard.rarity)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Giá gốc</div>
                                                <div className="text-accent-400 font-semibold">
                                                    {formatCurrencyVND(detailCard.basePrice)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Giá thấp nhất</div>
                                                <div className="text-sm">
                                                    {formatCurrencyVND(detailCard.minPrice)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Giá cao nhất</div>
                                                <div className="text-sm">
                                                    {formatCurrencyVND(detailCard.maxPrice)}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Card ID</div>
                                            <div className="text-xs font-mono text-muted-foreground break-all">{detailCard.cardId}</div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="premium"
                                                className="flex-1 gap-2"
                                                onClick={() => {
                                                    setDetailCard(null);
                                                    openEditModal(detailCard);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                Chỉnh sửa
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setDetailCard(null)}
                                            >
                                                Đóng
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => {
                            setIsImportModalOpen(false);
                            setImportFile(null);
                        }}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <Card className="glass-card-strong w-full max-w-lg">
                            <CardHeader className="border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl gradient-text flex items-center gap-2">
                                        <FileSpreadsheet className="h-6 w-6" />
                                        Nhập thẻ
                                    </CardTitle>
                                    <button
                                        onClick={() => {
                                            setIsImportModalOpen(false);
                                            setImportFile(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Instructions */}
                                    <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                                        <h4 className="font-semibold mb-2">Hướng dẫn nhập:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                            <li>Tải lên file Excel (.xlsx, .xls) hoặc CSV</li>
                                            <li>File cần có cột: name, description, price, rarity, imageUrl, categoryId</li>
                                            <li>Thẻ trùng tên sẽ được cập nhật</li>
                                        </ul>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Chọn file</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls,.csv"
                                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                                className="w-full px-4 py-3 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30 cursor-pointer"
                                            />
                                        </div>
                                        {importFile && (
                                            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                                <FileSpreadsheet className="h-3 w-3" />
                                                Đã chọn: {importFile.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="premium"
                                            className="flex-1"
                                            onClick={handleImportCards}
                                            disabled={!importFile || isImporting}
                                        >
                                            {isImporting ? 'Đang nhập...' : 'Nhập thẻ'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="flex-1"
                                            onClick={() => {
                                                setIsImportModalOpen(false);
                                                setImportFile(null);
                                            }}
                                            disabled={isImporting}
                                        >
                                            Hủy
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};
