import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Search, Heart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';

const products = [
    {
        id: 1,
        name: 'Charizard VMAX',
        set: 'Champion\'s Path',
        price: 299.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        rating: 4.9,
        reviews: 127,
    },
    {
        id: 2,
        name: 'Pikachu VMAX',
        set: 'Vivid Voltage',
        price: 149.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        rating: 4.8,
        reviews: 89,
    },
    {
        id: 3,
        name: 'Mewtwo GX',
        set: 'Shining Legends',
        price: 89.99,
        rarity: 'Ultra Rare',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
        rating: 4.7,
        reviews: 156,
    },
    {
        id: 4,
        name: 'Rayquaza VMAX',
        set: 'Evolving Skies',
        price: 199.99,
        rarity: 'Alternate Art',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
        rating: 4.9,
        reviews: 203,
    },
    {
        id: 5,
        name: 'Umbreon VMAX',
        set: 'Evolving Skies',
        price: 349.99,
        rarity: 'Alternate Art',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
        rating: 5.0,
        reviews: 178,
    },
    {
        id: 6,
        name: 'Lugia V',
        set: 'Silver Tempest',
        price: 79.99,
        rarity: 'Full Art',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        rating: 4.6,
        reviews: 92,
    },
];

export const Products: React.FC = () => {
    const [selectedRarity, setSelectedRarity] = React.useState<string>('all');
    const [sortBy, setSortBy] = React.useState<string>('featured');
    const { addItem: addToCart } = useCart();
    const { addItem: addToWishlist, isInWishlist } = useWishlist();

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 font-serif">All Products</h1>
                <p className="text-muted-foreground">Browse our complete collection of trading cards</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-6 rounded-xl mb-8">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 flex-wrap">
                        <select
                            value={selectedRarity}
                            onChange={(e) => setSelectedRarity(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="all">All Rarities</option>
                            <option value="common">Common</option>
                            <option value="uncommon">Uncommon</option>
                            <option value="rare">Rare</option>
                            <option value="ultra">Ultra Rare</option>
                            <option value="secret">Secret Rare</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="featured">Featured</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="newest">Newest First</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product, index) => (
                    <Card
                        key={product.id}
                        className="group hover-lift animate-slide-up overflow-hidden"
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-2 right-2">
                                <div className="glass-card-strong px-3 py-1 rounded-full text-xs font-medium">
                                    {product.rarity}
                                </div>
                            </div>
                            <button
                                onClick={() => addToWishlist({ id: product.id, name: product.name, price: product.price, image: product.image, rarity: product.rarity })}
                                className="absolute top-2 left-2 p-2 glass-card-strong rounded-full hover:bg-white/20 transition-colors"
                            >
                                <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </button>
                        </div>

                        <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{product.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{product.set}</p>

                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl font-bold gradient-text">${product.price}</span>
                            </div>

                            <div className="flex items-center mb-3 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-accent-500 text-accent-500 mr-1" />
                                <span>{product.rating} ({product.reviews} reviews)</span>
                            </div>

                            <Button
                                variant="premium"
                                className="w-full"
                                size="sm"
                                onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, rarity: product.rarity })}
                            >
                                Add to Cart
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-12">
                <Button variant="outline" size="sm" className="glass-card">Previous</Button>
                <Button variant="premium" size="sm">1</Button>
                <Button variant="outline" size="sm" className="glass-card">2</Button>
                <Button variant="outline" size="sm" className="glass-card">3</Button>
                <Button variant="outline" size="sm" className="glass-card">Next</Button>
            </div>
        </div>
    );
};
