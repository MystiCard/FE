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
            const data = await rateConfigApi.getAllRateConfigs();
            setRateConfigs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load rate configs');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateConfig = async () => {
        if (!newConfig.rarity || newConfig.rate < 0) {
            alert('Please select a rarity and set a valid rate');
            return;
        }

        try {
            await rateConfigApi.createRateConfig(newConfig);
            await loadRateConfigs();
            setIsAddModalOpen(false);
            resetForm();
            alert('Rate config created successfully!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to create rate config');
        }
    };

    const handleUpdateConfig = async () => {
        if (!editingConfig) return;

        if (!newConfig.rarity || newConfig.rate < 0) {
            alert('Please select a rarity and set a valid rate');
            return;
        }

        try {
            await rateConfigApi.updateRateConfig(editingConfig.id, newConfig);
            await loadRateConfigs();
            setEditingConfig(null);
            resetForm();
            alert('Rate config updated successfully!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update rate config');
        }
    };

    const handleDeleteConfig = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rate config?')) return;

        try {
            await rateConfigApi.deleteRateConfig(id);
            await loadRateConfigs();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete rate config');
        }
    };

    const handleImportConfigs = async () => {
        if (!importFile) {
            alert('Please select a file to import');
            return;
        }

        try {
            setIsImporting(true);
            await rateConfigApi.importRateConfigs(importFile);
            await loadRateConfigs();
            setIsImportModalOpen(false);
            setImportFile(null);
            alert('Rate configs imported successfully!');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to import rate configs');
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
            rarity: config.rarity,
            rate: config.rate,
            variancePercent: config.variancePercent || 0
        });
    };

    const filteredConfigs = rateConfigs.filter(config =>
        config.rarity.toLowerCase().includes(searchQuery.toLowerCase())
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
                                        <tr key={config.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 font-medium">{config.rarity}</td>
                                            <td className="p-4">{config.rate}</td>
                                            <td className="p-4">{config.variancePercent || 0}%</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(config)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-primary-400"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteConfig(config.id)}
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
                                    value={newConfig.rate}
                                    onChange={(e) => setNewConfig({ ...newConfig, rate: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 glass-card rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Độ lệch (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={newConfig.variancePercent}
                                    onChange={(e) => setNewConfig({ ...newConfig, variancePercent: parseFloat(e.target.value) })}
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
