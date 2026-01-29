import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Layers } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PokemonSet, PokemonCard, fetchSets } from '@/utils/pokemonTcgApi';
import { SetDetail } from './SetDetail';
import { CardDetailModal } from './CardDetailModal';

type ViewState = 'SETS' | 'CARDS';

export const Portfolio: React.FC = () => {
    // State
    const [view, setView] = useState<ViewState>('SETS');
    const [isLoading, setIsLoading] = useState(false);
    const [sets, setSets] = useState<PokemonSet[]>([]);
    const [selectedSet, setSelectedSet] = useState<PokemonSet | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);

    // Initial Load: Fetch Sets
    useEffect(() => {
        loadSets();
    }, []);

    const loadSets = async () => {
        setIsLoading(true);
        try {
            const data = await fetchSets();
            setSets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handlers
    const handleSetClick = (set: PokemonSet) => {
        setSelectedSet(set);
        setView('CARDS');
    };

    const handleBackToSets = () => {
        setView('SETS');
        setSelectedSet(null);
    };

    const handleCardClick = (card: PokemonCard) => {
        setSelectedCard(card);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedCard(null), 300); // Wait for animation
    };

    // Render Logic
    return (
        <div className="min-h-screen">
            {/* 1. Sets View (Home) */}
            {view === 'SETS' && (
                <div className="py-8 animate-fade-in">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold font-serif gradient-text mb-2">My Collection</h1>
                        <p className="text-muted-foreground">Select a set to browse cards</p>
                    </div>

                    {isLoading && sets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-400 mb-4" />
                            <p className="text-muted-foreground">Loading sets...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sets.map((set) => (
                                <Card
                                    key={set.id}
                                    onClick={() => handleSetClick(set)}
                                    className="glass-card hover-lift cursor-pointer group"
                                >
                                    <CardContent className="p-6 flex flex-col items-center text-center h-full">
                                        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                                            <img
                                                src={set.images.logo}
                                                alt={set.name}
                                                className="max-w-full max-h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <img src={set.images.symbol} alt="symbol" className="w-5 h-5 opacity-70" />
                                            <h3 className="font-bold text-lg leading-tight">{set.name}</h3>
                                        </div>
                                        <div className="w-full mt-auto space-y-3 pt-4 border-t border-white/10">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Collected</span>
                                                    <span className="font-medium text-primary-400">0 / {set.total}</span>
                                                </div>
                                                <Progress value={0} className="h-1.5 bg-white/10" />
                                            </div>

                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                                <span className="text-xs text-muted-foreground">Total Value</span>
                                                <span className="text-sm font-bold text-emerald-400">$0.00</span>
                                            </div>

                                            <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{set.releaseDate}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    <span>{set.total} cards</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 2. Set Detail View */}
            {view === 'CARDS' && selectedSet && (
                <SetDetail
                    set={selectedSet}
                    onBack={handleBackToSets}
                    onCardClick={handleCardClick}
                />
            )}

            {/* 3. Card Detail Modal */}
            <CardDetailModal
                card={selectedCard}
                set={selectedSet}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};
