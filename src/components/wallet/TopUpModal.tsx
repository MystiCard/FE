import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { transactionApi } from '@/utils/api';

interface TopUpModalProps {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const PRESET_AMOUNTS = [
    { label: '50,000đ', value: 50000 },
    { label: '100,000đ', value: 100000 },
    { label: '200,000đ', value: 200000 },
    { label: '500,000đ', value: 500000 },
    { label: '1,000,000đ', value: 1000000 },
    { label: '2,000,000đ', value: 2000000 },
];

export const TopUpModal: React.FC<TopUpModalProps> = ({ userId, onClose, onSuccess }) => {
    void onSuccess;
    const [amount, setAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handlePresetClick = (value: number) => {
        setAmount(value);
        setCustomAmount('');
        setError('');
    };

    const handleCustomAmountChange = (value: string) => {
        setCustomAmount(value);
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            setAmount(numValue);
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (amount < 10000) {
            setError('Số tiền tối thiểu là 10,000đ');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const paymentUrl = await transactionApi.deposit({
                userId,
                amount,
                provider: 'MOMO',
            });

            // Redirect to MoMo payment gateway
            window.location.href = paymentUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nạp tiền thất bại');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a0a2e] rounded-lg max-w-md w-full border border-white/10 relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">Nạp tiền vào ví</h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white transition-colors"
                        disabled={isProcessing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Preset Amounts */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-3">
                            Chọn số tiền nhanh
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESET_AMOUNTS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePresetClick(preset.value)}
                                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${amount === preset.value
                                            ? 'bg-primary-500 border-primary-500 text-white'
                                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                        }`}
                                    disabled={isProcessing}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Hoặc nhập số tiền khác
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => handleCustomAmountChange(e.target.value)}
                                placeholder="Nhập số tiền"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors"
                                min="10000"
                                step="10000"
                                disabled={isProcessing}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                đ
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Số tiền tối thiểu: 10,000đ
                        </p>
                    </div>

                    {/* Selected Amount Display */}
                    {amount > 0 && (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div className="text-sm text-muted-foreground mb-1">Số tiền nạp</div>
                            <div className="text-2xl font-bold text-green-400">
                                {amount.toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                    )}

                    {/* Payment Provider Info */}
                    <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">💳</div>
                            <div>
                                <div className="font-medium text-white">Thanh toán qua MoMo</div>
                                <div className="text-xs text-muted-foreground">
                                    Nhanh chóng, an toàn và bảo mật
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-white/10">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Hủy
                    </Button>
                    <Button
                        className="flex-1 bg-pink-600 hover:bg-pink-700"
                        onClick={handleSubmit}
                        disabled={isProcessing || amount < 10000}
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Thanh toán MoMo'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
