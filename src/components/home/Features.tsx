import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Zap, TrendingUp, Users } from 'lucide-react';

const features = [
    {
        icon: Shield,
        title: 'Giao dịch an toàn',
        description: 'Giao dịch yên tâm với nền tảng bảo mật và bảo vệ người mua',
    },
    {
        icon: Zap,
        title: 'Giao hàng nhanh',
        description: 'Nhận thẻ ngay sau khi thanh toán',
    },
    {
        icon: TrendingUp,
        title: 'Thị trường theo thời gian thực',
        description: 'Theo dõi giá trị thẻ và xu hướng thị trường',
    },
    {
        icon: Users,
        title: 'Cộng đồng sôi động',
        description: 'Tham gia cùng hàng ngàn người sưu tầm và giao dịch',
    },
];

export const Features: React.FC = () => {
    return (
        <section className="py-8 md:py-10 min-h-[320px] flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 font-serif">Tại sao chọn MysticCard?</h2>
                <p className="text-sm md:text-base text-muted-foreground">Nền tảng hàng đầu cho người sưu tầm thẻ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <Card
                            key={index}
                            className=""
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <CardHeader className="pb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-3">
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-base md:text-lg">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <CardDescription className="text-xs md:text-sm">{feature.description}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
};
