import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
    return (
        <div className="py-8 px-4 max-w-4xl mx-auto">
            <Link
                to="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-400 mb-6"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Về trang chủ
            </Link>
            <Card className="glass-card-strong">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl font-serif">
                        <Shield className="h-6 w-6" />
                        Chính sách bảo mật
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                    <section>
                        <h3 className="font-semibold text-white mb-2">1. Thu thập thông tin</h3>
                        <p>
                            Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký, giao dịch và sử dụng dịch vụ:
                            email, tên, địa chỉ giao hàng, thông tin thanh toán (được xử lý bảo mật).
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">2. Sử dụng thông tin</h3>
                        <p>
                            Thông tin được dùng để cung cấp dịch vụ, xử lý giao dịch, hỗ trợ khách hàng và cải thiện
                            trải nghiệm. Chúng tôi không bán dữ liệu cá nhân cho bên thứ ba.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">3. Bảo vệ dữ liệu</h3>
                        <p>
                            Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu của bạn khỏi
                            truy cập trái phép, mất mát hoặc lạm dụng.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">4. Cookie và công nghệ tương tự</h3>
                        <p>
                            Website có thể sử dụng cookie để duy trì phiên đăng nhập và trải nghiệm người dùng.
                            Bạn có thể cấu hình trình duyệt để từ chối cookie.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">5. Liên hệ</h3>
                        <p>
                            Mọi yêu cầu về quyền riêng tư hoặc dữ liệu cá nhân, vui lòng gửi đến:{' '}
                            <a href="mailto:support@myscard.com" className="text-primary-400 hover:underline">
                                support@myscard.com
                            </a>
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    );
};
