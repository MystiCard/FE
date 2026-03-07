import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Percent,
    Settings,
    X,
    Upload,
    FileSpreadsheet
} from 'lucide-react';
import { rateConfigApi, RateConfig, RateConfigRequest } from '@/utils/api';

export const AdminRateConfigPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [rateConfigs, setRateConfigs] = useState<RateConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<RateConfig | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const [newConfig, setNewConfig] = useState<RateConfigRequest>({
        rarity: 'COMMON',
        rate: 0,
        variancePercent: 0
    });

    useEffect(() => {
        loadRateConfigs();
    }, []);

    const loadRateConfigs = async () => {
        try {
            setIsLoading(true);
            setError('');
            const data = await rateConfigApi.getAllRateConfigs();
            setRateConfigs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được cấu hình tỷ lệ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateConfig = async () => {
        if (!newConfig.rarity || newConfig.rate < 0) {
            alert('Vui lòng chọn độ hiếm và nhập tỷ lệ hợp lệ');
            return;
        }

        try {
            await rateConfigApi.createRateConfig(newConfig);
            await loadRateConfigs();
            setIsAddModalOpen(false);
            resetForm();
            alert('Đã tạo cấu hình tỷ lệ thành công!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Tạo cấu hình tỷ lệ thất bại');
        }
    };

    const handleUpdateConfig = async () => {
        if (!editingConfig) return;

        if (!newConfig.rarity || newConfig.rate < 0) {
            alert('Vui lòng chọn độ hiếm và nhập tỷ lệ hợp lệ');
            return;
        }

        try {
            const id = editingConfig.id;
            if (!id) {
                alert('Mã cấu hình không hợp lệ');
                return;
            }
            await rateConfigApi.updateRateConfig(id, newConfig);
            await loadRateConfigs();
            setEditingConfig(null);
            resetForm();
            alert('Đã cập nhật cấu hình tỷ lệ thành công!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Cập nhật cấu hình tỷ lệ thất bại');
        }
    };

    const handleDeleteConfig = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa cấu hình tỷ lệ này?')) return;

        try {
            await rateConfigApi.deleteRateConfig(id);
            await loadRateConfigs();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Xóa cấu hình tỷ lệ thất bại');
        }
    };

    const handleImportConfigs = async () => {
        if (!importFile) {
            alert('Vui lòng chọn file để nhập');
            return;
        }

        try {
            setIsImporting(true);
            await rateConfigApi.importRateConfigs(importFile);
            await loadRateConfigs();
            setIsImportModalOpen(false);
            setImportFile(null);
            alert('Đã nhập cấu hình tỷ lệ thành công!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Nhập cấu hình tỷ lệ thất bại');
        } finally {
            setIsImporting(false);
        }
    };

    const resetForm = () => {
        setNewConfig({
            rarity: 'COMMON',
            rate: 0,
            variancePercent: 0
        });
    };

    const openEditModal = (config: RateConfig) => {
        setEditingConfig(config);
        setNewConfig({
            rarity: config.rarity ?? 'COMMON',
            rate: config.rate ?? 0,
            variancePercent: config.variancePercent ?? 0
        });
    };

    const filteredConfigs = rateConfigs.filter(config =>
        (config.rarity ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'SUPER_RARE', 'SECRET_RARE'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif gradient-text">Cấu hình tỷ lệ</h1>
                    <p className="text-muted-foreground mt-1">Quản lý tỷ lệ rơi thẻ và xác suất</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        <Upload className="h-4 w-4" />
                        Nhập
                    </Button>
                    <Button
                        variant="premium"
                        className="gap-2"
                        onClick={() => {
                            setEditingConfig(null);
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm tỷ lệ
                    </Button>
                </div>
            </div>

            {/* ERROR Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card-strong">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
                                <Settings className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                                <p className="text-2xl font-bold">{rateConfigs.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Tìm theo độ hiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
            </div>

            {/* Table */}
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle>Cấu hình ({filteredConfigs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">Đang tải...</div>
                    ) : filteredConfigs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">Không tìm thấy cấu hình</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Độ hiếm</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Tỷ lệ rơi</th>
                                        <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Độ lệch %</th>
                                        <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredConfigs.map(config => (
                                        <tr key={config.id || config.rarity} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 font-medium">{config.rarity ?? '—'}</td>
                                            <td className="p-4">{config.rate ?? 0}</td>
                                            <td className="p-4">{config.variancePercent ?? 0}%</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(config)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-primary-400"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => config.id && handleDeleteConfig(config.id)}
                                                        className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
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

            {/* Create/Edit Modal */}
            {(isAddModalOpen || editingConfig) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="glass-card-strong w-full max-w-md">
                        <CardHeader className="border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">
                                    {editingConfig ? 'Chỉnh sửa cấu hình tỷ lệ' : 'Thêm cấu hình tỷ lệ'}
                                </CardTitle>
                                <button
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingConfig(null);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Độ hiếm</label>
                                <select
                                    value={newConfig.rarity}
                                    onChange={(e) => setNewConfig({ ...newConfig, rarity: e.target.value })}
                                    className="w-full px-4 py-2 bg-primary-900/50 border border-white/10 rounded-lg text-sm"
                                >
                                    {rarities.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tỷ lệ rơi</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={newConfig.rate}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setNewConfig({ ...newConfig, rate: Number.isFinite(v) ? v : 0 });
                                    }}
                                    className="w-full px-4 py-2 glass-card rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Độ lệch (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={newConfig.variancePercent ?? 0}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setNewConfig({ ...newConfig, variancePercent: Number.isFinite(v) ? v : 0 });
                                    }}
                                    className="w-full px-4 py-2 glass-card rounded-lg text-sm"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setEditingConfig(null);
                                    }}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="premium"
                                    className="flex-1"
                                    onClick={editingConfig ? handleUpdateConfig : handleCreateConfig}
                                >
                                    {editingConfig ? 'Cập nhật' : 'Tạo'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="glass-card-strong w-full max-w-lg">
                        <CardHeader className="border-b border-white/10">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5" />
                                    Nhập cấu hình tỷ lệ
                                </CardTitle>
                                <button
                                    onClick={() => {
                                        setIsImportModalOpen(false);
                                        setImportFile(null);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                                <h4 className="font-semibold mb-2">Hướng dẫn:</h4>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    <li>Tải lên file Excel (.xlsx, .xls) hoặc CSV</li>
                                    <li>Cột: rarity, rate, variance_percent</li>
                                </ul>
                            </div>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-3 glass-card rounded-lg text-sm"
                            />
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsImportModalOpen(false);
                                        setImportFile(null);
                                    }}
                                    disabled={isImporting}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    variant="premium"
                                    className="flex-1"
                                    onClick={handleImportConfigs}
                                    disabled={!importFile || isImporting}
                                >
                                    {isImporting ? 'Đang nhập...' : 'Nhập'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
