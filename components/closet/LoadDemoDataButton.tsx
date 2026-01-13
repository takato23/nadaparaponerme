/**
 * LoadDemoDataButton Component
 * 
 * Shows a button to load demo wardrobe items when the closet is empty.
 * Useful for new users to test the app functionality immediately.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sampleData, isDemoDataLoaded, removeDemoItems } from '../../data/sampleData';
import type { ClothingItem } from '../../types';

interface LoadDemoDataButtonProps {
    closet: ClothingItem[];
    onLoadDemo: (items: ClothingItem[]) => void;
    onClearDemo?: (items: ClothingItem[]) => void;
    variant?: 'prominent' | 'subtle';
}

export default function LoadDemoDataButton({
    closet,
    onLoadDemo,
    onClearDemo,
    variant = 'prominent'
}: LoadDemoDataButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const hasDemoData = isDemoDataLoaded(closet);
    const isEmpty = closet.length === 0;

    const handleLoadDemo = async () => {
        setIsLoading(true);

        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Merge demo items with existing closet (avoid duplicates)
        const existingIds = new Set(closet.map(item => item.id));
        const newDemoItems = sampleData.filter(item => !existingIds.has(item.id));
        const mergedCloset = [...closet, ...newDemoItems];

        onLoadDemo(mergedCloset);
        setIsLoading(false);
        setShowSuccess(true);

        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleClearDemo = () => {
        const cleanedCloset = removeDemoItems(closet);
        if (onClearDemo) {
            onClearDemo(cleanedCloset);
        } else {
            onLoadDemo(cleanedCloset);
        }
    };

    // If closet has user items and no demo data, don't show anything
    if (!isEmpty && !hasDemoData) {
        return null;
    }

    // Show "Clear Demo" option if demo data is loaded
    if (hasDemoData) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50"
            >
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm">
                    info
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                    Armario de prueba cargado
                </span>
                <button
                    onClick={handleClearDemo}
                    className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 underline"
                >
                    Limpiar
                </button>
            </motion.div>
        );
    }

    // Show load button for empty closet
    if (variant === 'prominent') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 dark:border-primary/30"
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary">
                        checkroom
                    </span>
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-gray-100 mb-1">
                        ¿Querés probarlo primero?
                    </h3>
                    <p className="text-sm text-text-secondary dark:text-gray-400 max-w-xs">
                        Cargá un armario de ejemplo con 13 prendas para explorar todas las funciones.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {showSuccess ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            <span className="text-sm font-medium">¡Listo!</span>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="button"
                            onClick={handleLoadDemo}
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium shadow-lg shadow-primary/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                    <span>Cargando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    <span>Cargar Armario Demo</span>
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    // Subtle variant (inline button)
    return (
        <button
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-secondary dark:text-gray-400 text-sm transition-colors"
        >
            {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
                <span className="material-symbols-outlined text-sm">science</span>
            )}
            <span>Probar con armario demo</span>
        </button>
    );
}
