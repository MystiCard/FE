import React from 'react';
import { AdminCardsPage } from '@/pages/AdminCardsPage';

// Backward-compat: một số nơi vẫn trỏ tới "Products".
export const AdminProductsPage: React.FC = () => {
    return <AdminCardsPage />;
};

