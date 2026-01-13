import { useState } from 'react';
import type { ClothingItem, FitResult } from '../types';
import * as aiService from '../src/services/aiService';

export const useOutfitGeneration = (closet: ClothingItem[]) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [fitResult, setFitResult] = useState<FitResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 60000): Promise<T> => {
        let timeoutId: number | undefined;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = window.setTimeout(() => {
                reject(new Error(`La generación tardó demasiado (${Math.round(timeoutMs / 1000)}s). Intentá de nuevo.`));
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        }
    };

    const generateOutfit = async (prompt: string) => {
        setIsGenerating(true);
        setError(null);
        setFitResult(null);

        try {
            const result = await withTimeout(aiService.generateOutfit(prompt, closet));
            setFitResult(result);
            return result;
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            throw e;
        } finally {
            setIsGenerating(false);
        }
    };

    const resetGeneration = () => {
        setFitResult(null);
        setError(null);
        setIsGenerating(false);
    };

    return {
        isGenerating,
        fitResult,
        error,
        generateOutfit,
        resetGeneration,
        setFitResult, // Exposed for manual updates if needed
        setError
    };
};
