import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { NewsSidebar } from '@/components/layout/NewsSidebar';
import { Footer } from '@/components/layout/Footer';
import { FloatingWidgets } from '@/components/shared/FloatingWidgets';

export const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />
            <NewsSidebar />
            <main className="lg:ml-20 xl:ml-[400px] pt-4 animate-fade-in">
                <div className="w-full max-w-7xl mx-auto px-4">
                    <Outlet />
                </div>
            </main>
            <Footer />
            <FloatingWidgets />
        </div>
    );
};
