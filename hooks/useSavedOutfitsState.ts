/**
 * useSavedOutfitsState Hook
 * 
 * Manages saved outfits state including:
 * - Loading/syncing with Supabase
 * - Save and delete operations
 * - Optimistic updates with rollback
 * 
 * Extracted from App.tsx to improve maintainability.
 */

import { useState, useEffect, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { useOptimistic } from './useOptimistic';
import { useToast } from './useToast';
import { useFeatureFlag } from './useFeatureFlag';
import { useAuth } from './useAuth';
import * as outfitService from '../src/services/outfitService';
import { getErrorMessage } from '../utils/errorMessages';
import type { SavedOutfit, FitResult } from '../types';

export function useSavedOutfitsState() {
    const { user } = useAuth();
    const isAuthenticated = !!user;
    const useSupabaseOutfits = useFeatureFlag('useSupabaseOutfits');
    const toast = useToast();
    const optimistic = useOptimistic();

    const [savedOutfits, setSavedOutfits] = useLocalStorage<SavedOutfit[]>('ojodeloca-saved-outfits', []);
    const [isLoading, setIsLoading] = useState(false);

    // Load from Supabase when flag enabled
    useEffect(() => {
        if (useSupabaseOutfits && isAuthenticated && user) {
            loadFromSupabase();
        }
    }, [useSupabaseOutfits, isAuthenticated, user]);

    const loadFromSupabase = useCallback(async () => {
        setIsLoading(true);
        try {
            const outfits = await outfitService.getSavedOutfits();
            setSavedOutfits(outfits);
        } catch (error) {
            console.error('Failed to load outfits from Supabase:', error);
            toast.error('No se pudieron cargar tus outfits guardados.');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const saveOutfit = useCallback(async (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => {
        const tempOutfit: SavedOutfit = {
            ...outfit,
            id: `outfit_${Date.now()}`
        };

        const originalOutfits = savedOutfits;

        await optimistic.update(
            () => setSavedOutfits(prev => [tempOutfit, ...prev]),
            async () => {
                if (useSupabaseOutfits) {
                    const newOutfit = await outfitService.saveOutfit(outfit);
                    setSavedOutfits(prev => prev.map(o => o.id === tempOutfit.id ? newOutfit : o));
                }
            },
            () => setSavedOutfits(originalOutfits),
            {
                onSuccess: () => toast.success('¡Outfit guardado!'),
                onError: () => toast.error('Error al guardar el outfit. Intentá de nuevo.')
            }
        );
    }, [savedOutfits, useSupabaseOutfits, optimistic, toast]);

    const deleteOutfit = useCallback(async (id: string) => {
        try {
            if (useSupabaseOutfits) {
                await outfitService.deleteOutfit(id);
            }
            setSavedOutfits(prev => prev.filter(outfit => outfit.id !== id));
            toast.success('Outfit eliminado');
        } catch (error) {
            console.error('Failed to delete outfit:', error);
            const errorMsg = getErrorMessage(error, undefined, {
                retry: () => deleteOutfit(id)
            });
            toast.error(errorMsg.message);
            throw error;
        }
    }, [useSupabaseOutfits, toast]);

    return {
        savedOutfits,
        setSavedOutfits,
        isLoading,
        saveOutfit,
        deleteOutfit,
        refresh: loadFromSupabase,
    };
}

export default useSavedOutfitsState;
