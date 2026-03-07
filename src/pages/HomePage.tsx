import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { Features } from '@/components/home/Features';
import { NewArrivals } from '@/components/home/NewArrivals';
import { HomeBlindBoxes } from '@/components/home/HomeBlindBoxes';

export const HomePage: React.FC = () => {
    return (
        <div className="space-y-8">
            <HeroSection />
            <Features />
            <NewArrivals />
            <HomeBlindBoxes />
        </div>
    );
};
