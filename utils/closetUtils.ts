/**
 * CLOSET UTILITIES
 *
 * Pure utility functions for closet data operations:
 * - Filtering (advanced multi-criteria)
 * - Sorting (multiple properties)
 * - Searching (text and visual)
 * - Transformations
 * - Calculations
 */

import type { ClothingItem, ClothingItemMetadata } from '../types';
import type {
  AdvancedFilters,
  ExtendedSortOption,
  SortProperty,
  SortDirection,
  CategoryFilter,
  SearchQuery,
  ColorStats,
  CategoryStats,
  SeasonStats
} from '../types/closet';

// =====================================================
// FILTERING UTILITIES
// =====================================================

/**
 * Check if a clothing item matches the advanced filters
 */
export function matchesFilters(
  item: ClothingItem,
  filters: AdvancedFilters
): boolean {
  const { metadata } = item;

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    if (!filters.categories.includes(metadata.category as CategoryFilter)) {
      return false;
    }
  }

  // Color filter
  if (filters.colors && filters.colors.colors.length > 0) {
    const itemColor = metadata.color_primary.toLowerCase();
    const hasMatch = filters.colors.colors.some(filterColor => {
      const normalizedFilterColor = filterColor.toLowerCase();

      if (filters.colors!.matchMode === 'exact') {
        return itemColor === normalizedFilterColor;
      } else {
        // Similar color matching (basic implementation)
        return itemColor.includes(normalizedFilterColor) ||
               normalizedFilterColor.includes(itemColor);
      }
    });

    if (!hasMatch) return false;
  }

  // Season filter
  if (filters.seasons && filters.seasons.seasons.length > 0) {
    const itemSeasons = metadata.seasons || [];
    const hasMatch = filters.seasons.seasons.some(season =>
      itemSeasons.some(itemSeason =>
        itemSeason.toLowerCase() === season.toLowerCase()
      )
    );

    if (!hasMatch) return false;
  }

  // Tag filter
  if (filters.tags && filters.tags.tags.length > 0) {
    const itemTags = metadata.vibe_tags || [];

    if (filters.tags.matchMode === 'all') {
      // Must match ALL tags
      const hasAllTags = filters.tags.tags.every(filterTag =>
        itemTags.some(itemTag =>
          itemTag.toLowerCase() === filterTag.toLowerCase()
        )
      );
      if (!hasAllTags) return false;
    } else {
      // Must match ANY tag
      const hasAnyTag = filters.tags.tags.some(filterTag =>
        itemTags.some(itemTag =>
          itemTag.toLowerCase() === filterTag.toLowerCase()
        )
      );
      if (!hasAnyTag) return false;
    }
  }

  // Text search (subcategory, color, description)
  if (filters.searchText && filters.searchText.trim() !== '') {
    const searchLower = filters.searchText.toLowerCase();
    const subcategoryMatch = metadata.subcategory.toLowerCase().includes(searchLower);
    const colorMatch = metadata.color_primary.toLowerCase().includes(searchLower);
    const descriptionMatch = metadata.description?.toLowerCase().includes(searchLower) || false;
    const tagsMatch = metadata.vibe_tags.some(tag =>
      tag.toLowerCase().includes(searchLower)
    );

    if (!subcategoryMatch && !colorMatch && !descriptionMatch && !tagsMatch) {
      return false;
    }
  }

  // Favorite filter
  if (filters.isFavorite !== undefined) {
    // Note: This requires adding is_favorite to ClothingItem type
    // For now, we'll skip this filter
    // if (item.is_favorite !== filters.isFavorite) return false;
  }

  // Collection filter
  if (filters.isInCollection) {
    // Note: This requires collection membership data
    // We'll handle this in the hook layer
  }

  return true;
}

/**
 * Filter an array of items by advanced filters
 */
export function filterItems(
  items: ClothingItem[],
  filters: AdvancedFilters
): ClothingItem[] {
  return items.filter(item => matchesFilters(item, filters));
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;

  if (filters.categories && filters.categories.length > 0) count++;
  if (filters.colors && filters.colors.colors.length > 0) count++;
  if (filters.seasons && filters.seasons.seasons.length > 0) count++;
  if (filters.tags && filters.tags.tags.length > 0) count++;
  if (filters.versatility) count++;
  if (filters.dateAdded) count++;
  if (filters.usage) count++;
  if (filters.brands && filters.brands.brands.length > 0) count++;
  if (filters.price) count++;
  if (filters.isFavorite !== undefined) count++;
  if (filters.isInCollection) count++;
  if (filters.searchText && filters.searchText.trim() !== '') count++;

  return count;
}

// =====================================================
// SORTING UTILITIES
// =====================================================

/**
 * Compare two items for sorting
 */
function compareItems(
  a: ClothingItem,
  b: ClothingItem,
  property: SortProperty,
  direction: SortDirection
): number {
  let comparison = 0;

  switch (property) {
    case 'date':
      // Assuming ID is timestamp-based (larger ID = newer)
      comparison = a.id.localeCompare(b.id);
      break;

    case 'name':
      comparison = a.metadata.subcategory.localeCompare(b.metadata.subcategory);
      break;

    case 'color':
      comparison = a.metadata.color_primary.localeCompare(b.metadata.color_primary);
      break;

    case 'category':
      comparison = a.metadata.category.localeCompare(b.metadata.category);
      break;

    case 'versatility':
      // Note: Versatility score needs to be calculated separately
      // We'll return 0 for now (handle in component layer)
      comparison = 0;
      break;

    case 'timesWorn':
      // Note: This requires times_worn field in ClothingItem
      // comparison = (a.times_worn || 0) - (b.times_worn || 0);
      comparison = 0;
      break;

    case 'lastWorn':
      // Note: This requires last_worn_at field in ClothingItem
      // comparison = (a.last_worn_at || '').localeCompare(b.last_worn_at || '');
      comparison = 0;
      break;

    case 'price':
      // Note: This requires price field in ClothingItem
      // comparison = (a.price || 0) - (b.price || 0);
      comparison = 0;
      break;

    case 'brand':
      // Note: This requires brand field in ClothingItem
      // comparison = (a.brand || '').localeCompare(b.brand || '');
      comparison = 0;
      break;

    default:
      comparison = 0;
  }

  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort an array of items by sort option
 */
export function sortItems(
  items: ClothingItem[],
  sortOption: ExtendedSortOption
): ClothingItem[] {
  return [...items].sort((a, b) =>
    compareItems(a, b, sortOption.property, sortOption.direction)
  );
}

/**
 * Apply filters and sorting to items
 */
export function filterAndSortItems(
  items: ClothingItem[],
  filters: AdvancedFilters,
  sortOption: ExtendedSortOption
): ClothingItem[] {
  const filtered = filterItems(items, filters);
  return sortItems(filtered, sortOption);
}

// =====================================================
// SEARCH UTILITIES
// =====================================================

/**
 * Search items by text query
 */
export function searchItemsByText(
  items: ClothingItem[],
  query: string
): ClothingItem[] {
  if (!query || query.trim() === '') return items;

  const searchLower = query.toLowerCase().trim();

  return items.filter(item => {
    const { metadata } = item;

    // Search in multiple fields
    const subcategoryMatch = metadata.subcategory.toLowerCase().includes(searchLower);
    const colorMatch = metadata.color_primary.toLowerCase().includes(searchLower);
    const categoryMatch = metadata.category.toLowerCase().includes(searchLower);
    const descriptionMatch = metadata.description?.toLowerCase().includes(searchLower) || false;
    const tagsMatch = metadata.vibe_tags.some(tag =>
      tag.toLowerCase().includes(searchLower)
    );
    const seasonsMatch = metadata.seasons.some(season =>
      season.toLowerCase().includes(searchLower)
    );

    return subcategoryMatch || colorMatch || categoryMatch ||
           descriptionMatch || tagsMatch || seasonsMatch;
  });
}

/**
 * Extract search suggestions from items
 */
export function getSearchSuggestions(
  items: ClothingItem[],
  query: string,
  maxSuggestions: number = 5
): string[] {
  if (!query || query.trim() === '') return [];

  const searchLower = query.toLowerCase().trim();
  const suggestions = new Set<string>();

  items.forEach(item => {
    const { metadata } = item;

    // Collect matching fields
    if (metadata.subcategory.toLowerCase().includes(searchLower)) {
      suggestions.add(metadata.subcategory);
    }
    if (metadata.color_primary.toLowerCase().includes(searchLower)) {
      suggestions.add(metadata.color_primary);
    }
    metadata.vibe_tags.forEach(tag => {
      if (tag.toLowerCase().includes(searchLower)) {
        suggestions.add(tag);
      }
    });
  });

  return Array.from(suggestions).slice(0, maxSuggestions);
}

// =====================================================
// STATISTICS UTILITIES
// =====================================================

/**
 * Calculate category statistics
 */
export function calculateCategoryStats(items: ClothingItem[]): CategoryStats[] {
  const categoryMap = new Map<string, number>();

  items.forEach(item => {
    const category = item.metadata.category;
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  const total = items.length;

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate color statistics
 */
export function calculateColorStats(items: ClothingItem[]): ColorStats[] {
  const colorMap = new Map<string, { count: number; categories: Set<string> }>();

  items.forEach(item => {
    const color = item.metadata.color_primary;
    const category = item.metadata.category;

    if (!colorMap.has(color)) {
      colorMap.set(color, { count: 0, categories: new Set() });
    }

    const colorData = colorMap.get(color)!;
    colorData.count++;
    colorData.categories.add(category);
  });

  const total = items.length;

  return Array.from(colorMap.entries())
    .map(([color, data]) => ({
      color,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      categories: Array.from(data.categories)
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate season statistics
 */
export function calculateSeasonStats(items: ClothingItem[]): SeasonStats[] {
  const seasonMap = new Map<string, number>();

  items.forEach(item => {
    const seasons = item.metadata.seasons || [];
    seasons.forEach(season => {
      seasonMap.set(season, (seasonMap.get(season) || 0) + 1);
    });
  });

  const total = items.length;

  return Array.from(seasonMap.entries())
    .map(([season, count]) => ({
      season,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Group items by category
 */
export function groupByCategory(
  items: ClothingItem[]
): Record<string, ClothingItem[]> {
  const groups: Record<string, ClothingItem[]> = {};

  items.forEach(item => {
    const category = item.metadata.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  });

  return groups;
}

/**
 * Group items by color
 */
export function groupByColor(
  items: ClothingItem[]
): Record<string, ClothingItem[]> {
  const groups: Record<string, ClothingItem[]> = {};

  items.forEach(item => {
    const color = item.metadata.color_primary;
    if (!groups[color]) {
      groups[color] = [];
    }
    groups[color].push(item);
  });

  return groups;
}

// =====================================================
// TRANSFORMATION UTILITIES
// =====================================================

/**
 * Extract unique values from items
 */
export function extractUniqueValues(
  items: ClothingItem[],
  field: keyof ClothingItemMetadata
): string[] {
  const values = new Set<string>();

  items.forEach(item => {
    const value = item.metadata[field];

    if (Array.isArray(value)) {
      value.forEach(v => values.add(v));
    } else if (typeof value === 'string') {
      values.add(value);
    }
  });

  return Array.from(values).sort();
}

/**
 * Get all unique categories
 */
export function getUniqueCategories(items: ClothingItem[]): string[] {
  return extractUniqueValues(items, 'category');
}

/**
 * Get all unique colors
 */
export function getUniqueColors(items: ClothingItem[]): string[] {
  return extractUniqueValues(items, 'color_primary');
}

/**
 * Get all unique tags
 */
export function getUniqueTags(items: ClothingItem[]): string[] {
  return extractUniqueValues(items, 'vibe_tags');
}

/**
 * Get all unique seasons
 */
export function getUniqueSeasons(items: ClothingItem[]): string[] {
  return extractUniqueValues(items, 'seasons');
}

// =====================================================
// VALIDATION UTILITIES
// =====================================================

/**
 * Validate filter configuration
 */
export function validateFilters(filters: AdvancedFilters): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate versatility range
  if (filters.versatility) {
    if (filters.versatility.min < 0 || filters.versatility.min > 100) {
      errors.push('Versatility min must be between 0 and 100');
    }
    if (filters.versatility.max < 0 || filters.versatility.max > 100) {
      errors.push('Versatility max must be between 0 and 100');
    }
    if (filters.versatility.min > filters.versatility.max) {
      errors.push('Versatility min cannot be greater than max');
    }
  }

  // Validate price range
  if (filters.price) {
    if (filters.price.min !== undefined && filters.price.min < 0) {
      errors.push('Price min cannot be negative');
    }
    if (filters.price.max !== undefined && filters.price.max < 0) {
      errors.push('Price max cannot be negative');
    }
    if (filters.price.min !== undefined &&
        filters.price.max !== undefined &&
        filters.price.min > filters.price.max) {
      errors.push('Price min cannot be greater than max');
    }
  }

  // Validate date range
  if (filters.dateAdded) {
    try {
      const fromDate = new Date(filters.dateAdded.from);
      const toDate = new Date(filters.dateAdded.to);

      if (fromDate > toDate) {
        errors.push('Date from cannot be after date to');
      }
    } catch (e) {
      errors.push('Invalid date format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize filter values
 */
export function normalizeFilters(filters: AdvancedFilters): AdvancedFilters {
  return {
    ...filters,
    categories: filters.categories || [],
    searchText: filters.searchText?.trim() || undefined
  };
}

// =====================================================
// HELPER UTILITIES
// =====================================================

/**
 * Get sort label for display
 */
export function getSortLabel(sortOption: ExtendedSortOption): string {
  const { property, direction } = sortOption;

  const directionMap: Record<SortProperty, { asc: string; desc: string }> = {
    date: { asc: 'Más antiguos', desc: 'Más recientes' },
    name: { asc: 'A-Z', desc: 'Z-A' },
    color: { asc: 'Color A-Z', desc: 'Color Z-A' },
    category: { asc: 'Categoría A-Z', desc: 'Categoría Z-A' },
    versatility: { asc: 'Menos versátiles', desc: 'Más versátiles' },
    timesWorn: { asc: 'Menos usados', desc: 'Más usados' },
    lastWorn: { asc: 'Usado hace tiempo', desc: 'Usado recientemente' },
    price: { asc: 'Más baratos', desc: 'Más caros' },
    brand: { asc: 'Marca A-Z', desc: 'Marca Z-A' }
  };

  return directionMap[property][direction];
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('es-AR');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
