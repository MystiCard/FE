import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Heart,
    Shield,
    Zap,
    Users,
    Award,
    TrendingUp,
    Target,
    Sparkles,
    Mail,
    MapPin,
    Phone
} from 'lucide-react';

const stats = [
    { label: 'Active Traders', value: '10K+', icon: Users },
    { label: 'Cards Available', value: '50K+', icon: Sparkles },
    { label: 'Successful Trades', value: '100K+', icon: TrendingUp },
    { label: 'Customer Satisfaction', value: '99%', icon: Award },
];

const values = [
    {
        icon: Shield,
        title: 'Authenticity Guaranteed',
        description: 'Every card is verified and authenticated by our expert team to ensure you receive genuine products.',
        color: 'from-primary-500 to-primary-300',
    },
    {
        icon: Heart,
        title: 'Community First',
        description: 'We build a passionate community of collectors and traders who share the love for rare cards.',
        color: 'from-secondary-500 to-secondary-300',
    },
    {
        icon: Zap,
        title: 'Fast & Secure',
        description: 'Lightning-fast transactions with bank-level security to protect your valuable collection.',
        color: 'from-accent-500 to-accent-300',
    },
    {
        icon: Target,
        title: 'Fair Pricing',
        description: 'Transparent market-based pricing ensures fair value for both buyers and sellers.',
        color: 'from-primary-400 to-accent-400',
    },
];

const team = [
    {
        name: 'Alex Chen',
        role: 'Founder & CEO',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        bio: '15+ years in trading card industry',
    },
    {
        name: 'Sarah Johnson',
        role: 'Head of Authentication',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
        bio: 'Expert card grader & authenticator',
    },
    {
        name: 'Michael Park',
        role: 'Chief Technology Officer',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
        bio: 'Building secure trading platforms',
    },
    {
        name: 'Emma Williams',
        role: 'Community Manager',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
        bio: 'Connecting collectors worldwide',
    },
];

export const About: React.FC = () => {
    return (
        <div className="py-8">
            {/* Hero Section */}
            <section className="relative min-h-[400px] flex items-center justify-center overflow-hidden rounded-2xl mb-16">
                {/* Background */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1511882150382-421056c481d6?w=1920&q=80)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.2
                    }}
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/60 to-accent-900/80 z-10" />

                {/* Floating Elements */}
                <div className="absolute top-20 left-20 w-32 h-32 bg-secondary-500/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

                {/* Content */}
                <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
                    <div className="inline-flex items-center space-x-2 glass-card-strong px-4 py-2 rounded-full mb-6 animate-scale-in">
                        <Sparkles className="h-4 w-4 text-accent-400" />
                        <span className="text-sm font-medium">About MysticCard</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-slide-up font-serif">
                        Your Trusted <span className="gradient-text">Card Trading</span> Platform
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up stagger-1">
                        Connecting collectors worldwide with rare and valuable trading cards since 2020
                    </p>
                </div>
            </section>

            {/* Stats Section */}
            <section className="mb-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <Card
                                key={index}
                                className="glass-card-strong text-center hover-lift animate-slide-up"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <CardContent className="p-6">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="text-3xl font-bold gradient-text mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {stat.label}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Our Story */}
            <section className="mb-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="animate-slide-up">
                        <h2 className="text-4xl font-bold mb-6 font-serif">Our Story</h2>
                        <div className="space-y-4 text-muted-foreground">
                            <p>
                                Founded in 2020 by passionate card collectors, MysticCard was born from a simple vision:
                                to create the most trusted and user-friendly platform for trading rare cards.
                            </p>
                            <p>
                                What started as a small community of enthusiasts has grown into a global marketplace
                                connecting thousands of collectors. We've facilitated over 100,000 successful trades,
                                helping collectors find their dream cards and build valuable portfolios.
                            </p>
                            <p>
                                Our commitment to authenticity, security, and community has made us the go-to platform
                                for serious collectors and casual traders alike. Every card that passes through our
                                platform is verified by experts, ensuring you always get what you pay for.
                            </p>
                        </div>
                        <div className="mt-8">
                            <Button variant="premium" size="lg">
                                Join Our Community
                            </Button>
                        </div>
                    </div>

                    <div className="relative animate-slide-up stagger-1">
                        <div className="aspect-square rounded-2xl overflow-hidden glass-card-strong">
                            <img
                                src="https://images.unsplash.com/photo-1511882150382-421056c481d6?w=800&q=80"
                                alt="Trading cards collection"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent-500/30 rounded-full blur-2xl" />
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-secondary-500/30 rounded-full blur-2xl" />
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="mb-16">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-4 font-serif">Our Core Values</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        The principles that guide everything we do
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {values.map((value, index) => {
                        const Icon = value.icon;
                        return (
                            <Card
                                key={index}
                                className="group hover-lift animate-slide-up overflow-hidden"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Glow Effect */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                                <CardContent className="p-6 relative">
                                    <div className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center`}>
                                        <Icon className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                                    <p className="text-muted-foreground">{value.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* Team Section */}
            <section className="mb-16">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-4 font-serif">Meet Our Team</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Passionate experts dedicated to serving the collector community
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {team.map((member, index) => (
                        <Card
                            key={index}
                            className="group hover-lift animate-slide-up text-center overflow-hidden"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="relative aspect-square overflow-hidden">
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <CardContent className="p-6">
                                <h3 className="font-bold text-lg mb-1">{member.name}</h3>
                                <p className="text-sm text-accent-400 mb-2">{member.role}</p>
                                <p className="text-xs text-muted-foreground">{member.bio}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Contact CTA */}
            <section>
                <Card className="glass-card-strong overflow-hidden relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500" />
                    </div>

                    <CardContent className="p-12 relative">
                        <div className="max-w-3xl mx-auto text-center">
                            <h2 className="text-4xl font-bold mb-4 font-serif">Get In Touch</h2>
                            <p className="text-xl text-muted-foreground mb-8">
                                Have questions? We'd love to hear from you. Our team is here to help.
                            </p>

                            <div className="grid md:grid-cols-3 gap-6 mb-8">
                                <div className="glass-card p-4 rounded-lg">
                                    <Mail className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-xs text-muted-foreground">support@myscard.com</p>
                                </div>
                                <div className="glass-card p-4 rounded-lg">
                                    <Phone className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Phone</p>
                                    <p className="text-xs text-muted-foreground">+1 (555) 123-4567</p>
                                </div>
                                <div className="glass-card p-4 rounded-lg">
                                    <MapPin className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Location</p>
                                    <p className="text-xs text-muted-foreground">San Francisco, CA</p>
                                </div>
                            </div>

                            <Button variant="premium" size="lg">
                                Contact Us
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};
