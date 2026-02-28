import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UndoToastProps {
    message: string;
    onUndo: () => void;
    onDismiss?: () => void;
    progress: number; // 0-100
    isVisible: boolean;
}

/**
 * Toast component with undo button and progress indicator
 *
 * @example
 * <UndoToast
 *   message="Prenda eliminada"
 *   onUndo={handleUndo}
 *   progress={progress}
 *   isVisible={hasUndoablePending}
 * />
 */
export function UndoToast({
    message,
    onUndo,
    onDismiss,
    progress,
    isVisible,
}: UndoToastProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-safe-24 left-safe-4 right-safe-4 z-[9999] flex justify-center pointer-events-none"
                >
                    <div className="
                        relative
                        flex items-center gap-3
                        px-4 py-3
                        bg-gray-900/95 dark:bg-gray-100/95
                        backdrop-blur-md
                        rounded-2xl
                        shadow-xl
                        border border-gray-700 dark:border-gray-300
                        pointer-events-auto
                        overflow-hidden
                        max-w-sm w-full
                    ">
                        {/* Progress bar background */}
                        <div
                            className="absolute bottom-0 left-0 h-1 bg-primary/30 transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Progress bar foreground */}
                        <div
                            className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />

                        {/* Icon */}
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-red-400 text-lg">
                                delete
                            </span>
                        </div>

                        {/* Message */}
                        <span className="text-white dark:text-gray-900 text-sm font-medium flex-grow">
                            {message}
                        </span>

                        {/* Undo button */}
                        <button
                            onClick={onUndo}
                            className="
                                px-3 py-1.5
                                bg-primary hover:bg-primary/80
                                text-white
                                text-sm font-bold
                                rounded-lg
                                transition-colors
                                flex-shrink-0
                            "
                        >
                            Deshacer
                        </button>

                        {/* Dismiss button */}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="
                                    p-1
                                    text-gray-400 hover:text-white
                                    dark:text-gray-600 dark:hover:text-gray-900
                                    transition-colors
                                    flex-shrink-0
                                "
                            >
                                <span className="material-symbols-outlined text-lg">
                                    close
                                </span>
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Compact undo toast for less intrusive notifications
 */
export function UndoToastCompact({
    message,
    onUndo,
    progress,
    isVisible,
}: Omit<UndoToastProps, 'onDismiss'>) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-safe-24 left-safe-4 right-safe-4 z-[9999] flex justify-center pointer-events-none"
                >
                    <button
                        onClick={onUndo}
                        className="
                            relative
                            flex items-center gap-2
                            px-4 py-2.5
                            bg-gray-900/95 dark:bg-gray-100/95
                            backdrop-blur-md
                            rounded-full
                            shadow-xl
                            border border-gray-700 dark:border-gray-300
                            pointer-events-auto
                            overflow-hidden
                            hover:scale-105
                            active:scale-95
                            transition-transform
                        "
                    >
                        {/* Circular progress */}
                        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                            <circle
                                cx="10"
                                cy="10"
                                r="8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-gray-600 dark:text-gray-400"
                            />
                            <circle
                                cx="10"
                                cy="10"
                                r="8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray={`${(progress / 100) * 50.26} 50.26`}
                                className="text-primary transition-all duration-100"
                            />
                        </svg>

                        <span className="text-white dark:text-gray-900 text-sm">
                            {message}
                        </span>

                        <span className="text-primary text-sm font-bold">
                            Deshacer
                        </span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default UndoToast;
