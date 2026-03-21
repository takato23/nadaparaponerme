import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as analytics from '../src/services/analyticsService';

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
    const [supportsNativePrompt, setSupportsNativePrompt] = useState(false);

    const trackInstalledOnce = useCallback((source: string) => {
        if (sessionStorage.getItem('ojodeloca-pwa-installed-tracked') === '1') return;
        sessionStorage.setItem('ojodeloca-pwa-installed-tracked', '1');
        analytics.trackEvent('pwa_installed', { source });
    }, []);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if iOS (needs different instructions)
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);
        setSupportsNativePrompt(!isIOSDevice);

        // Check if user dismissed recently (don't show for 14 days)
        const dismissedAt = localStorage.getItem('ojodeloca-pwa-prompt-dismissed');
        if (dismissedAt) {
            const dismissedDate = new Date(dismissedAt);
            const now = new Date();
            const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 14) {
                return;
            }
        }

        const visits = Number(localStorage.getItem('ojodeloca-pwa-prompt-visits') || '0') + 1;
        localStorage.setItem('ojodeloca-pwa-prompt-visits', String(visits));

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (visits >= 2) {
                setTimeout(() => setShowPrompt(true), 3500);
            }
        };

        const handleInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
            localStorage.removeItem('ojodeloca-pwa-prompt-dismissed');
            trackInstalledOnce('browser_event');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleInstalled);

        // For iOS, show instructions only after repeated intent.
        if (isIOSDevice && visits >= 2) {
            const timerId = window.setTimeout(() => setShowPrompt(true), 4500);
            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                window.removeEventListener('appinstalled', handleInstalled);
                window.clearTimeout(timerId);
            };
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, [trackInstalledOnce]);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
                trackInstalledOnce('install_prompt');
            }

            setDeferredPrompt(null);
            setShowPrompt(false);
        } catch (error) {
            console.error('Error during PWA installation:', error);
        }
    }, [deferredPrompt, trackInstalledOnce]);

    const handleDismiss = useCallback(() => {
        setShowPrompt(false);
        localStorage.setItem('ojodeloca-pwa-prompt-dismissed', new Date().toISOString());
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
                <div className="relative rounded-[24px] border border-white/14 bg-[rgba(7,9,16,0.86)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/18"
                        aria-label="Cerrar"
                    >
                        <span className="material-symbols-outlined text-white text-sm">close</span>
                    </button>

                    <div className="flex items-start gap-3">
                        {/* App Icon */}
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                            <span className="material-symbols-outlined text-white text-2xl">download</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white">
                                Instalá Ojo de Loca
                            </h3>

                            {isIOS ? (
                                // iOS Instructions
                                <p className="mt-1 text-xs leading-relaxed text-white/74">
                                    Tocá <span className="inline-flex items-center align-middle"><span className="material-symbols-outlined text-xs">ios_share</span></span> y después “Agregar a pantalla de inicio”.
                                </p>
                            ) : (
                                // Android/Desktop
                                <p className="mt-1 text-xs leading-relaxed text-white/74">
                                    Abrila como app, cargá más rápido y tené fallback offline cuando se corte la conexión.
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 mt-3">
                                {!isIOS && deferredPrompt && supportsNativePrompt && (
                                    <button
                                        onClick={handleInstall}
                                        className="flex-1 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                                    >
                                        Instalar app
                                    </button>
                                )}
                                <button
                                    onClick={handleDismiss}
                                    className="px-3 py-2 text-xs text-white/70 transition-colors hover:text-white"
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
