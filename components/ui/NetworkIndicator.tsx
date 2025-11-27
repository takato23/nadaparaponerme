import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkIndicatorProps {
    showOnlineToast?: boolean;
    position?: 'top' | 'bottom';
}

/**
 * Network status indicator component
 * Shows offline banner and reconnection toast
 */
export function NetworkIndicator({
    showOnlineToast = true,
    position = 'top'
}: NetworkIndicatorProps) {
    const { isOnline, wasOffline } = useNetworkStatus();
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        if (wasOffline && isOnline && showOnlineToast) {
            setShowReconnected(true);
            const timer = setTimeout(() => {
                setShowReconnected(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [wasOffline, isOnline, showOnlineToast]);

    const positionClasses = position === 'top'
        ? 'top-0 pt-safe'
        : 'bottom-20 pb-safe'; // Above navbar

    return (
        <>
            {/* Offline Banner */}
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
                        className={`
                            fixed ${positionClasses} left-0 right-0 z-[9998]
                            flex justify-center px-4
                        `}
                    >
                        <div className="
                            flex items-center gap-3
                            px-4 py-3
                            bg-gray-900/95 dark:bg-gray-100/95
                            backdrop-blur-md
                            rounded-2xl
                            shadow-lg
                            border border-gray-700 dark:border-gray-300
                        ">
                            {/* Pulsing offline indicator */}
                            <div className="relative">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
                            </div>

                            <div className="flex flex-col">
                                <span className="text-white dark:text-gray-900 text-sm font-medium">
                                    Sin conexión
                                </span>
                                <span className="text-gray-400 dark:text-gray-600 text-xs">
                                    Algunas funciones no estarán disponibles
                                </span>
                            </div>

                            <span className="material-symbols-outlined text-gray-400 dark:text-gray-600">
                                wifi_off
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reconnected Toast */}
            <AnimatePresence>
                {showReconnected && (
                    <motion.div
                        initial={{ opacity: 0, y: position === 'top' ? -50 : 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: position === 'top' ? -20 : 20, scale: 0.9 }}
                        className={`
                            fixed ${positionClasses} left-0 right-0 z-[9998]
                            flex justify-center px-4
                        `}
                    >
                        <div className="
                            flex items-center gap-3
                            px-4 py-3
                            bg-emerald-500/95
                            backdrop-blur-md
                            rounded-2xl
                            shadow-lg
                        ">
                            {/* Online indicator */}
                            <div className="relative">
                                <div className="w-3 h-3 rounded-full bg-white" />
                            </div>

                            <span className="text-white text-sm font-medium">
                                Conexión restaurada
                            </span>

                            <span className="material-symbols-outlined text-white/80">
                                wifi
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * Minimal connection dot indicator for headers/navbars
 */
export function ConnectionDot({ className = '' }: { className?: string }) {
    const { isOnline } = useNetworkStatus();

    return (
        <div
            className={`relative ${className}`}
            title={isOnline ? 'Conectado' : 'Sin conexión'}
        >
            <div className={`
                w-2 h-2 rounded-full
                ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}
            `} />
            {!isOnline && (
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
            )}
        </div>
    );
}

export default NetworkIndicator;
