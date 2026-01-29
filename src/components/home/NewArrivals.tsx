import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Heart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { Link } from 'react-router-dom';

const products = [
    {
        id: 1,
        name: 'Charizard VMAX',
        set: 'Champion\'s Path',
        price: 299.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
    },
    {
        id: 2,
        name: 'Pikachu VMAX',
        set: 'Vivid Voltage',
        price: 149.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
    },
    {
        id: 3,
        name: 'Mewtwo GX',
        set: 'Shining Legends',
        price: 89.99,
        rarity: 'Ultra Rare',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
    },
    {
        id: 4,
        name: 'Rayquaza VMAX',
        set: 'Evolving Skies',
        price: 199.99,
        rarity: 'Alternate Art',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
    },
    {
        id: 5,
        name: 'Gengar VMAX',
        set: 'Fusion Strike',
        price: 129.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
    },
    {
        id: 6,
        name: 'Mew VMAX',
        set: 'Fusion Strike',
        price: 189.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80',
    },
    {
        id: 7,
        name: 'Umbreon VMAX',
        set: 'Evolving Skies',
        price: 349.99,
        rarity: 'Alternate Art',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80',
    },
    {
        id: 8,
        name: 'Giratina VSTAR',
        set: 'Lost Origin',
        price: 249.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
    },
];

export const NewArrivals: React.FC = () => {
    const { addItem: addToCart } = useCart();
    const { addItem: addToWishlist, isInWishlist } = useWishlist();

    return (
        <section className="py-16">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-4xl font-bold mb-2 font-serif">New Arrivals</h2>
                    <p className="text-muted-foreground">Fresh cards just added to our collection</p>
                </div>
                <Link to="/products">
                    <Button variant="outline" className="glass-card hover:bg-white/20">
                        View All
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product, index) => (
                    <Card
                        key={product.id}
                        className="group hover-lift animate-slide-up overflow-hidden"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-2 right-2">
                                <div className="glass-card-strong px-2 py-1 rounded-full text-xs font-medium">
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
                            <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{product.set}</p>

                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold gradient-text">${product.price}</span>
                                <Button
                                    size="sm"
                                    variant="premium"
                                    onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, rarity: product.rarity })}
                                >
                                    Add to Cart
                                </Button>
                            </div>

                            <div className="flex items-center mt-3 text-xs text-muted-foreground">
                                <Star className="h-3 w-3 fill-accent-500 text-accent-500 mr-1" />
                                <span>4.9 (127 reviews)</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
};
