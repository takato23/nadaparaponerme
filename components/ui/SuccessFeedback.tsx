/**
 * SuccessFeedback
 * Animación de confirmación visual para acciones exitosas
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessFeedbackProps {
    isVisible: boolean;
    message?: string;
    icon?: string;
    onComplete?: () => void;
    duration?: number;
}

export function SuccessFeedback({
    isVisible,
    message = '¡Listo!',
    icon = 'check_circle',
    onComplete,
    duration = 2000
}: SuccessFeedbackProps) {
    useEffect(() => {
        if (isVisible && onComplete) {
            const timer = setTimeout(onComplete, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete, duration]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center"
                    >
                        {/* Animated checkmark */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                            className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4"
                        >
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="material-symbols-outlined text-green-500 text-4xl"
                            >
                                {icon}
                            </motion.span>
                        </motion.div>

                        {/* Message */}
                        <motion.p
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg font-bold text-gray-800 dark:text-white"
                        >
                            {message}
                        </motion.p>

                        {/* Confetti-like particles */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        x: '50%',
                                        y: '50%',
                                        scale: 0
                                    }}
                                    animate={{
                                        x: `${30 + Math.random() * 40}%`,
                                        y: `${20 + Math.random() * 60}%`,
                                        scale: [0, 1, 0.5],
                                        opacity: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 1,
                                        delay: 0.2 + i * 0.1,
                                        ease: 'easeOut'
                                    }}
                                    className={`absolute w-3 h-3 rounded-full ${['bg-primary', 'bg-secondary', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400', 'bg-blue-400'][i]
                                        }`}
                                />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Hook para manejar feedback de éxito
 */
export function useSuccessFeedback() {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('¡Listo!');
    const [icon, setIcon] = useState('check_circle');

    const show = (msg?: string, iconName?: string) => {
        if (msg) setMessage(msg);
        if (iconName) setIcon(iconName);
        setIsVisible(true);
    };

    const hide = () => {
        setIsVisible(false);
    };

    return { isVisible, message, icon, show, hide };
}

export default SuccessFeedback;
