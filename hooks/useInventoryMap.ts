import { useMemo } from 'react';
import type { ClothingItem, FitResult, SavedOutfit } from '../types';

/**
 * Hook for O(1) item lookups using Map-based inventory
 * Solves performance issue in Virtual Try-On where Array.find() was O(n)
 *
 * Before: const top = inventory.find(item => item.id === fitResult.top_id) // O(n)
 * After:  const top = getItem(fitResult.top_id) // O(1)
 */
export function useInventoryMap(
  closet: ClothingItem[],
  borrowedItems: ClothingItem[] = []
) {
  // Create a Map for O(1) lookups - memoized to avoid recreating on every render
  const itemMap = useMemo(() => {
    const map = new Map<string, ClothingItem>();

    // Add closet items first
    closet.forEach(item => map.set(item.id, item));

    // Add borrowed items (will override if duplicate IDs)
    borrowedItems.forEach(item => map.set(item.id, item));

    return map;
  }, [closet, borrowedItems]);

  // Get single item by ID - O(1)
  const getItem = (id: string | undefined): ClothingItem | undefined => {
    if (!id) return undefined;
    return itemMap.get(id);
  };

  // Get multiple items by IDs - O(n) where n = number of requested IDs
  const getItems = (ids: string[]): (ClothingItem | undefined)[] => {
    return ids.map(id => itemMap.get(id));
  };

  // Get outfit items from a FitResult or SavedOutfit
  const getOutfitItems = (outfit: FitResult | SavedOutfit | null) => {
    if (!outfit) return null;

    return {
      top: itemMap.get(outfit.top_id),
      bottom: itemMap.get(outfit.bottom_id),
      shoes: itemMap.get(outfit.shoes_id)
    };
  };

  // Check if all outfit items exist
  const hasAllOutfitItems = (outfit: FitResult | SavedOutfit | null): boolean => {
    if (!outfit) return false;

    return (
      itemMap.has(outfit.top_id) &&
      itemMap.has(outfit.bottom_id) &&
      itemMap.has(outfit.shoes_id)
    );
  };

  // Get missing item IDs from an outfit
  const getMissingItemIds = (outfit: FitResult | SavedOutfit | null): string[] => {
    if (!outfit) return [];

    const missing: string[] = [];
    if (!itemMap.has(outfit.top_id)) missing.push(outfit.top_id);
    if (!itemMap.has(outfit.bottom_id)) missing.push(outfit.bottom_id);
    if (!itemMap.has(outfit.shoes_id)) missing.push(outfit.shoes_id);

    return missing;
  };

  // Get items by category - O(n) where n = closet size
  const getItemsByCategory = useMemo(() => {
    return (category: string): ClothingItem[] => {
      return closet.filter(item => item.metadata.category === category);
    };
  }, [closet]);

  // Combined inventory as array (for components that need it)
  const inventory = useMemo(() => {
    return Array.from(itemMap.values());
  }, [itemMap]);

  return {
    // Core Map access
    itemMap,

    // Single item lookup - O(1)
    getItem,

    // Multiple items lookup
    getItems,

    // Outfit-specific helpers
    getOutfitItems,
    hasAllOutfitItems,
    getMissingItemIds,

    // Category filtering
    getItemsByCategory,

    // Full inventory array
    inventory,

    // Stats
    totalItems: itemMap.size,
    closetSize: closet.length,
    borrowedCount: borrowedItems.length
  };
}
