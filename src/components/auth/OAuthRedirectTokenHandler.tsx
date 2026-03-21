import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { tokenManager } from '@/utils/api';
import { getPathAfterOAuthLogin, parseOAuthRedirectSearch } from '@/utils/oauthRedirect';

/**
 * BE redirect sau Google OAuth: FE_URL?accessToken&refreshToken hoặc FE_URL/admin?...
 * Lưu token, xóa query khỏi URL (replace), điều hướng theo role nếu cần.
 */
export const OAuthRedirectTokenHandler: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const loginRef = useRef(login);
    loginRef.current = login;

    useEffect(() => {
        const parsed = parseOAuthRedirectSearch(location.search);
        if (parsed.kind === 'none') {
            return;
        }
        if (parsed.kind === 'error') {
            navigate('/login', { replace: true });
            return;
        }

        loginRef.current(parsed.accessToken, parsed.refreshToken);
        const userInfo = tokenManager.getUserInfo();
        const next = getPathAfterOAuthLogin(location.pathname, userInfo);
        navigate(next, { replace: true });
    }, [location.search, location.pathname, navigate]);

    return null;
};
