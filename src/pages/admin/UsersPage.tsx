import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Search,
    UserCheck,
    UserX,
    Shield,
    Users as UsersIcon,
    Mail,
    Ban,
    CheckCircle,
    UserPlus,
    User,
    Phone,
    Lock,
    Upload,
    Truck,
} from 'lucide-react';
import { userApi, UserProfile, AdminCreateUserRequest, roleApi, permissionApi, type Role } from '@/api';
import type { Permission } from '@/api/roles';
import { AddressSelect } from '@/components/shared/AddressSelect';
import { ADMIN_API_PAGE_SIZE } from './adminApiPageSize';
import { toast } from '@/components/ui/use-toast';
import { useAdminConfirm } from '@/components/admin';

async function fetchAllRolesForUser(userId: string): Promise<Role[]> {
    const out: Role[] = [];
    let page = 1;
    let totalPages = 1;
    do {
        const res = await roleApi.getByUserId(userId, page, ADMIN_API_PAGE_SIZE, true);
        out.push(...(res.content || []));
        totalPages = Math.max(1, res.totalPages ?? 1);
        page++;
    } while (page <= totalPages);
    return out;
}

async function fetchAllPermissionsForRole(roleCode: string): Promise<Permission[]> {
    const out: Permission[] = [];
    let page = 1;
    let totalPages = 1;
    do {
        const res = await permissionApi.getByRoleCode(roleCode, page, ADMIN_API_PAGE_SIZE, true);
        out.push(...(res.content || []));
        totalPages = Math.max(1, res.totalPages ?? 1);
        page++;
    } while (page <= totalPages);
    return out;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: 'USER', label: 'Khách hàng' },
    { value: 'ADMIN', label: 'Quản trị' },
    { value: 'SHIPPER', label: 'Shipper' },
];

const PERMISSION_LABELS: Record<
    string,
    {
        name: string;
        description: string;
    }
> = {
    PERM_001: {
        name: 'Quyền quản trị',
        description: 'Toàn quyền quản lý cấu hình và dữ liệu hệ thống.',
    },
    PERM_002: {
        name: 'Quyền đăng bài',
        description: 'Được tạo và quản lý bài đăng bán hàng.',
    },
    PERM_003: {
        name: 'Quyền mua hàng',
        description: 'Được phép đặt mua sản phẩm/thẻ trên hệ thống.',
    },
    PERM_004: {
        name: 'Cập nhật giao hàng',
        description: 'Cập nhật trạng thái giao hàng cho các đơn liên quan.',
    },
    PERM_005: {
        name: 'Xem báo cáo',
        description: 'Truy cập các màn hình báo cáo và thống kê.',
    },
};

const initialCreateForm: AdminCreateUserRequest & { confirmPassword: string; role: string } = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    districtId: '',
    wardId: '',
    gender: 'MALE',
    role: 'USER',
};

export const AdminUsersPage: React.FC = () => {
    const { confirm, confirmDialog } = useAdminConfirm();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [users, setUsers] = React.useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [userRolesMap, setUserRolesMap] = React.useState<Record<string, 'ADMIN' | 'SHIPPER' | 'USER'>>({});
    const [roleFilter, setRoleFilter] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<'ACTIVE' | 'BANNED' | ''>('');
    const [createModalOpen, setCreateModalOpen] = React.useState(false);
    const [createForm, setCreateForm] = React.useState(initialCreateForm);
    const [createAvatar, setCreateAvatar] = React.useState<File | null>(null);
    const [createSubmitting, setCreateSubmitting] = React.useState(false);
    const [createError, setCreateError] = React.useState('');
    const [roleModalUser, setRoleModalUser] = React.useState<UserProfile | null>(null);
    const [roleModalRoles, setRoleModalRoles] = React.useState<Role[]>([]);
    const [roleModalLoading, setRoleModalLoading] = React.useState(false);
    const [roleModalSaving, setRoleModalSaving] = React.useState(false);

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
            setError(err instanceof Error ? err.message : 'Không tải được danh sách người dùng');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Load primary role for each user (ADMIN > SHIPPER > USER) để hiển thị trong bảng
    React.useEffect(() => {
        const usersList = Array.isArray(users) ? users : [];
        if (!usersList.length) {
            setUserRolesMap({});
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const entries = await Promise.all(
                    usersList.map(async (u) => {
                        try {
                            const roles = await fetchAllRolesForUser(u.userId);
                            const codes = roles.map((r) => r.roleCode);
                            let primary: 'ADMIN' | 'SHIPPER' | 'USER' = 'USER';
                            if (codes.includes('ADMIN')) primary = 'ADMIN';
                            else if (codes.includes('SHIPPER')) primary = 'SHIPPER';
                            return [u.userId, primary] as const;
                        } catch {
                            return [u.userId, 'USER' as const];
                        }
                    })
                );
                if (!cancelled) {
                    setUserRolesMap(Object.fromEntries(entries));
                }
            } catch {
                // ignore, giữ map cũ
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [users]);

    const openRoleModal = async (user: UserProfile) => {
        setRoleModalUser(user);
        setRoleModalLoading(true);
        try {
            const basicRoles = await fetchAllRolesForUser(user.userId);

            // Lấy quyền cho từng role của user qua /api/permisions/{roleCode}
            const rolesWithPermissions: Role[] = await Promise.all(
                basicRoles.map(async (r) => {
                    try {
                        const perms = await fetchAllPermissionsForRole(r.roleCode);
                        return {
                            ...r,
                            permisionResponse: perms,
                        };
                    } catch {
                        return r;
                    }
                })
            );

            setRoleModalRoles(rolesWithPermissions);
        } catch (err) {
            toast({
                title: 'Không tải được vai trò',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
            setRoleModalRoles([]);
        } finally {
            setRoleModalLoading(false);
        }
    };

    const toggleRoleForUser = async (roleCode: string, hasRole: boolean) => {
        if (!roleModalUser) return;
        setRoleModalSaving(true);
        try {
            if (hasRole) {
                await userApi.removeRole(roleModalUser.userId, [roleCode]);
            } else {
                await userApi.addRole(roleModalUser.userId, [roleCode]);
            }
            const roles = await fetchAllRolesForUser(roleModalUser.userId);
            setRoleModalRoles(roles);
            await loadUsers();
            toast({ title: 'Đã cập nhật vai trò', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Cập nhật vai trò thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        } finally {
            setRoleModalSaving(false);
        }
    };

    const handleBanUser = async (userId: string) => {
        const ok = await confirm('Bạn có chắc muốn khóa tài khoản này?');
        if (!ok) return;

        try {
            await userApi.updateUserStatus(userId, 'BANNED');
            await loadUsers();
            toast({ title: 'Đã khóa tài khoản', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Khóa tài khoản thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const handleUnbanUser = async (userId: string) => {
        try {
            await userApi.updateUserStatus(userId, 'ACTIVE');
            await loadUsers();
            toast({ title: 'Đã mở khóa tài khoản', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Mở khóa tài khoản thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const handleCreateUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCreateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        if (createForm.password !== createForm.confirmPassword) {
            setCreateError('Mật khẩu xác nhận không khớp');
            return;
        }
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(createForm.password)) {
            setCreateError('Mật khẩu tối thiểu 8 ký tự, có ít nhất 1 chữ và 1 số');
            return;
        }
        const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phoneRegex.test(createForm.phone)) {
            setCreateError('Số điện thoại phải bắt đầu 0 hoặc +84 và 9 chữ số');
            return;
        }
        if (createForm.name.length < 5 || createForm.address.length < 5) {
            setCreateError('Họ tên và địa chỉ tối thiểu 5 ký tự');
            return;
        }
        if (!createForm.districtId || !createForm.wardId) {
            setCreateError('Vui lòng chọn đầy đủ Quận/Huyện và Phường/Xã');
            return;
        }
        setCreateSubmitting(true);
        try {
            const newUser = await userApi.adminCreateUser(
                {
                    email: createForm.email,
                    password: createForm.password,
                    name: createForm.name,
                    phone: createForm.phone,
                    address: createForm.address,
                    gender: createForm.gender as 'MALE' | 'FEMALE',
                    districtId: createForm.districtId,
                    wardId: createForm.wardId,
                },
                createAvatar || undefined
            );
            const selectedRole = createForm.role || 'USER';
            if (selectedRole !== 'USER' && newUser.userId) {
                await userApi.removeRole(newUser.userId, ['USER']);
                await userApi.addRole(newUser.userId, [selectedRole]);
            }
            setCreateModalOpen(false);
            setCreateForm(initialCreateForm);
            setCreateAvatar(null);
            await loadUsers();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại');
        } finally {
            setCreateSubmitting(false);
        }
    };

    const openCreateModal = () => {
        setCreateForm(initialCreateForm);
        setCreateAvatar(null);
        setCreateError('');
        setCreateModalOpen(true);
    };

    // Ensure users is always an array
    const usersList = Array.isArray(users) ? users : [];

    const stats = [
        {
            title: 'Tổng người dùng',
            value: usersList.length.toString(),
            icon: UsersIcon,
            color: 'from-primary-500 to-primary-300',
            change: `${usersList.length} người dùng`
        },
        {
            title: 'Đang hoạt động',
            value: usersList.filter(u => u.status === 'ACTIVE').length.toString(),
            icon: UserCheck,
            color: 'from-green-500 to-emerald-500',
            change: 'Hoạt động'
        },
        {
            title: 'Quản trị viên',
            value: usersList.filter(u => u.role === 'ADMIN').length.toString(),
            icon: Shield,
            color: 'from-accent-500 to-accent-300',
            change: 'Vai trò Admin'
        },
        {
            title: 'Đã khóa',
            value: usersList.filter(u => u.status === 'BANNED').length.toString(),
            icon: UserX,
            color: 'from-red-500 to-orange-500',
            change: 'Đã khóa'
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
            {confirmDialog}
            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý người dùng</h1>
                    <p className="text-muted-foreground mt-1">Quản lý người dùng và quyền</p>
                </div>
                <Button onClick={openCreateModal} className="flex items-center gap-2 shrink-0">
                    <UserPlus className="h-4 w-4" />
                    Tạo người dùng
                </Button>
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
                                placeholder="Tìm người dùng..."
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
                            <option value="">Tất cả vai trò</option>
                            <option value="USER">Khách hàng</option>
                            <option value="ADMIN">Quản trị</option>
                            <option value="SHIPPER">Shipper</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="glass-card px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="BANNED">Đã khóa</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Người dùng ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                            <div className="text-muted-foreground">Đang tải người dùng...</div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Không tìm thấy người dùng.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Người dùng</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Vai trò</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Số điện thoại</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Số dư ví</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Trạng thái</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Thao tác</th>
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
                                                {(() => {
                                                    const primaryRole = userRolesMap[user.userId] || 'USER';
                                                    const badgeClass =
                                                        primaryRole === 'ADMIN'
                                                            ? 'bg-red-500/20 text-red-400'
                                                            : primaryRole === 'SHIPPER'
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : 'bg-primary-500/20 text-primary-400';
                                                    const label =
                                                        primaryRole === 'ADMIN'
                                                            ? 'Quản trị'
                                                            : primaryRole === 'SHIPPER'
                                                                ? 'Shipper'
                                                                : 'Khách hàng';
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                                            {primaryRole === 'ADMIN' && <Shield className="h-3 w-3" />}
                                                            {primaryRole === 'SHIPPER' && <Truck className="h-3 w-3" />}
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="p-4 text-sm">{user.phone || '—'}</td>
                                            <td className="p-4 text-right font-semibold text-accent-400">
                                                {user.walletResponse?.balance?.toLocaleString('vi-VN') || '0'} đ
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                                    user.status === 'BANNED' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'BANNED' ? 'Đã khóa' : 'Khác'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openRoleModal(user)}
                                                            className="px-3 py-1 bg-primary-500/20 hover:bg-primary-500/30 rounded-md text-primary-300 text-xs font-medium transition-colors flex items-center gap-1"
                                                        >
                                                            <Shield className="h-3 w-3" />
                                                            Phân quyền
                                                        </button>
                                                        {user.status === 'BANNED' ? (
                                                            <button
                                                                onClick={() => handleUnbanUser(user.userId)}
                                                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded-md text-green-400 text-xs font-medium transition-colors flex items-center gap-1"
                                                            >
                                                                <CheckCircle className="h-3 w-3" />
                                                                Mở khóa
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleBanUser(user.userId)}
                                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-md text-red-400 text-xs font-medium transition-colors flex items-center gap-1"
                                                            >
                                                                <Ban className="h-3 w-3" />
                                                                Khóa (ban)
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {user.status === 'BANNED'
                                                            ? 'Đã khóa'
                                                            : user.status === 'ACTIVE'
                                                                ? 'Hoạt động'
                                                                : 'Khác'}
                                                    </span>
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

            {/* Manage Roles Modal */}
            <Dialog open={!!roleModalUser} onOpenChange={(open) => !open && setRoleModalUser(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Quản lý quyền cho người dùng</DialogTitle>
                    </DialogHeader>
                    {roleModalUser && (
                        <div className="space-y-4">
                            <div>
                                <div className="font-medium">{roleModalUser.name}</div>
                                <div className="text-xs text-muted-foreground">{roleModalUser.email}</div>
                            </div>
                            {roleModalLoading ? (
                                <div className="text-sm text-muted-foreground">Đang tải quyền...</div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Quyền hiện tại
                                        </div>
                                        {roleModalRoles.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">
                                                User chưa được gán role nào.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {roleModalRoles.map((role) => (
                                                    <div
                                                        key={role.roleCode}
                                                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div>
                                                                <div className="text-sm font-semibold">
                                                                    {role.roleName || role.roleCode}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    Mã: {role.roleCode}
                                                                </div>
                                                            </div>
                                                            {role.permisionResponse &&
                                                                role.permisionResponse.length > 0 && (
                                                                    <span className="text-[11px] text-muted-foreground">
                                                                        {role.permisionResponse.length} quyền
                                                                    </span>
                                                                )}
                                                        </div>
                                                        {role.permisionResponse &&
                                                            role.permisionResponse.length > 0 && (
                                                                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                                                                    {role.permisionResponse.map((p) => {
                                                                        const meta = PERMISSION_LABELS[p.permisionCode] || null;
                                                                        const displayName =
                                                                            meta?.name || p.permisionName || p.permisionCode;
                                                                        const displayDesc =
                                                                            meta?.description || p.description || '';
                                                                        return (
                                                                            <li key={p.permisionCode}>
                                                                                <span className="font-semibold">
                                                                                    {displayName}
                                                                                </span>
                                                                                {displayDesc && (
                                                                                    <span className="ml-1 opacity-80">
                                                                                        – {displayDesc}
                                                                                    </span>
                                                                                )}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-white/10">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Thêm / gỡ role
                                        </div>
                                        {ROLE_OPTIONS.map((opt) => {
                                            const hasRole = roleModalRoles.some((r) => r.roleCode === opt.value);
                                            return (
                                                <label
                                                    key={opt.value}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                                                >
                                                    <span>{opt.label}</span>
                                                    <button
                                                        type="button"
                                                        disabled={roleModalSaving}
                                                        onClick={() => toggleRoleForUser(opt.value, hasRole)}
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                            hasRole
                                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                        }`}
                                                    >
                                                        {hasRole ? 'Gỡ bỏ' : 'Thêm'}
                                                    </button>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setRoleModalUser(null)}>
                                    Đóng
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create User Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Tạo người dùng mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                        {createError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {createError}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-1">Họ tên *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="name"
                                    value={createForm.name}
                                    onChange={handleCreateUserChange}
                                    placeholder="Nguyễn Văn A"
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    required
                                    minLength={5}
                                    maxLength={255}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="email"
                                    type="email"
                                    value={createForm.email}
                                    onChange={handleCreateUserChange}
                                    placeholder="user@example.com"
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mật khẩu *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="password"
                                    type="password"
                                    value={createForm.password}
                                    onChange={handleCreateUserChange}
                                    placeholder="Tối thiểu 8 ký tự, 1 chữ + 1 số"
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    value={createForm.confirmPassword}
                                    onChange={handleCreateUserChange}
                                    placeholder="Nhập lại mật khẩu"
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Số điện thoại *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="phone"
                                    value={createForm.phone}
                                    onChange={handleCreateUserChange}
                                    placeholder="0912345678"
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Địa chỉ *</label>
                            <AddressSelect
                                value={createForm.address}
                                onChange={(address) => setCreateForm((prev) => ({ ...prev, address }))}
                                required
                                showDetailInput
                                onCodesChange={(codes) => {
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        districtId: codes.districtId != null ? String(codes.districtId) : '',
                                        wardId: codes.wardCode ?? '',
                                    }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giới tính *</label>
                            <select
                                name="gender"
                                value={createForm.gender}
                                onChange={handleCreateUserChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Vai trò *</label>
                            <select
                                name="role"
                                value={createForm.role}
                                onChange={handleCreateUserChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            >
                                {ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Avatar (tùy chọn)</label>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 text-sm">
                                    <Upload className="h-4 w-4" />
                                    Chọn ảnh
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setCreateAvatar(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                                {createAvatar && <span className="text-xs text-muted-foreground">{createAvatar.name}</span>}
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 pt-4">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={createSubmitting}>
                                {createSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
