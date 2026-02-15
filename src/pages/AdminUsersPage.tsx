import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Search,
    UserCheck,
    UserX,
    Shield,
    Users as UsersIcon,
    Mail,
    Ban,
    CheckCircle
} from 'lucide-react';
import { userApi, UserProfile } from '@/utils/api';

export const AdminUsersPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [users, setUsers] = React.useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('');

    // Load users on mount
    React.useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await userApi.getAllUsers();
            setUsers(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBanUser = async (userId: string) => {
        if (!confirm('Are you sure you want to ban this user?')) return;

        try {
            await userApi.updateUserStatus(userId, 'BANNED');
            await loadUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to ban user');
        }
    };

    const handleUnbanUser = async (userId: string) => {
        try {
            await userApi.updateUserStatus(userId, 'ACTIVE');
            await loadUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to unban user');
        }
    };

    // Ensure users is always an array
    const usersList = Array.isArray(users) ? users : [];

    const stats = [
        {
            title: 'Total Users',
            value: usersList.length.toString(),
            icon: UsersIcon,
            color: 'from-primary-500 to-primary-300',
            change: `${usersList.length} users`
        },
        {
            title: 'Active Users',
            value: usersList.filter(u => u.status === 'ACTIVE').length.toString(),
            icon: UserCheck,
            color: 'from-green-500 to-emerald-500',
            change: 'Active'
        },
        {
            title: 'Admins',
            value: usersList.filter(u => u.role === 'ADMIN').length.toString(),
            icon: Shield,
            color: 'from-accent-500 to-accent-300',
            change: 'Admin role'
        },
        {
            title: 'Banned Users',
            value: usersList.filter(u => u.status === 'BANNED').length.toString(),
            icon: UserX,
            color: 'from-red-500 to-orange-500',
            change: 'Banned'
        },
    ];

    const filteredUsers = usersList.filter(user => {
        const matchesSearch = (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

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
                        <Card key={index} className="glass-card-strong ">
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
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="">All Roles</option>
                            <option value="CUSTOMER">Customer</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="BANNED">Banned</option>
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
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Loading users...</div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No users found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">User</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Role</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Phone</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Wallet Balance</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Status</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.userId} className="border-b border-white/5 hover:bg-white/5 ">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80'}
                                                        alt={user.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80';
                                                        }}
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
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-primary-500/20 text-primary-400'
                                                    }`}>
                                                    {user.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                                                    {user.role || 'CUSTOMER'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm">{user.phone || 'N/A'}</td>
                                            <td className="p-4 text-right font-semibold text-accent-400">
                                                {user.walletResponse?.balance?.toLocaleString('vi-VN') || '0'} đ
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                                    user.status === 'BANNED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {user.status || 'ACTIVE'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {user.status === 'BANNED' ? (
                                                        <button
                                                            onClick={() => handleUnbanUser(user.userId)}
                                                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded-md text-green-400 text-xs font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <CheckCircle className="h-3 w-3" />
                                                            Unban
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleBanUser(user.userId)}
                                                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-md text-red-400 text-xs font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <Ban className="h-3 w-3" />
                                                            Ban
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
