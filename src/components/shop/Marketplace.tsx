import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, TrendingUp, TrendingDown, Star, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const marketplaceItems = [
    {
        id: 1,
        name: 'Charizard VMAX PSA 10',
        seller: 'CardMaster99',
        price: 450.00,
        condition: 'Mint',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        trending: 'up',
        change: '+12%',
        rating: 4.9,
    },
    {
        id: 2,
        name: 'Pikachu Illustrator',
        seller: 'RareCollector',
        price: 1250.00,
        condition: 'Near Mint',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        trending: 'up',
        change: '+25%',
        rating: 5.0,
    },
    {
        id: 3,
        name: 'Umbreon VMAX Alt Art',
        seller: 'ProTrader',
        price: 380.00,
        condition: 'Mint',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
        trending: 'down',
        change: '-5%',
        rating: 4.8,
    },
    {
        id: 4,
        name: 'Lugia Legend Top',
        seller: 'VintageCards',
        price: 220.00,
        condition: 'Lightly Played',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
        trending: 'up',
        change: '+8%',
        rating: 4.7,
    },
    {
        id: 5,
        name: 'Rayquaza VMAX',
        seller: 'DragonMaster',
        price: 195.00,
        condition: 'Near Mint',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        trending: 'up',
        change: '+15%',
        rating: 4.9,
    },
    {
        id: 6,
        name: 'Mewtwo EX Full Art',
        seller: 'LegendaryCards',
        price: 165.00,
        condition: 'Mint',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        trending: 'up',
        change: '+3%',
        rating: 4.6,
    },
];

export const Marketplace: React.FC = () => {
    const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 1000]);
    const [condition, setCondition] = React.useState('all');
    const [sortBy, setSortBy] = React.useState('trending');

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2 font-serif">Marketplace</h1>
                    <p className="text-muted-foreground">Buy and sell cards with collectors worldwide</p>
                </div>
                <Link to="/post-listing">
                    <Button variant="premium" className="shadow-lg hover:shadow-primary-500/25">
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Sell Item
                    </Button>
                </Link>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-4 rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Active Listings</div>
                    <div className="text-2xl font-bold gradient-text">2,847</div>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Total Sales (24h)</div>
                    <div className="text-2xl font-bold gradient-text">$45,230</div>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Avg. Price</div>
                    <div className="text-2xl font-bold gradient-text">$156</div>
                </div>
                <div className="glass-card p-4 rounded-xl">
                    <div className="text-sm text-muted-foreground mb-1">Active Traders</div>
                    <div className="text-2xl font-bold gradient-text">1,234</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 rounded-xl sticky top-24">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </h3>

                        {/* Search */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="search"
                                    placeholder="Card name..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                                />
                            </div>
                        </div>

                        {/* Price Range */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Price Range</label>
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="1000"
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>${priceRange[0]}</span>
                                    <span>${priceRange[1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Condition</label>
                            <select
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                            >
                                <option value="all">All Conditions</option>
                                <option value="mint">Mint</option>
                                <option value="near-mint">Near Mint</option>
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="played">Played</option>
                            </select>
                        </div>

                        {/* Rarity */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Rarity</label>
                            <div className="space-y-2">
                                {['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare'].map((rarity) => (
                                    <label key={rarity} className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                                        <span className="text-sm">{rarity}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Button variant="premium" className="w-full">
                            Apply Filters
                        </Button>
                    </div>
                </div>

                {/* Marketplace Items */}
                <div className="lg:col-span-3">
                    {/* Sort Options */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-sm text-muted-foreground">
                            Showing {marketplaceItems.length} results
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                        >
                            <option value="trending">Trending</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="newest">Newest First</option>
                            <option value="ending">Ending Soon</option>
                        </select>
                    </div>

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {marketplaceItems.map((item, index) => (
                            <Card
                                key={item.id}
                                className="group hover-lift animate-slide-up overflow-hidden"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="relative aspect-[3/4] overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />

                                    {/* Trending Badge */}
                                    <div className="absolute top-2 right-2">
                                        <div className={`glass-card-strong px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${item.trending === 'up' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {item.trending === 'up' ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                            {item.change}
                                        </div>
                                    </div>

                                    {/* Condition Badge */}
                                    <div className="absolute top-2 left-2">
                                        <div className="glass-card-strong px-2 py-1 rounded-full text-xs font-medium">
                                            {item.condition}
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-3">by {item.seller}</p>

                                    <div className="flex items-center mb-3 text-xs text-muted-foreground">
                                        <Star className="h-3 w-3 fill-accent-500 text-accent-500 mr-1" />
                                        <span>{item.rating} seller rating</span>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-2xl font-bold gradient-text">${item.price}</span>
                                    </div>

                                    <Button variant="premium" className="w-full" size="sm">
                                        Buy Now
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
