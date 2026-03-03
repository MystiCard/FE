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
    scope?: string; // Spring Security sometimes uses 'scope' for roles
}

// Helper function to check if user is admin
export const isAdmin = (user: UserInfo | null): boolean => {
    if (!user) return false;

    // Check in roles array
    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some(role =>
            role === 'ROLE_ADMIN' || role === 'ADMIN'
        );
    }

    // Check in scope string (Spring Security format)
    if (user.scope && typeof user.scope === 'string') {
        return user.scope.includes('ROLE_ADMIN') || user.scope.includes('ADMIN');
    }

    return false;
};

// Helper function to check if user is shipper
export const isShipper = (user: UserInfo | null): boolean => {
    if (!user) return false;

    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some(role =>
            role === 'ROLE_SHIPPER' || role === 'SHIPPER'
        );
    }

    if (user.scope && typeof user.scope === 'string') {
        return user.scope.includes('ROLE_SHIPPER') || user.scope.includes('SHIPPER');
    }

    return false;
};

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

// User API
export interface UserProfile {
    userId: string;
    email: string;
    gender?: string;
    name: string;
    avatarUrl?: string;
    address?: string;
    phone?: string;
    role?: string; // ADMIN, CUSTOMER, etc.
    status?: string; // ACTIVE, BANNED, etc.
    walletResponse?: {
        balance: number;
    };
}

export interface RegisterRequest {
    email: string;
    password: string;
    gender: 'MALE' | 'FEMALE';
    address: string;
    name: string;
    phone: string;
}

/** Admin create user: same as RegisterRequest + optional districtId/wardId (BE requires them) */
export interface AdminCreateUserRequest extends RegisterRequest {
    districtId?: string;
    wardId?: string;
}

export interface UpdateProfileRequest {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    gender?: 'MALE' | 'FEMALE';
    password?: string; // optional, chỉ gửi khi đổi mật khẩu
}

export const userApi = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await apiRequest<ApiResponse<UserProfile>>('/users/my-infor', {
            method: 'GET',
        });
        return response.data;
    },

    register: async (data: RegisterRequest, avatar?: File): Promise<UserProfile> => {
        const formData = new FormData();

        // Append all fields as JSON string in a part called "request"
        const requestBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        formData.append('request', requestBlob);

        // Append avatar if provided
        if (avatar) {
            formData.append('avatar', avatar);
        }

        const token = tokenManager.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/users/create`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(error.message || 'Registration failed');
        }

        const result: ApiResponse<UserProfile> = await response.json();
        return result.data;
    },

    /** Admin: create new user (uses same POST /users/create, with districtId/wardId for BE validation) */
    adminCreateUser: async (data: AdminCreateUserRequest, avatar?: File): Promise<UserProfile> => {
        const payload = {
            email: data.email,
            password: data.password,
            gender: data.gender,
            address: data.address,
            name: data.name,
            phone: data.phone,
            districtId: data.districtId ?? '3695',
            wardId: data.wardId ?? '90752',
        };
        const formData = new FormData();
        formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        if (avatar) formData.append('avatar', avatar);
        const token = tokenManager.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/users/create`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Tạo user thất bại' }));
            throw new Error(err.message || 'Tạo user thất bại');
        }
        const result: ApiResponse<UserProfile> = await response.json();
        return result.data;
    },

    updateProfile: async (userId: string, data: UpdateProfileRequest, avatar?: File): Promise<UserProfile> => {
        const buildBody = () => {
            const formData = new FormData();
            const payload = {
                name: data.name,
                email: data.email,
                phone: data.phone ?? '',
                address: data.address ?? '',
                gender: data.gender ?? null,
                password: data.password?.trim() || null,
                districtId: (data as Record<string, string>).districtId ?? null,
                wardId: (data as Record<string, string>).wardId ?? null,
            };
            formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            if (avatar) formData.append('avatar', avatar);
            return formData;
        };

        const doPut = (accessToken: string | null) =>
            fetch(`${API_BASE_URL}/users/my-infor`, {
                method: 'PUT',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                body: buildBody(),
            });

        let response = await doPut(tokenManager.getAccessToken());

        if (response.status === 401) {
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
                throw new Error('Phiên đăng nhập hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.');
            }
            try {
                const newAccessToken = await authApi.refreshToken(refreshToken);
                tokenManager.setTokens(newAccessToken, refreshToken);
                response = await doPut(newAccessToken);
            } catch {
                throw new Error('Phiên đăng nhập hết hạn. Vui lòng tải lại trang (F5) hoặc đăng nhập lại.');
            }
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Cập nhật thất bại' }));
            throw new Error(error.message || 'Cập nhật thất bại');
        }
        const result: ApiResponse<UserProfile> = await response.json();
        return result.data;
    },

    // Admin: Get all users
    getAllUsers: async (page: number = 1, size: number = 100): Promise<UserProfile[]> => {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
            active: 'true',
        });

        const response = await apiRequest<ApiResponse<PageResponse<UserProfile>>>(`/users?${params.toString()}`, {
            method: 'GET',
        });

        // Extract content array from pagination response
        return response.data.content || [];
    },

    // Admin: Update user status (ban/unban)
    updateUserStatus: async (userId: string, status: 'ACTIVE' | 'BANNED'): Promise<UserProfile> => {
        const response = await apiRequest<ApiResponse<UserProfile>>(`/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
        return response.data;
    },

    // Admin: Update user role
    updateUserRole: async (userId: string, role: string): Promise<UserProfile> => {
        const response = await apiRequest<ApiResponse<UserProfile>>(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        });
        return response.data;
    },

    /** Add roles to user (BE: PUT /users/add-role, body: { userId, roleCode: string[] }) */
    addRole: async (userId: string, roleCodes: string[]): Promise<void> => {
        await apiRequest<ApiResponse<string>>('/users/add-role', {
            method: 'PUT',
            body: JSON.stringify({ userId, roleCode: roleCodes }),
        });
    },

    /** Remove roles from user (BE: DELETE /users/remove-role) */
    removeRole: async (userId: string, roleCodes: string[]): Promise<void> => {
        await apiRequest<ApiResponse<string>>('/users/remove-role', {
            method: 'DELETE',
            body: JSON.stringify({ userId, roleCode: roleCodes }),
        });
    },
};

// Card API
export interface Card {
    cardId: string;
    name: string;
    description?: string; // Not in User's snippet but maybe inherited? Keep optional just in case.
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';
    imageUrl?: string;
    // categoryId?: string; // Backend does NOT return this
    categoryName?: string;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
}

export interface CardRequest {
    name: string;
    description?: string | null;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';
    imageUrl?: string | null;
    categoryId?: string | null;
    basePrice: number;
}

export interface WishlistItem {
    wishListId: string;
    userId: string;
    cardId: string;
    expectPrice?: number;
}

export const cardApi = {
    getAllCards: async (): Promise<Card[]> => {
        const response = await apiRequest<ApiResponse<Card[]>>('/card', {
            method: 'GET',
        });
        return response.data;
    },

    getCardById: async (id: string): Promise<Card> => {
        const response = await apiRequest<ApiResponse<Card>>(`/card/${id}`, {
            method: 'GET',
        });
        return response.data;
    },

    createCard: async (data: CardRequest): Promise<Card> => {
        const response = await apiRequest<ApiResponse<Card>>('/card', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    updateCard: async (id: string, data: CardRequest): Promise<Card> => {
        const response = await apiRequest<ApiResponse<Card>>(`/card/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    deleteCard: async (id: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/card/${id}`, {
            method: 'DELETE',
        });
    },

    importCards: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/card/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to import cards');
        }

        return await response.json();
    },

    getUserWishlist: async (page: number = 0, size: number = 10): Promise<PageResponse<WishlistItem>> => {
        const response = await apiRequest<ApiResponse<PageResponse<WishlistItem>>>(
            `/card/wishlist?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    addToWishlist: async (cardId: string, expectPrice?: number): Promise<void> => {
        await apiRequest<ApiResponse<unknown>>(`/card/wishlist/${cardId}`, {
            method: 'POST',
            body: JSON.stringify(expectPrice != null ? { expectPrice } : {}),
        });
    },

    removeFromWishlist: async (wishListId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/card/wishlist/${wishListId}`, {
            method: 'DELETE',
        });
    },

    removeFromWishlistByCardId: async (cardId: string): Promise<void> => {
        const res = await apiRequest<ApiResponse<PageResponse<WishlistItem>>>(
            `/card/wishlist?page=0&size=100`,
            { method: 'GET' }
        );
        const item = (res.data?.content ?? []).find((w) => w.cardId === cardId);
        if (item) await apiRequest<ApiResponse<void>>(`/card/wishlist/${item.wishListId}`, { method: 'DELETE' });
    },
};

// Category API
export interface Category {
    categoryId: string;
    categoryName: string;
    description?: string;
    imageUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryRequest {
    categoryName: string;
    description?: string;
    imageUrl?: string;
}

export const categoryApi = {
    getAllCategories: async (): Promise<Category[]> => {
        const response = await apiRequest<ApiResponse<Category[]>>('/cate', {
            method: 'GET',
        });
        return response.data;
    },

    getCategoryById: async (id: string): Promise<Category> => {
        const response = await apiRequest<ApiResponse<Category>>(`/cate/${id}`, {
            method: 'GET',
        });
        return response.data;
    },

    createCategory: async (data: CategoryRequest): Promise<Category> => {
        const response = await apiRequest<ApiResponse<Category>>('/cate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    updateCategory: async (id: string, data: CategoryRequest): Promise<Category> => {
        const response = await apiRequest<ApiResponse<Category>>(`/cate/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    deleteCategory: async (id: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/cate/${id}`, {
            method: 'DELETE',
        });
    },

    getCardsByCategoryId: async (categoryId: string): Promise<Card[]> => {
        const response = await apiRequest<ApiResponse<Card[]>>(`/cate/${categoryId}/cards`, {
            method: 'GET',
        });
        return response.data;
    },

    importCategories: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/cate/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to import categories');
        }

        return await response.json();
    },
};

// List Seller API (đăng bán thẻ)
export interface ListSellerRequest {
    price: number;
    quantity: number;
    description?: string;
}

export interface ListingItem {
    listSellerId: string;
    price: number;
    quantity: number;
    status: string;
    sellerId: string;
    sellerName?: string;
    cardId: string;
    cardName: string;
    imageUrl?: string;
    categoryName?: string;
    rarity: string;
    basePrice: number;
}

export const listSellerApi = {
    createListing: async (cardId: string, data: ListSellerRequest): Promise<unknown> => {
        const response = await apiRequest<ApiResponse<unknown>>(`/listseller/${cardId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    getListings: async (page: number = 0, size: number = 12): Promise<{ content: ListingItem[]; totalPages: number; totalElements: number; size: number; number: number }> => {
        const response = await apiRequest<ApiResponse<{ content: ListingItem[]; totalPages: number; totalElements: number; size: number; number: number }>>(
            `/listseller?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    getMyListings: async (page: number = 0, size: number = 10): Promise<PageResponse<unknown>> => {
        const response = await apiRequest<ApiResponse<PageResponse<unknown>>>(
            `/listseller/my-listings?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },
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

// Transaction API
export interface TransactionResponse {
    transactionId: string;
    amount: number;
    transactionType: 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT';
    statusTransaction: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    createAt: string;
    updateAt: string;
}

export interface DepositeRequest {
    userId: string;
    amount: number;
    provider: 'MOMO' | 'VNPAY';
}

export interface WithdrawRequest {
    userId: string;
    amount: number;
    bankId: string;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export const transactionApi = {
    // Deposit money to wallet
    deposit: async (data: DepositeRequest): Promise<string> => {
        try {
            const response = await apiRequest<ApiResponse<string>>('/transactions/deposite', {
                method: 'POST',
                body: JSON.stringify(data),
            });

            console.log('Deposit API full response:', JSON.stringify(response, null, 2));

            // Check if response is the data directly (not wrapped in ApiResponse)
            if (typeof response === 'string' && response.startsWith('http')) {
                console.log('Response is direct string URL');
                return response;
            }

            if (!response) {
                throw new Error('No response from server');
            }

            // Backend returns payment URL in 'message' field instead of 'data'
            const paymentUrl = (response as any).message || response.data;

            if (!paymentUrl) {
                console.error('Response missing payment URL. Full response:', response);
                throw new Error(`Invalid response from server: missing payment URL. Response: ${JSON.stringify(response)}`);
            }

            if (typeof paymentUrl !== 'string' || !paymentUrl.startsWith('http')) {
                throw new Error(`Invalid payment URL received from server. Type: ${typeof paymentUrl}, Value: ${paymentUrl}`);
            }

            console.log('Payment URL extracted:', paymentUrl);
            return paymentUrl;
        } catch (error) {
            console.error('Deposit API error:', error);
            throw error;
        }
    },

    // Request withdraw money from wallet
    requestWithdraw: async (data: WithdrawRequest): Promise<TransactionResponse> => {
        const response = await apiRequest<ApiResponse<TransactionResponse>>('/transactions/request-withdraw', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // Get my transaction history (backend dùng page 1-based)
    getMyTransactions: async (
        statusPayment?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED',
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<TransactionResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        if (statusPayment) {
            params.append('statusPayment', statusPayment);
        }

        const response = await apiRequest<ApiResponse<PageResponse<TransactionResponse>>>(
            `/transactions/me?${params.toString()}`,
            {
                method: 'POST',
            }
        );
        return response.data;
    },

    // Get transaction by ID
    getById: async (id: string): Promise<TransactionResponse> => {
        const response = await apiRequest<ApiResponse<TransactionResponse>>(`/transactions/${id}`, {
            method: 'GET',
        });
        return response.data;
    },
};

// Blind Box API
export interface BlindBox {
    blindBoxId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string; // Optional, based on common patterns, though not in doc request body
    cardIds?: string[]; // IDs of cards in the box
}

export interface BlindBoxRequest {
    name: string;
    description: string;
    price: number;
    drawPrice: number;
    cardIds: string[];
}

export interface BlindBoxProbability {
    rarity: string;
    probability: number;
}

export const blindBoxApi = {
    getAllBlindBoxes: async (): Promise<BlindBox[]> => {
        const response = await apiRequest<ApiResponse<BlindBox[]>>('/blind-boxes', {
            method: 'GET',
        });
        return response.data;
    },

    getBlindBoxById: async (id: string): Promise<BlindBox> => {
        const response = await apiRequest<ApiResponse<BlindBox>>(`/blind-boxes/${id}`, {
            method: 'GET',
        });
        return response.data;
    },

    createBlindBox: async (data: BlindBoxRequest): Promise<BlindBox> => {
        const response = await apiRequest<ApiResponse<BlindBox>>('/blind-boxes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    deleteBlindBox: async (id: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/blind-boxes/${id}`, {
            method: 'DELETE',
        });
    },

    getBlindBoxCards: async (id: string): Promise<Card[]> => {
        const response = await apiRequest<any>(`/blind-boxes/${id}/cards`, {
            method: 'GET',
        });
        const raw = response?.data ?? response;
        const list = Array.isArray(raw) ? raw : [];
        // Backend BlindBoxCardResponse has cardName, cardId, rarity (no imageUrl/name) - map to Card-like shape
        return list.map((c: any) => ({
            cardId: c.cardId ?? c.blindBoxCardId,
            name: c.cardName ?? c.name ?? '—',
            imageUrl: c.imageUrl,
            rarity: c.rarity ?? 'COMMON',
            basePrice: c.basePrice ?? 0,
            minPrice: c.minPrice ?? 0,
            maxPrice: c.maxPrice ?? 0,
        }));
    },

    getBlindBoxProbabilities: async (id: string): Promise<BlindBoxProbability[]> => {
        const response = await apiRequest<any>(`/blind-boxes/${id}/probabilities`, {
            method: 'GET',
        });
        // Backend may return { data: { probabilities: [...] } } or legacy unwrapped { probabilities: [...] }
        const data = response?.data ?? response;
        const list = Array.isArray(data) ? data : (data?.probabilities ?? []);
        return Array.isArray(list) ? list : [];
    }
};

// Rate Config API (frontend uses id/rarity/rate; backend uses rateConfigId/cardRarity/dropRate)
export interface RateConfig {
    id: string;
    rarity: string;
    rate: number;
    variancePercent?: number;
}

export interface RateConfigRequest {
    rarity: string;
    rate: number;
    variancePercent?: number;
}

function mapRateConfigFromBackend(raw: any): RateConfig {
    return {
        id: raw?.rateConfigId ?? raw?.id ?? '',
        rarity: raw?.cardRarity ?? raw?.rarity ?? 'COMMON',
        rate: Number(raw?.dropRate ?? raw?.rate ?? 0),
        variancePercent: Number(raw?.variancePercent ?? 0),
    };
}

function mapRateConfigRequestToBackend(data: RateConfigRequest): { cardRarity: string; dropRate: number; variancePercent: number } {
    return {
        cardRarity: data.rarity ?? 'COMMON',
        dropRate: Number(data.rate ?? 0),
        variancePercent: Number(data.variancePercent ?? 0),
    };
}

export const rateConfigApi = {
    getAllRateConfigs: async (): Promise<RateConfig[]> => {
        const response = await apiRequest<ApiResponse<any[]>>('/rate-config', {
            method: 'GET',
        });
        const list = response?.data ?? [];
        return Array.isArray(list) ? list.map(mapRateConfigFromBackend) : [];
    },

    getRateConfigById: async (id: string): Promise<RateConfig> => {
        const response = await apiRequest<ApiResponse<any>>(`/rate-config/${id}`, {
            method: 'GET',
        });
        return mapRateConfigFromBackend(response?.data ?? {});
    },

    createRateConfig: async (data: RateConfigRequest): Promise<RateConfig> => {
        const response = await apiRequest<ApiResponse<any>>('/rate-config', {
            method: 'POST',
            body: JSON.stringify(mapRateConfigRequestToBackend(data)),
        });
        return mapRateConfigFromBackend(response?.data ?? {});
    },

    updateRateConfig: async (id: string, data: RateConfigRequest): Promise<RateConfig> => {
        const response = await apiRequest<ApiResponse<any>>(`/rate-config/${id}`, {
            method: 'PUT',
            body: JSON.stringify(mapRateConfigRequestToBackend(data)),
        });
        return mapRateConfigFromBackend(response?.data ?? {});
    },

    deleteRateConfig: async (id: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/rate-config/${id}`, {
            method: 'DELETE',
        });
    },

    importRateConfigs: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/rate-config/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to import rate configs');
        }

        return await response.json();
    },
};

// Shipment API
export type ShippingStatus =
    | 'PENDING'
    | 'ASIGNED'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'DELIVERED'
    | 'FAILED'
    | 'RETURNED'
    | 'LOST'
    | 'RECEIVED'
    | 'CANCELLED';

export interface ShipmentResponse {
    shipmentId: string;
    toAddress?: string;
    toPhone?: string;
    fromAddress?: string;
    fromPhone?: string;
    shipmentStatus: ShippingStatus;
    shipmentFee: number;
    createAt?: string;
}

export interface AssignShipperRequest {
    shipmentId: string;
    shipperId: string;
}

export interface UpdateShipmentRequest {
    shipmentId: string;
    shippingStatus: ShippingStatus;
    note?: string;
}

export const shipmentApi = {
    getByOrderItemId: async (orderItemId: string): Promise<ShipmentResponse[]> => {
        const response = await apiRequest<ApiResponse<ShipmentResponse[]>>(
            `/shipments/orders/${orderItemId}`,
            { method: 'GET' }
        );
        return response.data;
    },

    getMyShipments: async (
        complete: boolean = false,
        page: number = 1,
        size: number = 10
    ): Promise<PageResponse<ShipmentResponse>> => {
        const response = await apiRequest<ApiResponse<PageResponse<ShipmentResponse>>>(
            `/shipments/me?complete=${complete}&page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    getNotAssignedShipments: async (
        page: number = 1,
        size: number = 10
    ): Promise<PageResponse<ShipmentResponse>> => {
        const response = await apiRequest<ApiResponse<PageResponse<ShipmentResponse>>>(
            `/shipments/not-asign?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    assignShipper: async (data: AssignShipperRequest): Promise<ShipmentResponse> => {
        const response = await apiRequest<ApiResponse<ShipmentResponse>>('/shipments/asign-shipper', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    updateShipment: async (
        data: UpdateShipmentRequest,
        files?: File[]
    ): Promise<ShipmentResponse> => {
        const formData = new FormData();
        formData.append(
            'request',
            new Blob([JSON.stringify(data)], { type: 'application/json' })
        );
        if (files?.length) {
            files.forEach((f) => formData.append('fileList', f));
        }
        const token = tokenManager.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/shipments/update`, {
            method: 'PATCH',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Cập nhật thất bại' }));
            throw new Error(err.message || 'Cập nhật thất bại');
        }
        const result: ApiResponse<ShipmentResponse> = await response.json();
        return result.data;
    },
};


