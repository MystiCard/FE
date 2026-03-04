// Token/session utility (không gọi refresh-access-token nữa)
import { tokenManager } from './api';

// Check if token is about to expire (within 5 minutes)
const isTokenExpiringSoon = (token: string): boolean => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);
        
        // Check if token expires in less than 5 minutes
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        return expirationTime - currentTime < fiveMinutes;
    } catch (error) {
        return true; // If can't decode, assume it's expiring
    }
};

// Auto refresh token if needed
export const checkAndRefreshToken = async (): Promise<void> => {
    const accessToken = tokenManager.getAccessToken();
    const refreshToken = tokenManager.getRefreshToken();

    if (!accessToken || !refreshToken) {
        return;
    }

    // Nếu token sắp hết hạn, coi như hết phiên: xóa token và chuyển về trang đăng nhập.
    if (isTokenExpiringSoon(accessToken)) {
        tokenManager.clearTokens();
        window.location.href = '/login';
    }
};

// Setup periodic token check (every 4 minutes)
export const setupTokenRefreshInterval = (): NodeJS.Timeout => {
    return setInterval(() => {
        checkAndRefreshToken();
    }, 4 * 60 * 1000); // Check every 4 minutes
};
