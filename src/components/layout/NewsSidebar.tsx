import React from 'react';
import { Card } from '@/components/ui/card';
import { Newspaper, Clock, TrendingUp, ChevronRight } from 'lucide-react';

interface NewsItem {
    id: number;
    title: string;
    excerpt: string;
    category: string;
    date: string;
    image: string;
    trending?: boolean;
}

const newsData: NewsItem[] = [
    {
        id: 1,
        title: 'New Pokémon Set Released!',
        excerpt: 'Scarlet & Violet - Temporal Forces is now available',
        category: 'Release',
        date: '2 hours ago',
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=400&q=80',
        trending: true
    },
    {
        id: 2,
        title: 'Rare Card Market Update',
        excerpt: 'Charizard prices surge 25% this week',
        category: 'Market',
        date: '5 hours ago',
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80',
        trending: true
    },
    {
        id: 3,
        title: 'Tournament Winners',
        excerpt: 'Regional Championship results announced',
        category: 'Events',
        date: '1 day ago',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80'
    },
    {
        id: 4,
        title: 'Collector\'s Guide',
        excerpt: 'Top 10 cards to invest in 2024',
        category: 'Guide',
        date: '2 days ago',
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=400&q=80'
    },
    {
        id: 5,
        title: 'Mystery Box Reveal',
        excerpt: 'Unboxing the latest premium mystery box',
        category: 'Unboxing',
        date: '3 days ago',
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=400&q=80'
    }
];

export const NewsSidebar: React.FC = () => {
    return (
        <aside className="fixed left-20 top-16 h-[calc(100vh-4rem)] w-80 border-r border-white/10 animate-slide-right hidden xl:block overflow-hidden">
            <div className="h-full flex flex-col glass-card-strong">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500">
                            <Newspaper className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold gradient-text">Latest News</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Stay updated with the latest</p>
                </div>

                {/* News List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {newsData.map((news, index) => (
                        <Card
                            key={news.id}
                            className="glass-card hover-lift cursor-pointer group overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="relative">
                                {/* Image */}
                                <div className="relative h-32 overflow-hidden">
                                    <img
                                        src={news.image}
                                        alt={news.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                                    {/* Category Badge */}
                                    <div className="absolute top-2 left-2">
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-500/90 backdrop-blur-sm text-white">
                                            {news.category}
                                        </span>
                                    </div>

                                    {/* Trending Badge */}
                                    {news.trending && (
                                        <div className="absolute top-2 right-2">
                                            <div className="p-1.5 rounded-full bg-accent-500/90 backdrop-blur-sm">
                                                <TrendingUp className="h-3 w-3 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
                                        {news.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                        {news.excerpt}
                                    </p>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{news.date}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 transition-all font-semibold text-sm text-white shadow-lg hover:shadow-primary-500/50 hover-lift">
                        View All News
                    </button>
                </div>
            </div>
        </aside>
    );
};
