import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { blindBoxApi, BlindBox } from '@/utils/api';

const PLACEHOLDER_BOX =
    'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=400&q=80';

const formatVND = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString('vi-VN') + ' đ' : '—';

export const HomeBlindBoxes: React.FC = () => {
    const [boxes, setBoxes] = useState<BlindBox[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const page = await blindBoxApi.getAllBlindBoxes();
                const data = page?.content ?? [];
                // Hiển thị cả hộp SOLD OUT (không cho mua), chỉ ẩn các trạng thái admin không muốn public
                const visible = (data || []).filter(
                    (b) => b.blindBoxStatus !== 'DISABLED' && b.blindBoxStatus !== 'DRAFT'
                );
                setBoxes(visible.slice(0, 4));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Không tải được Hộp bí ẩn');
                setBoxes([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <section className="py-8 md:py-10">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 font-serif">Hộp bí ẩn</h2>
                    <p className="text-sm md:text-base text-muted-foreground">Mở hộp, nhận thẻ ngẫu nhiên và thử vận may</p>
                </div>
                <Link to="/mystery-box">
                    <Button variant="outline" className="glass-card hover:bg-white/20">
                        Khám phá tất cả
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 md:gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="overflow-hidden animate-pulse">
                            <div className="aspect-[3/4] bg-white/10" />
                            <CardContent className="p-3 space-y-2">
                                <div className="h-5 bg-white/10 rounded w-3/4" />
                                <div className="h-4 bg-white/10 rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 text-muted-foreground">{error}</div>
            ) : boxes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Chưa có Hộp bí ẩn</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3">
                    {boxes.map((box) => {
                        const soldOut = String(box.blindBoxStatus || '').toUpperCase() === 'OUT_OF_STOCK';
                        const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
                            soldOut ? (
                                <div className="block cursor-not-allowed">{children}</div>
                            ) : (
                                <Link to="/mystery-box" className="block">
                                    {children}
                                </Link>
                            );

                        return (
                            <Card
                                key={box.blindBoxId}
                                className={`group overflow-hidden transition-colors border border-border/60 bg-background/70 ${soldOut ? 'opacity-80' : 'hover:border-yellow-400/60'} text-left`}
                            >
                                <Wrapper>
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <img
                                            src={box.imageUrl || PLACEHOLDER_BOX}
                                            alt={box.name}
                                            className={`w-full h-full object-cover transition-transform ${soldOut ? '' : 'group-hover:scale-105'}`}
                                            onError={(e) => {
                                                e.currentTarget.src = PLACEHOLDER_BOX;
                                            }}
                                        />
                                        {soldOut && (
                                            <div className="absolute top-2 left-2">
                                                <div className="glass-card-strong px-2 py-1 rounded-full text-xs font-bold text-yellow-300 border border-yellow-400/30">
                                                    SOLD OUT
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0.5 left-0.5 right-0.5">
                                            <div className="glass-card-strong px-1 py-0.5 rounded text-[9px] font-medium text-yellow-300">
                                                {formatVND(box.drawPrice)} / lần mở
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-1.5 md:p-2">
                                        <h3 className="font-semibold text-[10px] md:text-[11px] mb-0.5 line-clamp-2">{box.name}</h3>
                                        {box.description && (
                                            <p className="text-[9px] md:text-[10px] text-muted-foreground line-clamp-2 mb-1.5">
                                                {box.description}
                                            </p>
                                        )}
                                        <Button variant="premium" size="sm" className="w-full h-7 md:h-8 text-[10px]" disabled={soldOut}>
                                            {soldOut ? 'Đã hết hàng' : 'Mở hộp ngay'}
                                        </Button>
                                    </CardContent>
                                </Wrapper>
                            </Card>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
