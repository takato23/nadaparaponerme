import React, { useEffect, useRef, useState } from 'react';
import BrandEye from './BrandEye';

interface SplashScreenProps {
    onFinish: () => void;
    minDurationMs?: number;
}

const BACKGROUND_IMAGE = [
    'radial-gradient(62% 48% at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.00) 60%)',
    'radial-gradient(55% 45% at 18% 24%, rgba(168,85,247,0.22) 0%, rgba(168,85,247,0.00) 70%)',
    'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.00) 70%)',
    'radial-gradient(45% 40% at 55% 90%, rgba(236,72,153,0.14) 0%, rgba(236,72,153,0.00) 70%)',
    'linear-gradient(180deg, rgba(3,7,18,0.00) 0%, rgba(3,7,18,0.78) 100%)',
].join(',');

const EXIT_MS = 450;

/**
 * SplashScreen — full-screen animated boot/splash shown once on app startup.
 * Mirrors the AuthEyeScreen cosmic background for a seamless handoff into login.
 */
export default function SplashScreen({ onFinish, minDurationMs = 1900 }: SplashScreenProps) {
    const [leaving, setLeaving] = useState(false);
    const finishedRef = useRef(false);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];

        const callFinish = () => {
            if (finishedRef.current) return;
            finishedRef.current = true;
            onFinish();
        };

        timers.push(
            setTimeout(() => {
                setLeaving(true);
                timers.push(setTimeout(callFinish, EXIT_MS));
            }, Math.max(0, minDurationMs)),
        );

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [minDurationMs, onFinish]);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Cargando Ojo de Loca"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05060a] overflow-hidden"
            style={{
                opacity: leaving ? 0 : 1,
                filter: leaving ? 'blur(8px)' : 'blur(0px)',
                transition: `opacity ${EXIT_MS}ms ease-in, filter ${EXIT_MS}ms ease-in`,
            }}
        >
            <style>{`
                @keyframes splash-progress-fill {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                @keyframes splash-progress-shimmer {
                    0% { transform: translateX(-120%); }
                    100% { transform: translateX(320%); }
                }
                .splash-fill {
                    animation: splash-progress-fill ${minDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .splash-shimmer {
                    animation: splash-progress-shimmer 1.4s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .splash-fill {
                        animation: none;
                        width: 100%;
                    }
                    .splash-shimmer {
                        animation: none;
                    }
                    .splash-eye,
                    .splash-wordmark,
                    .splash-tagline {
                        animation: none !important;
                    }
                }
            `}</style>

            {/* Decorative cosmic gradient layers — matches AuthEyeScreen */}
            <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ backgroundImage: BACKGROUND_IMAGE }}
            />

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center px-6 text-center">
                {/* Eye with glowing halo */}
                <div className="relative splash-eye animate-scale-in">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-full blur-2xl animate-pulse-glow"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(168,85,247,0.55) 0%, rgba(59,130,246,0.35) 45%, rgba(236,72,153,0.15) 70%, rgba(0,0,0,0) 100%)',
                        }}
                    />
                    <BrandEye className="w-28 h-28 text-white drop-shadow-[0_0_24px_rgba(168,85,247,0.45)]" />
                </div>

                {/* Wordmark */}
                <h1
                    className="splash-wordmark animate-slide-in-up font-display text-4xl sm:text-5xl font-bold mt-7 tracking-tight bg-clip-text text-transparent"
                    style={{
                        backgroundImage:
                            'linear-gradient(90deg, #c084fc 0%, #f0abfc 50%, #f472b6 100%)',
                        animationDelay: '120ms',
                    }}
                >
                    Ojo de Loca
                </h1>

                {/* Tagline */}
                <p
                    className="splash-tagline animate-fade-in font-sans text-sm sm:text-base text-white/60 mt-3"
                    style={{ animationDelay: '320ms' }}
                >
                    No tengo nada para ponerme
                </p>

                {/* Boot progress indicator */}
                <div
                    aria-hidden="true"
                    className="relative mt-10 h-1.5 w-40 overflow-hidden rounded-full bg-white/10"
                >
                    <div
                        className="splash-fill absolute inset-y-0 left-0 rounded-full"
                        style={{
                            backgroundImage:
                                'linear-gradient(90deg, #a855f7 0%, #3b82f6 50%, #ec4899 100%)',
                        }}
                    >
                        <div
                            className="splash-shimmer absolute inset-y-0 w-1/3"
                            style={{
                                background:
                                    'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
