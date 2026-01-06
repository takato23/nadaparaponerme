import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClothingCompatibilityWarningProps {
    hasBottomSelected: boolean;
    hasShoesSelected: boolean;
    isVisible: boolean;
    onProceed: () => void;
    onCancel: () => void;
}

/**
 * Warning modal shown when user selects full-body clothes but their selfie
 * might not show those body parts, informing them that the result will
 * necessarily look different since the AI needs to generate missing parts.
 */
export default function ClothingCompatibilityWarning({
    hasBottomSelected,
    hasShoesSelected,
    isVisible,
    onProceed,
    onCancel,
}: ClothingCompatibilityWarningProps) {
    if (!isVisible) return null;

    const missingParts: string[] = [];
    if (hasBottomSelected) missingParts.push('pantalón/falda');
    if (hasShoesSelected) missingParts.push('calzado');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onCancel}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">
                                accessibility_new
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-3">
                        ¿Tu foto es de cuerpo completo?
                    </h3>

                    {/* Explanation */}
                    <div className="space-y-4 mb-6">
                        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                            Seleccionaste <strong>{missingParts.join(' y ')}</strong>.
                            Para que el resultado se vea real, necesitamos saber si se ven tus piernas en la foto original.
                        </p>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
                            <p className="text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                                <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                                <span><strong>Si es cuerpo completo:</strong> El resultado respetará mejor tu identidad.</span>
                            </p>
                            <p className="text-xs text-blue-800 dark:text-blue-200 flex gap-2">
                                <span className="material-symbols-outlined text-base shrink-0">warning</span>
                                <span><strong>Si es medio cuerpo:</strong> La IA "inventará" las piernas y fondo, y podría cambiar un poco tu apariencia.</span>
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onProceed}
                            className="w-full py-3 rounded-xl bg-[color:var(--studio-ink)] text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.01] transition flex items-center justify-center gap-2"
                        >
                            <span>Sí, se ve el cuerpo entero</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>

                        <button
                            onClick={onProceed}
                            className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm font-medium"
                        >
                            No, es solo medio cuerpo (continuar igual)
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full py-2 text-gray-400 hover:text-gray-600 text-xs mt-2"
                        >
                            Cancelar y cambiar ropa
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
