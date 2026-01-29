import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, Calendar, Layers, ExternalLink } from 'lucide-react';
import { PokemonCard, PokemonSet } from '@/utils/pokemonTcgApi';

interface CardDetailModalProps {
    card: PokemonCard | null;
    set: PokemonSet | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, set, isOpen, onClose }) => {
    if (!card) return null;

    const prices = card.tcgplayer?.prices;

    // Helper to safely access price
    const getPrice = (type: 'normal' | 'holofoil' | 'reverseHolofoil') => {
        return prices?.[type]?.market?.toFixed(2) || '---';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card-strong border-white/10 text-white backdrop-blur-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1">
                        <span className="px-2 py-0.5 rounded bg-white/10 uppercase font-bold tracking-wider text-[10px]">
                            {card.supertype}
                        </span>
                        {card.subtypes?.map(type => (
                            <span key={type} className="px-2 py-0.5 rounded bg-white/5 uppercase text-[10px]">
                                {type}
                            </span>
                        ))}
                    </div>
                    <DialogTitle className="text-3xl font-serif gradient-text">{card.name}</DialogTitle>
                    <DialogDescription className="text-muted-foreground flex items-center gap-2">
                        {card.rarity || 'Common'} • #{card.number}/{set?.printedTotal}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    {/* Left: Image */}
                    <div className="flex justify-center">
                        <div className="relative group w-full max-w-sm">
                            <img
                                src={card.images.large}
                                alt={card.name}
                                className="w-full h-auto rounded-xl shadow-2xl object-contain"
                            />
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="space-y-6">
                        {/* Prices */}
                        <Card className="bg-black/20 border-white/10">
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-accent-400" />
                                    TCGPlayer Market
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded bg-white/5">
                                        <p className="text-[10px] text-muted-foreground">Normal</p>
                                        <p className="font-bold">${getPrice('normal')}</p>
                                    </div>
                                    <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                                        <p className="text-[10px] text-indigo-300">Holo</p>
                                        <p className="font-bold text-indigo-100">${getPrice('holofoil')}</p>
                                    </div>
                                    <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-[10px] text-emerald-300">Rev. Holo</p>
                                        <p className="font-bold text-emerald-100">${getPrice('reverseHolofoil')}</p>
                                    </div>
                                </div>
                                {card.tcgplayer?.url && (
                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                        <a
                                            href={card.tcgplayer.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300"
                                        >
                                            View on TCGPlayer <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Set</span>
                                </div>
                                <div className="font-medium truncate" title={set?.name}>{set?.name}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Released</span>
                                </div>
                                <div className="font-medium">{set?.releaseDate}</div>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white/5">
                            <span className="text-xs text-muted-foreground block mb-1">Artist</span>
                            <span className="font-medium">{card.artist || 'Unknown'}</span>
                        </div>

                        {/* Attacks (Optional - if we want more detail later) */}
                        {card.attacks && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Attacks</h4>
                                <div className="space-y-2">
                                    {card.attacks.map((attack, idx) => (
                                        <div key={idx} className="p-2 rounded bg-white/5 text-sm">
                                            <div className="flex justify-between font-medium mb-0.5">
                                                <span>{attack.name}</span>
                                                <span>{attack.damage}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{attack.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    {/* Placeholder for future "Add to My Collection" feature */}
                    <Button className="bg-primary-500 hover:bg-primary-600 text-white">Add to Collection</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
