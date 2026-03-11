import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cardRequiredApi, CardRequired } from '@/utils/api';
import { ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('vi-VN');
    } catch {
        return iso;
    }
};

const statusLabel = (s: CardRequired['status']) => {
    switch (s) {
        case 'PENDING':
            return 'Đang chờ duyệt';
        case 'APPROVED':
            return 'Đã được tạo thẻ';
        case 'REJECTED':
            return 'Bị từ chối';
        default:
            return s;
    }
};

export const MyCardRequestsPage: React.FC = () => {
    const [requests, setRequests] = useState<CardRequired[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<CardRequired | null>(null);

    useEffect(() => {
        let cancelled = false;
        cardRequiredApi
            .getMyRequiredCards(0, 50)
            .then((res) => {
                if (cancelled) return;
                setRequests(res.content ?? []);
            })
            .catch(() => {
                if (cancelled) return;
                setRequests([]);
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-screen py-6 px-4">
            <div className="max-w-5xl mx-auto space-y-4">
                <Link to="/post-listing" className="inline-flex items-center text-primary-400 hover:text-primary-300 text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Về trang đăng bán
                </Link>

                <Card className="glass-card-strong">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Yêu cầu thêm thẻ của tôi</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Danh sách các yêu cầu thêm thẻ bạn đã gửi. Trạng thái chỉ lưu trên trình duyệt này (FE-only, không thay đổi BE).
                        </p>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">Đang tải...</div>
                        ) : requests.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                Bạn chưa gửi yêu cầu thêm thẻ nào.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-xs text-muted-foreground">
                                            <th className="px-3 py-2 text-left">Ảnh</th>
                                            <th className="px-3 py-2 text-left">Thẻ</th>
                                            <th className="px-3 py-2 text-left">Set</th>
                                            <th className="px-3 py-2 text-left">Danh mục</th>
                                            <th className="px-3 py-2 text-right">Giá base</th>
                                            <th className="px-3 py-2 text-left">Trạng thái</th>
                                            <th className="px-3 py-2 text-left">Ghi chú Admin</th>
                                            <th className="px-3 py-2 text-left">Thời gian</th>
                                            <th className="px-3 py-2 text-right">Chi tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((r) => {
                                            const status = r.status;
                                            const color =
                                                status === 'APPROVED'
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400/40'
                                                    : status === 'REJECTED'
                                                    ? 'text-red-400 bg-red-500/10 border-red-400/40'
                                                    : 'text-amber-300 bg-amber-500/10 border-amber-400/40';
                                            const Icon =
                                                status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : Clock;
                                            return (
                                                <tr key={r.cardRequiredId} className="border-b border-white/5">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="w-12 h-16 rounded-md overflow-hidden bg-white/5 border border-white/10">
                                                            {r.imageUrl ? (
                                                                <img
                                                                    src={r.imageUrl}
                                                                    alt={r.cardName}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src =
                                                                            'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=100&q=80';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-lg">
                                                                    🎴
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="font-medium">{r.cardName}</div>
                                                        <div className="text-xs text-muted-foreground">{r.rate}</div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {/* Không còn setName riêng, dùng categoryName làm set/cate hiển thị */}
                                                        {r.categoryName || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {r.categoryName || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        {r.basePrice.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${color}`}
                                                        >
                                                            <Icon className="h-3 w-3" />
                                                            {statusLabel(status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        {r.note || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                                        <div>Gửi: {formatDateTime(r.createdAt)}</div>
                                                        {r.decidedAt && <div>Duyệt: {formatDateTime(r.decidedAt)}</div>}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs"
                                                            onClick={() => setSelected(r)}
                                                        >
                                                            Xem chi tiết
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/sell/request-card')}>
                                Gửi yêu cầu mới
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Dialog chi tiết yêu cầu */}
                <Dialog open={!!selected} onOpenChange={(open: boolean) => !open && setSelected(null)}>
                    <DialogContent className="max-w-lg">
                        {selected && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Chi tiết yêu cầu thẻ</DialogTitle>
                                </DialogHeader>
                                <div className="mt-3 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-32 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                            {selected.imageUrl ? (
                                                <img
                                                    src={selected.imageUrl}
                                                    alt={selected.cardName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src =
                                                            'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=200&q=80';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl">
                                                    🎴
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="text-sm text-muted-foreground">Tên thẻ</div>
                                            <div className="font-semibold">{selected.cardName}</div>
                                            <div className="text-sm text-muted-foreground mt-2">
                                                Độ hiếm: <span className="text-white">{selected.rate}</span>
                                            </div>
                                            {/* Không có setName riêng trong BE, dùng categoryName nếu cần */}
                                        <div className="text-sm text-muted-foreground">
                                                Danh mục: <span className="text-white">{selected.categoryName || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Giá base (VNĐ)</div>
                                            <div className="font-semibold">
                                                {selected.basePrice.toLocaleString('vi-VN')}
                                                {' đ'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">Trạng thái</div>
                                            <div className="flex items-center gap-1">
                                                {(() => {
                                                    const s = selected.status;
                                                    const Icon =
                                                        s === 'APPROVED' ? CheckCircle2 : s === 'REJECTED' ? XCircle : Clock;
                                                    return (
                                                        <>
                                                            <Icon className="h-4 w-4" />
                                                            <span>{statusLabel(s)}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm">
                                        <div className="text-xs text-muted-foreground mb-1">Ghi chú</div>
                                        <div className="whitespace-pre-wrap text-muted-foreground">
                                            {selected.note || '—'}
                                        </div>
                                    </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                            <div>Gửi: {formatDateTime(selected.createdAt)}</div>
                                            <div>Duyệt: {formatDateTime(selected.decidedAt || undefined)}</div>
                                        </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

