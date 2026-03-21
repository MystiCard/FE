import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseOAuthRedirectSearch } from '@/utils/oauthRedirect';

/** Route cũ /auth/google/callback — xử lý token do OAuthRedirectTokenHandler toàn app. */
export const GoogleCallbackPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const parsed = parseOAuthRedirectSearch(location.search);
        if (parsed.kind === 'tokens') {
            return;
        }
        if (parsed.kind === 'error') {
            setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
            const t = setTimeout(() => navigate('/login'), 3000);
            return () => clearTimeout(t);
        }
        setError('Phản hồi không hợp lệ từ máy chủ.');
        const t = setTimeout(() => navigate('/login'), 3000);
        return () => clearTimeout(t);
    }, [location.search, navigate]);

    const parsed = parseOAuthRedirectSearch(location.search);
    const waiting = parsed.kind === 'tokens';

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                {error ? (
                    <div>
                        <div className="text-red-400 text-xl mb-4">{error}</div>
                        <div className="text-muted-foreground">Đang chuyển đến trang đăng nhập...</div>
                    </div>
                ) : (
                    <div>
                        <div className="rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <div className="text-xl">
                            {waiting ? 'Đang hoàn tất đăng nhập Google…' : 'Đang chuyển hướng…'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
