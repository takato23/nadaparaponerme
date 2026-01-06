import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { SceneOrchestrator } from './SceneOrchestrator';
import { useLocation } from 'react-router-dom';
import { useThemeContext } from '../../contexts/ThemeContext';

interface GlobalCanvasProps {
    children?: React.ReactNode;
    isAuth?: boolean;
}

const Eye3D = lazy(() => import('../Eye3D'));

function useMediaQuery(query: string) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;
        const mql = window.matchMedia(query);
        const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
        setMatches(mql.matches);
        if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
        else mql.addListener(onChange);
        return () => {
            if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
            else mql.removeListener(onChange);
        };
    }, [query]);

    return matches;
}

export const GlobalCanvas: React.FC<GlobalCanvasProps> = ({ isAuth }) => {
    const [dpr, setDpr] = React.useState(1); // Start conservative at 1
    const location = useLocation();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const isSmallScreen = useMediaQuery('(max-width: 640px)');
    const { theme } = useThemeContext();
    const isDark = theme === 'dark';

    const disable3DForDashboard = !isAuth && location.pathname === '/';
    const eyeBackgroundDebug =
        import.meta.env.DEV && new URLSearchParams(location.search).has('eyeBgDebug');

    if (disable3DForDashboard) {
        const eyeDpr: number | [number, number] = isSmallScreen ? 0.85 : 1.1;
        const blinkInterval = prefersReducedMotion ? 9000 : 5200;
        const watermarkFps = isSmallScreen ? 18 : 24;

        // Theme-aware gradient backgrounds
        const lightGradients = [
            'radial-gradient(75% 60% at 20% 0%, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.00) 60%)',
            'radial-gradient(70% 55% at 80% 15%, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0.00) 60%)',
            'radial-gradient(60% 55% at 70% 85%, rgba(16, 185, 129, 0.10) 0%, rgba(16, 185, 129, 0.00) 60%)',
            'radial-gradient(55% 50% at 15% 85%, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0.00) 60%)',
            'linear-gradient(180deg, rgba(245,245,247,1) 0%, rgba(245,245,247,1) 100%)',
        ];

        const darkGradients = [
            'radial-gradient(75% 60% at 20% 0%, rgba(168, 85, 247, 0.20) 0%, rgba(168, 85, 247, 0.00) 60%)',
            'radial-gradient(70% 55% at 80% 15%, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0.00) 60%)',
            'radial-gradient(60% 55% at 70% 85%, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.00) 60%)',
            'radial-gradient(55% 50% at 15% 85%, rgba(236, 72, 153, 0.12) 0%, rgba(236, 72, 153, 0.00) 60%)',
            'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(15,23,42,1) 100%)',
        ];

        return (
            <div className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-[#F5F5F7]'}`}>
                <div
                    aria-hidden="true"
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                        backgroundImage: (isDark ? darkGradients : lightGradients).join(','),
                    }}
                />
                <Suspense fallback={null}>
                    <div
                        aria-hidden="true"
                        className={`absolute inset-0 transition-opacity duration-500 ${eyeBackgroundDebug ? 'opacity-100' : isDark ? 'opacity-[0.35]' : 'opacity-[0.26]'}`}
                        style={{
                            filter: eyeBackgroundDebug ? 'none' : 'blur(14px) saturate(128%)',
                            transform: eyeBackgroundDebug ? 'none' : 'scale(1.12)',
                            WebkitMaskImage: eyeBackgroundDebug
                                ? undefined
                                : 'radial-gradient(circle at 50% 42%, #000 0%, #000 55%, transparent 88%)',
                            maskImage: eyeBackgroundDebug
                                ? undefined
                                : 'radial-gradient(circle at 50% 42%, #000 0%, #000 55%, transparent 88%)',
                            mixBlendMode: eyeBackgroundDebug ? 'normal' : isDark ? 'screen' : 'multiply',
                        }}
                    >
                        <Eye3D
                            variant="landing"
                            blinkInterval={blinkInterval}
                            reducedMotion={prefersReducedMotion}
                            dpr={eyeDpr}
                            quality="watermark"
                            interactive={false}
                            watermarkFps={watermarkFps}
                            className="absolute inset-0"
                        />
                    </div>
                </Suspense>
                <div
                    aria-hidden="true"
                    className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-[0.03] mix-blend-overlay' : 'opacity-[0.06] mix-blend-multiply'}`}
                    style={{
                        backgroundImage:
                            'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 300 300%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.7%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-[#F5F5F7]'}`}>
            <Canvas
                dpr={dpr}
                gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} // Disable AA for perf
                camera={{ position: [0, 0, 5], fov: 45 }}
                style={{ background: 'transparent', pointerEvents: 'auto' }}
                eventSource={document.body}
                eventPrefix="client"
            >
                <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(0.75)}>
                    <AdaptiveDpr pixelated />
                </PerformanceMonitor>

                <Suspense fallback={null}>
                    <SceneOrchestrator isAuth={isAuth} />
                    <Preload all />
                </Suspense>
            </Canvas>
        </div>
    );
};
