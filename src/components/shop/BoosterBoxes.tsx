import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Sparkles, Heart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

const boosterBoxes = [
    {
        id: 1,
        name: 'Scarlet & Violet Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 144.99,
        image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600&q=80',
        inStock: true,
    },
    {
        id: 2,
        name: 'Obsidian Flames Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 139.99,
        image: 'https://images.unsplash.com/photo-1611068813580-c0c3c4a0d8a8?w=600&q=80',
        inStock: true,
    },
    {
        id: 3,
        name: 'Paldean Fates Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 159.99,
        image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=600&q=80',
        inStock: false,
    },
    {
        id: 4,
        name: 'Temporal Forces Booster Box',
        description: '36 packs per box, 10 cards per pack',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1542779283-429940ce8336?w=600&q=80',
        inStock: true,
    },
];

export const BoosterBoxes: React.FC = () => {
    const { addItem: addToCart } = useCart();

    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 font-serif">Hộp Booster</h1>
                <p className="text-muted-foreground">Giá trị tốt nhất với hộp booster niêm phong</p>
            </div>

            {/* Info Banner */}
            <div className="glass-card-strong p-6 rounded-xl mb-8 border-l-4 border-accent-500">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-accent-500/20">
                        <Package className="h-6 w-6 text-accent-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-1">Tại sao nên mua hộp Booster?</h3>
                        <p className="text-sm text-muted-foreground">
                            Mỗi hộp booster gồm 36 gói với thẻ hiếm đảm bảo. Phù hợp cho người sưu tầm và người chơi muốn mở rộng bộ sưu tập hoặc build deck cạnh tranh.
                        </p>
                    </div>
                </div>
            </div>

            {/* Booster Boxes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boosterBoxes.map((box, index) => (
                    <Card
                        key={box.id}
                        className="group overflow-hidden"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="md:flex">
                            <div className="relative md:w-1/2 aspect-square md:aspect-auto overflow-hidden">
                                <img
                                    src={box.image}
                                    alt={box.name}
                                    className="w-full h-full object-cover group-hover:scale-110"
                                />
                                {!box.inStock && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="glass-card-strong px-4 py-2 rounded-full font-semibold">
                                            Hết hàng
                                        </span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="absolute top-2 left-2 p-2 glass-card-strong rounded-full hover:bg-white/20 "
                                >
                                    <Heart className="h-4 w-4" />
                                </button>
                            </div>

                            <CardContent className="md:w-1/2 p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-xl mb-2">{box.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{box.description}</p>

                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="h-4 w-4 text-accent-500" />
                                        <span className="text-sm">Đảm bảo có thẻ hiếm trong mỗi hộp</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-3xl font-bold gradient-text mb-4">
                                        ${box.price}
                                    </div>

                                    <Button
                                        variant="premium"
                                        className="w-full"
                                        disabled={!box.inStock}
                                        onClick={() => box.inStock && addToCart({ id: box.id, name: box.name, price: box.price, image: box.image })}
                                    >
                                        {box.inStock ? 'Thêm vào giỏ' : 'Thông báo khi có hàng'}
                                    </Button>
                                </div>
                            </CardContent>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <h3 className="font-semibold mb-2">Niêm phong & Chính hãng</h3>
                    <p className="text-sm text-muted-foreground">Tất cả hộp niêm phong nhà máy, 100% chính hãng</p>
                </div>
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">🚚</div>
                    <h3 className="font-semibold mb-2">Miễn phí vận chuyển</h3>
                    <p className="text-sm text-muted-foreground">Miễn phí ship cho mọi đơn hộp booster</p>
                </div>
                <div className="glass-card p-6 rounded-xl text-center">
                    <div className="text-4xl mb-2">💎</div>
                    <h3 className="font-semibold mb-2">Giá tốt nhất</h3>
                    <p className="text-sm text-muted-foreground">Cam kết giá thấp nhất cho sản phẩm niêm phong</p>
                </div>
            </div>
        </div>
    );
};
