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
                    <h1 className="text-4xl font-bold mb-2 font-serif">Product Management</h1>
                    <p className="text-muted-foreground">Manage your product inventory</p>
                </div>
                <Button
                    variant="premium"
                    onClick={() => setIsAddingProduct(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
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
                                placeholder="Search products..."
                                className="pl-10"
                            />
                        </div>
                        <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                        </select>
                        <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option value="all">All Rarities</option>
                            <option value="common">Common</option>
                            <option value="rare">Rare</option>
                            <option value="ultra">Ultra Rare</option>
                            <option value="secret">Secret Rare</option>
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
                                    <th className="text-left p-3 font-semibold">Product Name</th>
                                    <th className="text-left p-3 font-semibold">Set</th>
                                    <th className="text-left p-3 font-semibold">Rarity</th>
                                    <th className="text-right p-3 font-semibold">Price</th>
                                    <th className="text-center p-3 font-semibold">Stock</th>
                                    <th className="text-center p-3 font-semibold">Status</th>
                                    <th className="text-right p-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr
                                        key={product.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors animate-slide-up"
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
                                        <td className="p-3 text-right font-semibold">${product.price}</td>
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
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-white/10 rounded-md transition-colors">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-md transition-colors">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-500/20 rounded-md transition-colors text-red-400">
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
                            <CardTitle>Add New Product</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Product Name</label>
                                <Input placeholder="Enter product name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Set</label>
                                    <Input placeholder="Card set" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Rarity</label>
                                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                                        <option>Common</option>
                                        <option>Uncommon</option>
                                        <option>Rare</option>
                                        <option>Ultra Rare</option>
                                        <option>Secret Rare</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Price</label>
                                    <Input type="number" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Stock</label>
                                    <Input type="number" placeholder="0" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <Textarea placeholder="Product description" rows={4} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="premium" className="flex-1">
                                    Add Product
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 glass-card"
                                    onClick={() => setIsAddingProduct(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
