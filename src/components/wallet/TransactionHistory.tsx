import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionResponse } from '@/utils/api';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    CreditCard,
    Clock,
    CheckCircle,
    XCircle,
    Ban,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface TransactionHistoryProps {
    transactions: TransactionResponse[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    statusFilter?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    onPageChange: (page: number) => void;
    onStatusFilterChange: (status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | undefined) => void;
}

const getStatusBadge = (status: string) => {
    const badges = {
        SUCCESS: {
            icon: CheckCircle,
            text: 'Thành công',
            className: 'bg-green-500/20 text-green-400 border-green-500/30'
        },
        PENDING: {
            icon: Clock,
            text: 'Đang xử lý',
            className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        },
        FAILED: {
            icon: XCircle,
            text: 'Thất bại',
            className: 'bg-red-500/20 text-red-400 border-red-500/30'
        },
        CANCELLED: {
            icon: Ban,
            text: 'Đã hủy',
            className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
            <Icon className="w-3 h-3" />
            {badge.text}
        </span>
    );
};

const getTransactionIcon = (type: string) => {
    switch (type) {
        case 'DEPOSTIE': // Backend typo
        case 'DEPOSIT':
            return <ArrowUpCircle className="w-5 h-5 text-green-400" />;
        case 'REQUEST_WITHDRAW':
        case 'WITHDRAW':
            return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
        case 'PAYMENT':
            return <CreditCard className="w-5 h-5 text-blue-400" />;
        default:
            return <CreditCard className="w-5 h-5 text-gray-400" />;
    }
};

const getTransactionTypeText = (type: string) => {
    const types = {
        DEPOSTIE: 'Nạp tiền', // Backend typo
        DEPOSIT: 'Nạp tiền',
        REQUEST_WITHDRAW: 'Yêu cầu rút tiền',
        WITHDRAW: 'Rút tiền',
        PAYMENT: 'Thanh toán',
    };
    return types[type as keyof typeof types] || type;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
    transactions,
    isLoading,
    currentPage,
    totalPages,
    statusFilter,
    onPageChange,
    onStatusFilterChange,
}) => {
    const filters = [
        { label: 'Tất cả', value: undefined },
        { label: 'Thành công', value: 'SUCCESS' as const },
        { label: 'Đang xử lý', value: 'PENDING' as const },
        { label: 'Thất bại', value: 'FAILED' as const },
        { label: 'Đã hủy', value: 'CANCELLED' as const },
    ];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter.label}
                        onClick={() => onStatusFilterChange(filter.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === filter.value
                                ? 'bg-primary-500 text-white'
                                : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Transactions List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Đang tải giao dịch...</p>
                </div>
            ) : transactions.length === 0 ? (
                <Card className="glass-card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Chưa có giao dịch nào</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {transactions.map((transaction) => (
                        <Card key={transaction.transactionId} className="glass-card p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                                {/* Icon and Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                                        {getTransactionIcon(transaction.transactionType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">
                                            {getTransactionTypeText(transaction.transactionType)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatDate(transaction.createAt)}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            ID: {transaction.transactionId}
                                        </div>
                                    </div>
                                </div>

                                {/* Amount and Status */}
                                <div className="text-right flex-shrink-0">
                                    <div className={`font-bold mb-1 ${transaction.transactionType === 'DEPOSTIE' || transaction.transactionType === 'DEPOSIT'
                                            ? 'text-green-400'
                                            : transaction.transactionType === 'WITHDRAW' || transaction.transactionType === 'REQUEST_WITHDRAW'
                                                ? 'text-red-400'
                                                : 'text-blue-400'
                                        }`}>
                                        {(transaction.transactionType === 'DEPOSTIE' || transaction.transactionType === 'DEPOSIT') ? '+' : '-'}
                                        {transaction.amount.toLocaleString('vi-VN')} đ
                                    </div>
                                    {getStatusBadge(transaction.statusTransaction)}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === page
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};
