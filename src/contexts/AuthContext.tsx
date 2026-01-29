import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenManager, UserInfo, authApi } from '@/utils/api';
import { setupTokenRefreshInterval, checkAndRefreshToken } from '@/utils/tokenRefresh';

interface AuthContextType {
    user: UserInfo | null;
    isAuthenticated: boolean;
    login: (accessToken: string, refreshToken: string) => void;
    logout: () => Promise<void>;
    updateUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const updateUser = () => {
        const userInfo = tokenManager.getUserInfo();
        setUser(userInfo);
        setIsAuthenticated(!!userInfo);
    };

    useEffect(() => {
        // Load user info on mount
        updateUser();

        // Check token immediately
        checkAndRefreshToken();

        // Setup periodic token refresh check
        const intervalId = setupTokenRefreshInterval();

        // Cleanup on unmount
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const login = (accessToken: string, refreshToken: string) => {
        tokenManager.setTokens(accessToken, refreshToken);
        updateUser();
    };

    const logout = async () => {
        try {
            // Call API logout
            await authApi.logout();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear tokens and state
            tokenManager.clearTokens();
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
