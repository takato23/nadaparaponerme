import { useCallback } from 'react';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import * as closetService from '../src/services/closetService';
import { dataUrlToFile } from '../src/lib/supabase';
import { getErrorMessage } from '../utils/errorMessages';

interface UseClosetOperationsProps {
  closet: ClothingItem[];
  setCloset: (items: ClothingItem[] | ((prev: ClothingItem[]) => ClothingItem[])) => void;
  useSupabaseCloset: boolean;
  userId?: string;
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
 * Hook for managing closet CRUD operations
 * Extracts closet logic from App.tsx for better separation of concerns
 */
export function useClosetOperations({
  closet,
  setCloset,
  useSupabaseCloset,
  userId,
  toast,
  optimistic
}: UseClosetOperationsProps) {

  // Load closet from Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      const items = await closetService.getClothingItems();
      setCloset(items);
    } catch (error) {
      console.error('Failed to load closet from Supabase:', error);
      toast.error('No se pudo cargar tu armario. Revisa tu conexión.');
    }
  }, [setCloset, toast]);

  // Add single item locally
  const addItemLocal = useCallback((item: ClothingItem) => {
    setCloset(prev => [item, ...prev]);
  }, [setCloset]);

  // Add multiple items locally (bulk)
  const addItemsBulk = useCallback((items: ClothingItem[]) => {
    setCloset(prev => [...items, ...prev]);
  }, [setCloset]);

  // Sync entire closet
  const syncCloset = useCallback((items: ClothingItem[]) => {
    setCloset(items);
  }, [setCloset]);

  // Add item (handles both localStorage and Supabase)
  const addItem = useCallback(async (
    imageDataUrl: string,
    metadata: ClothingItemMetadata
  ) => {
    const newItem: ClothingItem = {
      id: `item_${Date.now()}`,
      imageDataUrl,
      metadata
    };

    if (useSupabaseCloset && userId) {
      const file = dataUrlToFile(imageDataUrl, `${newItem.id}.jpg`);
      await closetService.addClothingItem(file, metadata);
      await loadFromSupabase();
    } else {
      addItemLocal(newItem);
    }

    return newItem;
  }, [useSupabaseCloset, userId, addItemLocal, loadFromSupabase]);

  // Update item metadata
  const updateItem = useCallback(async (id: string, metadata: ClothingItemMetadata) => {
    try {
      if (useSupabaseCloset) {
        const updatedItem = await closetService.updateClothingItem(id, metadata);
        setCloset(prev => prev.map(item => item.id === id ? updatedItem : item));
      } else {
        setCloset(prev => prev.map(item =>
          item.id === id ? { ...item, metadata } : item
        ));
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      const errorMsg = getErrorMessage(error, undefined, {
        retry: () => updateItem(id, metadata)
      });
      toast.error(errorMsg.message);
      throw error;
    }
  }, [useSupabaseCloset, setCloset, toast]);

  // Delete single item with optimistic update
  const deleteItem = useCallback(async (
    id: string,
    onComplete?: () => void
  ) => {
    const originalCloset = closet;

    await optimistic.update(
      // Optimistic update
      () => {
        setCloset(prev => prev.filter(item => item.id !== id));
        onComplete?.();
      },
      // API call
      async () => {
        if (useSupabaseCloset) {
          await closetService.deleteClothingItem(id);
        }
      },
      // Rollback
      () => {
        setCloset(originalCloset);
      },
      // Callbacks
      {
        onSuccess: () => toast.success('Prenda eliminada'),
        onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
      }
    );
  }, [closet, setCloset, useSupabaseCloset, optimistic, toast]);

  // Delete multiple items
  const deleteItems = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const originalCloset = closet;
    const count = ids.length;

    await optimistic.update(
      () => {
        setCloset(prev => prev.filter(item => !ids.includes(item.id)));
      },
      async () => {
        if (useSupabaseCloset) {
          await Promise.all(ids.map(id => closetService.deleteClothingItem(id)));
        }
      },
      () => {
        setCloset(originalCloset);
      },
      {
        onSuccess: () => toast.success(`${count} prendas eliminadas`),
        onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
      }
    );
  }, [closet, setCloset, useSupabaseCloset, optimistic, toast]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (id: string) => {
    if (useSupabaseCloset) {
      try {
        await closetService.toggleFavorite(id);
        toast.success('Favorito actualizado');
      } catch {
        toast.error('Error al actualizar favorito');
      }
    }
  }, [useSupabaseCloset, toast]);

  // Find item by ID (O(1) with memoization pattern)
  const getItemById = useCallback((id: string): ClothingItem | undefined => {
    return closet.find(item => item.id === id);
  }, [closet]);

  return {
    // Load operations
    loadFromSupabase,

    // Add operations
    addItem,
    addItemLocal,
    addItemsBulk,
    syncCloset,

    // Update operations
    updateItem,
    toggleFavorite,

    // Delete operations
    deleteItem,
    deleteItems,

    // Query operations
    getItemById,

    // Loading state
    isLoading: optimistic.isLoading
  };
}
