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
    X
} from 'lucide-react';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
    status: 'Active' | 'Low Stock' | 'Out of Stock';
    image: string;
    sales: number;
}

const sampleProducts: Product[] = [
    {
        id: 1,
        name: 'Charizard VMAX Rainbow',
        category: 'Single Cards',
        price: 299.99,
        stock: 12,
        status: 'Active',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=100&q=80',
        sales: 45
    },
    {
        id: 2,
        name: 'Booster Box - Scarlet & Violet',
        category: 'Booster Boxes',
        price: 149.99,
        stock: 5,
        status: 'Low Stock',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80',
        sales: 128
    },
    {
        id: 3,
        name: 'Premium Mystery Box',
        category: 'Mystery Boxes',
        price: 79.99,
        stock: 0,
        status: 'Out of Stock',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=100&q=80',
        sales: 89
    },
    {
        id: 4,
        name: 'Pikachu V Full Art',
        category: 'Single Cards',
        price: 89.99,
        stock: 25,
        status: 'Active',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80',
        sales: 67
    },
];

export const AdminProductsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [products, setProducts] = React.useState<Product[]>(sampleProducts);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [newProduct, setNewProduct] = React.useState({
        name: '',
        category: 'Single Cards',
        price: '',
        stock: '',
        description: '',
        imageUrl: ''
    });

    const stats = [
        {
            title: 'Total Products',
            value: products.length.toString(),
            icon: Package,
            color: 'from-primary-500 to-primary-300',
            change: '+12%'
        },
        {
            title: 'Total Revenue',
            value: '$45,231',
            icon: DollarSign,
            color: 'from-accent-500 to-accent-300',
            change: '+23%'
        },
        {
            title: 'Best Seller',
            value: 'Booster Box',
            icon: TrendingUp,
            color: 'from-secondary-500 to-secondary-300',
            change: '128 sales'
        },
        {
            title: 'Low Stock Items',
            value: products.filter(p => p.stock <= 5 && p.stock > 0).length.toString(),
            icon: AlertCircle,
            color: 'from-red-500 to-orange-500',
            change: 'Need restock'
        },
    ];

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddProduct = () => {
        const price = parseFloat(newProduct.price);
        const stock = parseInt(newProduct.stock);

        if (!newProduct.name || !price || !stock) {
            alert('Please fill in all required fields');
            return;
        }

        const product: Product = {
            id: products.length + 1,
            name: newProduct.name,
            category: newProduct.category,
            price: price,
            stock: stock,
            status: stock === 0 ? 'Out of Stock' : stock <= 5 ? 'Low Stock' : 'Active',
            image: newProduct.imageUrl || 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80',
            sales: 0
        };

        setProducts([...products, product]);
        setIsAddModalOpen(false);
        setNewProduct({
            name: '',
            category: 'Single Cards',
            price: '',
            stock: '',
            description: '',
            imageUrl: ''
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Product Management</h1>
                    <p className="text-muted-foreground mt-1">Manage your inventory and products</p>
                </div>
                <Button
                    variant="premium"
                    className="gap-2"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Add New Product
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="glass-card-strong hover-lift">
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
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            />
                        </div>
                        <select className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option>All Categories</option>
                            <option>Single Cards</option>
                            <option>Booster Boxes</option>
                            <option>Mystery Boxes</option>
                        </select>
                        <select className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Products ({filteredProducts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Product</th>
                                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Category</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Price</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Stock</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Sales</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Status</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground">ID: #{product.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">{product.category}</td>
                                        <td className="p-4 text-right font-semibold text-accent-400">${product.price}</td>
                                        <td className="p-4 text-right">
                                            <span className={product.stock <= 5 ? 'text-amber-400 font-semibold' : ''}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-sm">{product.sales}</td>
                                        <td className="p-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                                product.status === 'Low Stock' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-primary-500/20 rounded-md transition-colors text-primary-400">
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

            {/* Add Product Modal */}
            {isAddModalOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <Card className="glass-card-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                            <CardHeader className="border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl gradient-text">Add New Product</CardTitle>
                                    <button
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Product Name */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Product Name *</label>
                                        <input
                                            type="text"
                                            value={newProduct.name}
                                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                            placeholder="Enter product name"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Category *</label>
                                        <select
                                            value={newProduct.category}
                                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                            className="w-full px-4 py-2 bg-primary-900/50 backdrop-blur-sm border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
                                        >
                                            <option>Single Cards</option>
                                            <option>Booster Boxes</option>
                                            <option>Mystery Boxes</option>
                                            <option>Special Items</option>
                                        </select>
                                    </div>

                                    {/* Price and Stock */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Price ($) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newProduct.price}
                                                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Stock Quantity *</label>
                                            <input
                                                type="number"
                                                value={newProduct.stock}
                                                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                                                placeholder="0"
                                                className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            value={newProduct.description}
                                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                            placeholder="Enter product description"
                                            rows={3}
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                                        />
                                    </div>

                                    {/* Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Image URL</label>
                                        <input
                                            type="text"
                                            value={newProduct.imageUrl}
                                            onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full px-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="premium"
                                            className="flex-1"
                                            onClick={handleAddProduct}
                                        >
                                            Add Product
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="flex-1"
                                            onClick={() => setIsAddModalOpen(false)}
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
