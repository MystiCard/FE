// API Configuration and Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// API Response wrapper
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Login types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

// User info from JWT token
export interface UserInfo {
    sub: string; // email
    name?: string;
    email?: string;
    picture?: string;
    avatarUrl?: string;
    roles?: string[];
}

// Decode JWT token to get user info
const decodeToken = (token: string): UserInfo | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Auth API Service
export const authApi = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(error.message || 'Login failed');
        }

        const result: ApiResponse<LoginResponse> = await response.json();
        return result.data;
    },

    refreshToken: async (refreshToken: string): Promise<string> => {
        const response = await fetch(`${API_BASE_URL}/auth/refresh-access-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const result: ApiResponse<string> = await response.json();
        return result.data;
    },

    logout: async (): Promise<void> => {
        const token = localStorage.getItem('accessToken');
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    // Google OAuth2 Login - redirects to Google
    loginWithGoogle: () => {
        // Redirect to Spring Security OAuth2 login endpoint
        window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
    },
};

// API request helper with auto token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};

export const apiRequest = async <T>(
    url: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = tokenManager.getAccessToken();
    
    // Add authorization header if token exists
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    // If 401 Unauthorized, try to refresh token
    if (response.status === 401 && !isRefreshing) {
        const refreshToken = tokenManager.getRefreshToken();
        
        if (!refreshToken) {
            // No refresh token, redirect to login
            tokenManager.clearTokens();
            window.location.href = '/login';
            throw new Error('Session expired');
        }

        isRefreshing = true;

        try {
            // Refresh the access token
            const newAccessToken = await authApi.refreshToken(refreshToken);
            tokenManager.setTokens(newAccessToken, refreshToken);
            
            isRefreshing = false;
            onTokenRefreshed(newAccessToken);

            // Retry the original request with new token
            response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers: {
                    ...headers,
                    Authorization: `Bearer ${newAccessToken}`,
                },
            });
        } catch (error) {
            isRefreshing = false;
            tokenManager.clearTokens();
            window.location.href = '/login';
            throw new Error('Session expired');
        }
    } else if (response.status === 401 && isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
            subscribeTokenRefresh(async (token: string) => {
                try {
                    const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
                        ...options,
                        headers: {
                            ...headers,
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await retryResponse.json();
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }

    return response.json();
};

// Token management
export const tokenManager = {
    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    },

    getAccessToken: () => localStorage.getItem('accessToken'),
    
    getRefreshToken: () => localStorage.getItem('refreshToken'),

    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    isAuthenticated: () => !!localStorage.getItem('accessToken'),

    getUserInfo: (): UserInfo | null => {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;
        return decodeToken(token);
    },
};
