/**
 * CLOSET PRESENTATION MODE
 *
 * Fullscreen immersive view for browsing closet items.
 * Features:
 * - Fullscreen carousel/slider layout
 * - Large high-quality images
 * - Minimal UI overlay
 * - Keyboard navigation (arrows)
 * - Touch swipe support
 * - Premium animations (AnimatePresence)
 * - Quick actions (Favorite, Edit, Share)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface ClosetPresentationModeProps {
    items: ClothingItem[];
    initialIndex?: number;
    onClose: () => void;
    onItemClick?: (id: string) => void;
    onToggleFavorite?: (id: string) => void;
}

export default function ClosetPresentationMode({
    items,
    initialIndex = 0,
    onClose,
    onItemClick,
    onToggleFavorite
}: ClosetPresentationModeProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0); // -1 for left, 1 for right

    // Ensure index is valid
    useEffect(() => {
        if (initialIndex >= 0 && initialIndex < items.length) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, items.length]);

    const currentItem = items[currentIndex];

    // Navigation handlers
    const paginate = useCallback((newDirection: number) => {
        setDirection(newDirection);
        setCurrentIndex((prevIndex) => {
            let nextIndex = prevIndex + newDirection;
            if (nextIndex < 0) nextIndex = items.length - 1;
            if (nextIndex >= items.length) nextIndex = 0;
            return nextIndex;
        });
    }, [items.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                paginate(-1);
            } else if (e.key === 'ArrowRight') {
                paginate(1);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [paginate, onClose]);

    if (!currentItem) return null;

    // Animation variants
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        })
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                <div className="text-white/70 font-medium text-sm">
                    {currentIndex + 1} / {items.length}
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors backdrop-blur-md"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Main Content Carousel */}
            <div className="relative w-full h-full flex items-center justify-center max-w-4xl mx-auto p-4 md:p-10">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.2 }
                        }}
                        className="absolute w-full max-w-md md:max-w-lg aspect-[3/4] bg-white/5 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                    >
                        {/* Image */}
                        <img
                            src={currentItem.imageDataUrl}
                            alt={currentItem.metadata?.subcategory || 'Item'}
                            className="w-full h-full object-cover"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-serif font-bold mb-2 capitalize"
                            >
                                {currentItem.metadata?.subcategory || 'Sin nombre'}
                            </motion.h2>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap gap-2 mb-6"
                            >
                                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium border border-white/10">
                                    {currentItem.metadata?.color_primary}
                                </span>
                                {currentItem.metadata?.seasons && currentItem.metadata.seasons.length > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium border border-white/10">
                                        {currentItem.metadata.seasons[0]}
                                    </span>
                                )}
                                {currentItem.metadata?.vibe_tags?.slice(0, 2).map(tag => (
                                    <span key={tag} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </motion.div>

                            {/* Actions */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex gap-4"
                            >
                                <button
                                    onClick={() => onToggleFavorite?.(currentItem.id)}
                                    className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">favorite</span>
                                    Favorito
                                </button>
                                <button
                                    onClick={() => onItemClick?.(currentItem.id)}
                                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold transition-colors border border-white/20 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">edit</span>
                                    Editar
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons (Desktop) */}
                <button
                    className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 z-30 hidden md:flex"
                    onClick={() => paginate(-1)}
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <button
                    className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 z-30 hidden md:flex"
                    onClick={() => paginate(1)}
                >
                    <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                </button>
            </div>
        </motion.div>
    );
}
