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

  // Color Filter
  selectedColor: string | null;
  setSelectedColor: (color: string | null) => void;
  availableColors: string[];

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

  // Actions (from parent)
  onDeleteItem?: (id: string) => void;
  onDeleteItems?: (ids: string[]) => void;
  onToggleFavorite?: (id: string) => void;
  onExportItems?: (ids: string[]) => void;
  onShareItems?: (ids: string[]) => void;

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
  // Action callbacks from parent
  onDeleteItem?: (id: string) => void;
  onDeleteItems?: (ids: string[]) => void;
  onToggleFavorite?: (id: string) => void;
  onExportItems?: (ids: string[]) => void;
  onShareItems?: (ids: string[]) => void;
}

export function ClosetProvider({
  children,
  items,
  onDeleteItem,
  onDeleteItems,
  onToggleFavorite,
  onExportItems,
  onShareItems
}: ClosetProviderProps) {
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

  // Color filter state
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Extract unique colors from items
  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    items.forEach(item => {
      if (item.metadata?.color_primary || item.color_primary) {
        colors.add(item.metadata?.color_primary || item.color_primary);
      }
    });
    return Array.from(colors);
  }, [items]);

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

    // Apply color filter first if selected
    let filteredByColor = baseItems;
    if (selectedColor) {
      filteredByColor = baseItems.filter(item => {
        const itemColor = item.metadata?.color_primary || item.color_primary;
        return itemColor === selectedColor;
      });
    }

    // Apply filters and sorting
    return filterAndSortItems(filteredByColor, filters.filters, sortOption);
  }, [items, collections.activeCollection, filters.filters, sortOption, selectedColor]);

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

    // Color Filter
    selectedColor,
    setSelectedColor,
    availableColors,

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

    // Actions (from parent)
    onDeleteItem,
    onDeleteItems,
    onToggleFavorite,
    onExportItems,
    onShareItems,

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
    selectedColor,
    availableColors,
    selection,
    selectItem,
    deselectItem,
    toggleItemSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    enterSelectionMode,
    exitSelectionMode,
    onDeleteItem,
    onDeleteItems,
    onToggleFavorite,
    onExportItems,
    onShareItems,
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
