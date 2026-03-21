import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TutorialPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface StudioTutorialStep {
    id: string;
    target: string;
    title: string;
    description: string;
    position: TutorialPosition;
}

const TUTORIAL_STEPS: StudioTutorialStep[] = [
    {
        id: 'selfie',
        target: 'studio-selfie-upload',
        title: '📸 Tu selfie',
        description: 'Subí una foto tuya de cuerpo entero. Esta será tu base para probarte la ropa.',
        position: 'bottom',
    },
    {
        id: 'presets',
        target: 'studio-presets',
        title: '🎬 Escenario',
        description: 'Elegí dónde querés verte: en tu cuarto, en la calle, en un estudio profesional...',
        position: 'bottom',
    },
    {
        id: 'slots',
        target: 'studio-slots',
        title: '👕 Prendas',
        description: 'Tocá las prendas de tu armario para agregarlas. "Top base" es tu remera o camisa, "Capa media" es un buzo encima.',
        position: 'top',
    },
    {
        id: 'quality',
        target: 'studio-quality',
        title: '⚡ Modelo',
        description: 'Usamos un único modo de alta calidad con Gemini 3.1 Flash Image Preview.',
        position: 'bottom',
    },
    {
        id: 'generate',
        target: 'studio-generate-btn',
        title: '✨ ¡Generá!',
        description: 'Cuando tengas tu selfie y al menos una prenda, tocá Generar para crear tu look virtual.',
        position: 'top',
    },
];

const TOUR_VIEWPORT_PADDING = 12;
const TOUR_TOOLTIP_GAP = 14;
const TOUR_TOOLTIP_MAX_WIDTH = 380;
const TOUR_TOOLTIP_ESTIMATED_HEIGHT = 290;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveTutorialTarget = (target: string): HTMLElement | null => {
    return (
        document.querySelector<HTMLElement>(`[data-studio-tutorial="${target}"]`)
        ?? document.getElementById(target)
    );
};

const buildTooltipStyle = (
    targetRect: DOMRect | null,
    position: TutorialPosition
): React.CSSProperties => {
    if (typeof window === 'undefined') {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
        };
    }

    const tooltipWidth = Math.min(TOUR_TOOLTIP_MAX_WIDTH, window.innerWidth - TOUR_VIEWPORT_PADDING * 2);

    if (!targetRect || position === 'center') {
        return {
            position: 'fixed',
            width: `${tooltipWidth}px`,
            maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
        };
    }

    const minLeft = TOUR_VIEWPORT_PADDING;
    const maxLeft = Math.max(minLeft, window.innerWidth - tooltipWidth - TOUR_VIEWPORT_PADDING);
    const minTop = TOUR_VIEWPORT_PADDING;
    const maxTop = Math.max(minTop, window.innerHeight - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_VIEWPORT_PADDING);

    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.bottom + TOUR_TOOLTIP_GAP;

    if (position === 'top') {
        top = targetRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
    }
    if (position === 'left') {
        left = targetRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
        top = targetRect.top + targetRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
    }
    if (position === 'right') {
        left = targetRect.right + TOUR_TOOLTIP_GAP;
        top = targetRect.top + targetRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
    }

    if (position === 'top' && top < minTop) {
        top = targetRect.bottom + TOUR_TOOLTIP_GAP;
    } else if (position === 'bottom' && top > maxTop) {
        top = targetRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
    }

    if (position === 'left' && left < minLeft) {
        left = targetRect.right + TOUR_TOOLTIP_GAP;
    } else if (position === 'right' && left > maxLeft) {
        left = targetRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
    }

    return {
        position: 'fixed',
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
        left: `${clamp(left, minLeft, maxLeft)}px`,
        top: `${clamp(top, minTop, maxTop)}px`,
    };
};

// Tooltip definitions for confused terms
const TERM_TOOLTIPS: Record<string, string> = {
    'Top base': 'Remera, camisa o musculosa que va directo al cuerpo',
    'Capa media': 'Buzo, sweater o cardigan que va sobre el top',
    'Abrigo': 'Campera, tapado o blazer que va encima de todo',
    'Enterizo': 'Vestido o mono que reemplaza top + bottom',
    'Bottom': 'Pantalón, falda o short',
    'Overlay': 'Mantiene tu fondo original de la foto',
    'Nano 3.1': 'Modo único de generación con Gemini 3.1 Flash Image Preview',
};

interface StudioTutorialProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const StudioTutorial: React.FC<StudioTutorialProps> = ({ onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [showInitialModal, setShowInitialModal] = useState(true);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
    const tooltipStyle = useMemo(
        () => buildTooltipStyle(targetRect, step.position),
        [targetRect, step.position]
    );

    useEffect(() => {
        if (showInitialModal) {
            setTargetRect(null);
            return;
        }

        let frameId: number | null = null;
        let scrollTimeoutId: number | null = null;
        let resizeObserver: ResizeObserver | null = null;

        const updateTargetRect = () => {
            const targetElement = resolveTutorialTarget(step.target);
            if (!targetElement) {
                setTargetRect(null);
                return;
            }
            setTargetRect(targetElement.getBoundingClientRect());
        };

        const ensureTargetInView = () => {
            const targetElement = resolveTutorialTarget(step.target);
            if (!targetElement) {
                setTargetRect(null);
                return;
            }

            const rect = targetElement.getBoundingClientRect();
            const viewportPadding = 24;
            const isOutsideViewport = rect.top < viewportPadding || rect.bottom > window.innerHeight - viewportPadding;

            if (isOutsideViewport) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: step.position === 'top' ? 'end' : 'center',
                    inline: 'nearest',
                });
                scrollTimeoutId = window.setTimeout(() => {
                    frameId = window.requestAnimationFrame(updateTargetRect);
                }, 220);
            } else {
                setTargetRect(rect);
            }

            if ('ResizeObserver' in window) {
                resizeObserver = new ResizeObserver(updateTargetRect);
                resizeObserver.observe(targetElement);
            }
        };

        const handleViewportChange = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            frameId = window.requestAnimationFrame(updateTargetRect);
        };

        ensureTargetInView();
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            if (scrollTimeoutId !== null) {
                window.clearTimeout(scrollTimeoutId);
            }
            resizeObserver?.disconnect();
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [showInitialModal, step.target, step.position]);

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleStartTour = () => {
        setShowInitialModal(false);
    };

    if (showInitialModal) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Bienvenido al Studio!</h2>
                            <p className="text-gray-600 text-sm mb-6">
                                Acá podés probarte ropa virtualmente. ¿Querés un tour rápido para ver cómo funciona?
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleStartTour}
                                    className="w-full py-3 px-4 bg-[#1b1a17] text-white rounded-xl font-semibold hover:bg-[#2a2925] transition"
                                >
                                    Sí, mostrame 👀
                                </button>
                                <button
                                    onClick={onSkip}
                                    className="w-full py-3 px-4 text-gray-500 hover:text-gray-700 font-medium transition"
                                >
                                    No, ya sé usarlo
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/35 z-40"
                onClick={onSkip}
            />

            {targetRect && (
                <motion.div
                    key={`${step.id}-highlight`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none fixed z-[45] rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{
                        top: `${targetRect.top - 6}px`,
                        left: `${targetRect.left - 6}px`,
                        width: `${targetRect.width + 12}px`,
                        height: `${targetRect.height + 12}px`,
                    }}
                />
            )}

            {/* Floating tooltip */}
            <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed z-50"
                style={tooltipStyle}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="bg-white rounded-2xl p-5 shadow-2xl">
                    {/* Progress dots */}
                    <div className="flex justify-center gap-1.5 mb-4">
                        {TUTORIAL_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-[#1b1a17]' : 'bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{step.description}</p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`px-4 py-2 rounded-lg font-medium transition ${currentStep === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            Anterior
                        </button>

                        <button
                            onClick={onSkip}
                            className="text-xs text-gray-400 hover:text-gray-600"
                        >
                            Saltar tour
                        </button>

                        <button
                            onClick={handleNext}
                            className="px-4 py-2 bg-[#1b1a17] text-white rounded-lg font-medium hover:bg-[#2a2925] transition"
                        >
                            {isLastStep ? '¡Listo!' : 'Siguiente'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Simple tooltip component for hoverable terms
export const TermTooltip: React.FC<{ term: string; children: React.ReactNode }> = ({ term, children }) => {
    const [show, setShow] = useState(false);
    const tooltip = TERM_TOOLTIPS[term];

    if (!tooltip) return <>{children}</>;

    return (
        <span
            className="relative inline-flex items-center gap-0.5 cursor-help"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onTouchStart={() => setShow(true)}
            onTouchEnd={() => setTimeout(() => setShow(false), 2000)}
        >
            {children}
            <span className="material-symbols-outlined text-xs text-gray-400">help</span>

            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-50"
                    >
                        {tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
};

// Hook to manage tutorial state
export function useStudioTutorial() {
    const [showTutorial, setShowTutorial] = useState(false);
    const STORAGE_KEY = 'studio-tutorial-completed';

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            setShowTutorial(true);
        }
    }, []);

    const completeTutorial = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setShowTutorial(false);
    };

    const skipTutorial = () => {
        localStorage.setItem(STORAGE_KEY, 'skipped');
        setShowTutorial(false);
    };

    const resetTutorial = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowTutorial(true);
    };

    return {
        showTutorial,
        completeTutorial,
        skipTutorial,
        resetTutorial,
    };
}
