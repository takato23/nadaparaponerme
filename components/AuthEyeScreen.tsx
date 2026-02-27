import React, { Suspense, lazy } from 'react';
import AuthView from './AuthView';
import { useMatchMedia } from '../src/hooks/useMatchMedia';

const Eye3D = lazy(() => import('./Eye3D'));

export default function AuthEyeScreen({
    initialMode,
    onLoggedIn,
}: {
    initialMode: 'login' | 'signup';
    onLoggedIn: () => void;
}) {
    const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
    const isSmallScreen = useMatchMedia('(max-width: 640px)');

    const dpr: number | [number, number] = isSmallScreen ? [1, 1.35] : [1, 1.75];
    const blinkInterval = prefersReducedMotion ? 7000 : 4200;

    return (
        <div className="relative w-full h-dvh overflow-hidden bg-[#05060a]">
            {/* Match landing background */}
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                    backgroundImage: [
                        'radial-gradient(62% 48% at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 60%)',
                        'radial-gradient(55% 45% at 18% 24%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.00) 70%)',
                        'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.00) 70%)',
                        'radial-gradient(45% 40% at 55% 90%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.00) 70%)',
                        'linear-gradient(180deg, rgba(3,7,18,0.00) 0%, rgba(3,7,18,0.78) 100%)',
                    ].join(','),
                }}
            />

            {/* Eye behind the portal */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-90 -translate-y-8 sm:-translate-y-10">
                <Suspense fallback={null}>
                    <Eye3D variant="landing" blinkInterval={blinkInterval} reducedMotion={prefersReducedMotion} dpr={dpr} className="absolute inset-0" />
                </Suspense>
            </div>

            <div className="relative z-10 w-full h-full">
                <AuthView onLogin={onLoggedIn} initialMode={initialMode} variant="eye" />
            </div>
        </div>
    );
}
