/**
 * App Rating Prompt Component
 * 
 * Beautiful modal that appears after success moments to ask for ratings.
 * Implements the "right time, right ask" pattern.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, Heart } from 'lucide-react';
import {
    shouldShowRatingPrompt,
    markPromptShown,
    handlePositiveRating,
    handleNegativeRating,
    dismissRatingPrompt,
} from '../src/services/appRatingService';
import { triggerHaptic } from '../src/services/hapticService';

interface AppRatingPromptProps {
    /** Force show for testing */
    forceShow?: boolean;
    /** Callback when prompt closes */
    onClose?: () => void;
}

export function AppRatingPrompt({ forceShow = false, onClose }: AppRatingPromptProps) {
    const shouldShowNow = useMemo(() => forceShow || shouldShowRatingPrompt(), [forceShow]);
    const [isVisible, setIsVisible] = useState(shouldShowNow);
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [step, setStep] = useState<'rating' | 'feedback' | 'thanks'>('rating');
    const [feedback, setFeedback] = useState('');
    const hasMarkedPrompt = useRef(false);

    useEffect(() => {
        if (isVisible && !hasMarkedPrompt.current) {
            markPromptShown();
            hasMarkedPrompt.current = true;
        }
    }, [isVisible]);

    const handleClose = () => {
        setIsVisible(false);
        onClose?.();
    };

    const handleDismiss = () => {
        dismissRatingPrompt();
        handleClose();
    };

    const handleStarClick = (starValue: number) => {
        triggerHaptic('selection');
        setRating(starValue);

        // Positive rating (4-5 stars)
        if (starValue >= 4) {
            handlePositiveRating();
            setStep('thanks');
            setTimeout(handleClose, 2000);
        } else {
            // Negative rating - show feedback form
            handleNegativeRating();
            setStep('feedback');
        }
    };

    const handleFeedbackSubmit = () => {
        triggerHaptic('success');
        // In a real app, send feedback to backend
        console.log('[AppRating] Feedback submitted:', feedback);
        setStep('thanks');
        setTimeout(handleClose, 2000);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleDismiss}
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-neutral-900 rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                >
                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <AnimatePresence mode="wait">
                        {/* Rating Step */}
                        {step === 'rating' && (
                            <motion.div
                                key="rating"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                {/* Icon */}
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                                        <Heart className="w-8 h-8 text-white" />
                                    </div>
                                </div>

                                {/* Title */}
                                <h2 className="text-xl font-bold text-white mb-2">
                                    ¿Te está gustando la app?
                                </h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    Tu opinión nos ayuda a mejorar
                                </p>

                                {/* Stars */}
                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(0)}
                                            onClick={() => handleStarClick(star)}
                                            className="p-1 transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`w-10 h-10 transition-colors ${star <= (hoveredStar || rating)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : 'text-gray-600'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Dismiss link */}
                                <button
                                    onClick={handleDismiss}
                                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    Ahora no
                                </button>
                            </motion.div>
                        )}

                        {/* Feedback Step */}
                        {step === 'feedback' && (
                            <motion.div
                                key="feedback"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="text-center"
                            >
                                <h2 className="text-xl font-bold text-white mb-2">
                                    ¿Qué podríamos mejorar?
                                </h2>
                                <p className="text-gray-400 text-sm mb-4">
                                    Tu feedback nos ayuda a crear una mejor experiencia
                                </p>

                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Contanos tu experiencia..."
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition-colors mb-4"
                                />

                                <button
                                    onClick={handleFeedbackSubmit}
                                    disabled={!feedback.trim()}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${feedback.trim()
                                            ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    <Send className="w-4 h-4" />
                                    Enviar
                                </button>
                            </motion.div>
                        )}

                        {/* Thanks Step */}
                        {step === 'thanks' && (
                            <motion.div
                                key="thanks"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.1 }}
                                    className="flex justify-center mb-4"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                        <Heart className="w-10 h-10 text-white fill-white" />
                                    </div>
                                </motion.div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    ¡Gracias! 💜
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Tu feedback nos ayuda a mejorar
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Hook to check and show rating prompt
 * Use this in components after success moments
 */
export function useAppRating() {
    const [showPrompt, setShowPrompt] = useState(false);

    const checkAndShowPrompt = () => {
        if (shouldShowRatingPrompt()) {
            setShowPrompt(true);
        }
    };

    const closePrompt = () => {
        setShowPrompt(false);
    };

    return {
        showPrompt,
        checkAndShowPrompt,
        closePrompt,
        RatingPrompt: showPrompt ? (
            <AppRatingPrompt onClose={closePrompt} />
        ) : null,
    };
}
