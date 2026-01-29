import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { Features } from '@/components/home/Features';
import { NewArrivals } from '@/components/home/NewArrivals';

export const HomePage: React.FC = () => {
    return (
        <div className="space-y-8">
            <HeroSection />
            <Features />
            <NewArrivals />
        </div>
    );
};
