/**
 * useClosetState Hook
 * 
 * Manages closet state including:
 * - Loading/syncing with Supabase
 * - CRUD operations (add, update, delete)
 * - Filtering and sorting
 * - Optimistic updates with rollback
 * 
 * Extracted from App.tsx to improve maintainability.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import { useDebounce } from './useDebounce';
import { useOptimistic } from './useOptimistic';
import { useToast } from './useToast';
import { useFeatureFlag } from './useFeatureFlag';
import { useAuth } from './useAuth';
import * as closetService from '../src/services/closetService';
import { getErrorMessage } from '../utils/errorMessages';
import type { ClothingItem, ClothingItemMetadata, SortOption, CategoryFilter } from '../types';

interface UseClosetStateOptions {
    initialData?: ClothingItem[];
}

export function useClosetState(options: UseClosetStateOptions = {}) {
    const { user } = useAuth();
    const isAuthenticated = !!user;
    const useSupabaseCloset = useFeatureFlag('useSupabaseCloset');
    const toast = useToast();
    const optimistic = useOptimistic();

    // Core state
    const [closet, setCloset] = useLocalStorage<ClothingItem[]>('ojodeloca-closet', options.initialData || []);
    const [isLoading, setIsLoading] = useState(false);

    // Filter and sort state
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter | null>(null);
    const [sortOption, setSortOption] = useLocalStorage<SortOption>('ojodeloca-sort-option', {
        property: 'date',
        direction: 'desc'
    });

    // Load from Supabase when flag enabled
    useEffect(() => {
        if (useSupabaseCloset && isAuthenticated && user) {
            loadFromSupabase();
        }
    }, [useSupabaseCloset, isAuthenticated, user]);

    const loadFromSupabase = useCallback(async () => {
        setIsLoading(true);
        try {
            const items = await closetService.getClothingItems();
            setCloset(items);
        } catch (error) {
            console.error('Failed to load closet from Supabase:', error);
            toast.error('No se pudo cargar tu armario. Revisa tu conexión.');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const refresh = useCallback(async () => {
        if (useSupabaseCloset) {
            await loadFromSupabase();
        }
    }, [useSupabaseCloset, loadFromSupabase]);

    // Filtered and sorted closet
    const filteredCloset = useMemo(() => {
        const filtered = closet.filter(item => {
            const searchLower = debouncedSearchTerm.toLowerCase();
            const searchMatch = searchLower === '' ||
                item.metadata.subcategory.toLowerCase().includes(searchLower) ||
                item.metadata.color_primary.toLowerCase().includes(searchLower);

            const categoryMatch = !activeCategory || item.metadata.category === activeCategory;

            return searchMatch && categoryMatch;
        });

        filtered.sort((a, b) => {
            const { property, direction } = sortOption;
            let valA: string, valB: string;

            switch (property) {
                case 'name':
                    valA = a.metadata.subcategory;
                    valB = b.metadata.subcategory;
                    break;
                case 'color':
                    valA = a.metadata.color_primary;
                    valB = b.metadata.color_primary;
                    break;
                case 'date':
                default:
                    valA = a.id;
                    valB = b.id;
                    break;
            }

            const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
            return direction === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [closet, debouncedSearchTerm, activeCategory, sortOption]);

    // CRUD Operations
    const addItem = useCallback((item: ClothingItem) => {
        setCloset(prev => [item, ...prev]);
    }, []);

    const bulkAdd = useCallback((items: ClothingItem[]) => {
        setCloset(prev => [...items, ...prev]);
    }, []);

    const updateItem = useCallback(async (id: string, metadata: ClothingItemMetadata) => {
        try {
            if (useSupabaseCloset) {
                const updatedItem = await closetService.updateClothingItem(id, metadata);
                setCloset(prev => prev.map(item => item.id === id ? updatedItem : item));
            } else {
                setCloset(prev => prev.map(item => item.id === id ? { ...item, metadata } : item));
            }
        } catch (error) {
            console.error('Failed to update item:', error);
            const errorMsg = getErrorMessage(error, undefined, {
                retry: () => updateItem(id, metadata)
            });
            toast.error(errorMsg.message);
            throw error;
        }
    }, [useSupabaseCloset, toast]);

    const deleteItem = useCallback(async (id: string) => {
        const originalCloset = closet;

        await optimistic.update(
            () => setCloset(prev => prev.filter(item => item.id !== id)),
            async () => {
                if (useSupabaseCloset) {
                    await closetService.deleteClothingItem(id);
                }
            },
            () => setCloset(originalCloset),
            {
                onSuccess: () => toast.success('Prenda eliminada'),
                onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
            }
        );
    }, [closet, useSupabaseCloset, optimistic, toast]);

    const deleteItems = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;

        const originalCloset = closet;
        const count = ids.length;

        await optimistic.update(
            () => setCloset(prev => prev.filter(item => !ids.includes(item.id))),
            async () => {
                if (useSupabaseCloset) {
                    await Promise.all(ids.map(id => closetService.deleteClothingItem(id)));
                }
            },
            () => setCloset(originalCloset),
            {
                onSuccess: () => toast.success(`${count} prendas eliminadas`),
                onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
            }
        );
    }, [closet, useSupabaseCloset, optimistic, toast]);

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

    return {
        // State
        closet,
        filteredCloset,
        isLoading,

        // Filters
        searchTerm,
        setSearchTerm,
        activeCategory,
        setActiveCategory,
        sortOption,
        setSortOption,

        // Operations
        addItem,
        bulkAdd,
        updateItem,
        deleteItem,
        deleteItems,
        toggleFavorite,
        refresh,
        setCloset,
    };
}

export default useClosetState;
