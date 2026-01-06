import React from 'react';
import LandingHeroEye from './LandingHeroEye';
import FeaturesSection from './landing/FeaturesSection';
import HowItWorksSection from './landing/HowItWorksSection';
import WaitlistSection from './landing/WaitlistSection';
import LandingFooter from './landing/LandingFooter';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
    return (
        <main role="main" aria-label="Landing" className="w-full flex flex-col">
            <LandingHeroEye onGetStarted={onGetStarted} onLogin={onLogin} />
            <WaitlistSection />
            <FeaturesSection />
            <HowItWorksSection />
            <LandingFooter />
        </main>
    );
}

