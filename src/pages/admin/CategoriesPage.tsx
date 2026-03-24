import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Edit,
    Folder,
    Image as ImageIcon,
    Calendar,
    X,
    Upload,
    FileSpreadsheet
} from 'lucide-react';
import { categoryApi, Category } from '@/api';
import { getCategoryImage } from '@/utils/categoryImages';
import { toast } from '@/components/ui/use-toast';
import { useAdminConfirm } from '@/components/admin';

export const AdminCategoriesPage: React.FC = () => {
    const { confirm, confirmDialog } = useAdminConfirm();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [importFile, setImportFile] = React.useState<File | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const [newCategory, setNewCategory] = React.useState({
        name: '',
        description: '',
        imageUrl: '',
    });
    const [categoryPage, setCategoryPage] = React.useState(1);
    const categoryPageSize = 12;

    // Reset page when search changes
    React.useEffect(() => {
        setCategoryPage(1);
    }, [searchQuery]);

    // Load categories on mount
    React.useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const data = await categoryApi.getAllCategories();

            // Backend list API might not return imageUrl, so we fetch details for each category
            // This ensures images are displayed in the grid
            if (data.length > 0) {
                try {
                    const fullDetails = await Promise.all(
                        data.map(async (cat) => {
                            try {
                                // Try to get detail first
                                const detail = await categoryApi.getCategoryById(cat.categoryId);
                                const result = detail || cat;

                                // If no image URL, try our hardcoded fallback
                                if (!result.imageUrl) {
                                    result.imageUrl = getCategoryImage(result.categoryName);
                                }

                                return result;
                            } catch (e) {
                                console.warn(`Failed to load detail for category {cat.categoryId} VND`, e);
                                // Fallback image if detail fails
                                return {
                                    ...cat,
                                    imageUrl: getCategoryImage(cat.categoryName)
                                };
                            }
                        })
                    );
                    setCategories(fullDetails);
                } catch (detailErr) {
                    console.warn('Failed to fetch category details', detailErr);
                    // Fallback images for basic list
                    const categoriesWithImages = data.map(cat => ({
                        ...cat,
                        imageUrl: cat.imageUrl || getCategoryImage(cat.categoryName)
                    }));
                    setCategories(categoriesWithImages);
                }
            } else {
                setCategories(data);
            }

            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh mục');
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = [
        {
            title: 'Tổng danh mục',
            value: categories.length.toString(),
            icon: Folder,
            color: 'from-blue-500 to-cyan-500',
            change: `${categories.length} danh mục`
        },
        {
            title: 'Có ảnh',
            value: categories.filter(c => c.imageUrl).length.toString(),
            icon: ImageIcon,
            color: 'from-purple-500 to-pink-500',
            change: 'Có ảnh'
        },
        {
            title: 'Mới thêm',
            value: categories.filter(c => {
                if (!c.createdAt) return false;
                const created = new Date(c.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
            }).length.toString(),
            icon: Calendar,
            color: 'from-green-500 to-emerald-500',
            change: '7 ngày qua'
        },
    ];

    const filteredCategories = categories.filter(category =>
        (category.categoryName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (category.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / categoryPageSize));
    const currentCategoryPage = Math.min(categoryPage, totalCategoryPages);
    const pagedCategories = filteredCategories.slice(
        (currentCategoryPage - 1) * categoryPageSize,
        currentCategoryPage * categoryPageSize
    );

    const buildCategoryPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalCategoryPages <= 7) {
            for (let i = 1; i <= totalCategoryPages; i++) pages.push(i);
            return pages;
        }
        pages.push(1);
        const left = Math.max(2, currentCategoryPage - 1);
        const right = Math.min(totalCategoryPages - 1, currentCategoryPage + 1);
        if (left > 2) pages.push('ellipsis');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalCategoryPages - 1) pages.push('ellipsis');
        pages.push(totalCategoryPages);
        return pages;
    };

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            toast({ title: 'Thiếu tên', description: 'Vui lòng nhập tên danh mục.', variant: 'warning' });
            return;
        }

        try {
            await categoryApi.createCategory({
                categoryName: newCategory.name.trim(),
                description: newCategory.description.trim() || undefined,
                imageUrl: newCategory.imageUrl.trim() || undefined,
            });

            await loadCategories();

            setIsAddModalOpen(false);
            setNewCategory({
                name: '',
                description: '',
                imageUrl: '',
            });
            toast({ title: 'Đã thêm danh mục', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Thêm danh mục thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const handleEditCategory = async () => {
        if (!editingCategory) return;

        const categoryId = editingCategory.categoryId;
        if (!categoryId) {
            toast({ title: 'Lỗi', description: 'Không có mã danh mục. Vui lòng thử lại.', variant: 'error' });
            return;
        }

        if (!newCategory.name.trim()) {
            toast({ title: 'Thiếu tên', description: 'Vui lòng nhập tên danh mục.', variant: 'warning' });
            return;
        }

        try {
            await categoryApi.updateCategory(categoryId, {
                categoryName: newCategory.name.trim(),
                description: newCategory.description.trim() || undefined,
                imageUrl: newCategory.imageUrl.trim() || undefined,
            });

            await loadCategories();

            setEditingCategory(null);
            setNewCategory({
                name: '',
                description: '',
                imageUrl: '',
            });
            toast({ title: 'Đã cập nhật danh mục', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Cập nhật danh mục thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const handleImportCategories = async () => {
        if (!importFile) {
            toast({ title: 'Chưa chọn file', description: 'Vui lòng chọn file để nhập.', variant: 'warning' });
            return;
        }

        try {
            setIsImporting(true);
            await categoryApi.importCategories(importFile);
            await loadCategories();
            setIsImportModalOpen(false);
            setImportFile(null);
            toast({ title: 'Đã nhập danh mục', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Nhập danh mục thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        } finally {
            setIsImporting(false);
        }
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setNewCategory({
            name: category.categoryName,
            description: category.description || '',
            imageUrl: category.imageUrl || '',
        });
    };

    return (
        <div className="space-y-6">
            {confirmDialog}
            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý danh mục</h1>
                    <p className="text-muted-foreground mt-1">Quản lý danh mục sản phẩm</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="h-4 w-4" />
                        Import Categories
                    </Button>
                    <Button
                        variant="premium"
                        className="gap-2"
                        onClick={() => {
                            setEditingCategory(null);
                            setNewCategory({
                                name: '',
                                description: '',
                                imageUrl: '',
                            });
                            setIsAddModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Add New Category
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Search */}
            <Card className="glass-card-strong">
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm danh mục..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Categories Grid */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <span>Categories ({filteredCategories.length})</span>
                        {filteredCategories.length > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                Trang {currentCategoryPage}/{totalCategoryPages}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải danh mục...</div>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Chưa có danh mục nào. Thêm danh mục đầu tiên để bắt đầu!
                        </div>
                    ) : (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pagedCategories.map((category) => (
                                <div key={category.categoryId} className="glass-card p-4 rounded-lg hover:bg-white/5 transition-colors">
                                    {/* Category Image */}
                                    {/* Category Image */}
                                    {/* Category Image */}
                                    <div className="w-full h-40 bg-white/5 rounded-lg mb-4 overflow-hidden relative group flex items-center justify-center p-4">
                                        {(category.imageUrl || getCategoryImage(category.categoryName || '')) ? (
                                            <img
                                                src={category.imageUrl || getCategoryImage(category.categoryName || '')}
                                                alt={category.categoryName}
                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const parent = e.currentTarget.parentElement;
                                                    if (parent) {
                                                        const icon = document.createElement('div');
                                                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                                        parent.appendChild(icon);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                            <p className="text-white text-sm font-medium truncate">{category.categoryName}</p>
                                        </div>
                                    </div>

                                    {/* Category Info */}
                                    <div className="mb-3">
                                        <h3 className="font-bold text-lg mb-1">{category.categoryName}</h3>
                                        {category.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {category.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(category)}
                                            className="w-full px-3 py-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-md text-primary-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalCategoryPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full px-3 h-8 text-xs"
                                    disabled={currentCategoryPage === 1}
                                    onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                                >
                                    ‹
                                </Button>
                                <div className="flex items-center gap-1">
                                    {buildCategoryPageNumbers().map((item, idx) =>
                                        item === 'ellipsis' ? (
                                            <span key={`e-${idx}`} className="w-6 h-6 flex items-center justify-center text-xs text-muted-foreground">...</span>
                                        ) : (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setCategoryPage(item)}
                                                className={`w-7 h-7 rounded-full text-[11px] font-medium border transition-colors ${
                                                    item === currentCategoryPage
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
                                    disabled={currentCategoryPage === totalCategoryPages}
                                    onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
                                >
                                    ›
                                </Button>
                            </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Category Modal */}
            {(isAddModalOpen || editingCategory) && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 "
                        onClick={() => {
                            setIsAddModalOpen(false);
                            setEditingCategory(null);
                        }}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <Card className="glass-card-strong w-full max-w-lg ">
                            <CardHeader className="border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl gradient-text">
                                        {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                                    </CardTitle>
                                    <button
                                        onClick={() => {
                                            setIsAddModalOpen(false);
                                            setEditingCategory(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg "
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Category Name */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Category Name *</label>
                                        <input
                                            type="text"
                                            value={newCategory.name}
                                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                            placeholder="Enter category name"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={newCategory.description}
                                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                            placeholder="Enter category description"
                                            rows={3}
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                        />
                                    </div>

                                    {/* Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Image URL</label>
                                        <input
                                            type="text"
                                            value={newCategory.imageUrl}
                                            onChange={(e) => setNewCategory({ ...newCategory, imageUrl: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="premium"
                                            className="flex-1"
                                            onClick={editingCategory ? handleEditCategory : handleAddCategory}
                                        >
                                            {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="flex-1"
                                            onClick={() => {
                                                setIsAddModalOpen(false);
                                                setEditingCategory(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
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
                                        Import Categories
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
                                        <h4 className="font-semibold mb-2">Import Instructions:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                            <li>Chỉ chấp nhận file Excel (.xlsx, .xls)</li>
                                            <li>Cột đầu tiên = tên category (categoryName); các cột khác không dùng</li>
                                            <li>Category trùng tên sẽ bị bỏ qua (skipped)</li>
                                        </ul>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Select File</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                                className="w-full px-4 py-3 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30 cursor-pointer"
                                            />
                                        </div>
                                        {importFile && (
                                            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                                <FileSpreadsheet className="h-3 w-3" />
                                                Selected: {importFile.name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="premium"
                                            className="flex-1"
                                            onClick={handleImportCategories}
                                            disabled={!importFile || isImporting}
                                        >
                                            {isImporting ? 'Đang nhập...' : 'Nhập danh mục'}
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
                                            Cancel
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
