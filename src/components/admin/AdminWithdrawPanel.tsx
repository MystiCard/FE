import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { transactionApi, TransactionResponse, PageResponse, WithdrawTransferQrResponse } from '@/utils/api';
import { Activity, CheckCircle2, ArrowDownCircle, RefreshCcw, Eye, X, XCircle, QrCode } from 'lucide-react';

const getTypeLabel = (type: TransactionResponse['transactionType']) => {
    switch (type) {
        case 'REQUEST_WITHDRAW':
            return 'Yêu cầu rút';
        case 'WITHDRAW':
            return 'Rút tiền';
        default:
            return type ?? '—';
    }
};

const statusLabels: Record<TransactionResponse['statusTransaction'], string> = {
    PENDING: 'Đang xử lý',
    SUCCESS: 'Thành công',
    FAILED: 'Thất bại',
    CANCELLED: 'Đã hủy',
};

/** Các lý do từ chối yêu cầu rút tiền (admin chọn hoặc nhập "Khác") */
const REJECT_REASONS = [
    { value: 'invalid_bank_info', label: 'Thông tin tài khoản ngân hàng không chính xác' },
    { value: 'suspicious_activity', label: 'Giao dịch bất thường / cần xác minh thêm' },
    { value: 'policy_violation', label: 'Vi phạm quy định của hệ thống' },
    { value: 'duplicate_request', label: 'Yêu cầu trùng lặp hoặc đã xử lý' },
    { value: 'insufficient_verification', label: 'Chưa xác minh đủ thông tin tài khoản' },
    { value: 'other', label: 'Khác (nhập lý do bên dưới)' },
] as const;

export const AdminWithdrawPanel: React.FC = () => {
    const [pending, setPending] = useState<TransactionResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [manualId, setManualId] = useState('');
    const [detailTx, setDetailTx] = useState<TransactionResponse | null>(null);
    /** Modal chọn lý do từ chối: tx đang chọn từ chối */
    const [rejectModalTx, setRejectModalTx] = useState<TransactionResponse | null>(null);
    const [rejectReasonKey, setRejectReasonKey] = useState<string>(REJECT_REASONS[0].value);
    const [rejectReasonOther, setRejectReasonOther] = useState('');
    /** Modal QR chuyển khoản khi duyệt thủ công */
    const [approveQrModalTx, setApproveQrModalTx] = useState<TransactionResponse | null>(null);
    const [approveQrData, setApproveQrData] = useState<WithdrawTransferQrResponse | null>(null);
    const [approveQrLoading, setApproveQrLoading] = useState(false);
    const [confirmManualLoading, setConfirmManualLoading] = useState(false);

    /** Tạo URL ảnh VietQR (chuẩn img.vietqr.io - MoMo/ngân hàng quét được) */
    const buildVietQrImageUrl = (data: WithdrawTransferQrResponse): string => {
        const bank = (data.bankCode || '').replace(/\s/g, '');
        const acc = (data.accountNumber || '').replace(/\s/g, '');
        const base = `https://img.vietqr.io/image/${bank}-${acc}-compact2.png`;
        const params = new URLSearchParams();
        if (data.amount > 0) params.set('amount', String(data.amount));
        if (data.description) params.set('addInfo', data.description.substring(0, 50));
        if (data.accountName) params.set('accountName', data.accountName);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    };

    const loadPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const res: PageResponse<TransactionResponse> = await transactionApi.getWithdrawRequests('PENDING', 0, 20);
            setPending(res.content ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được danh sách yêu cầu rút tiền');
            setPending([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPending();
    }, []);

    /** Mở modal QR: lấy thông tin chuyển khoản và hiển thị VietQR để admin quét (MoMo/bank app) chuyển thủ công */
    const openApproveQrModal = async (tx: TransactionResponse) => {
        const id = tx.walletTransactionId;
        if (!id) return;
        setApproveQrModalTx(tx);
        setApproveQrData(null);
        setApproveQrLoading(true);
        setError(null);
        try {
            const data = await transactionApi.getWithdrawTransferQr(id);
            setApproveQrData(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được thông tin QR chuyển khoản');
            setApproveQrModalTx(null);
        } finally {
            setApproveQrLoading(false);
        }
    };

    const closeApproveQrModal = () => {
        if (!confirmManualLoading) {
            setApproveQrModalTx(null);
            setApproveQrData(null);
            setDetailTx(null);
        }
    };

    /** Admin đã chuyển tiền xong → xác nhận và trừ ví user */
    const confirmManualTransfer = async () => {
        if (!approveQrModalTx?.walletTransactionId) return;
        setConfirmManualLoading(true);
        setError(null);
        try {
            await transactionApi.confirmManualWithdraw(approveQrModalTx.walletTransactionId);
            alert('Đã xác nhận chuyển tiền. Số dư ví user đã được trừ.');
            setApproveQrModalTx(null);
            setApproveQrData(null);
            setDetailTx(null);
            setManualId('');
            await loadPending();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không xác nhận được (kiểm tra số dư user)');
        } finally {
            setConfirmManualLoading(false);
        }
    };

    const reject = async (transactionId: string, reason?: string) => {
        setRejectingId(transactionId);
        setError(null);
        try {
            await transactionApi.rejectWithdraw(transactionId, reason);
            alert('Đã từ chối yêu cầu rút tiền.');
            setRejectModalTx(null);
            setDetailTx(null);
            setRejectReasonKey(REJECT_REASONS[0].value);
            setRejectReasonOther('');
            await loadPending();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể từ chối yêu cầu rút tiền');
        } finally {
            setRejectingId(null);
        }
    };

    const getRejectReasonText = (): string => {
        if (rejectReasonKey === 'other') return rejectReasonOther.trim();
        const r = REJECT_REASONS.find(x => x.value === rejectReasonKey);
        return r ? r.label : rejectReasonOther.trim() || '';
    };

    const confirmReject = () => {
        const tx = rejectModalTx;
        if (!tx?.walletTransactionId) return;
        const text = getRejectReasonText();
        if (rejectReasonKey === 'other' && !text) {
            setError('Vui lòng nhập lý do từ chối.');
            return;
        }
        reject(tx.walletTransactionId, text || undefined);
    };

    return (
        <>
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-400" />
                    Duyệt yêu cầu rút tiền (Admin)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-2 rounded bg-red-500/15 border border-red-500/40 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Duyệt thủ công: bấm <strong>Duyệt (QR)</strong> ở từng dòng → hiện QR VietQR đúng số tiền và tài khoản user → quét bằng MoMo/ngân hàng chuyển tiền → bấm <strong>Đã chuyển xong</strong>.
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Input
                            placeholder="Hoặc nhập Transaction ID để xem QR..."
                            value={manualId}
                            onChange={e => setManualId(e.target.value)}
                            className="max-w-xs"
                        />
                        <Button
                            size="sm"
                            disabled={!manualId.trim() || approveQrLoading}
                            onClick={() => openApproveQrModal({ walletTransactionId: manualId.trim() } as TransactionResponse)}
                        >
                            <QrCode className="w-4 h-4 mr-1" />
                            {approveQrLoading ? 'Đang tải...' : 'Xem QR'}
                        </Button>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">Yêu cầu rút tiền đang chờ</span>
                        <Button variant="outline" size="sm" onClick={loadPending} disabled={loading} className="gap-2">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Tải lại
                        </Button>
                    </div>
                    {loading ? (
                        <p className="text-sm text-muted-foreground py-6">Đang tải...</p>
                    ) : pending.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6">Không có yêu cầu rút tiền nào đang chờ.</p>
                    ) : (
                        <div className="rounded-lg border border-white/10 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="text-left p-3">Thời gian</th>
                                        <th className="text-left p-3">Loại</th>
                                        <th className="text-left p-3">Trạng thái</th>
                                        <th className="text-right p-3">Số tiền</th>
                                        <th className="text-right p-3">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map((tx, idx) => {
                                        const id = tx.walletTransactionId ?? '';
                                        return (
                                            <tr
                                                key={id || `tx-${idx}`}
                                                className="border-b border-white/5 hover:bg-white/5"
                                            >
                                                <td className="p-3 text-muted-foreground">
                                                    {tx.createAt
                                                        ? new Date(tx.createAt).toLocaleString('vi-VN')
                                                        : '—'}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowDownCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                        {getTypeLabel(tx.transactionType)}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                        Đang xử lý
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {Number(tx.amount).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDetailTx(tx)}
                                                            className="gap-1"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Chi tiết
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            disabled={!id || approveQrLoading}
                                                            onClick={() => id && openApproveQrModal(tx)}
                                                            className="gap-1"
                                                        >
                                                            <QrCode className="w-4 h-4" />
                                                            Duyệt (QR)
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={!id || rejectingId === id}
                                                            onClick={() => id && setRejectModalTx(tx)}
                                                            className="gap-1"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Từ chối
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Modal chi tiết yêu cầu rút tiền */}
        {detailTx && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDetailTx(null)}>
                <div
                    className="bg-[#1a0a2e] rounded-xl border border-white/10 w-full max-w-md shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-lg font-semibold">Chi tiết yêu cầu rút tiền</h3>
                        <button
                            type="button"
                            onClick={() => setDetailTx(null)}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4 text-sm">
                        {/* Thông tin giao dịch */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin giao dịch</h4>
                            <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground shrink-0">Mã giao dịch</span>
                                <span className="font-mono text-xs break-all text-right">{detailTx.walletTransactionId || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Loại</span>
                                <span>{getTypeLabel(detailTx.transactionType)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Trạng thái</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                    detailTx.statusTransaction === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                    detailTx.statusTransaction === 'SUCCESS' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                    detailTx.statusTransaction === 'FAILED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                    'bg-muted text-muted-foreground border-white/10'
                                }`}>
                                    {statusLabels[detailTx.statusTransaction] ?? detailTx.statusTransaction}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Số tiền</span>
                                <span className="font-semibold text-lg">{Number(detailTx.amount).toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Thời gian tạo</span>
                                <span>{detailTx.createAt ? new Date(detailTx.createAt).toLocaleString('vi-VN') : '—'}</span>
                            </div>
                            {detailTx.message && (
                                <div className="pt-1">
                                    <span className="text-muted-foreground block mb-1">Ghi chú / Lý do</span>
                                    <p className="text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5 text-xs">
                                        {detailTx.message}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Thông tin tài khoản nhận tiền (khi duyệt sẽ chuyển đến đây) */}
                        {detailTx.bankAccountResponse && (
                            <div className="space-y-3 pt-3 border-t border-white/10">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tài khoản nhận tiền</h4>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ngân hàng</span>
                                    <span className="font-medium">{detailTx.bankAccountResponse.bankCode || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số tài khoản</span>
                                    <span className="font-mono">{detailTx.bankAccountResponse.accountNumber || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Chủ tài khoản</span>
                                    <span className="font-medium">{detailTx.bankAccountResponse.accountName || '—'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setDetailTx(null)}>
                            Đóng
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={!!rejectingId}
                            onClick={() => setRejectModalTx(detailTx)}
                            className="gap-1"
                        >
                            <XCircle className="w-4 h-4" />
                            Từ chối
                        </Button>
                        <Button
                            size="sm"
                            disabled={approveQrLoading}
                            onClick={() => openApproveQrModal(detailTx)}
                            className="gap-1"
                        >
                            <QrCode className="w-4 h-4" />
                            Duyệt (hiện QR)
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal chọn lý do từ chối */}
        {rejectModalTx && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => !rejectingId && setRejectModalTx(null)}>
                <div
                    className="bg-[#1a0a2e] rounded-xl border border-white/10 w-full max-w-md shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-lg font-semibold">Lý do từ chối yêu cầu rút tiền</h3>
                        <button
                            type="button"
                            disabled={!!rejectingId}
                            onClick={() => setRejectModalTx(null)}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Số tiền: <strong className="text-foreground">{Number(rejectModalTx.amount).toLocaleString('vi-VN')} đ</strong>
                        </p>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Chọn lý do từ chối</span>
                            <div className="grid gap-2">
                                {REJECT_REASONS.map((r) => (
                                    <label
                                        key={r.value}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer has-[:checked]:border-red-500/40 has-[:checked]:bg-red-500/10"
                                    >
                                        <input
                                            type="radio"
                                            name="rejectReason"
                                            value={r.value}
                                            checked={rejectReasonKey === r.value}
                                            onChange={() => setRejectReasonKey(r.value)}
                                            className="text-red-500"
                                        />
                                        <span className="text-sm">{r.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {rejectReasonKey === 'other' && (
                            <div>
                                <label className="text-sm font-medium block mb-1">Nhập lý do</label>
                                <Input
                                    placeholder="Nhập lý do từ chối..."
                                    value={rejectReasonOther}
                                    onChange={(e) => setRejectReasonOther(e.target.value)}
                                    className="bg-black/40 border-white/10"
                                />
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setRejectModalTx(null)} disabled={!!rejectingId}>
                            Hủy
                        </Button>
                        <Button variant="destructive" size="sm" onClick={confirmReject} disabled={!!rejectingId} className="gap-1">
                            <XCircle className="w-4 h-4" />
                            {rejectingId ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal QR chuyển khoản (VietQR) - Admin quét MoMo/ngân hàng chuyển thủ công */}
        {approveQrModalTx && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={closeApproveQrModal}>
                <div
                    className="bg-[#1a0a2e] rounded-xl border border-white/10 w-full max-w-md shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-green-400" />
                            Chuyển tiền theo QR (VietQR)
                        </h3>
                        <button
                            type="button"
                            disabled={confirmManualLoading}
                            onClick={closeApproveQrModal}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        {approveQrLoading ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">Đang tải thông tin QR...</p>
                        ) : approveQrData ? (
                            <>
                                <p className="text-sm text-muted-foreground text-center">
                                    Quét mã bằng <strong>MoMo</strong> hoặc app ngân hàng để chuyển đúng số tiền vào tài khoản user.
                                </p>
                                <div className="flex justify-center bg-white rounded-lg p-3">
                                    <img
                                        src={buildVietQrImageUrl(approveQrData)}
                                        alt="VietQR chuyển khoản"
                                        className="w-52 h-52 object-contain"
                                    />
                                </div>
                                <div className="rounded-lg border border-white/10 p-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Số tiền</span>
                                        <span className="font-bold text-lg">{Number(approveQrData.amount).toLocaleString('vi-VN')} đ</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ngân hàng</span>
                                        <span className="font-medium">{approveQrData.bankCode || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Số tài khoản</span>
                                        <span className="font-mono">{approveQrData.accountNumber || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Chủ tài khoản</span>
                                        <span className="font-medium">{approveQrData.accountName || '—'}</span>
                                    </div>
                                    {approveQrData.description && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Nội dung CK</span>
                                            <span className="text-xs">{approveQrData.description}</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                    {approveQrData && (
                        <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={closeApproveQrModal} disabled={confirmManualLoading}>
                                Đóng
                            </Button>
                            <Button size="sm" onClick={confirmManualTransfer} disabled={confirmManualLoading} className="gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {confirmManualLoading ? 'Đang xử lý...' : 'Đã chuyển xong'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </>
    );
};

