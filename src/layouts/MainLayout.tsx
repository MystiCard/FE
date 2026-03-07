import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { NewsSidebar } from '@/components/layout/NewsSidebar';
import { Footer } from '@/components/layout/Footer';
import { FloatingWidgets } from '@/components/shared/FloatingWidgets';
import { MarketplaceCartProvider } from '@/contexts/MarketplaceCartContext';

export const MainLayout: React.FC = () => {
    return (
        <MarketplaceCartProvider>
        <div className="min-h-screen">
            <Header />
            <NewsSidebar />
            <main className="xl:ml-80 pt-4 ">
                <div className="w-full max-w-7xl mx-auto px-4">
                    <Outlet />
                </div>
            </main>
            <Footer />
            <FloatingWidgets />
        </div>
        </MarketplaceCartProvider>
    );
};
