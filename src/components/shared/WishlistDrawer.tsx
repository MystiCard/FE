import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';

interface WishlistDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({ isOpen, onClose }) => {
    const { items, removeItem, itemCount } = useWishlist();

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md glass-card-strong border-l border-white/20 z-50 flex flex-col animate-slide-down shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-300 flex items-center justify-center">
                                <Heart className="h-5 w-5 text-white fill-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Wishlist</h2>
                                <p className="text-sm text-muted-foreground">{itemCount} items</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Wishlist Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Your wishlist is empty</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <Card key={item.id} className="group hover-lift overflow-hidden">
                                <div className="flex gap-4 p-4">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-20 h-28 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
                                        {item.rarity && (
                                            <p className="text-xs text-muted-foreground mb-2">{item.rarity}</p>
                                        )}
                                        <div className="text-lg font-bold gradient-text mb-3">
                                            ${item.price.toFixed(2)}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="premium" size="sm" className="flex-1">
                                                Add to Cart
                                            </Button>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-md transition-colors text-red-400"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
