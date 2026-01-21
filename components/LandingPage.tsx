import React from 'react';
import Landing3DScroll from './landing/Landing3DScroll';
import LandingFooter from './landing/LandingFooter';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
    return (
        <main role="main" aria-label="Landing" className="w-full flex flex-col">
            <Landing3DScroll onGetStarted={onGetStarted} onLogin={onLogin} />
            <LandingFooter />
        </main>
    );
}

