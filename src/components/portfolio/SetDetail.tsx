import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { PokemonSet, PokemonCard, fetchCardsBySet } from '@/utils/pokemonTcgApi';

interface SetDetailProps {
    set: PokemonSet;
    onBack: () => void;
    onCardClick: (card: PokemonCard) => void;
}

export const SetDetail: React.FC<SetDetailProps> = ({ set, onBack, onCardClick }) => {
    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCards = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCardsBySet(set.id);
                setCards(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCards();
    }, [set.id]);

    return (
        <div className="py-8 animate-fade-in">
            <div className="mb-8">
                <Button variant="ghost" onClick={onBack} className="mb-4 pl-0 hover:bg-transparent hover:text-primary-400">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sets
                </Button>
                <div className="flex items-center gap-4">
                    <img src={set.images.logo} alt={set.name} className="h-12 w-auto object-contain" />
                    <div>
                        <h1 className="text-3xl font-bold font-serif gradient-text">{set.name}</h1>
                        <p className="text-muted-foreground">Showing {cards.length} cards</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {cards.map((card) => (
                        <Card
                            key={card.id}
                            onClick={() => onCardClick(card)}
                            className="glass-card hover-lift cursor-pointer group overflow-hidden border-0 bg-transparent"
                        >
                            <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-xl">
                                <img
                                    src={card.images.small}
                                    alt={card.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-3 text-center">
                                <h3 className="font-semibold text-sm truncate">{card.name}</h3>
                                <p className="text-xs text-muted-foreground">#{card.number}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
