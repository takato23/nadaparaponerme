/**
 * CLOSET CONTEXT
 *
 * Global state management for the enhanced closet system.
 * Orchestrates:
 * - Filters
 * - Collections
 * - Statistics
 * - View preferences
 * - Item selection (bulk operations)
 */

import React, { createContext, useContext, useMemo, useCallback, useState, ReactNode } from 'react';
import type { ClothingItem } from '../types';
import type { ExtendedSortOption, BulkSelectionState } from '../types/closet';
import { useClosetFilters } from '../hooks/useClosetFilters';
import { useCollections } from '../hooks/useCollections';
import { useClosetStats } from '../hooks/useClosetStats';
import { useViewPreferences } from '../hooks/useViewPreferences';
import { filterAndSortItems } from '../utils/closetUtils';

interface ClosetContextValue {
  // Data
  items: ClothingItem[];
  displayItems: ClothingItem[];           // Filtered and sorted items

  // Filters
  filters: ReturnType<typeof useClosetFilters>;

  // Collections
  collections: ReturnType<typeof useCollections>;

  // Statistics
  stats: ReturnType<typeof useClosetStats>;

  // View preferences
  viewPreferences: ReturnType<typeof useViewPreferences>;

  // Sorting
  sortOption: ExtendedSortOption;
  setSortOption: (option: ExtendedSortOption) => void;

  // Bulk selection
  selection: BulkSelectionState;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItemSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelectAll: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;

  // Computed values
  hasSelection: boolean;
  selectedCount: number;
  selectedItems: ClothingItem[];
  totalItems: number;
  filteredCount: number;
}

const ClosetContext = createContext<ClosetContextValue | undefined>(undefined);

interface ClosetProviderProps {
  children: ReactNode;
  items: ClothingItem[];                  // Items from parent (App.tsx)
}

export function ClosetProvider({ children, items }: ClosetProviderProps) {
  // Initialize all hooks
  const filters = useClosetFilters(items);
  const collections = useCollections(items);
  const stats = useClosetStats(items);
  const viewPreferences = useViewPreferences();

  // Sorting state
  const [sortOption, setSortOption] = useState<ExtendedSortOption>({
    property: 'date',
    direction: 'desc'
  });

  // Bulk selection state
  const [selection, setSelection] = useState<BulkSelectionState>({
    selectedIds: new Set(),
    isSelectionMode: false,
    selectAll: false
  });

  // Apply filters and sorting to get display items
  const displayItems = useMemo(() => {
    // Start with collection items if a collection is active
    const baseItems = collections.activeCollection.id === 'all'
      ? items
      : collections.activeCollection.items;

    // Apply filters and sorting
    return filterAndSortItems(baseItems, filters.filters, sortOption);
  }, [items, collections.activeCollection, filters.filters, sortOption]);

  // Bulk selection functions
  const selectItem = useCallback((id: string) => {
    setSelection(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      newSelectedIds.add(id);
      return {
        ...prev,
        selectedIds: newSelectedIds,
        selectAll: newSelectedIds.size === displayItems.length
      };
    });
  }, [displayItems.length]);

  const deselectItem = useCallback((id: string) => {
    setSelection(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      newSelectedIds.delete(id);
      return {
        ...prev,
        selectedIds: newSelectedIds,
        selectAll: false
      };
    });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    setSelection(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }

      return {
        ...prev,
        selectedIds: newSelectedIds,
        selectAll: newSelectedIds.size === displayItems.length
      };
    });
  }, [displayItems.length]);

  const selectAll = useCallback(() => {
    const allIds = new Set(displayItems.map(item => item.id));
    setSelection(prev => ({
      ...prev,
      selectedIds: allIds,
      selectAll: true
    }));
  }, [displayItems]);

  const deselectAll = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedIds: new Set(),
      selectAll: false
    }));
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selection.selectAll) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selection.selectAll, selectAll, deselectAll]);

  const enterSelectionMode = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      isSelectionMode: true
    }));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelection({
      selectedIds: new Set(),
      isSelectionMode: false,
      selectAll: false
    });
  }, []);

  // Computed values
  const hasSelection = selection.selectedIds.size > 0;
  const selectedCount = selection.selectedIds.size;
  const selectedItems = useMemo(() => {
    return displayItems.filter(item => selection.selectedIds.has(item.id));
  }, [displayItems, selection.selectedIds]);

  // Context value
  const value: ClosetContextValue = useMemo(() => ({
    // Data
    items,
    displayItems,

    // Hooks
    filters,
    collections,
    stats,
    viewPreferences,

    // Sorting
    sortOption,
    setSortOption,

    // Bulk selection
    selection,
    selectItem,
    deselectItem,
    toggleItemSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    enterSelectionMode,
    exitSelectionMode,

    // Computed values
    hasSelection,
    selectedCount,
    selectedItems,
    totalItems: items.length,
    filteredCount: displayItems.length
  }), [
    items,
    displayItems,
    filters,
    collections,
    stats,
    viewPreferences,
    sortOption,
    selection,
    selectItem,
    deselectItem,
    toggleItemSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    enterSelectionMode,
    exitSelectionMode,
    hasSelection,
    selectedCount,
    selectedItems
  ]);

  return (
    <ClosetContext.Provider value={value}>
      {children}
    </ClosetContext.Provider>
  );
}

// Hook to use closet context
export function useCloset() {
  const context = useContext(ClosetContext);

  if (context === undefined) {
    throw new Error('useCloset must be used within a ClosetProvider');
  }

  return context;
}

// Export context for advanced use cases
export { ClosetContext };
