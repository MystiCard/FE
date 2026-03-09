import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const AdminWithdrawPanel: React.FC = () => {
    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    Quản lý yêu cầu rút tiền
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Backend hiện tại <span className="font-semibold text-amber-300">chưa cung cấp API liệt kê / duyệt / từ chối yêu cầu rút tiền</span>,
                    nên chức năng quản lý danh sách rút tiền cho Admin tạm thời chưa khả dụng trên giao diện.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                    Khi backend bổ sung các endpoint (list REQUEST_WITHDRAW toàn hệ thống, approve/reject từng yêu cầu),
                    phần này có thể được kết nối lại để hiển thị đúng luồng duyệt rút tiền.
                </p>
            </CardContent>
        </Card>
    );
};

