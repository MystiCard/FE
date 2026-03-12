import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const HeroSection: React.FC = () => {
    return (
        <section className="relative min-h-[320px] md:min-h-[380px] flex items-center justify-center overflow-hidden rounded-2xl mb-8">
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
            <div className="absolute top-20 left-20 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl " style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl " style={{ animationDelay: '1s' }} />
            <div className="absolute top-40 right-40 w-24 h-24 bg-primary-400/20 rounded-full blur-3xl " style={{ animationDelay: '2s' }} />

            {/* Content */}
            <div className="relative z-20 text-center px-4 max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                    <span className="text-[11px] md:text-xs font-medium">Đã có Hộp bí ẩn mới</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 font-serif">
                    Sưu tầm <span className="gradient-text">những thẻ hiếm nhất</span>
                </h1>

                <p className="text-base md:text-lg text-muted-foreground mb-4 md:mb-5">
                    Giao dịch, thi đấu và xây dựng bộ sưu tập thẻ đỉnh cao
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                    <Link to="/portfolio">
                        <Button variant="premium" size="lg" className="text-sm md:text-base px-5 md:px-6 py-2 md:py-2.5">
                            Khám phá bộ sưu tập
                        </Button>
                    </Link>
                    <Link to="/marketplace">
                        <Button variant="outline" size="lg" className="text-sm md:text-base px-5 md:px-6 py-2 md:py-2.5 glass-card hover:bg-white/20">
                            Xem sàn giao dịch
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-10">
                    <div className="glass-card p-3 md:p-4 rounded-lg">
                        <div className="text-xl md:text-2xl font-bold gradient-text">10K+</div>
                        <div className="text-sm text-muted-foreground mt-1">Thẻ có sẵn</div>
                    </div>
                    <div className="glass-card p-3 md:p-4 rounded-lg">
                        <div className="text-xl md:text-2xl font-bold gradient-text">5K+</div>
                        <div className="text-sm text-muted-foreground mt-1">Người giao dịch</div>
                    </div>
                    <div className="glass-card p-3 md:p-4 rounded-lg">
                        <div className="text-xl md:text-2xl font-bold gradient-text">99%</div>
                        <div className="text-sm text-muted-foreground mt-1">Hài lòng</div>
                    </div>
                </div>
            </div>
        </section>
    );
};
