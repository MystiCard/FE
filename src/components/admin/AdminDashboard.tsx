import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    Package,
    AlertCircle,
    ArrowUp,
    ArrowDown
} from 'lucide-react';

const stats = [
    {
        title: 'Doanh thu',
        value: '45.231đ',
        change: '+20.1%',
        trend: 'up',
        icon: DollarSign,
    },
    {
        title: 'Đơn hàng',
        value: '1.234',
        change: '+12.5%',
        trend: 'up',
        icon: ShoppingBag,
    },
    {
        title: 'Người dùng',
        value: '2.847',
        change: '+8.2%',
        trend: 'up',
        icon: Users,
    },
    {
        title: 'Sản phẩm',
        value: '456',
        change: '-2.4%',
        trend: 'down',
        icon: Package,
    },
];

const recentOrders = [
    { id: '#1234', customer: 'John Doe', product: 'Charizard VMAX', amount: '$299.99', status: 'Completed' },
    { id: '#1235', customer: 'Jane Smith', product: 'Pikachu VMAX', amount: '$149.99', status: 'Processing' },
    { id: '#1236', customer: 'Bob Johnson', product: 'Umbreon VMAX', amount: '$349.99', status: 'Pending' },
    { id: '#1237', customer: 'Alice Brown', product: 'Rayquaza VMAX', amount: '$199.99', status: 'Completed' },
    { id: '#1238', customer: 'Charlie Wilson', product: 'Mewtwo GX', amount: '$89.99', status: 'Shipped' },
];

export const AdminDashboard: React.FC = () => {
    return (
        <div className="py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 font-serif">Bảng điều khiển Admin</h1>
                <p className="text-muted-foreground">Chào mừng trở lại, Admin!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={index}
                            className="glass-card-strong "
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold gradient-text mb-2">
                                    {stat.value}
                                </div>
                                <div className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {stat.trend === 'up' ? (
                                        <ArrowUp className="h-4 w-4 mr-1" />
                                    ) : (
                                        <ArrowDown className="h-4 w-4 mr-1" />
                                    )}
                                    <span>{stat.change} so với tháng trước</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Đơn hàng gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-3 font-semibold">Mã đơn</th>
                                        <th className="text-left p-3 font-semibold">Khách hàng</th>
                                        <th className="text-left p-3 font-semibold">Sản phẩm</th>
                                        <th className="text-right p-3 font-semibold">Số tiền</th>
                                        <th className="text-right p-3 font-semibold">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order, index) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-white/5 hover:bg-white/5 "
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <td className="p-3 font-medium">{order.id}</td>
                                            <td className="p-3">{order.customer}</td>
                                            <td className="p-3 text-muted-foreground">{order.product}</td>
                                            <td className="p-3 text-right font-semibold">{order.amount}</td>
                                            <td className="p-3 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                                    order.status === 'Processing' ? 'bg-primary-500/20 text-primary-300' :
                                                        order.status === 'Shipped' ? 'bg-secondary-500/20 text-secondary-300' :
                                                            'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {order.status === 'Completed' ? 'Hoàn thành' : order.status === 'Processing' ? 'Đang xử lý' : order.status === 'Shipped' ? 'Đã giao' : 'Chờ xử lý'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thao tác nhanh</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Thêm sản phẩm</div>
                                    <div className="text-xs text-muted-foreground">Tạo sản phẩm mới</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Quản lý người dùng</div>
                                    <div className="text-xs text-muted-foreground">Xem tất cả người dùng</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-primary-400" />
                                <div>
                                    <div className="font-semibold">Phân tích</div>
                                    <div className="text-xs text-muted-foreground">Xem báo cáo</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full glass-card p-4 rounded-lg hover:bg-white/10 text-left">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-400" />
                                <div>
                                    <div className="font-semibold">Cảnh báo</div>
                                    <div className="text-xs text-muted-foreground">3 vấn đề chờ xử lý</div>
                                </div>
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Alert */}
            <Card className="mt-6 border-l-4 border-amber-500">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold mb-1">Cảnh báo tồn kho thấp</h3>
                            <p className="text-sm text-muted-foreground">
                                5 sản phẩm sắp hết hàng. Cân nhắc nhập thêm sớm.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
