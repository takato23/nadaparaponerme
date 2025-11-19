/**
 * CLOSET FILTERS HOOK
 *
 * Manages advanced filtering state and operations for closet items.
 * Provides:
 * - Filter state management
 * - Apply/clear filters
 * - Active filter counting
 * - Filter persistence
 */

import { useState, useMemo, useCallback } from 'react';
import type { ClothingItem } from '../types';
import type {
  AdvancedFilters,
  FilterState,
  CategoryFilter,
  ColorFilter,
  SeasonFilter,
  TagFilter,
  VersatilityFilter,
  DateRangeFilter,
  UsageFilter
} from '../types/closet';
import {
  filterItems,
  countActiveFilters,
  validateFilters,
  normalizeFilters
} from '../utils/closetUtils';
import useLocalStorage from './useLocalStorage';

// Default filter state
const DEFAULT_FILTERS: AdvancedFilters = {
  categories: [],
  colors: undefined,
  seasons: undefined,
  tags: undefined,
  versatility: undefined,
  dateAdded: undefined,
  usage: undefined,
  brands: undefined,
  price: undefined,
  isFavorite: undefined,
  isInCollection: undefined,
  searchText: undefined
};

interface UseClosetFiltersOptions {
  persistKey?: string;                 // LocalStorage key for persistence
  initialFilters?: Partial<AdvancedFilters>;
}

export function useClosetFilters(
  items: ClothingItem[],
  options: UseClosetFiltersOptions = {}
) {
  const { persistKey = 'ojodeloca-closet-filters', initialFilters = {} } = options;

  // Persist filters in localStorage
  const [filters, setFilters] = useLocalStorage<AdvancedFilters>(
    persistKey,
    { ...DEFAULT_FILTERS, ...initialFilters }
  );

  // Track if filters are active
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Calculate filter state
  const filterState: FilterState = useMemo(() => {
    const activeCount = countActiveFilters(filters);
    return {
      ...filters,
      isActive: activeCount > 0,
      activeFiltersCount: activeCount
    };
  }, [filters]);

  // Apply filters to items
  const filteredItems = useMemo(() => {
    return filterItems(items, filters);
  }, [items, filters]);

  // Filter update functions
  const updateFilters = useCallback((updates: Partial<AdvancedFilters>) => {
    setFilters(prev => normalizeFilters({ ...prev, ...updates }));
  }, [setFilters]);

  const setCategories = useCallback((categories: CategoryFilter[]) => {
    updateFilters({ categories });
  }, [updateFilters]);

  const toggleCategory = useCallback((category: CategoryFilter) => {
    setFilters(prev => {
      const categories = prev.categories || [];
      const hasCategory = categories.includes(category);

      return normalizeFilters({
        ...prev,
        categories: hasCategory
          ? categories.filter(c => c !== category)
          : [...categories, category]
      });
    });
  }, [setFilters]);

  const setColors = useCallback((colors: string[], matchMode: 'exact' | 'similar' = 'exact') => {
    const colorFilter: ColorFilter = { colors, matchMode };
    updateFilters({ colors: colorFilter });
  }, [updateFilters]);

  const setSeasons = useCallback((seasons: string[]) => {
    const seasonFilter: SeasonFilter = { seasons };
    updateFilters({ seasons: seasonFilter });
  }, [updateFilters]);

  const setTags = useCallback((tags: string[], matchMode: 'any' | 'all' = 'any') => {
    const tagFilter: TagFilter = { tags, matchMode };
    updateFilters({ tags: tagFilter });
  }, [updateFilters]);

  const setVersatility = useCallback((min: number, max: number) => {
    const versatilityFilter: VersatilityFilter = { min, max };
    updateFilters({ versatility: versatilityFilter });
  }, [updateFilters]);

  const setDateRange = useCallback((
    from: string,
    to: string,
    preset?: 'last_week' | 'last_month' | 'last_3_months' | 'custom'
  ) => {
    const dateFilter: DateRangeFilter = { from, to, preset };
    updateFilters({ dateAdded: dateFilter });
  }, [updateFilters]);

  const setUsage = useCallback((usage: Partial<UsageFilter>) => {
    updateFilters({ usage: usage as UsageFilter });
  }, [updateFilters]);

  const setSearchText = useCallback((searchText: string) => {
    updateFilters({ searchText: searchText.trim() || undefined });
  }, [updateFilters]);

  const toggleFavoriteFilter = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      isFavorite: prev.isFavorite === true ? undefined : true
    }));
  }, [setFilters]);

  const setCollectionFilter = useCallback((collectionId: string | undefined) => {
    updateFilters({ isInCollection: collectionId });
  }, [updateFilters]);

  // Clear functions
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  const clearCategory = useCallback(() => {
    updateFilters({ categories: [] });
  }, [updateFilters]);

  const clearColors = useCallback(() => {
    updateFilters({ colors: undefined });
  }, [updateFilters]);

  const clearSeasons = useCallback(() => {
    updateFilters({ seasons: undefined });
  }, [updateFilters]);

  const clearTags = useCallback(() => {
    updateFilters({ tags: undefined });
  }, [updateFilters]);

  const clearVersatility = useCallback(() => {
    updateFilters({ versatility: undefined });
  }, [updateFilters]);

  const clearDateRange = useCallback(() => {
    updateFilters({ dateAdded: undefined });
  }, [updateFilters]);

  const clearUsage = useCallback(() => {
    updateFilters({ usage: undefined });
  }, [updateFilters]);

  const clearSearchText = useCallback(() => {
    updateFilters({ searchText: undefined });
  }, [updateFilters]);

  // Validation
  const validation = useMemo(() => validateFilters(filters), [filters]);

  // Quick filter presets
  const applyPreset = useCallback((preset: 'favorites' | 'recent' | 'unused' | 'versatile') => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (preset) {
      case 'favorites':
        updateFilters({ isFavorite: true });
        break;

      case 'recent':
        updateFilters({
          dateAdded: {
            from: oneMonthAgo.toISOString(),
            to: now.toISOString(),
            preset: 'last_month'
          }
        });
        break;

      case 'unused':
        updateFilters({
          usage: {
            maxTimesWorn: 0
          }
        });
        break;

      case 'versatile':
        updateFilters({
          versatility: {
            min: 70,
            max: 100
          }
        });
        break;
    }
  }, [updateFilters]);

  // Export current filters
  const exportFilters = useCallback(() => {
    return JSON.stringify(filters, null, 2);
  }, [filters]);

  // Import filters
  const importFilters = useCallback((filtersJson: string) => {
    try {
      const imported = JSON.parse(filtersJson) as AdvancedFilters;
      const validation = validateFilters(imported);

      if (validation.isValid) {
        setFilters(normalizeFilters(imported));
        return { success: true, errors: [] };
      } else {
        return { success: false, errors: validation.errors };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format']
      };
    }
  }, [setFilters]);

  return {
    // State
    filters,
    filterState,
    filteredItems,
    isFilterPanelOpen,
    validation,

    // Setters
    setFilters: updateFilters,
    setCategories,
    toggleCategory,
    setColors,
    setSeasons,
    setTags,
    setVersatility,
    setDateRange,
    setUsage,
    setSearchText,
    toggleFavoriteFilter,
    setCollectionFilter,

    // Clear functions
    clearFilters,
    clearCategory,
    clearColors,
    clearSeasons,
    clearTags,
    clearVersatility,
    clearDateRange,
    clearUsage,
    clearSearchText,

    // Panel control
    setIsFilterPanelOpen,
    toggleFilterPanel: () => setIsFilterPanelOpen(prev => !prev),

    // Presets
    applyPreset,

    // Import/Export
    exportFilters,
    importFilters,

    // Stats
    totalItems: items.length,
    filteredCount: filteredItems.length,
    activeFiltersCount: filterState.activeFiltersCount,
    hasFilters: filterState.isActive
  };
}

export default useClosetFilters;
