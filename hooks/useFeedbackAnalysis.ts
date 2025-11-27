import { useState, useEffect } from 'react';
import type { ClothingItem, SavedOutfit, FeedbackAnalysisResult } from '../types';
import * as geminiService from '../src/services/aiService';
import * as ratingService from '../src/services/ratingService';

export type AnalysisStep = 'intro' | 'analyzing' | 'results';

export const useFeedbackAnalysis = (closet: ClothingItem[], savedOutfits: SavedOutfit[]) => {
    const [currentStep, setCurrentStep] = useState<AnalysisStep>('intro');
    const [analysisResult, setAnalysisResult] = useState<FeedbackAnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkDataAvailability = async () => {
            try {
                const ratings = await ratingService.getUserRatings();
                if (ratings.length < 3) {
                    setError('Necesitás al menos 3 calificaciones de outfits para generar un análisis personalizado.');
                }
            } catch (err) {
                console.error('Error checking ratings:', err);
            }
        };

        checkDataAvailability();
    }, []);

    const generateAnalysis = async () => {
        setLoading(true);
        setError(null);
        setCurrentStep('analyzing');

        try {
            const ratings = await ratingService.getUserRatings();

            if (ratings.length < 3) {
                throw new Error('Necesitás al menos 3 calificaciones para generar insights.');
            }

            if (savedOutfits.length < 3) {
                throw new Error('Necesitás al menos 3 outfits guardados para generar insights.');
            }

            const insights = await geminiService.analyzeFeedbackPatterns({
                ratings,
                outfits: savedOutfits,
                closet,
            });

            const sortedRatings = [...ratings].sort((a, b) =>
                new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
            );

            const result: FeedbackAnalysisResult = {
                insights,
                analyzed_ratings_count: ratings.length,
                analyzed_outfits_count: savedOutfits.length,
                date_range: {
                    from: sortedRatings[0]?.created_at || new Date().toISOString(),
                    to: sortedRatings[sortedRatings.length - 1]?.created_at || new Date().toISOString(),
                },
                confidence_level: ratings.length >= 10 ? 'high' : ratings.length >= 5 ? 'medium' : 'low',
            };

            setAnalysisResult(result);
            setCurrentStep('results');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al generar análisis');
            setCurrentStep('intro');
        } finally {
            setLoading(false);
        }
    };

    const resetAnalysis = () => {
        setCurrentStep('intro');
        setAnalysisResult(null);
    };

    return {
        currentStep,
        analysisResult,
        loading,
        error,
        generateAnalysis,
        resetAnalysis
    };
};
