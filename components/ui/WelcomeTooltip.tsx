/**
 * WelcomeTooltip
 * Muestra un tooltip de bienvenida solo en la primera visita del usuario
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeTooltipProps {
    featureId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: React.ReactNode;
}

const STORAGE_KEY = 'ojodeloca-welcome-seen';

export function WelcomeTooltip({
    featureId,
    title,
    description,
    position = 'bottom',
    children
}: WelcomeTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if this tooltip was already shown
        const seen = localStorage.getItem(STORAGE_KEY);
        const seenFeatures = seen ? JSON.parse(seen) : {};

        if (!seenFeatures[featureId]) {
            // Delay showing tooltip for better UX
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [featureId]);

    const handleDismiss = () => {
        // Mark as seen
        const seen = localStorage.getItem(STORAGE_KEY);
        const seenFeatures = seen ? JSON.parse(seen) : {};
        seenFeatures[featureId] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seenFeatures));

        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
        left: 'right-full mr-2 top-1/2 -translate-y-1/2',
        right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
    };

    return (
        <div className="relative inline-block">
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`absolute z-50 ${positionClasses[position]}`}
                    >
                        <div className="bg-primary text-white rounded-xl p-4 shadow-lg max-w-xs">
                            {/* Arrow */}
                            <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />

                            {/* Content */}
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-white/80 text-xl flex-shrink-0">
                                    lightbulb
                                </span>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm mb-1">{title}</h4>
                                    <p className="text-xs text-white/90 leading-relaxed">{description}</p>
                                </div>
                            </div>

                            {/* Dismiss button */}
                            <button
                                onClick={handleDismiss}
                                className="mt-3 w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                            >
                                ¡Entendido!
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Hook para resetear tooltips de bienvenida (útil para testing)
 */
export function useResetWelcomeTooltips() {
    return () => {
        localStorage.removeItem(STORAGE_KEY);
    };
}

export default WelcomeTooltip;
