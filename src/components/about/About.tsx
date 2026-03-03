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
    { label: 'Người giao dịch', value: '10K+', icon: Users },
    { label: 'Thẻ có sẵn', value: '50K+', icon: Sparkles },
    { label: 'Giao dịch thành công', value: '100K+', icon: TrendingUp },
    { label: 'Hài lòng khách hàng', value: '99%', icon: Award },
];

const values = [
    {
        icon: Shield,
        title: 'Cam kết chính hãng',
        description: 'Mọi thẻ đều được đội ngũ chuyên gia kiểm định để đảm bảo bạn nhận được sản phẩm thật.',
        color: 'from-primary-500 to-primary-300',
    },
    {
        icon: Heart,
        title: 'Cộng đồng là trên hết',
        description: 'Chúng tôi xây dựng cộng đồng người sưu tầm và giao dịch đam mê thẻ hiếm.',
        color: 'from-secondary-500 to-secondary-300',
    },
    {
        icon: Zap,
        title: 'Nhanh chóng & An toàn',
        description: 'Giao dịch nhanh với bảo mật cấp ngân hàng để bảo vệ bộ sưu tập quý giá của bạn.',
        color: 'from-accent-500 to-accent-300',
    },
    {
        icon: Target,
        title: 'Giá công bằng',
        description: 'Giá minh bạch theo thị trường đảm bảo công bằng cho cả người mua và người bán.',
        color: 'from-primary-400 to-accent-400',
    },
];

const team = [
    {
        name: 'Alex Chen',
        role: 'Người sáng lập & CEO',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        bio: 'Hơn 15 năm trong ngành thẻ sưu tầm',
    },
    {
        name: 'Sarah Johnson',
        role: 'Trưởng bộ phận Kiểm định',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
        bio: 'Chuyên gia định cấp & xác thực thẻ',
    },
    {
        name: 'Michael Park',
        role: 'Giám đốc Công nghệ',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
        bio: 'Xây dựng nền tảng giao dịch an toàn',
    },
    {
        name: 'Emma Williams',
        role: 'Quản lý Cộng đồng',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
        bio: 'Kết nối người sưu tầm toàn cầu',
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
                <div className="absolute top-20 left-20 w-32 h-32 bg-secondary-500/20 rounded-full blur-3xl " />
                <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl " style={{ animationDelay: '1s' }} />

                {/* Content */}
                <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
                    <div className="inline-flex items-center space-x-2 glass-card-strong px-4 py-2 rounded-full mb-6 ">
                        <Sparkles className="h-4 w-4 text-accent-400" />
                        <span className="text-sm font-medium">Về MysticCard</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold mb-6 font-serif">
                        Nền tảng <span className="gradient-text">Giao dịch thẻ</span> đáng tin cậy
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto ">
                        Kết nối người sưu tầm toàn cầu với thẻ hiếm và có giá trị từ năm 2020
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
                                className="glass-card-strong text-center "
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
                    <div className="">
                        <h2 className="text-4xl font-bold mb-6 font-serif">Câu chuyện của chúng tôi</h2>
                        <div className="space-y-4 text-muted-foreground">
                            <p>
                                MysticCard được thành lập năm 2020 bởi những người đam mê sưu tầm thẻ, với tầm nhìn đơn giản:
                                tạo ra nền tảng giao dịch thẻ hiếm đáng tin cậy và dễ sử dụng nhất.
                            </p>
                            <p>
                                Từ một cộng đồng nhỏ những người đam mê, chúng tôi đã phát triển thành sàn giao dịch toàn cầu
                                kết nối hàng nghìn người sưu tầm. Chúng tôi đã hỗ trợ hơn 100.000 giao dịch thành công,
                                giúp người chơi tìm được thẻ mơ ước và xây dựng bộ sưu tập giá trị.
                            </p>
                            <p>
                                Cam kết về tính chính hãng, bảo mật và cộng đồng đã biến chúng tôi thành lựa chọn hàng đầu
                                cho cả người sưu tầm chuyên nghiệp và người giao dịch thông thường. Mọi thẻ qua nền tảng
                                đều được chuyên gia kiểm định, đảm bảo bạn luôn nhận đúng những gì bạn trả.
                            </p>
                        </div>
                        <div className="mt-8">
                            <Button variant="premium" size="lg">
                                Tham gia cộng đồng
                            </Button>
                        </div>
                    </div>

                    <div className="relative ">
                        <div className="aspect-square rounded-2xl overflow-hidden glass-card-strong">
                            <img
                                src="https://images.unsplash.com/photo-1511882150382-421056c481d6?w=800&q=80"
                                alt="Bộ sưu tập thẻ"
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
                    <h2 className="text-4xl font-bold mb-4 font-serif">Giá trị cốt lõi</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Những nguyên tắc dẫn dắt mọi hoạt động của chúng tôi
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {values.map((value, index) => {
                        const Icon = value.icon;
                        return (
                            <Card
                                key={index}
                                className="group overflow-hidden"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Glow Effect */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-10 `} />

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
                    <h2 className="text-4xl font-bold mb-4 font-serif">Đội ngũ của chúng tôi</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Chuyên gia tâm huyết phục vụ cộng đồng người sưu tầm
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {team.map((member, index) => (
                        <Card
                            key={index}
                            className="group text-center overflow-hidden"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="relative aspect-square overflow-hidden">
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-full h-full object-cover group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 " />
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
                            <h2 className="text-4xl font-bold mb-4 font-serif">Liên hệ</h2>
                            <p className="text-xl text-muted-foreground mb-8">
                                Có câu hỏi? Chúng tôi rất muốn lắng nghe bạn. Đội ngũ luôn sẵn sàng hỗ trợ.
                            </p>

                            <div className="grid md:grid-cols-3 gap-6 mb-8">
                                <div className="glass-card p-4 rounded-lg">
                                    <Mail className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-xs text-muted-foreground">support@myscard.com</p>
                                </div>
                                <div className="glass-card p-4 rounded-lg">
                                    <Phone className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Điện thoại</p>
                                    <p className="text-xs text-muted-foreground">+84 9123456789</p>
                                </div>
                                <div className="glass-card p-4 rounded-lg">
                                    <MapPin className="h-6 w-6 text-accent-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium">Địa chỉ</p>
                                    <p className="text-xs text-muted-foreground">Nhà văn hóa Sinh Viên, Đại học Quốc Gia TP.HCM, Q9, TP.HCM</p>
                                </div>
                            </div>

                            <Button variant="premium" size="lg">
                                Liên hệ với chúng tôi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};
