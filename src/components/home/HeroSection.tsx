import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
    return (
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden rounded-2xl mb-12">
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1511882150382-421056c481d6?w=1920&q=80)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.3
                }}
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-primary-800/60 to-accent-900/80 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />

            {/* Floating Decorative Elements */}
            <div className="absolute top-20 left-20 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-40 right-40 w-24 h-24 bg-primary-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

            {/* Content */}
            <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 animate-scale-in">
                    <Sparkles className="h-4 w-4 text-accent-400" />
                    <span className="text-sm font-medium">New Mystery Boxes Available</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up font-serif">
                    Collect the <span className="gradient-text">Rarest Cards</span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-8 animate-slide-up stagger-1">
                    Trade, battle, and build your ultimate card collection
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up stagger-2">
                    <Button variant="premium" size="lg" className="text-lg px-8">
                        Explore Collection
                    </Button>
                    <Button variant="outline" size="lg" className="text-lg px-8 glass-card hover:bg-white/20">
                        View Marketplace
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 mt-16 animate-slide-up stagger-3">
                    <div className="glass-card p-6 rounded-xl">
                        <div className="text-3xl font-bold gradient-text">10K+</div>
                        <div className="text-sm text-muted-foreground mt-1">Cards Available</div>
                    </div>
                    <div className="glass-card p-6 rounded-xl">
                        <div className="text-3xl font-bold gradient-text">5K+</div>
                        <div className="text-sm text-muted-foreground mt-1">Active Traders</div>
                    </div>
                    <div className="glass-card p-6 rounded-xl">
                        <div className="text-3xl font-bold gradient-text">99%</div>
                        <div className="text-sm text-muted-foreground mt-1">Satisfaction</div>
                    </div>
                </div>
            </div>
        </section>
    );
};
