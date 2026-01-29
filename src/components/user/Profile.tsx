import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    User, Mail, Edit, Share2, Layers, Award, TrendingUp,
    Settings, Image as ImageIcon, LifeBuoy, CreditCard,
    Briefcase, Activity
} from 'lucide-react';

export const Profile: React.FC = () => {
    // Mock Data based on screenshot
    const user = {
        name: "Truong Minh Khanh",
        username: "@kaylee",
        email: "truongminhkhanh@fpt.edu.vn",
        joinDate: "January 2024",
        avatar: "https://ui-avatars.com/api/?name=Truong+Minh+Khanh&background=3D7DCA&color=fff",
        cover: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80" // Soft gradient placeholder
    };

    const stats = {
        totalCards: 156,
        totalSets: 23,
        totalBadges: 8,
        totalValue: 48500000
    };

    const [activeTab, setActiveTab] = useState<'stats' | 'badges' | 'support'>('stats');

    return (
        <div className="min-h-screen pb-12">
            {/* 1. Header Section */}
            <div className="relative mb-8">
                {/* Cover Image */}
                <div className="h-48 md:h-64 rounded-b-3xl relative group">
                    <div className="absolute inset-0 bg-transparent" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 text-white hover:bg-white/20"
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Edit Cover
                    </Button>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-4 -mt-16 relative flex flex-col md:flex-row items-end md:items-center gap-6">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-[#0B0112] bg-[#1a0a2e] flex items-center justify-center overflow-hidden">
                            <span className="text-3xl font-bold text-primary-400">TM</span>
                            {/* In real app: <img src={user.avatar} className="w-full h-full object-cover" /> */}
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-[#0B0112] flex items-center justify-center">
                            <Edit className="w-3 h-3 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 mb-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                            <Edit className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
                            <Award className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-primary-400 font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Button variant="outline" className="glass-card">
                            <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button variant="premium">
                            <Settings className="w-4 h-4 mr-2" /> Settings
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* 2. Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#FFF9C4] uppercase tracking-wider mb-1">Total Cards</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.totalCards}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#E1F5FE] uppercase tracking-wider mb-1">Total Sets</div>
                            <div className="text-2xl font-bold text-blue-400">{stats.totalSets}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#E8F5E9] uppercase tracking-wider mb-1">Total Badges</div>
                            <div className="text-2xl font-bold text-green-400">{stats.totalBadges}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-4 text-center">
                            <div className="text-xs font-bold text-[#FFEBEE] uppercase tracking-wider mb-1">Total Value</div>
                            <div className="text-2xl font-bold text-red-400">{stats.totalValue.toLocaleString('vi-VN')} đ</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Action Bar */}
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                    <button className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors">
                        <User className="w-4 h-4" /> View Social Profile
                    </button>
                    <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                        <Edit className="w-4 h-4" /> Edit Background
                    </button>
                </div>

                {/* 4. Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-lg">
                    {['stats', 'badges', 'support'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                ? 'bg-primary-500 text-white shadow-lg'
                                : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* 5. Main Collection Summary */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-yellow-400">
                        <Briefcase className="w-5 h-5" />
                        Portfolio: Main Collection
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">156</div>
                                <div className="text-xs text-muted-foreground">Cards</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-400">23</div>
                                <div className="text-xs text-muted-foreground">Sets</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-400">8</div>
                                <div className="text-xs text-muted-foreground">Graded</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-transparent border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-red-400">48.700.000 đ</div>
                                <div className="text-xs text-muted-foreground">Value</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 6. Performance Chart Placeholder */}
                <div>
                    <h3 className="text-lg font-bold font-serif mb-4 flex items-center gap-2 text-blue-400">
                        <Activity className="w-5 h-5" />
                        Your Performance
                    </h3>
                    <Card className="glass-card p-6 min-h-[200px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            {/* Fake Graph SVG */}
                            <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
                                <path
                                    d="M0,150 Q250,50 500,100 T1000,20"
                                    fill="none"
                                    stroke="#3D7DCA"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M0,150 Q250,50 500,100 T1000,20 V200 H0 Z"
                                    fill="url(#gradient)"
                                    opacity="0.3"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3D7DCA" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                <TrendingUp className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-muted-foreground text-sm max-w-md text-center">
                                Theo dõi hiệu suất danh mục đầu tư, biến động giá thị trường và xếp hạng bộ sưu tập của bạn theo thời gian thực.
                            </p>
                        </div>
                    </Card>
                </div>

                <div className="pt-4">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 h-10">
                        View Transaction Logs
                    </Button>
                </div>
            </div>
        </div>
    );
};
