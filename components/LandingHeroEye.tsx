import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Eye3D from './Eye3D';
import { useThemeContext } from '../contexts/ThemeContext';
import { useMatchMedia } from '../src/hooks/useMatchMedia';

const createSeededRandom = (seed: number) => {
    let value = seed >>> 0;
    return () => {
        value ^= value << 13;
        value ^= value >>> 17;
        value ^= value << 5;
        return ((value >>> 0) / 0x100000000);
    };
};

const PARTICLE_SEED = 173489;

// Floating particles component
const FloatingParticles = ({ count = 20, isDark = true }: { count?: number; isDark?: boolean }) => {
    const particles = React.useMemo(() => {
        const random = createSeededRandom(PARTICLE_SEED + (isDark ? 13 : 17) + count);
        return Array.from({ length: count }, (_, i) => ({
        id: i,
            x: random() * 100,
            y: random() * 100,
            size: random() * 3 + 1,
            duration: random() * 20 + 15,
            delay: random() * 5,
        }));
    }, [count, isDark]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className={`absolute rounded-full ${isDark ? 'bg-white/10' : 'bg-primary/20'}`}
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.2, 0.6, 0.2],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};

interface LandingHeroEyeProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export default function LandingHeroEye({ onGetStarted, onLogin }: LandingHeroEyeProps) {
    const prefersReducedMotion = useReducedMotion() || useMatchMedia('(prefers-reduced-motion: reduce)');
    const isSmallScreen = useMatchMedia('(max-width: 640px)');
    const [transitioningTo, setTransitioningTo] = useState<null | 'login' | 'signup'>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const { theme } = useThemeContext();
    const isDark = theme === 'dark';

    // Trigger initial load animation
    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const dpr: number | [number, number] = isSmallScreen ? [1, 1.35] : [1, 1.75];
    const blinkInterval = prefersReducedMotion ? 6500 : 3500;

    const triggerTransition = (intent: 'login' | 'signup') => {
        if (transitioningTo) return;
        setTransitioningTo(intent);
        if (prefersReducedMotion) {
            if (intent === 'login') onLogin();
            else onGetStarted();
            return;
        }
        window.setTimeout(() => {
            if (intent === 'login') onLogin();
            else onGetStarted();
        }, 520);
    };

    const isTransitioning = transitioningTo !== null;

    // Theme-aware gradients
    const darkGradients = [
        'radial-gradient(62% 48% at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 60%)',
        'radial-gradient(55% 45% at 18% 24%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.00) 70%)',
        'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.00) 70%)',
        'radial-gradient(45% 40% at 55% 90%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.00) 70%)',
        'linear-gradient(180deg, rgba(3,7,18,0.00) 0%, rgba(3,7,18,0.75) 100%)',
    ];

    const lightGradients = [
        'radial-gradient(62% 48% at 50% 42%, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.00) 60%)',
        'radial-gradient(55% 45% at 18% 24%, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.00) 70%)',
        'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.00) 70%)',
        'radial-gradient(45% 40% at 55% 90%, rgba(236,72,153,0.10) 0%, rgba(236,72,153,0.00) 70%)',
        'linear-gradient(180deg, rgba(248,250,252,0.00) 0%, rgba(248,250,252,0.90) 100%)',
    ];

    return (
        <section className={`relative min-h-screen w-full transition-colors duration-500 ${isDark ? 'bg-[#05060a] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Floating particles */}
            {!prefersReducedMotion && <FloatingParticles count={isSmallScreen ? 10 : 20} isDark={isDark} />}

            {/* CSS-only background (no 3D backdrop) */}
            <motion.div
                aria-hidden="true"
                className="absolute inset-0 transition-opacity duration-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                style={{
                    backgroundImage: (isDark ? darkGradients : lightGradients).join(','),
                }}
            />
            <div aria-hidden="true" className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-black/0 via-black/0 to-black/35' : 'bg-gradient-to-b from-white/0 via-white/0 to-white/50'}`} />

            {/* Hero object */}
            <div
                className={[
                    'absolute inset-0 z-0 min-h-0',
                    'transition-[transform,filter,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isTransitioning ? 'scale-[1.18] -translate-y-16 opacity-95' : '-translate-y-10 sm:-translate-y-12',
                    !prefersReducedMotion && isTransitioning ? 'blur-[0.5px]' : '',
                ].join(' ')}
            >
                <Eye3D variant="landing" blinkInterval={blinkInterval} reducedMotion={prefersReducedMotion} dpr={dpr} className="absolute inset-0" />
            </div>

            {/* "Dive into the eye" tunnel overlay */}
            <div
                aria-hidden="true"
                className={[
                    'pointer-events-none absolute inset-0 z-[5]',
                    'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    isTransitioning ? 'opacity-100 scale-[1.02]' : 'opacity-0 scale-100',
                ].join(' ')}
                style={{
                    backgroundImage: [
                        'radial-gradient(32% 32% at 50% 52%, rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.00) 18%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 100%)',
                        'radial-gradient(55% 55% at 50% 52%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 55%)',
                    ].join(','),
                }}
            />

            {/* CTA overlay: allow clicks on buttons, keep Canvas interactive elsewhere */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{
                        opacity: isLoaded && !isTransitioning ? 1 : 0,
                        y: isLoaded && !isTransitioning ? 0 : 30,
                        scale: isLoaded && !isTransitioning ? 1 : 0.95
                    }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className={`pointer-events-none w-full max-w-md rounded-[28px] p-5 backdrop-blur-xl sm:p-6 ${isDark
                        ? 'border border-white/12 bg-white/6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
                        : 'border border-slate-200/50 bg-white/70 shadow-[0_24px_80px_rgba(0,0,0,0.15)]'
                        }`}
                >
                    <header className="pointer-events-none text-center">
                        {/* Animated badge */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${isDark ? 'bg-primary/20 border border-primary/30' : 'bg-primary/10 border border-primary/20'
                                }`}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                            <span className={`text-xs font-semibold tracking-wide ${isDark ? 'text-primary' : 'text-primary'}`}>
                                OJO DE LOCA
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                            className={`text-2xl font-bold tracking-tight sm:text-3xl ${isDark ? 'text-white' : 'text-slate-800'}`}
                        >
                            Tu armario, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">potenciado con IA</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                            className={`mt-3 text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-slate-600'}`}
                        >
                            Organizá tu ropa, descubrí combinaciones increíbles y nunca más digas "no tengo qué ponerme".
                        </motion.p>
                    </header>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center"
                    >
                        <motion.button
                            type="button"
                            onClick={() => triggerTransition('login')}
                            disabled={isTransitioning}
                            aria-disabled={isTransitioning}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`pointer-events-auto inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed sm:w-auto ${isDark
                                ? 'bg-white text-black shadow-[0_14px_28px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]'
                                : 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg mr-2">login</span>
                            Ingresar
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={() => triggerTransition('signup')}
                            disabled={isTransitioning}
                            aria-disabled={isTransitioning}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`pointer-events-auto inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold backdrop-blur-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed sm:w-auto ${isDark
                                ? 'border border-white/18 bg-white/8 text-white shadow-[0_10px_26px_rgba(0,0,0,0.25)] hover:bg-white/15'
                                : 'border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg mr-2">person_add</span>
                            Crear cuenta
                        </motion.button>
                    </motion.div>

                    {/* Trust indicators */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.6 }}
                        className={`mt-5 flex items-center justify-center gap-4 text-xs ${isDark ? 'text-white/50' : 'text-slate-400'}`}
                    >
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Gratis
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            Privado
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">bolt</span>
                            IA Avanzada
                        </span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Subtle vignette to keep eye premium/readable */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${isDark ? 'shadow-[inset_0_0_140px_rgba(0,0,0,0.55)]' : 'shadow-[inset_0_0_140px_rgba(0,0,0,0.08)]'}`} />

            {/* Scroll indicator */}
            {!isTransitioning && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.6 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className={`flex flex-col items-center gap-2 ${isDark ? 'text-white/40' : 'text-slate-400'}`}
                    >
                        <span className="text-xs font-medium">Descubrí más</span>
                        <span className="material-symbols-outlined text-xl">expand_more</span>
                    </motion.div>
                </motion.div>
            )}
        </section>
    );
}
