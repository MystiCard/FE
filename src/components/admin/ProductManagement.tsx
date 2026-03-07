import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';

const products = [
    {
        id: 1,
        name: 'Charizard VMAX',
        set: 'Champion\'s Path',
        price: 299.99,
        stock: 15,
        rarity: 'Secret Rare',
        status: 'Active',
    },
    {
        id: 2,
        name: 'Pikachu VMAX',
        set: 'Vivid Voltage',
        price: 149.99,
        stock: 8,
        rarity: 'Rainbow Rare',
        status: 'Active',
    },
    {
        id: 3,
        name: 'Umbreon VMAX',
        set: 'Evolving Skies',
        price: 349.99,
        stock: 3,
        rarity: 'Alternate Art',
        status: 'Low Stock',
    },
    {
        id: 4,
        name: 'Rayquaza VMAX',
        set: 'Evolving Skies',
        price: 199.99,
        stock: 0,
        rarity: 'Alternate Art',
        status: 'Out of Stock',
    },
];

export const ProductManagement: React.FC = () => {
    const [isAddingProduct, setIsAddingProduct] = React.useState(false);

    return (
        <div className="py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2 font-serif">Quản lý sản phẩm</h1>
                    <p className="text-muted-foreground">Quản lý kho sản phẩm</p>
                </div>
                <Button
                    variant="premium"
                    onClick={() => setIsAddingProduct(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm sản phẩm
                </Button>
            </div>

            {/* Search & Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Tìm sản phẩm..."
                                className="pl-10"
                            />
                        </div>
                        <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang bán</option>
                            <option value="low">Sắp hết</option>
                            <option value="out">Hết hàng</option>
                        </select>
                        <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="all">Tất cả độ hiếm</option>
                            <option value="common">Thường</option>
                            <option value="rare">Hiếm</option>
                            <option value="ultra">Cực hiếm</option>
                            <option value="secret">Bí mật hiếm</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardContent className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-3 font-semibold">ID</th>
                                    <th className="text-left p-3 font-semibold">Tên sản phẩm</th>
                                    <th className="text-left p-3 font-semibold">Bộ</th>
                                    <th className="text-left p-3 font-semibold">Độ hiếm</th>
                                    <th className="text-right p-3 font-semibold">Giá</th>
                                    <th className="text-center p-3 font-semibold">Tồn kho</th>
                                    <th className="text-center p-3 font-semibold">Trạng thái</th>
                                    <th className="text-right p-3 font-semibold">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr
                                        key={product.id}
                                        className="border-b border-white/5 hover:bg-white/5 "
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <td className="p-3 font-medium">#{product.id}</td>
                                        <td className="p-3 font-semibold">{product.name}</td>
                                        <td className="p-3 text-muted-foreground">{product.set}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                                                {product.rarity}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-semibold">{product.price.toLocaleString('vi-VN')} VND</td>
                                        <td className="p-3 text-center">
                                            <span className={product.stock <= 5 ? 'text-amber-400 font-semibold' : ''}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                                    product.status === 'Low Stock' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                }`}>
                                                {product.status === 'Active' ? 'Đang bán' : product.status === 'Low Stock' ? 'Sắp hết' : 'Hết hàng'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-white/10 rounded-md ">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-md ">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-500/20 rounded-md text-red-400">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Product Modal (Simple version) */}
            {isAddingProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>Thêm sản phẩm mới</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tên sản phẩm</label>
                                <Input placeholder="Nhập tên sản phẩm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Bộ</label>
                                    <Input placeholder="Bộ thẻ" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Độ hiếm</label>
                                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                                        <option>Thường</option>
                                        <option>Không hiếm</option>
                                        <option>Hiếm</option>
                                        <option>Cực hiếm</option>
                                        <option>Bí mật hiếm</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Giá</label>
                                    <Input type="number" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tồn kho</label>
                                    <Input type="number" placeholder="0" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mô tả</label>
                                <Textarea placeholder="Mô tả sản phẩm" rows={4} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="premium" className="flex-1">
                                    Thêm sản phẩm
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 glass-card"
                                    onClick={() => setIsAddingProduct(false)}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
