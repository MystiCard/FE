import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Sparkles, Heart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';

const boosterBoxes = [
    {
        id: 1,
        name: 'Scarlet & Violet Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 144.99,
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600&q=80',
        inStock: true,
    },
    {
        id: 2,
        name: 'Obsidian Flames Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 139.99,
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=600&q=80',
        inStock: true,
    },
    {
        id: 3,
        name: 'Paldean Fates Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 159.99,
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=600&q=80',
        inStock: false,
    },
    {
        id: 4,
        name: 'Temporal Forces Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=600&q=80',
        inStock: true,
    },
];

export const BoosterBoxes: React.FC = () => {
    const { addItem: addToCart } = useCart();
    const { addItem: addToWishlist, isInWishlist } = useWishlist();

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 font-serif">Booster Boxes</h1>
                <p className="text-muted-foreground">Get the best value with our sealed booster boxes</p>
            </div>

            {/* Info Banner */}
            <div className="glass-card-strong p-6 rounded-xl mb-8 border-l-4 border-accent-500">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-accent-500/20">
                        <Package className="h-6 w-6 text-accent-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-1">Why Buy Booster Boxes?</h3>
                        <p className="text-sm text-muted-foreground">
                            Each booster box contains 36 packs with guaranteed rare cards. Perfect for collectors and players looking to expand their collection or build competitive decks.
                        </p>
                    </div>
                </div>
            </div>

            {/* Booster Boxes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boosterBoxes.map((box, index) => (
                    <Card
                        key={box.id}
                        className="group hover-lift animate-slide-up overflow-hidden"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="md:flex">
                            <div className="relative md:w-1/2 aspect-square md:aspect-auto overflow-hidden">
                                <img
                                    src={box.image}
                                    alt={box.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {!box.inStock && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="glass-card-strong px-4 py-2 rounded-full font-semibold">
                                            Out of Stock
                                        </span>
                                    </div>
                                )}
                                <button
                                    onClick={() => addToWishlist({ id: box.id, name: box.name, price: box.price, image: box.image })}
                                    className="absolute top-2 left-2 p-2 glass-card-strong rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <Heart className={`h-4 w-4 ${isInWishlist(box.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                </button>
                            </div>

                            <CardContent className="md:w-1/2 p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-xl mb-2">{box.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{box.description}</p>

                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="h-4 w-4 text-accent-500" />
                                        <span className="text-sm">Guaranteed rare cards in every box</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-3xl font-bold gradient-text mb-4">
                                        ${box.price}
                                    </div>

                                    <Button
                                        variant="premium"
                                        className="w-full"
                                        disabled={!box.inStock}
                                        onClick={() => box.inStock && addToCart({ id: box.id, name: box.name, price: box.price, image: box.image })}
                                    >
                                        {box.inStock ? 'Add to Cart' : 'Notify When Available'}
                                    </Button>
                                </div>
                            </CardContent>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <h3 className="font-semibold mb-2">Sealed & Authentic</h3>
                    <p className="text-sm text-muted-foreground">All boxes are factory sealed and 100% authentic</p>
                </div>
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">🚚</div>
                    <h3 className="font-semibold mb-2">Free Shipping</h3>
                    <p className="text-sm text-muted-foreground">Free shipping on all booster box orders</p>
                </div>
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">💎</div>
                    <h3 className="font-semibold mb-2">Best Value</h3>
                    <p className="text-sm text-muted-foreground">Lowest prices guaranteed on sealed products</p>
                </div>
            </div>
        </div>
    );
};
