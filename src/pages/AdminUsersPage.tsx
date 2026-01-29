import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Search,
    UserCheck,
    UserX,
    Shield,
    Users as UsersIcon,
    TrendingUp,
    Mail,
    MoreVertical
} from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'Customer' | 'Admin' | 'Moderator';
    status: 'Active' | 'Banned' | 'Pending';
    joinDate: string;
    totalOrders: number;
    totalSpent: number;
    avatar: string;
}

const sampleUsers: User[] = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Customer',
        status: 'Active',
        joinDate: '2024-01-15',
        totalOrders: 12,
        totalSpent: 1245.50,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80'
    },
    {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'Customer',
        status: 'Active',
        joinDate: '2024-02-20',
        totalOrders: 8,
        totalSpent: 890.00,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80'
    },
    {
        id: 3,
        name: 'Mike Wilson',
        email: 'mike@example.com',
        role: 'Moderator',
        status: 'Active',
        joinDate: '2023-12-10',
        totalOrders: 25,
        totalSpent: 3450.75,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'
    },
    {
        id: 4,
        name: 'Emma Davis',
        email: 'emma@example.com',
        role: 'Customer',
        status: 'Banned',
        joinDate: '2024-03-05',
        totalOrders: 2,
        totalSpent: 150.00,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80'
    },
];

export const AdminUsersPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [users] = React.useState<User[]>(sampleUsers);

    const stats = [
        {
            title: 'Total Users',
            value: '1,234',
            icon: UsersIcon,
            color: 'from-primary-500 to-primary-300',
            change: '+18%'
        },
        {
            title: 'Active Users',
            value: '1,156',
            icon: UserCheck,
            color: 'from-green-500 to-emerald-500',
            change: '+12%'
        },
        {
            title: 'New This Month',
            value: '89',
            icon: TrendingUp,
            color: 'from-accent-500 to-accent-300',
            change: '+25%'
        },
        {
            title: 'Banned Users',
            value: '12',
            icon: UserX,
            color: 'from-red-500 to-orange-500',
            change: '-5%'
        },
    ];

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold font-serif gradient-text">User Management</h1>
                <p className="text-muted-foreground mt-1">Manage users and permissions</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="glass-card-strong hover-lift">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <span className="text-xs text-green-400 font-medium">{stat.change}</span>
                                </div>
                                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.title}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search and Filters */}
            <Card className="glass-card-strong">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            />
                        </div>
                        <select className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option>All Roles</option>
                            <option>Customer</option>
                            <option>Moderator</option>
                            <option>Admin</option>
                        </select>
                        <select className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Banned</option>
                            <option>Pending</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Users ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">User</th>
                                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Role</th>
                                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Join Date</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Orders</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Total Spent</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Status</th>
                                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === 'Admin' ? 'bg-red-500/20 text-red-400' :
                                                user.role === 'Moderator' ? 'bg-secondary-500/20 text-secondary-400' :
                                                    'bg-primary-500/20 text-primary-400'
                                                }`}>
                                                {user.role === 'Admin' && <Shield className="h-3 w-3" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">{user.joinDate}</td>
                                        <td className="p-4 text-right text-sm">{user.totalOrders}</td>
                                        <td className="p-4 text-right font-semibold text-accent-400">${user.totalSpent.toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                                user.status === 'Banned' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-white/10 rounded-md transition-colors">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
