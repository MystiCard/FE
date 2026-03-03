import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { transactionApi, TransactionResponse } from '@/utils/api';

export const PaymentCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const fetchTransactionStatus = async () => {
            // Get transaction ID from URL params
            const transactionId = searchParams.get('transactionId') || searchParams.get('orderId');

            if (!transactionId) {
                setError('Không tìm thấy thông tin giao dịch');
                setIsLoading(false);
                return;
            }

            try {
                const data = await transactionApi.getById(transactionId);
                setTransaction(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải thông tin giao dịch');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactionStatus();
    }, [searchParams]);

    // Countdown and auto redirect
    useEffect(() => {
        if (!isLoading && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            navigate('/wallet');
        }
    }, [countdown, isLoading, navigate]);

    const handleGoToWallet = () => {
        navigate('/wallet');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-xl text-muted-foreground">Đang xác nhận giao dịch...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="glass-card p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-red-400">Có lỗi xảy ra</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={handleGoToWallet} className="w-full">
                        Quay lại ví
                    </Button>
                </Card>
            </div>
        );
    }

    const isSuccess = transaction?.statusTransaction === 'SUCCESS';
    const isPending = transaction?.statusTransaction === 'PENDING';
    const isFailed = transaction?.statusTransaction === 'FAILED' || transaction?.statusTransaction === 'CANCELLED';

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="glass-card p-8 max-w-md w-full">
                {/* Status Icon */}
                <div className="text-center mb-6">
                    {isSuccess && (
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                    )}
                    {isPending && (
                        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-10 h-10 text-yellow-400 animate-pulse" />
                        </div>
                    )}
                    {isFailed && (
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10 text-red-400" />
                        </div>
                    )}

                    {/* Status Text */}
                    <h2 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-green-400' :
                        isPending ? 'text-yellow-400' :
                            'text-red-400'
                        }`}>
                        {isSuccess && 'Nạp tiền thành công!'}
                        {isPending && 'Đang xử lý giao dịch'}
                        {isFailed && 'Giao dịch thất bại'}
                    </h2>

                    <p className="text-muted-foreground">
                        {isSuccess && 'Số dư ví của bạn đã được cập nhật'}
                        {isPending && 'Giao dịch đang được xử lý, vui lòng chờ trong giây lát'}
                        {isFailed && 'Giao dịch không thành công, vui lòng thử lại'}
                    </p>
                </div>

                {/* Transaction Details */}
                {transaction && (
                    <div className="space-y-3 mb-6 p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Mã giao dịch</span>
                            <span className="text-white font-mono text-xs">{transaction.transactionId}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Số tiền</span>
                            <span className="text-white font-bold">
                                {transaction.amount.toLocaleString('vi-VN')} đ
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Thời gian</span>
                            <span className="text-white">
                                {new Date(transaction.createAt).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        onClick={handleGoToWallet}
                        className="w-full bg-primary-500 hover:bg-primary-600"
                    >
                        Về trang ví
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Tự động chuyển hướng sau {countdown} giây...
                    </p>
                </div>
            </Card>
        </div>
    );
};
