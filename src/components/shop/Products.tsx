import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Search, Heart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';

const allProducts = [
    {
        id: 1,
        name: 'Charizard VMAX',
        set: 'Champion\'s Path',
        price: 299.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        rating: 4.9,
        reviews: 127,
        releaseDate: '2023-09-01',
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
        releaseDate: '2023-08-15',
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
        releaseDate: '2023-07-20',
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
        releaseDate: '2023-10-05',
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
        releaseDate: '2023-10-05',
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
        releaseDate: '2023-06-10',
    },
    {
        id: 7,
        name: 'Gengar VMAX',
        set: 'Fusion Strike',
        price: 129.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        rating: 4.8,
        reviews: 145,
        releaseDate: '2023-11-12',
    },
    {
        id: 8,
        name: 'Mew VMAX',
        set: 'Fusion Strike',
        price: 189.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
        rating: 4.9,
        reviews: 167,
        releaseDate: '2023-11-12',
    },
    {
        id: 9,
        name: 'Dragonite V',
        set: 'Crown Zenith',
        price: 59.99,
        rarity: 'Ultra Rare',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
        rating: 4.5,
        reviews: 78,
        releaseDate: '2023-05-22',
    },
    {
        id: 10,
        name: 'Giratina VSTAR',
        set: 'Lost Origin',
        price: 249.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        rating: 4.9,
        reviews: 198,
        releaseDate: '2023-12-01',
    },
    {
        id: 11,
        name: 'Eevee VMAX',
        set: 'Evolving Skies',
        price: 119.99,
        rarity: 'Full Art',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        rating: 4.7,
        reviews: 134,
        releaseDate: '2023-10-05',
    },
    {
        id: 12,
        name: 'Arceus VSTAR',
        set: 'Brilliant Stars',
        price: 169.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
        rating: 4.8,
        reviews: 156,
        releaseDate: '2023-09-18',
    },
    {
        id: 13,
        name: 'Dialga VSTAR',
        set: 'Brilliant Stars',
        price: 139.99,
        rarity: 'Ultra Rare',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
        rating: 4.6,
        reviews: 112,
        releaseDate: '2023-09-18',
    },
    {
        id: 14,
        name: 'Palkia VSTAR',
        set: 'Brilliant Stars',
        price: 139.99,
        rarity: 'Ultra Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        rating: 4.6,
        reviews: 108,
        releaseDate: '2023-09-18',
    },
    {
        id: 15,
        name: 'Leafeon VMAX',
        set: 'Evolving Skies',
        price: 99.99,
        rarity: 'Alternate Art',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        rating: 4.7,
        reviews: 95,
        releaseDate: '2023-10-05',
    },
];

const ITEMS_PER_PAGE = 8;

export const Products: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRarity, setSelectedRarity] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('featured');
    const [currentPage, setCurrentPage] = useState(1);
    const { addItem: addToCart } = useCart();
    const { addItem: addToWishlist, isInWishlist } = useWishlist();

    // Filter and sort products
    const filteredAndSortedProducts = useMemo(() => {
        let filtered = [...allProducts];

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.set.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply rarity filter
        if (selectedRarity !== 'all') {
            filtered = filtered.filter(product => {
                const rarity = product.rarity.toLowerCase();
                if (selectedRarity === 'secret') return rarity.includes('secret');
                if (selectedRarity === 'ultra') return rarity.includes('ultra');
                if (selectedRarity === 'rare') return rarity === 'rainbow rare' || rarity === 'full art' || rarity === 'alternate art';
                return false;
            });
        }

        // Apply sorting
        switch (sortBy) {
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
                break;
            default:
                // featured - keep original order
                break;
        }

        return filtered;
    }, [searchQuery, selectedRarity, sortBy]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedRarity, sortBy]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                            <option value="rare">Rare Variants</option>
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

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
                Showing {currentProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} results
            </div>

            {/* Products Grid */}
            {currentProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentProducts.map((product, index) => (
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
            ) : (
                <div className="text-center py-12 glass-card rounded-xl">
                    <p className="text-muted-foreground mb-2">No products found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                    <Button
                        variant="outline"
                        size="sm"
                        className="glass-card"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                            key={page}
                            variant={currentPage === page ? 'premium' : 'outline'}
                            size="sm"
                            className={currentPage === page ? '' : 'glass-card'}
                            onClick={() => handlePageChange(page)}
                        >
                            {page}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        className="glass-card"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};
