import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

/**
 * PWA Install Prompt Component
 * 
 * Shows a tooltip/banner suggesting users to install the app as a PWA.
 * Only appears on supported browsers and when the app meets PWA criteria.
 */
export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if iOS (needs different instructions)
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if user dismissed recently (don't show for 7 days)
        const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const now = new Date();
            const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt after a short delay (let user see the app first)
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, show instructions after delay
        if (isIOSDevice) {
            setTimeout(() => setShowPrompt(true), 5000);
        }

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
            }

            setDeferredPrompt(null);
            setShowPrompt(false);
        } catch (error) {
            console.error('Error during PWA installation:', error);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    }, []);

    // Don't render if already installed or prompt shouldn't show
    if (isInstalled || !showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-safe-4 inset-x-safe-4 z-[9999] sm:left-auto sm:right-safe-4 sm:max-w-sm"
            >
                <div className="bg-gradient-to-r from-primary/95 to-secondary/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20">
                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        aria-label="Cerrar"
                    >
                        <span className="material-symbols-outlined text-white text-sm">close</span>
                    </button>

                    <div className="flex items-start gap-3">
                        {/* App Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-2xl">download</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm">
                                Instalá Ojo de Loca
                            </h3>

                            {isIOS ? (
                                // iOS Instructions
                                <p className="text-white/80 text-xs mt-1 leading-relaxed">
                                    Tocá <span className="inline-flex items-center"><span className="material-symbols-outlined text-xs">ios_share</span></span> y luego "Agregar a inicio"
                                </p>
                            ) : (
                                // Android/Desktop
                                <p className="text-white/80 text-xs mt-1 leading-relaxed">
                                    Accedé más rápido y usá la app sin conexión
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 mt-3">
                                {!isIOS && deferredPrompt && (
                                    <button
                                        onClick={handleInstall}
                                        className="flex-1 bg-white text-primary font-semibold text-xs py-2 px-4 rounded-lg hover:bg-white/90 transition-colors"
                                    >
                                        Instalar ahora
                                    </button>
                                )}
                                <button
                                    onClick={handleDismiss}
                                    className="text-white/70 hover:text-white text-xs py-2 px-3 transition-colors"
                                >
                                    Más tarde
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PWAInstallPrompt;
