import React from 'react';
import { AdminWithdrawPanel } from '@/components/admin';
import { Banknote } from 'lucide-react';

export const AdminWithdrawPage: React.FC = () => {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold font-serif gradient-text flex items-center gap-2">
                    <Banknote className="w-7 h-7 text-yellow-400" />
                    Duyệt yêu cầu rút tiền
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Xem và duyệt các yêu cầu rút tiền từ ví người dùng
                </p>
            </div>
            <AdminWithdrawPanel />
        </div>
    );
};
