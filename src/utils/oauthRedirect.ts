import { isAdmin, isShipper, type UserInfo } from '@/utils/api';

/** Query từ BE sau Google OAuth: ?accessToken=...&refreshToken=... hoặc ?error=... */
export type OAuthRedirectParse =
    | { kind: 'tokens'; accessToken: string; refreshToken: string }
    | { kind: 'error' }
    | { kind: 'none' };

export function parseOAuthRedirectSearch(search: string): OAuthRedirectParse {
    const params = new URLSearchParams(search);
    if (params.get('error')) {
        return { kind: 'error' };
    }
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
        return { kind: 'tokens', accessToken, refreshToken };
    }
    return { kind: 'none' };
}

/** Sau khi lưu JWT: điều hướng giống GoogleCallbackPage (admin / shipper / user). */
export function getPathAfterOAuthLogin(pathname: string, user: UserInfo | null): string {
    const path = pathname || '/';

    if (isAdmin(user)) {
        if (!path.startsWith('/admin')) return '/admin';
        return '/admin';
    }
    if (isShipper(user)) {
        if (!path.startsWith('/shipments')) return '/shipments';
        return '/shipments';
    }
    if (path.startsWith('/admin')) {
        return '/';
    }
    return path;
}
