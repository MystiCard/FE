import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Zap, TrendingUp, Users } from 'lucide-react';

const features = [
    {
        icon: Shield,
        title: 'Secure Trading',
        description: 'Trade with confidence using our secure platform and buyer protection',
    },
    {
        icon: Zap,
        title: 'Instant Delivery',
        description: 'Get your digital cards instantly after purchase',
    },
    {
        icon: TrendingUp,
        title: 'Market Insights',
        description: 'Track card values and market trends in real-time',
    },
    {
        icon: Users,
        title: 'Active Community',
        description: 'Join thousands of collectors and traders worldwide',
    },
];

export const Features: React.FC = () => {
    return (
        <section className="py-16">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4 font-serif">Why Choose MyScard?</h2>
                <p className="text-xl text-muted-foreground">The ultimate platform for card collectors</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <Card
                            key={index}
                            className="hover-lift animate-slide-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4">
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{feature.description}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
};
