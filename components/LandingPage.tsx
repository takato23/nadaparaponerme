import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMatchMedia } from '../src/hooks/useMatchMedia';
import * as analytics from '../src/services/analyticsService';
import type { PublicEntryIntent } from '../src/services/publicEntryFlow';
import AuthView from './AuthView';

const Eye3D = lazy(() => import('./Eye3D'));

class SilentEyeBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: unknown) { console.warn('Eye3D disabled after render error:', error); }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

function supportsWebGL(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return Boolean(gl);
    } catch {
        return false;
    }
}

interface LandingPageProps {
    authInitialMode: 'login' | 'signup';
    showAuth: boolean;
    onCloseAuth: () => void;
    onLoggedIn: () => void;
    onOpenAuth: (mode: 'login' | 'signup', intent?: PublicEntryIntent) => void;
}

const palette = {
    '--home-bg': '#e7ecef',
    '--home-ink': '#14343b',
    '--home-muted': 'rgba(20, 52, 59, 0.84)',
    '--home-mint': '#cae8ea',
} as React.CSSProperties;

export default function LandingPage({
    authInitialMode,
    showAuth,
    onCloseAuth,
    onLoggedIn,
    onOpenAuth,
}: LandingPageProps) {
    const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
    const isSmallScreen = useMatchMedia('(max-width: 640px)');
    const dpr: number | [number, number] = isSmallScreen ? [1, 1.2] : [1, 1.5];
    const blinkInterval = prefersReducedMotion ? 7200 : 4200;
    const [canRenderEye3D, setCanRenderEye3D] = useState(false);

    // Mouse interactive state
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setCanRenderEye3D(supportsWebGL());
        analytics.trackEvent('public_entry_viewed', { stage: 'landing_hero' });
    }, []);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (prefersReducedMotion) return;

        // Calculate normalized device coordinates (-1 to +1)
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth) * 2 - 1;
        const y = -(clientY / window.innerHeight) * 2 + 1;

        setMousePos({ x, y });
    };

    return (
        <main
            className="relative box-border min-h-[100dvh] w-full overflow-hidden text-[color:var(--home-ink)] font-sans selection:bg-[#cae8ea] selection:text-[#14343b] touch-pan-y"
            style={palette}
            onPointerMove={handlePointerMove}
        >
            {/* Light Premium Background Elements matching HomeViewImproved */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.62),transparent_36%),linear-gradient(180deg,#dfe7eb_0%,#eef2f3_100%)] z-0" />
            <div className="noise-overlay opacity-[0.03] z-0" />
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.65)_0%,_transparent_70%)] blur-3xl z-0" />
            <div className="absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(202,232,234,0.45)_0%,_transparent_72%)] blur-3xl z-0" />

            {/* 3D Eye Container (Absolute centered, behind glass) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="relative w-[150vw] h-[150vh] sm:w-[90vw] sm:h-[110vh] lg:w-[70vw] lg:h-[140vh] max-w-[1400px] opacity-90 mix-blend-multiply select-none translate-y-[5%] lg:translate-x-[25%] xl:translate-x-[15%]">
                    {canRenderEye3D ? (
                        <SilentEyeBoundary>
                            <Suspense fallback={null}>
                                <Eye3D
                                    variant="landing"
                                    blinkInterval={blinkInterval}
                                    reducedMotion={prefersReducedMotion}
                                    dpr={dpr}
                                    pointer={mousePos}
                                    className="absolute inset-0"
                                />
                            </Suspense>
                        </SilentEyeBoundary>
                    ) : null}
                </div>
            </div>

            {/* Liquid Glass Interface Layer */}
            <div className="relative z-20 flex min-h-[100dvh] box-border w-full flex-col px-6 py-6 sm:px-10 lg:px-16 lg:py-10">

                {/* Header */}
                <header className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/50 shadow-[0_10px_18px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                            <span className="text-[#14343b] font-serif text-2xl tracking-tighter italic font-bold">O.</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--home-muted)]">Ojo de Loca</span>
                    </div>

                    <button
                        onClick={() => onOpenAuth('login')}
                        className="group relative overflow-hidden rounded-full border border-white/75 bg-white/78 px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--home-ink)] shadow-[0_12px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:bg-white/90 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)]"
                    >
                        Ya tengo cuenta
                    </button>
                </header>

                {/* Hero Asymmetric Content */}
                <div className="mt-20 mb-auto flex flex-col justify-center lg:w-3/5 xl:w-1/2">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-start gap-4"
                    >
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/75 bg-white/72 px-4 py-2 backdrop-blur-md shadow-[0_8px_16px_rgba(0,0,0,0.03)]">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#2aa1a7]" />
                            <span className="text-[9px] uppercase font-bold tracking-[0.25em] text-[color:var(--home-muted)]">Kumbi + armario + looks</span>
                        </div>

                        <h1 className="font-serif text-[clamp(4.5rem,10vw,11rem)] italic font-semibold leading-[0.85] tracking-[-0.05em] text-[color:var(--home-ink)] drop-shadow-sm">
                            Ojo de loca
                        </h1>

                        <div className="relative mt-2">
                            <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-normal tracking-[-0.04em] text-[color:var(--home-muted)]">
                                Tu armario digital para <span className="font-serif italic text-[color:var(--home-ink)] font-medium">decidir qué ponerte.</span>
                            </h2>
                            <div className="absolute -bottom-1 -right-6 h-4 w-4 rounded-full bg-[#cae8ea] mix-blend-multiply blur-[6px] opacity-80" />
                        </div>

                        <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-[color:var(--home-muted)] font-semibold">
                            Subí tu ropa, consultá con Kumbi y guardá looks reutilizables para no pensar de cero todos los días.
                        </p>

                        <button
                            onClick={() => onOpenAuth('signup', 'closet')}
                            className="group relative mt-10 inline-flex overflow-hidden rounded-full border border-white/40 bg-[color:var(--home-ink)] px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_15px_30px_rgba(20,52,59,0.2)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,52,59,0.3)]"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                Crear mi armario
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform duration-300 group-hover:translate-x-1.5"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </span>
                        </button>
                    </motion.div>
                </div>

                {/* Bottom Stats / UI Elements */}
                <div className="mt-16 lg:mt-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pointer-events-none">
                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--home-muted)]">
                        <span>Inteligencia Editorial</span>
                        <div className="h-[1px] w-8 bg-white/40" />
                        <span>v2.0</span>
                    </div>
                </div>
            </div>

            {/* Auth Modal Modal Override */}
            <AnimatePresence>
                {showAuth && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#e7ecef]/80 px-4 backdrop-blur-xl"
                    >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 5 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative h-[min(720px,calc(100dvh-2rem))] w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/70 p-1 pb-0 shadow-[0_30px_60px_rgba(20,52,59,0.1)] backdrop-blur-[30px]"
                    >
                            <button
                                type="button"
                                onClick={onCloseAuth}
                                className="absolute right-5 top-5 z-10 rounded-full border border-white/60 bg-white/50 p-2 text-[color:var(--home-muted)] shadow-sm backdrop-blur-md transition hover:bg-white hover:text-[color:var(--home-ink)]"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </button>
                            <div className="h-full overflow-hidden px-6 pb-8 pt-8">
                                <AuthView onLogin={onLoggedIn} initialMode={authInitialMode} variant="light-eye" />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
