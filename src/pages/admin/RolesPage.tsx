import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { roleApi, permissionApi, type Role, type Permission } from '@/api';
import { Plus, Trash2, Shield, KeyRound, CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { ADMIN_API_PAGE_SIZE } from './adminApiPageSize';
import { toast } from '@/components/ui/use-toast';
import { useAdminConfirm } from '@/components/admin';

async function fetchAllRolesList(active: boolean): Promise<Role[]> {
    const out: Role[] = [];
    let page = 1;
    let totalPages = 1;
    do {
        const res = await roleApi.list(page, ADMIN_API_PAGE_SIZE, active);
        out.push(...(res.content || []));
        totalPages = Math.max(1, res.totalPages ?? 1);
        page++;
    } while (page <= totalPages);
    return out;
}

async function fetchAllPermissionsForRoleCode(roleCode: string): Promise<Permission[]> {
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

async function fetchAllPermissionsCatalog(): Promise<Permission[]> {
    const out: Permission[] = [];
    let page = 1;
    let totalPages = 1;
    do {
        const res = await permissionApi.list(page, ADMIN_API_PAGE_SIZE, true);
        out.push(...(res.content || []));
        totalPages = Math.max(1, res.totalPages ?? 1);
        page++;
    } while (page <= totalPages);
    return out;
}

export const AdminRolesPage: React.FC = () => {
    const { confirm, confirmDialog } = useAdminConfirm();
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [activeFilter, setActiveFilter] = React.useState<'true' | 'false'>('true');

    const [createOpen, setCreateOpen] = React.useState(false);
    const [createForm, setCreateForm] = React.useState({ roleCode: '', roleName: '', description: '' });
    const [createLoading, setCreateLoading] = React.useState(false);

    const [permModalRole, setPermModalRole] = React.useState<Role | null>(null);
    const [permCodes, setPermCodes] = React.useState('');
    const [permLoading, setPermLoading] = React.useState(false);
    const [permRemoving, setPermRemoving] = React.useState(false);
    const [allPermissions, setAllPermissions] = React.useState<Permission[]>([]);
    const [permissionDropdownOpen, setPermissionDropdownOpen] = React.useState(false);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const basicRoles = await fetchAllRolesList(activeFilter === 'true');

            // Lấy quyền cho từng role qua /api/permisions/{roleCode}
            const withPermissions = await Promise.all(
                basicRoles.map(async (r) => {
                    try {
                        const perms = await fetchAllPermissionsForRoleCode(r.roleCode);
                        return {
                            ...r,
                            permisionResponse: perms,
                        };
                    } catch {
                        return r;
                    }
                })
            );

            setRoles(withPermissions);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách role');
            setRoles([]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadRoles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter]);

    const openCreate = () => {
        setCreateForm({ roleCode: '', roleName: '', description: '' });
        setCreateOpen(true);
    };

    const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCreateForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.roleCode.trim() || !createForm.roleName.trim()) return;
        setCreateLoading(true);
        try {
            await roleApi.addRole({
                roleCode: createForm.roleCode.trim(),
                roleName: createForm.roleName.trim(),
                description: createForm.description.trim() || undefined,
            });
            setCreateOpen(false);
            await loadRoles();
            toast({ title: 'Đã tạo vai trò', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Tạo role thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDeleteRole = async (code: string) => {
        const ok = await confirm(`Bạn có chắc muốn deactive/xóa role "${code}"?`);
        if (!ok) return;
        try {
            await roleApi.deleteByCode(code);
            await loadRoles();
            toast({ title: 'Đã cập nhật role', description: 'Đã vô hiệu hóa role.', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Xóa role thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const handleActiveRole = async (code: string) => {
        try {
            await roleApi.active(code);
            await loadRoles();
            toast({ title: 'Đã kích hoạt role', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Kích hoạt role thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        }
    };

    const openPermModal = (role: Role) => {
        setPermModalRole(role);
        setPermCodes('');
        setPermissionDropdownOpen(false);
        // lazy load permissions list when first open
        if (!allPermissions.length) {
            fetchAllPermissionsCatalog()
                .then((list) => {
                    setAllPermissions(list);
                })
                .catch(() => {
                    // ignore, vẫn cho nhập tay
                });
        }
    };

    const handleAddPermissions = async () => {
        if (!permModalRole) return;
        const codes = permCodes
            .split(/[,\s]+/)
            .map((c) => c.trim())
            .filter(Boolean);
        if (!codes.length) return;
        setPermLoading(true);
        try {
            await roleApi.addPermissions(permModalRole.roleCode, codes);
            const perms = await fetchAllPermissionsForRoleCode(permModalRole.roleCode);
            setPermModalRole({
                ...permModalRole,
                permisionResponse: perms,
            });
            await loadRoles();
            setPermCodes('');
            toast({ title: 'Đã thêm quyền', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Thêm quyền thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        } finally {
            setPermLoading(false);
        }
    };

    const handleRemovePermissions = async (codes: string[]) => {
        if (!permModalRole || !codes.length) return;
        setPermRemoving(true);
        try {
            await roleApi.removePermissions(permModalRole.roleCode, codes);
            const perms = await fetchAllPermissionsForRoleCode(permModalRole.roleCode);
            setPermModalRole({
                ...permModalRole,
                permisionResponse: perms,
            });
            await loadRoles();
            toast({ title: 'Đã gỡ quyền', variant: 'success' });
        } catch (err) {
            toast({
                title: 'Xóa quyền thất bại',
                description: err instanceof Error ? err.message : undefined,
                variant: 'error',
            });
        } finally {
            setPermRemoving(false);
        }
    };

    const isActiveList = activeFilter === 'true';

    return (
        <div className="space-y-6">
            {confirmDialog}
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Quản lý vai trò & quyền</h1>
                    <p className="text-muted-foreground mt-1">
                        Thêm/sửa role, gán quyền (permission) cho từng vai trò.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value as 'true' | 'false')}
                        className="glass-card px-3 py-2 rounded-lg text-sm"
                    >
                        <option value="true">Role đang hoạt động</option>
                        <option value="false">Role đã deactive</option>
                    </select>
                    <Button onClick={openCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Tạo role mới
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Roles list */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Danh sách vai trò ({roles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Đang tải vai trò...</span>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            Không có role nào trong trạng thái này.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roles.map((role) => (
                                <Card key={role.roleCode} className="glass-card">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-primary-500/20">
                                                    <Shield className="h-4 w-4 text-primary-300" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">
                                                        {role.roleName || role.roleCode}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Mã: {role.roleCode}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {role.description && (
                                            <p className="text-xs text-muted-foreground">{role.description}</p>
                                        )}
                                        <div className="text-[11px] text-muted-foreground">
                                            Quyền: {role.permisionResponse?.length || 0}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs"
                                                onClick={() => openPermModal(role)}
                                            >
                                                <KeyRound className="h-3 w-3 mr-1" />
                                                Xem / sửa quyền
                                            </Button>
                                            {isActiveList ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs text-red-400 border-red-500/40 hover:bg-red-500/10"
                                                    onClick={() => handleDeleteRole(role.roleCode)}
                                                >
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Deactive / xóa
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs text-green-400 border-green-500/40 hover:bg-green-500/10"
                                                    onClick={() => handleActiveRole(role.roleCode)}
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Active lại
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create role modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tạo role mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Mã role (ROLE_*)</label>
                            <Input
                                name="roleCode"
                                value={createForm.roleCode}
                                onChange={handleCreateChange}
                                placeholder="VD: ADMIN, SHIPPER, USER..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tên hiển thị</label>
                            <Input
                                name="roleName"
                                value={createForm.roleName}
                                onChange={handleCreateChange}
                                placeholder="Quản trị viên, Shipper..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mô tả (tùy chọn)</label>
                            <Input
                                name="description"
                                value={createForm.description}
                                onChange={handleCreateChange}
                                placeholder="Mô tả ngắn về role"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={createLoading}>
                                {createLoading ? 'Đang tạo...' : 'Tạo role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Permissions modal */}
            <Dialog open={!!permModalRole} onOpenChange={(open) => !open && setPermModalRole(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Quyền của role {permModalRole?.roleName || permModalRole?.roleCode}</DialogTitle>
                    </DialogHeader>
                    {permModalRole && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Danh sách quyền
                                </div>
                                {permModalRole.permisionResponse &&
                                permModalRole.permisionResponse.length > 0 ? (
                                    <div className="space-y-2">
                                        {permModalRole.permisionResponse.map((p) => (
                                            <div
                                                key={p.permisionCode}
                                                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        {p.permisionName} ({p.permisionCode})
                                                    </div>
                                                    {p.description && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7 text-red-400 border-red-500/40 hover:bg-red-500/10"
                                                    disabled={permRemoving}
                                                    onClick={() => handleRemovePermissions([p.permisionCode])}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">
                                        Chưa có quyền nào được gán cho role này.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/10">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Thêm quyền vào role
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Nhập mã quyền, phân cách bởi dấu phẩy. VD: PERM_001, PERM_002"
                                        value={permCodes}
                                        onChange={(e) => setPermCodes(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => setPermissionDropdownOpen((o) => !o)}
                                    >
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Chọn từ danh sách quyền
                                    </Button>
                                    {permissionDropdownOpen && allPermissions.length > 0 && (
                                        <div className="max-h-56 w-full overflow-y-auto rounded-md border border-white/10 bg-background/95 text-xs shadow-lg">
                                            {allPermissions.map((p) => {
                                                const checked = permCodes
                                                    .split(/[,\s]+/)
                                                    .map((c) => c.trim())
                                                    .filter(Boolean)
                                                    .includes(p.permisionCode);
                                                const toggle = () => {
                                                    const current = permCodes
                                                        .split(/[,\s]+/)
                                                        .map((c) => c.trim())
                                                        .filter(Boolean);
                                                    let next: string[];
                                                    if (checked) {
                                                        next = current.filter((c) => c !== p.permisionCode);
                                                    } else {
                                                        next = [...current, p.permisionCode];
                                                    }
                                                    setPermCodes(next.join(', '));
                                                };
                                                return (
                                                    <button
                                        key={p.permisionCode}
                                        type="button"
                                        onClick={toggle}
                                        className={`flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-white/5 ${
                                            checked ? 'text-primary-300' : ''
                                        }`}
                                    >
                                        <span className="mt-[2px] inline-block h-3 w-3 rounded border border-white/40">
                                            {checked && (
                                                <span className="block h-full w-full rounded bg-primary-400" />
                                            )}
                                        </span>
                                        <span>
                                            <span className="font-semibold">
                                                {p.permisionName} ({p.permisionCode})
                                            </span>
                                            {p.description && (
                                                <span className="ml-1 text-[11px] text-muted-foreground">
                                                    – {p.description}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={handleAddPermissions}
                                        disabled={permLoading}
                                        className="text-xs"
                                    >
                                        {permLoading ? 'Đang thêm...' : 'Thêm quyền'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminRolesPage;

