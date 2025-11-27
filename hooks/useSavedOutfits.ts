import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import type { FitResult, SavedOutfit } from '../types';
import * as outfitService from '../src/services/outfitService';
import { getErrorMessage } from '../utils/errorMessages';

interface UseSavedOutfitsProps {
  useSupabaseOutfits: boolean;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
  optimistic: {
    update: <T>(
      optimisticUpdate: () => void,
      apiCall: () => Promise<T>,
      rollback: () => void,
      callbacks?: { onSuccess?: () => void; onError?: () => void }
    ) => Promise<void>;
    isLoading: boolean;
  };
}

/**
 * Hook for managing saved outfits
 * Extracts outfit persistence logic from App.tsx
 */
export function useSavedOutfits({
  useSupabaseOutfits,
  toast,
  optimistic
}: UseSavedOutfitsProps) {
  const [savedOutfits, setSavedOutfits] = useLocalStorage<SavedOutfit[]>(
    'ojodeloca-saved-outfits',
    []
  );

  // Load outfits from Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      const outfits = await outfitService.getSavedOutfits();
      setSavedOutfits(outfits);
    } catch (error) {
      console.error('Failed to load outfits from Supabase:', error);
      toast.error('No se pudieron cargar tus outfits guardados.');
    }
  }, [setSavedOutfits, toast]);

  // Save a new outfit with optimistic update
  const saveOutfit = useCallback(async (
    outfit: Omit<FitResult, 'missing_piece_suggestion'>
  ) => {
    const tempOutfit: SavedOutfit = {
      ...outfit,
      id: `outfit_${Date.now()}`
    };

    const originalOutfits = savedOutfits;

    await optimistic.update(
      // Optimistic update
      () => setSavedOutfits(prev => [tempOutfit, ...prev]),
      // API call
      async () => {
        if (useSupabaseOutfits) {
          const newOutfit = await outfitService.saveOutfit(outfit);
          setSavedOutfits(prev =>
            prev.map(o => o.id === tempOutfit.id ? newOutfit : o)
          );
        }
      },
      // Rollback
      () => setSavedOutfits(originalOutfits),
      // Callbacks
      {
        onSuccess: () => toast.success('¡Outfit guardado!'),
        onError: () => toast.error('Error al guardar el outfit. Intentá de nuevo.')
      }
    );

    return tempOutfit;
  }, [savedOutfits, setSavedOutfits, useSupabaseOutfits, optimistic, toast]);

  // Delete an outfit
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
  }, [useSupabaseOutfits, setSavedOutfits, toast]);

  // Get outfit by ID
  const getOutfitById = useCallback((id: string): SavedOutfit | undefined => {
    return savedOutfits.find(outfit => outfit.id === id);
  }, [savedOutfits]);

  return {
    // State
    savedOutfits,
    setSavedOutfits,

    // Operations
    loadFromSupabase,
    saveOutfit,
    deleteOutfit,
    getOutfitById,

    // Loading state
    isLoading: optimistic.isLoading
  };
}
