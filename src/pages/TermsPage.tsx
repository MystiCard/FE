import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
                        <FileText className="h-6 w-6" />
                        Điều khoản sử dụng
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
                    <section>
                        <h3 className="font-semibold text-white mb-2">1. Chấp nhận điều khoản</h3>
                        <p>
                            Bằng việc truy cập và sử dụng MysticCard, bạn đồng ý tuân thủ các điều khoản sử dụng này.
                            Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">2. Sử dụng dịch vụ</h3>
                        <p>
                            Bạn cam kết sử dụng nền tảng đúng mục đích: mua bán, sưu tầm thẻ bài. Không được sử dụng
                            để vi phạm pháp luật, quấy rối người dùng khác hoặc gian lận.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">3. Tài khoản và bảo mật</h3>
                        <p>
                            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập. Mọi hoạt động từ tài khoản của bạn
                            được coi là do bạn thực hiện.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">4. Giao dịch và thanh toán</h3>
                        <p>
                            Giao dịch trên Marketplace tuân theo quy định của sàn. MysticCard có thể thu phí dịch vụ
                            theo chính sách công bố. Hoàn trả và tranh chấp được xử lý theo quy trình hỗ trợ.
                        </p>
                    </section>
                    <section>
                        <h3 className="font-semibold text-white mb-2">5. Liên hệ</h3>
                        <p>
                            Mọi thắc mắc về điều khoản, vui lòng liên hệ:{' '}
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
