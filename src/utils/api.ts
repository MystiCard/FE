// API Configuration and Service
// Base URL: .env VITE_API_URL (mặc định http://localhost:8080/api)
// Trang Sàn giao dịch: listSellerApi, orderApi, cardApi, categoryApi, shipmentApi, transactionApi
// Trang Hộp bí ẩn: blindBoxApi (GET/POST /blind-boxes, /blind-boxes/me/results, /blind-boxes/me/ship)
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

    // Nếu 401 thì coi như hết phiên, xóa token và đẩy về trang đăng nhập.
    if (response.status === 401) {
        tokenManager.clearTokens();
        window.location.href = '/login';
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
    }

    return response.json();
};

/**
 * Public request helper: giống `apiRequest` nhưng KHÔNG auto-redirect về /login khi 401.
 * Dùng cho các endpoint có thể được gọi ở màn hình public (vd: đăng ký).
 */
export const apiRequestNoRedirect = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

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
    // backend có districtId / wardId, thêm optional để FE dùng tính phí ship
    districtId?: string;
    wardId?: string;
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
    /** Mã quận/huyện & phường/xã theo GHN (tùy chọn khi đăng ký) */
    districtId?: string;
    wardId?: string;
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
    districtId?: string;
    wardId?: string;
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
        const payload: AdminCreateUserRequest = {
            email: data.email,
            password: data.password,
            gender: data.gender,
            address: data.address,
            name: data.name,
            phone: data.phone,
            districtId: data.districtId,
            wardId: data.wardId,
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
                districtId: data.districtId ?? null,
                wardId: data.wardId ?? null,
            };
            formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
            if (avatar) formData.append('avatar', avatar);
            return formData;
        };

        const doPut = (accessToken: string | null) =>
            fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                body: buildBody(),
            });

        let response = await doPut(tokenManager.getAccessToken());

        if (response.status === 401) {
            tokenManager.clearTokens();
            window.location.href = '/login';
            throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
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
/** Backend CardResponse trả imageUrl là List<ImageResponse> (mảng), FE cần chuỗi để hiển thị */
export type CardImageUrl = string | Array<{ imageUrl?: string }>;

export interface Card {
    cardId: string;
    name: string;
    description?: string;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';
    imageUrl?: CardImageUrl; // BE trả về mảng [{ imageUrl: "..." }]
    categoryName?: string;
    basePrice: number;
    minPrice: number;
    maxPrice: number;
}

/** Lấy URL ảnh thẻ (string) từ response: hỗ trợ cả imageUrl là string hoặc mảng ImageResponse */
export function getCardImageUrl(card: { imageUrl?: CardImageUrl } | null | undefined): string {
    if (!card?.imageUrl) return '';
    const u = card.imageUrl;
    if (typeof u === 'string') return u;
    if (Array.isArray(u) && u.length > 0) {
        const first = u[0];
        return (typeof first === 'object' && first && 'imageUrl' in first && first.imageUrl) ? first.imageUrl : (typeof first === 'string' ? first : '');
    }
    return '';
}

export interface CardRequest {
    name: string;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';
    imageUrl?: string | null;
    categoryId?: string | null;
    basePrice: number;
}

export type CardRequiredStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CardRequired {
    cardRequiredId: string;
    cardName: string;
    rate: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SUPER_RARE' | 'SECRET_RARE';
    basePrice: number;
    imageUrl?: string | null;
    createdAt: string;
    decidedAt?: string | null;
    /** Ghi chú (hiện BE đang dùng cho admin note khi duyệt). */
    note?: string | null;
    status: CardRequiredStatus;
    userName?: string | null;
    categoryName?: string | null;
}

export interface NewCardRequiredRequest {
    cardName: string;
    rate: CardRequired['rate'];
    basePrice: number;
    imageUrl?: string | null;
    /** Tên category/set nếu cần tạo mới khi BE không tìm thấy categoryId. */
    category: string;
    /** Id category nếu đã chọn được sẵn. */
    categoryId?: string | null;
}

export interface AddCardRequiredRequest {
    note?: string | null;
}

export interface WishlistItem {
    wishListId: string;
    userId: string;
    cardId: string;
    cardName?: string;
    expectPrice?: number;
}

/** Thông báo từ hệ thống (BE: NotificationResponse). */
export interface NotificationItem {
    notificationId: string;
    cardId?: string;
    userId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    notiType: 'wishList' | 'shipment' | 'wallet';
}

/** Mục wishlist có tin bán <= giá mong muốn (để thông báo người mua). */
export interface WishlistPriceAlert {
    wishListId: string;
    cardId: string;
    cardName: string;
    expectPrice: number | null;
    matchingListings: Array<{ listSellerId: string; price: number; quantity: number; sellerName?: string }>;
}

export const cardApi = {
    getAllCards: async (): Promise<Card[]> => {
        // BE: GET /api/card trả về Spring Page<CardResponse>
        // Một số môi trường có thể trả thẳng array → fallback để không phá UI cũ.
        const response = await apiRequest<ApiResponse<PageResponse<Card> | Card[]>>('/card?page=1&size=500&sort=asc', {
            method: 'GET',
        });
        const data = response.data as any;
        if (Array.isArray(data)) return data as Card[];
        if (data && Array.isArray(data.content)) return data.content as Card[];
        return [];
    },

    /**
     * Tìm kiếm thẻ có phân trang (dùng cho màn đăng bán, trends...).
     * Map trực tiếp tới BE: GET /api/card?page=&size=&keyword=&sort=
     */
    searchCards: async (
        page: number = 0,
        size: number = 24,
        keyword?: string,
        sort: 'asc' | 'desc' = 'asc'
    ): Promise<PageResponse<Card>> => {
        const params = new URLSearchParams();
        // BE page bắt đầu từ 1
        params.set('page', String(page + 1));
        params.set('size', String(size));
        params.set('sort', sort);
        if (keyword && keyword.trim()) {
            params.set('keyword', keyword.trim());
        }
        const response = await apiRequest<ApiResponse<PageResponse<Card>>>(`/card?${params.toString()}`, {
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
        const payload = {
            name: data.name,
            rarity: data.rarity,
            imageUrl: data.imageUrl ?? null,
            basePrice: data.basePrice,
            categoryId: data.categoryId ?? null,
        };
        const response = await apiRequest<ApiResponse<Card>>('/card', {
            method: 'POST',
            body: JSON.stringify(payload),
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

    /** Danh sách wishlist kèm tin bán <= giá mong muốn (dựa trên Notification + listings thực tế). */
    getWishlistPriceAlerts: async (): Promise<WishlistPriceAlert[]> => {
        // Gọi song song: wishlist hiện tại + notification (BE: /notification?page=&size=)
        const [wishlistRes, notiRes] = await Promise.all([
            apiRequest<ApiResponse<PageResponse<WishlistItem>>>('/card/wishlist?page=0&size=100', {
                method: 'GET',
            }),
            apiRequest<ApiResponse<PageResponse<NotificationItem>>>('/notification?page=0&size=50', {
                method: 'GET',
            }),
        ]);

        const wishlistItems = wishlistRes.data?.content ?? [];
        const notifications = (notiRes.data?.content ?? []).filter(
            (n) => n.notiType === 'wishList' && n.cardId
        );

        const wishlistByCardId = new Map<string, WishlistItem>();
        for (const w of wishlistItems) {
            wishlistByCardId.set(w.cardId, w);
        }

        const alerts: WishlistPriceAlert[] = [];

        await Promise.all(
            notifications.map(async (n) => {
                const cardId = n.cardId!;
                const w = wishlistByCardId.get(cardId);
                if (!w) return;

                const expect = w.expectPrice ?? null;
                let matchingListings: Array<{ listSellerId: string; price: number; quantity: number; sellerName?: string }> = [];

                try {
                    const listingPage = await listSellerApi.getListingsByCardId(cardId, 0, 50);
                    const content = (listingPage.content || []) as SellResponse[];
                    matchingListings = content
                        .filter((sell) =>
                            expect != null ? sell.price <= expect : true
                        )
                        .map((sell) => ({
                            listSellerId: sell.listSellerId,
                            price: sell.price,
                            quantity: sell.quantity,
                            sellerName: sell.sellerName,
                        }));
                } catch {
                    // Nếu không lấy được listings thì cứ trả về rỗng cho mục này
                    matchingListings = [];
                }

                alerts.push({
                    wishListId: w.wishListId,
                    cardId: w.cardId,
                    cardName: w.cardName ?? '',
                    expectPrice: expect,
                    matchingListings,
                });
            })
        );

        // Chỉ giữ những alert thực sự có tin bán phù hợp
        return alerts.filter((a) => a.matchingListings.length > 0);
    },

    changeExpectPrice: async (wishListId: string, newExpectPrice: number): Promise<void> => {
        await apiRequest<ApiResponse<unknown>>(`/card/wishlist/${wishListId}?newExpectPrice=${newExpectPrice}`, {
            method: 'PUT',
        });
    },
};

// Card Required API (yêu cầu thêm thẻ mới)
export const cardRequiredApi = {
    /** Seller gửi yêu cầu thêm thẻ mới. */
    requireNewCard: async (payload: NewCardRequiredRequest): Promise<CardRequired> => {
        const response = await apiRequest<ApiResponse<CardRequired>>('/card/required', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return response.data;
    },

    /** Seller xem yêu cầu của chính mình. */
    getMyRequiredCards: async (page: number = 0, size: number = 20): Promise<PageResponse<CardRequired>> => {
        const response = await apiRequest<ApiResponse<PageResponse<CardRequired>>>(
            `/card/required-user?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    /** Admin xem toàn bộ yêu cầu. */
    getAllRequiredCardsAdmin: async (page: number = 0, size: number = 20): Promise<PageResponse<CardRequired>> => {
        const response = await apiRequest<ApiResponse<PageResponse<CardRequired>>>(
            `/card/required-admin?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    /** Admin duyệt yêu cầu và tạo thẻ mới. */
    approveRequiredCard: async (cardRequiredId: string, note?: string | null): Promise<CardRequired> => {
        const body: AddCardRequiredRequest = { note: note ?? null };
        const response = await apiRequest<ApiResponse<CardRequired>>(`/card/${cardRequiredId}/approve`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        return response.data;
    },

    /** Admin từ chối yêu cầu. */
    rejectRequiredCard: async (cardRequiredId: string, note?: string | null): Promise<CardRequired> => {
        const body: AddCardRequiredRequest = { note: note ?? null };
        const response = await apiRequest<ApiResponse<CardRequired>>(`/card/${cardRequiredId}/reject`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        return response.data;
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
// BE chỉ có: GET /api/listseller/{cardId}?page=&size=  và  POST /api/listseller/{cardId}
export interface ListSellerRequest {
    price: number;
    quantity: number;
}

/** BE SellResponse từ getListSellersByCardId */
export interface SellResponse {
    listSellerId: string;
    price: number;
    quantity: number;
    status: string;
    cardId: string;
    sellerId: string;
    sellerName?: string;
    sellerAverageRating?: number;
    sellerFeedbackCount?: number;
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
    minPrice?: number;
    maxPrice?: number;
    /** Đánh giá trung bình của seller (từ feedback đơn hàng). */
    sellerAverageRating?: number;
    /** Số đánh giá của seller. */
    sellerFeedbackCount?: number;
}

export const listSellerApi = {
    createListing: async (cardId: string, data: ListSellerRequest): Promise<unknown> => {
        const response = await apiRequest<ApiResponse<unknown>>(`/listseller/${cardId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    /** BE: GET /api/listseller/{cardId}?page=&size= - danh sách đăng bán theo từng thẻ */
    getListingsByCardId: async (
        cardId: string,
        page: number = 0,
        size: number = 20
    ): Promise<PageResponse<SellResponse>> => {
        const response = await apiRequest<ApiResponse<PageResponse<SellResponse>>>(
            `/listseller/${cardId}?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },

    /** Lấy toàn bộ listing cho Sàn giao dịch: gọi getListingsByCardId cho từng card và gộp (BE không có API list all) */
    getListings: async (
        page: number = 0,
        size: number = 12
    ): Promise<{ content: ListingItem[]; totalPages: number; totalElements: number; size: number; number: number }> => {
        const cards = await cardApi.getAllCards();
        const allListings: ListingItem[] = [];
        // Gọi listing cho TẤT CẢ card (trước đây chỉ 60 card đầu → dễ bỏ sót)
        await Promise.all(
            cards.map(async (card) => {
                try {
                    const res = await listSellerApi.getListingsByCardId(card.cardId, 0, 50);
                    const content = (res.content || []) as SellResponse[];
                    content.forEach((sell) => {
                        allListings.push({
                            listSellerId: sell.listSellerId,
                            price: sell.price,
                            quantity: sell.quantity,
                            status: typeof sell.status === 'string' ? sell.status : String(sell.status),
                            sellerId: sell.sellerId,
                            sellerName: sell.sellerName,
                            cardId: sell.cardId ?? card.cardId,
                            cardName: card.name,
                            imageUrl: getCardImageUrl(card),
                            categoryName: card.categoryName,
                            rarity: card.rarity,
                            basePrice: card.basePrice,
                            sellerAverageRating: sell.sellerAverageRating,
                            sellerFeedbackCount: sell.sellerFeedbackCount,
                        });
                    });
                } catch {
                    // Bỏ qua card không có listing hoặc lỗi
                }
            })
        );
        const totalElements = allListings.length;
        const start = page * size;
        const content = allListings.slice(start, start + size);
        const totalPages = Math.max(1, Math.ceil(totalElements / size));
        return { content, totalPages, totalElements, size, number: page };
    },

    /** BE: GET /api/listseller/my-listings - danh sách tin đăng bán của user (Profile - Đang bán)
     *  Lưu ý: BE dùng page bắt đầu từ 1, FE dùng 0-based → cần cộng/trừ 1.
     */
    getMyListings: async (page: number = 0, size: number = 10): Promise<PageResponse<ListingItem>> => {
        const pageOneBased = Math.max(1, page + 1);
        const response = await apiRequest<ApiResponse<PageResponse<ListingItem>>>(
            `/listseller/my-listings?page=${pageOneBased}&size=${size}`,
            { method: 'GET' }
        );
        const data = response.data;
        const rawContent = (data?.content ?? []) as ListingItem[];

        // Bổ sung thông tin card (ảnh, tên, set, rarity, basePrice) nếu BE chưa trả
        const content: ListingItem[] = await Promise.all(
            rawContent.map(async (item) => {
                let enriched = {
                    ...item,
                    status: typeof item.status === 'string' ? item.status : String(item.status ?? ''),
                } as ListingItem;

                // Nếu thiếu imageUrl hoặc cardName, categoryName... thì gọi thêm cardApi.getCardById
                if (!enriched.imageUrl || !enriched.cardName || !enriched.categoryName) {
                    try {
                        const card = await cardApi.getCardById(enriched.cardId);
                        enriched = {
                            ...enriched,
                            cardName: enriched.cardName || card.name,
                            imageUrl: enriched.imageUrl || getCardImageUrl(card),
                            categoryName: enriched.categoryName || card.categoryName,
                            rarity: enriched.rarity || card.rarity,
                            basePrice: enriched.basePrice ?? card.basePrice,
                            minPrice: enriched.minPrice ?? card.minPrice,
                            maxPrice: enriched.maxPrice ?? card.maxPrice,
                        };
                    } catch {
                        // Nếu lỗi thì giữ nguyên enriched, FE sẽ fallback PLACEHOLDER_IMG
                    }
                }

                return enriched;
            })
        );
        return {
            content,
            totalElements: data?.totalElements ?? 0,
            totalPages: data?.totalPages ?? 0,
            size: data?.size ?? size,
            // data.number từ BE là 0-based, ta trả về 0-based cho FE
            number: data?.number ?? page,
        };
    },

    /** Chi tiết một bài đăng của tôi. */
    getMyListingById: async (listSellerId: string): Promise<ListingItem> => {
        const response = await apiRequest<ApiResponse<ListingItem>>(
            `/listseller/my-listings/${listSellerId}`,
            { method: 'GET' }
        );
        const item = response.data;
        return { ...item, status: typeof item.status === 'string' ? item.status : String(item.status ?? '') };
    },

    /** Chỉnh sửa bài đăng (giá, số lượng). */
    updateMyListing: async (listSellerId: string, data: { price: number; quantity: number }): Promise<ListingItem> => {
        const response = await apiRequest<ApiResponse<ListingItem>>(
            `/listseller/my-listings/${listSellerId}`,
            { method: 'PUT', body: JSON.stringify(data) }
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

// Payment API (admin & user)
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface PaymentResponse {
    paymentId: string;
    provider: string;
    amount: number;
    transactionRef: string;
    statusPayment: PaymentStatus;
    createdAt: string;
    content?: string;
}

export const paymentApi = {
    getMyPayments: async (
        statusPayment: PaymentStatus | undefined = undefined,
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<PaymentResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        if (statusPayment) {
            params.append('statusPayment', statusPayment);
        }
        const response = await apiRequest<ApiResponse<PageResponse<PaymentResponse>>>(
            `/payments/me?${params.toString()}`,
            { method: 'GET' }
        );
        return response.data;
    },

    getAllPaymentsAdmin: async (
        statusPayment: PaymentStatus | undefined = undefined,
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<PaymentResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        if (statusPayment) {
            params.append('statusPayment', statusPayment);
        }

        const response = await apiRequest<ApiResponse<PageResponse<PaymentResponse>>>(
            `/payments?${params.toString()}`,
            { method: 'GET' }
        );
        return response.data;
    },
};

// Transaction API
export interface TransactionResponse {
    walletTransactionId: string;
    /** Alias cho UI cũ */
    transactionId?: string;
    amount: number;
    transactionType: 'DEPOSIT' | 'DEPOSTIE' | 'WITHDRAW' | 'REQUEST_WITHDRAW' | 'TRANSFER' | 'PAYMENT';
    statusTransaction: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    createAt: string;
    /** Ghi chú / lý do (vd: "Admin từ chối yêu cầu rút tiền") */
    message?: string;
    /** Thông tin tài khoản nhận tiền (rút về) */
    bankAccountResponse?: BankAccountResponse;
    /** true: tiền vào ví, false: tiền ra (server set) */
    incoming?: boolean;
}

/** Thông tin hiển thị QR chuyển khoản (VietQR) cho admin duyệt rút thủ công */
export interface WithdrawTransferQrResponse {
    bankCode: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    walletTransactionId: string;
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

export interface BankAccountResponse {
    bankAccountId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    defaultAccount: boolean;
}

export interface BankAccountRequest {
    bankCode: string;
    accountNumber: string;
    accountName: string;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

// Chi tiết thẻ trong shipment Hộp bí ẩn (không có OrderItem)
export interface BlindBoxShipmentItemResponse {
    cardName?: string;
    cardImageUrl?: string;
    basePrice?: number;
}

// OrderItem (dùng cho đơn hàng + màn Orders)
export interface OrderItemResponse {
    shipfee: number;
    shipmentResponse: ShipmentResponse | null;
    orderDetailResponseList: {
        orderItemId: string;
        quantity: number;
        price: number;
        orderItemStatus: string;
        cardName?: string;
        cardImageUrl?: string;
        /** Đánh giá của buyer (sau khi nhận hàng) */
        feedbackRating?: number;
        feedbackComment?: string;
        feedbackCreatedAt?: string;
    }[];
    /** Chi tiết thẻ khi shipment từ Hộp bí ẩn */
    blindBoxDetails?: BlindBoxShipmentItemResponse[];
}

// Order (kết quả tạo đơn khi mua trên sàn / các flow khác)
export interface OrderCardResponse {
    orderId: string;
    totalAmount: number;
    status: string;
    orderDate: string;
    orderItems: OrderItemResponse[];
}

// Payload tạo đơn từ sàn giao dịch (match OrderCardRequest ở BE)
export interface CreateOrderRequest {
    buyerAddress: string;
    toDistrictId: number;
    toWardId: number;
    buyerPhone: string;
    orderItemsList: {
        quantity: number;
        listSellerId: string;
    }[];
}

// Transaction report (admin dashboard)
export interface TransactionReportRequest {
    from: string; // yyyy-MM-dd
    to: string;   // yyyy-MM-dd
}

export interface TransactionReportSummary {
    localDate: string;
    totalAmount: number;
    totalPayment: number;
    success: number;
    error: number;
}

export interface TransactionReportResponse {
    totalAmount: number;
    totalPayment: number;
    totalSuccess: number;
    totalError: number;
    totalPending: number;
    data: TransactionReportSummary[];
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
            const raw: any = response as any;
            if (typeof raw === 'string' && raw.startsWith('http')) {
                console.log('Response is direct string URL');
                return raw;
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

    // Pay ship fee for Blind Box shipment by wallet (current user)
    payBlindBoxShipWithWallet: async (shipmentId: string): Promise<TransactionResponse> => {
        const response = await apiRequest<ApiResponse<TransactionResponse>>(
            `/transactions/blind-box/ship/${shipmentId}/wallet`,
            { method: 'POST' }
        );
        return response.data;
    },

    // Pay marketplace order (orderId) by wallet
    payOrderWithWallet: async (orderId: string): Promise<TransactionResponse> => {
        const response = await apiRequest<ApiResponse<TransactionResponse>>('/transactions/pay-with-wallet', {
            method: 'POST',
            body: JSON.stringify({
                transactionType: 'PAYMENT',
                orderId,
            }),
        });
        return response.data;
    },

    // Admin: approve withdraw transaction (gateway redirect - giữ để tương thích)
    approveWithdraw: async (transactionId: string, provider: string): Promise<string> => {
        const res = await apiRequest<ApiResponse<string>>('/transactions/approve', {
            method: 'POST',
            body: JSON.stringify({ transactionId, provider }),
        });
        return res.data;
    },

    // Admin: báo cáo giao dịch (dùng cho dashboard)
    report: async (payload: TransactionReportRequest): Promise<TransactionReportResponse> => {
        const res = await apiRequest<ApiResponse<TransactionReportResponse>>('/transactions/report', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.data;
    },
};

// Order API (đơn hàng: lấy theo trạng thái + tạo đơn mua từ sàn)
export const orderApi = {
    getByShippingStatus: async (
        shippingStatus: ShippingStatus,
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<OrderItemResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        const res = await apiRequest<ApiResponse<PageResponse<OrderItemResponse>>>(
            `/orders/status?${params.toString()}`,
            {
                method: 'POST',
                body: JSON.stringify(shippingStatus),
            }
        );
        return res.data;
    },

    getByShippingStatusAdmin: async (
        shippingStatus: ShippingStatus,
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<OrderItemResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        const res = await apiRequest<ApiResponse<PageResponse<OrderItemResponse>>>(
            `/orders/status-admin?${params.toString()}`,
            {
                method: 'POST',
                body: JSON.stringify(shippingStatus),
            }
        );
        return res.data;
    },

    getByShippingStatusSeller: async (
        shippingStatus: ShippingStatus,
        page: number = 0,
        size: number = 10
    ): Promise<PageResponse<OrderItemResponse>> => {
        const pageOneBased = Math.max(1, page + 1);
        const params = new URLSearchParams({
            page: pageOneBased.toString(),
            size: size.toString(),
        });
        const res = await apiRequest<ApiResponse<PageResponse<OrderItemResponse>>>(
            `/orders/status-seller?${params.toString()}`,
            {
                method: 'POST',
                body: JSON.stringify(shippingStatus),
            }
        );
        return res.data;
    },

    confirmReceive: async (shipmentId: string): Promise<OrderItemResponse> => {
        const res = await apiRequest<ApiResponse<OrderItemResponse>>(
            `/orders/confirm-receive/${shipmentId}`,
            {
                method: 'POST',
            }
        );
        return res.data;
    },

    /** Buyer gửi đánh giá cho order item (sau khi đã nhận hàng). */
    createFeedback: async (orderItemId: string, rating: number, comment: string): Promise<{ feedbackId: string }> => {
        const res = await apiRequest<ApiResponse<{ feedbackId: string }>>('/orders/feedback', {
            method: 'POST',
            body: JSON.stringify({ orderItemId, rating, comment: comment || '' }),
        });
        return res.data;
    },

    createOrder: async (payload: CreateOrderRequest): Promise<OrderCardResponse> => {
        const res = await apiRequest<ApiResponse<OrderCardResponse>>('/orders/create', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.data;
    },
};

// Bank Account API (rút tiền cần chọn tài khoản ngân hàng)
export const bankAccountApi = {
    getMyBankAccounts: async (userId: string, page: number = 1, size: number = 20): Promise<PageResponse<BankAccountResponse>> => {
        const response = await apiRequest<ApiResponse<PageResponse<BankAccountResponse>>>(
            `/bank-account/bank-user/${userId}?page=${page}&size=${size}`,
            { method: 'GET' }
        );
        return response.data;
    },
    create: async (userId: string, data: BankAccountRequest): Promise<BankAccountResponse> => {
        const response = await apiRequest<ApiResponse<BankAccountResponse>>(
            `/bank-account/create/${userId}`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
        return response.data;
    },
};

// Blind Box API
// BE BlindBoxResponse: blindBoxId, name, description, imageUrl, drawPrice, allBoxPrice, blindBoxStatus
export interface BlindBox {
    blindBoxId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    /** Giá mở 1 lần (EV). */
    drawPrice: number;
    /** Tổng giá trị toàn bộ hộp (DB price). */
    allBoxPrice?: number | null;
    /** ACTIVE = còn thẻ, OUT_OF_STOCK = hết hàng. */
    blindBoxStatus?: 'ACTIVE' | 'OUT_OF_STOCK' | 'DRAFT' | 'DISABLED' | 'UPCOMING' | 'ENDED';
}

// BE BlindBoxRequest: name, description, imageUrl, cardIds, categoryId
export interface BlindBoxRequest {
    name: string;
    description: string;
    imageUrl?: string;
    cardIds: string[];
    categoryId?: string;
}

export interface BlindBoxProbability {
    rarity: string;
    probability: number;
}

/** BE OrderResponse: sau khi mua hộp bí ẩn */
export interface BlindBoxOrderResponse {
    orderId: string;
    totalAmount: number;
    status: string;
    orderDate: string;
    quantity: number;
    buyerId: string;
    blindBoxId: string;
}

/** BE DrawResultResponse: kết quả mở 1 lần (id = orderId) */
export interface DrawResultResponse {
    card: Card;
    drawPrice: number;
    profitOrLoss: number;
}

/** Thẻ trong hộp bí ẩn (BE BlindBoxCardResponse): status true = còn trong hộp, false = đã mở */
export interface BlindBoxCardInBox {
    cardId: string;
    blindBoxCardId?: string;
    name: string;
    imageUrl?: CardImageUrl;
    rarity: string;
    basePrice: number;
    minPrice?: number;
    maxPrice?: number;
    status: boolean; // true = còn trong hộp, false = đã mở
}

/** BE BlindBoxHistoryItemResponse: lịch sử mở hộp bí ẩn của user */
export interface BlindBoxHistoryItem {
    blindBoxResultId: string;
    openedAt: string;
    card: Card;
    blindBoxId?: string;
    blindBoxName?: string;
    drawPrice: number;
    profitOrLoss: number;
    shipped?: boolean;
    /** Thẻ đang được đăng bán trên sàn */
    listedForSale?: boolean;
    /** Đã bán và buyer đã xác nhận nhận hàng → Đã giao buyer */
    soldAndDeliveredToBuyer?: boolean;
    /** Giao về nhà: đã xác nhận đã nhận → Đã giao */
    shippedToHomeDelivered?: boolean;
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

    /** Thẻ trong hộp bí ẩn (có thêm status: true = còn trong hộp, false = đã mở). */
    getBlindBoxCards: async (id: string): Promise<BlindBoxCardInBox[]> => {
        const response = await apiRequest<any>(`/blind-boxes/${id}/cards`, {
            method: 'GET',
        });
        const raw = response?.data ?? response;
        const list = Array.isArray(raw) ? raw : [];
        return list.map((c: any) => ({
            cardId: c.cardId ?? c.blindBoxCardId,
            blindBoxCardId: c.blindBoxCardId,
            name: c.cardName ?? c.name ?? '—',
            imageUrl: c.imageUrl,
            rarity: c.rarity ?? 'COMMON',
            basePrice: c.basePrice ?? 0,
            minPrice: c.minPrice ?? 0,
            maxPrice: c.maxPrice ?? 0,
            status: c.status !== false, // true = còn trong hộp, false = đã mở
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
    },

    /** BE: POST /blind-boxes/{blindBoxId}/buy — mua hộp, trả về order (dùng orderId để draw). */
    buyBlindBox: async (blindBoxId: string): Promise<BlindBoxOrderResponse> => {
        const response = await apiRequest<ApiResponse<BlindBoxOrderResponse>>(`/blind-boxes/${blindBoxId}/buy`, {
            method: 'POST',
        });
        return response.data;
    },

    /** BE: GET /blind-boxes/{orderId}/draw-card — mở 1 thẻ (id là orderId từ buyBlindBox). */
    drawCard: async (orderId: string): Promise<DrawResultResponse> => {
        const response = await apiRequest<ApiResponse<DrawResultResponse>>(`/blind-boxes/${orderId}/draw-card`, {
            method: 'GET',
        });
        return response.data;
    },

    /** Lịch sử mở hộp bí ẩn của user hiện tại (mới nhất trước). */
    getMyHistory: async (): Promise<BlindBoxHistoryItem[]> => {
        // BE: GET /api/blind-boxes/results?page=&size= trả về Page<BlindBoxResultResponse>
        const params = new URLSearchParams({
            // BE đang dùng Pageable.ofSize(size).withPage(page) (0-based),
            // nên để lấy trang đầu tiên phải truyền page=0.
            page: '0',
            size: '100',
        });
        const response = await apiRequest<ApiResponse<PageResponse<{
            blindBoxResultId: string;
            openedAt?: string;
            cardName?: string;
            cardImageUrl?: string;
            rarity?: string;
        }>>>(`/blind-boxes/results?${params.toString()}`, {
            method: 'GET',
        });

        const page = response.data;
        const rows = page?.content ?? [];

        return rows.map((it) => {
            const card: Card = {
                cardId: '',
                name: it.cardName ?? 'Thẻ bí ẩn',
                description: undefined,
                // backend rarity là enum string; fallback COMMON nếu thiếu
                rarity: (it.rarity as Card['rarity']) ?? 'COMMON',
                imageUrl: it.cardImageUrl ?? undefined,
                categoryName: undefined,
                basePrice: 0,
                minPrice: 0,
                maxPrice: 0,
            };

            const openedAt = it.openedAt ?? '';

            const item: BlindBoxHistoryItem = {
                blindBoxResultId: String(it.blindBoxResultId),
                openedAt,
                card,
                blindBoxId: undefined,
                blindBoxName: undefined,
                // BE history hiện chưa trả giá mở & lời/lỗ → để 0 và UI sẽ xử lý
                drawPrice: 0,
                profitOrLoss: 0,
                shipped: false,
                listedForSale: false,
                soldAndDeliveredToBuyer: false,
                shippedToHomeDelivered: false,
            };

            return item;
        });
    },

    /** Yêu cầu ship các thẻ đã mở (BlindBoxResult) về nhà. */
    requestShipResults: async (resultIds: string[]): Promise<ShipmentResponse> => {
        const response = await apiRequest<ApiResponse<ShipmentResponse>>('/blind-boxes/me/ship', {
            method: 'POST',
            body: JSON.stringify(resultIds),
        });
        return response.data;
    },
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

// GHN master-data types (chỉ dùng các field chính)
export interface GhnProvince {
    ProvinceID: number;
    ProvinceName: string;
    Code?: string;
}

export interface GhnDistrict {
    DistrictID: number;
    DistrictName: string;
    ProvinceID: number;
}

export interface GhnWard {
    WardCode: string;
    WardName: string;
    DistrictID: number;
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

    // Tính phí ship trực tiếp (dùng cho Hộp bí ẩn)
    calculateFeeDirect: async (params: {
        totalAmount: number;
        fromDistrictId: number;
        toDistrictId: number;
        toWardId: string;
    }): Promise<number> => {
        const response = await apiRequest<ApiResponse<number>>('/shipments/calculate-fee-direct', {
            method: 'POST',
            body: JSON.stringify(params),
        });
        return response.data;
    },

    // GHN master-data thông qua backend
    getProvinces: async (): Promise<GhnProvince[]> => {
        const response = await apiRequestNoRedirect<ApiResponse<GhnProvince[]>>('/shipments/provinces', {
            method: 'GET',
        });
        return response.data;
    },

    getDistricts: async (provinceId: number): Promise<GhnDistrict[]> => {
        const response = await apiRequestNoRedirect<ApiResponse<GhnDistrict[]>>(
            `/shipments/districts?provinceId=${provinceId}`,
            { method: 'GET' }
        );
        return response.data;
    },

    getWards: async (districtId: number): Promise<GhnWard[]> => {
        const response = await apiRequestNoRedirect<ApiResponse<GhnWard[]>>(
            `/shipments/wards?districtId=${districtId}`,
            { method: 'GET' }
        );
        return response.data;
    },
};


