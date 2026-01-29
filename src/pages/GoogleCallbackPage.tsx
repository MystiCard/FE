import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const GoogleCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = React.useState('');
    const { login } = useAuth();

    useEffect(() => {
        // Get tokens from URL parameters
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError('Google login failed. Please try again.');
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

        if (accessToken && refreshToken) {
            // Save tokens and update auth context
            login(accessToken, refreshToken);
            
            // Redirect to home
            navigate('/');
        } else {
            setError('Invalid response from server.');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                {error ? (
                    <div>
                        <div className="text-red-400 text-xl mb-4">{error}</div>
                        <div className="text-muted-foreground">Redirecting to login...</div>
                    </div>
                ) : (
                    <div>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                        <div className="text-xl">Completing Google login...</div>
                    </div>
                )}
            </div>
        </div>
    );
};
