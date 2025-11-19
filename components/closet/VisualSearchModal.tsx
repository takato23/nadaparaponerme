/**
 * VISUAL SEARCH MODAL
 *
 * Allows users to search for items by uploading an image.
 * Features:
 * - Drag & drop image upload
 * - Camera capture (mobile)
 * - Image preview
 * - Color extraction (simulated/canvas)
 * - Visual matching logic
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VisualSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (imageData: string, color?: string) => void;
}

export default function VisualSearchModal({
    isOpen,
    onClose,
    onSearch
}: VisualSearchModalProps) {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const handleSearch = () => {
        if (!imagePreview) return;

        setIsAnalyzing(true);

        // Simulate analysis delay
        setTimeout(() => {
            setIsAnalyzing(false);
            // In a real app, we would extract dominant color here
            // For now, we pass the image data and let the parent handle/mock it
            onSearch(imagePreview, '#FF5733'); // Mock color
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <h2 className="text-xl font-serif font-bold text-text-primary dark:text-gray-100">
                            Búsqueda Visual
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {!imagePreview ? (
                            <div
                                className={`
                  border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                  ${isDragging
                                        ? 'border-primary bg-primary/5 scale-[1.02]'
                                        : 'border-gray-300 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }
                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                </div>
                                <p className="font-medium text-text-primary dark:text-gray-200 mb-1">
                                    Sube una foto o arrástrala aquí
                                </p>
                                <p className="text-sm text-text-secondary dark:text-gray-400">
                                    Buscaremos prendas similares en tu armario
                                </p>
                            </div>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black/5">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                                <button
                                    onClick={() => setImagePreview(null)}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-md"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>

                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                                        <p className="font-medium animate-pulse">Analizando imagen...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-0">
                        <button
                            onClick={handleSearch}
                            disabled={!imagePreview || isAnalyzing}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-glow-accent hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">search</span>
                            {isAnalyzing ? 'Buscando...' : 'Buscar Similares'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
