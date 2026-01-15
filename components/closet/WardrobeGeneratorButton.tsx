
import React, { useState, useEffect } from 'react';
import { generateWardrobeItem, TOTAL_GENERATED_ITEMS } from '../../src/utils/wardrobeGenerator';
import { motion } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface WardrobeGeneratorButtonProps {
    onGenerationComplete?: () => void;
}

export default function WardrobeGeneratorButton({ onGenerationComplete }: WardrobeGeneratorButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Debug: Log when component mounts
    useEffect(() => {
        console.log('[WardrobeGeneratorButton] Component mounted and visible');
    }, []);

    const handleGenerate = async () => {
        console.log('[WardrobeGeneratorButton] Button clicked, isGenerating:', isGenerating);

        if (isGenerating) {
            console.log('[WardrobeGeneratorButton] Already generating, ignoring click');
            return;
        }

        setIsGenerating(true);
        setProgress(1);
        console.log('[WardrobeGeneratorButton] Starting generation of', TOTAL_GENERATED_ITEMS, 'items');

        try {
            // Load existing closet from localStorage
            const existingClosetRaw = localStorage.getItem('ojodeloca-closet');
            const existingCloset: ClothingItem[] = existingClosetRaw ? JSON.parse(existingClosetRaw) : [];
            console.log('[WardrobeGeneratorButton] Existing closet has', existingCloset.length, 'items');

            const newItems: ClothingItem[] = [];

            for (let i = 0; i < TOTAL_GENERATED_ITEMS; i++) {
                try {
                    console.log('[WardrobeGeneratorButton] Generating item', i + 1, 'of', TOTAL_GENERATED_ITEMS);
                    const { imageDataUrl, metadata } = await generateWardrobeItem(i);

                    const newItem: ClothingItem = {
                        id: `generated_${Date.now()}_${i}`,
                        imageDataUrl,
                        metadata,
                    };
                    newItems.push(newItem);
                } catch (err: any) {
                    console.error('[WardrobeGeneratorButton] Error generating item', i, ':', err);
                }

                setProgress(((i + 1) / TOTAL_GENERATED_ITEMS) * 100);
            }

            console.log('[WardrobeGeneratorButton] Generated', newItems.length, 'new items');

            // Save to localStorage
            const updatedCloset = [...newItems, ...existingCloset];
            localStorage.setItem('ojodeloca-closet', JSON.stringify(updatedCloset));
            console.log('[WardrobeGeneratorButton] Saved to localStorage, total items:', updatedCloset.length);

            if (newItems.length > 0) {
                alert(`¡Éxito! Se generaron ${newItems.length} prendas.\n\nLa página se recargará.`);
                window.location.reload();
            } else {
                alert('No se pudieron generar prendas.');
            }
        } catch (error: any) {
            console.error('[WardrobeGeneratorButton] Fatal error in generator:', error);
            alert(`Error critico: ${error.message || error}`);
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all font-medium text-sm relative overflow-hidden"
            title="Generar Armario de Prueba"
        >
            {isGenerating && (
                <motion.div
                    className="absolute inset-0 bg-primary/10 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    transition={{ duration: 0.2 }}
                />
            )}

            <span className={`material-symbols-outlined text-lg ${isGenerating ? 'animate-spin' : ''}`}>
                {isGenerating ? 'autorenew' : 'science'}
            </span>
            <span className="relative z-10">
                {isGenerating ? `Generando ${Math.round(progress)}%...` : 'Test Wardrobe'}
            </span>
        </button>
    );
}
