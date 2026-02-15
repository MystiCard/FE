import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Vui lòng nhập email đăng ký.');
            return;
        }
        setIsLoading(true);
        try {
            // TODO: gọi API forgot password khi backend có endpoint
            await new Promise((r) => setTimeout(r, 800));
            setSent(true);
        } catch {
            setError('Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ support@myscard.com.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <Card className="w-full max-w-md glass-card-strong">
                <CardHeader className="text-center">
                    <div className="mx-auto w-24 h-24 flex items-center justify-center mb-4">
                        <img src="/logo/logo.png" alt="MysticCard" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-serif">Quên mật khẩu</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Nhập email đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                    </p>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (và thư mục spam).
                            </p>
                            <Link to="/login">
                                <Button variant="outline" className="w-full">Quay lại đăng nhập</Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full pl-10 pr-4 py-2.5 glass-card rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                            </Button>
                            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary-400 mt-4">
                                <ArrowLeft className="h-4 w-4" />
                                Quay lại đăng nhập
                            </Link>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
