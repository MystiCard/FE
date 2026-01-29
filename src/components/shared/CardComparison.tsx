import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowLeftRight } from 'lucide-react';

interface ComparisonItem {
    id: number;
    name: string;
    set: string;
    price: number;
    rarity: string;
    image: string;
    hp?: number;
    attack?: number;
    defense?: number;
}

const sampleCards: ComparisonItem[] = [
    {
        id: 1,
        name: 'Charizard VMAX',
        set: 'Champion\'s Path',
        price: 299.99,
        rarity: 'Secret Rare',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=300&q=80',
        hp: 330,
        attack: 300,
        defense: 250,
    },
    {
        id: 2,
        name: 'Pikachu VMAX',
        set: 'Vivid Voltage',
        price: 149.99,
        rarity: 'Rainbow Rare',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=300&q=80',
        hp: 310,
        attack: 280,
        defense: 220,
    },
];

export const CardComparison: React.FC = () => {
    const [selectedCards, setSelectedCards] = React.useState<ComparisonItem[]>(sampleCards);

    const removeCard = (id: number) => {
        setSelectedCards(cards => cards.filter(card => card.id !== id));
    };

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <ArrowLeftRight className="h-8 w-8 text-primary-400" />
                    <h1 className="text-4xl font-bold font-serif">Card Comparison</h1>
                </div>
                <p className="text-muted-foreground">Compare cards side by side</p>
            </div>

            {selectedCards.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <ArrowLeftRight className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-4">No cards selected for comparison</p>
                        <Button variant="premium">Browse Products</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedCards.map((card, index) => (
                        <Card
                            key={card.id}
                            className="animate-slide-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg">{card.name}</CardTitle>
                                    <button
                                        onClick={() => removeCard(card.id)}
                                        className="p-1 hover:bg-red-500/20 rounded-md transition-colors text-red-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <img
                                    src={card.image}
                                    alt={card.name}
                                    className="w-full aspect-[3/4] object-cover rounded-lg"
                                />

                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Set</span>
                                        <span className="font-medium">{card.set}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Rarity</span>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                                            {card.rarity}
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Price</span>
                                        <span className="font-bold gradient-text">${card.price}</span>
                                    </div>

                                    {card.hp && (
                                        <>
                                            <div className="border-t border-white/10 pt-3">
                                                <div className="text-sm font-semibold mb-2">Stats</div>
                                            </div>

                                            <div className="space-y-2">
                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">HP</span>
                                                        <span className="font-medium">{card.hp}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-secondary-500 to-secondary-300"
                                                            style={{ width: `${(card.hp / 350) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Attack</span>
                                                        <span className="font-medium">{card.attack}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-accent-500 to-accent-300"
                                                            style={{ width: `${(card.attack! / 350) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">Defense</span>
                                                        <span className="font-medium">{card.defense}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                                                            style={{ width: `${(card.defense! / 350) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <Button variant="premium" className="w-full">
                                    Add to Cart
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {selectedCards.length > 0 && selectedCards.length < 4 && (
                <Card className="mt-6">
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">
                            Add more cards to compare (up to 4 cards)
                        </p>
                        <Button variant="outline" className="glass-card">
                            Add Card
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
