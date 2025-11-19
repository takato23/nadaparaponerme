/**
 * COLLECTIONS HOOK
 *
 * Manages closet collections/folders system.
 * Provides:
 * - Create, update, delete collections
 * - Add/remove items from collections
 * - Drag & drop support
 * - Default collections (Favorites, All Items)
 */

import { useState, useMemo, useCallback } from 'react';
import type { ClothingItem } from '../types';
import type { Collection, CollectionWithItems } from '../types/closet';
import useLocalStorage from './useLocalStorage';

// Default system collections
const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'all',
    name: 'Todas las prendas',
    description: 'Tu armario completo',
    color: '#6366F1',
    icon: 'dresser',
    itemIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    sortOrder: 0
  },
  {
    id: 'favorites',
    name: 'Favoritos',
    description: 'Tus prendas favoritas',
    color: '#EF4444',
    icon: 'favorite',
    itemIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    sortOrder: 1
  }
];

interface UseCollectionsOptions {
  persistKey?: string;                 // LocalStorage key for persistence
}

export function useCollections(
  items: ClothingItem[],
  options: UseCollectionsOptions = {}
) {
  const { persistKey = 'ojodeloca-collections' } = options;

  // Persist collections in localStorage
  const [collections, setCollections] = useLocalStorage<Collection[]>(
    persistKey,
    DEFAULT_COLLECTIONS
  );

  // Track active collection
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>('all');

  // Generate unique ID
  const generateId = useCallback(() => {
    return `collection_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Get collections with populated items
  const collectionsWithItems = useMemo((): CollectionWithItems[] => {
    return collections.map(collection => {
      let collectionItems: ClothingItem[];

      if (collection.id === 'all') {
        // "All" collection contains all items
        collectionItems = items;
      } else if (collection.id === 'favorites') {
        // "Favorites" collection contains favorited items
        // Note: Requires is_favorite field in ClothingItem
        // For now, filter by itemIds
        collectionItems = items.filter(item => collection.itemIds.includes(item.id));
      } else {
        // Custom collections
        collectionItems = items.filter(item => collection.itemIds.includes(item.id));
      }

      return {
        ...collection,
        items: collectionItems
      };
    });
  }, [collections, items]);

  // Get active collection
  const activeCollection = useMemo(() => {
    return collectionsWithItems.find(c => c.id === activeCollectionId) || collectionsWithItems[0];
  }, [collectionsWithItems, activeCollectionId]);

  // Get collection by ID
  const getCollectionById = useCallback((id: string): CollectionWithItems | undefined => {
    return collectionsWithItems.find(c => c.id === id);
  }, [collectionsWithItems]);

  // Get collections containing an item
  const getCollectionsForItem = useCallback((itemId: string): Collection[] => {
    return collections.filter(c => c.itemIds.includes(itemId));
  }, [collections]);

  // Check if item is in collection
  const isItemInCollection = useCallback((itemId: string, collectionId: string): boolean => {
    const collection = collections.find(c => c.id === collectionId);
    return collection ? collection.itemIds.includes(itemId) : false;
  }, [collections]);

  // Create collection
  const createCollection = useCallback((
    name: string,
    options: {
      description?: string;
      color?: string;
      icon?: string;
      itemIds?: string[];
    } = {}
  ): Collection => {
    const newCollection: Collection = {
      id: generateId(),
      name,
      description: options.description,
      color: options.color || '#6B7280',
      icon: options.icon || 'folder',
      itemIds: options.itemIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
      sortOrder: collections.length
    };

    setCollections(prev => [...prev, newCollection]);
    return newCollection;
  }, [collections.length, generateId, setCollections]);

  // Update collection
  const updateCollection = useCallback((
    id: string,
    updates: Partial<Omit<Collection, 'id' | 'createdAt' | 'isDefault'>>
  ): boolean => {
    let updated = false;

    setCollections(prev => prev.map(collection => {
      if (collection.id === id && !collection.isDefault) {
        updated = true;
        return {
          ...collection,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return collection;
    }));

    return updated;
  }, [setCollections]);

  // Delete collection
  const deleteCollection = useCallback((id: string): boolean => {
    const collection = collections.find(c => c.id === id);

    // Cannot delete default collections
    if (!collection || collection.isDefault) {
      return false;
    }

    setCollections(prev => prev.filter(c => c.id !== id));

    // If deleted collection was active, switch to "all"
    if (activeCollectionId === id) {
      setActiveCollectionId('all');
    }

    return true;
  }, [collections, activeCollectionId, setCollections]);

  // Add item to collection
  const addItemToCollection = useCallback((itemId: string, collectionId: string): boolean => {
    const collection = collections.find(c => c.id === collectionId);

    // Cannot modify default "all" collection
    if (!collection || collection.id === 'all') {
      return false;
    }

    // Check if item already in collection
    if (collection.itemIds.includes(itemId)) {
      return false;
    }

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return {
          ...c,
          itemIds: [...c.itemIds, itemId],
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    return true;
  }, [collections, setCollections]);

  // Remove item from collection
  const removeItemFromCollection = useCallback((itemId: string, collectionId: string): boolean => {
    const collection = collections.find(c => c.id === collectionId);

    // Cannot modify default "all" collection
    if (!collection || collection.id === 'all') {
      return false;
    }

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return {
          ...c,
          itemIds: c.itemIds.filter(id => id !== itemId),
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    return true;
  }, [collections, setCollections]);

  // Toggle item in collection
  const toggleItemInCollection = useCallback((itemId: string, collectionId: string): boolean => {
    const inCollection = isItemInCollection(itemId, collectionId);

    if (inCollection) {
      return removeItemFromCollection(itemId, collectionId);
    } else {
      return addItemToCollection(itemId, collectionId);
    }
  }, [isItemInCollection, addItemToCollection, removeItemFromCollection]);

  // Move item between collections
  const moveItem = useCallback((
    itemId: string,
    fromCollectionId: string,
    toCollectionId: string
  ): boolean => {
    // Remove from source
    const removed = removeItemFromCollection(itemId, fromCollectionId);

    if (!removed) {
      return false;
    }

    // Add to destination
    return addItemToCollection(itemId, toCollectionId);
  }, [addItemToCollection, removeItemFromCollection]);

  // Bulk operations
  const addItemsToCollection = useCallback((itemIds: string[], collectionId: string): number => {
    let addedCount = 0;

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId && c.id !== 'all') {
        const newItemIds = itemIds.filter(id => !c.itemIds.includes(id));
        addedCount = newItemIds.length;

        if (newItemIds.length > 0) {
          return {
            ...c,
            itemIds: [...c.itemIds, ...newItemIds],
            updatedAt: new Date().toISOString()
          };
        }
      }
      return c;
    }));

    return addedCount;
  }, [setCollections]);

  const removeItemsFromCollection = useCallback((itemIds: string[], collectionId: string): number => {
    let removedCount = 0;

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId && c.id !== 'all') {
        const itemIdsSet = new Set(itemIds);
        const newItemIds = c.itemIds.filter(id => !itemIdsSet.has(id));
        removedCount = c.itemIds.length - newItemIds.length;

        if (removedCount > 0) {
          return {
            ...c,
            itemIds: newItemIds,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return c;
    }));

    return removedCount;
  }, [setCollections]);

  // Reorder collections
  const reorderCollections = useCallback((startIndex: number, endIndex: number): void => {
    setCollections(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      // Update sort orders
      return result.map((collection, index) => ({
        ...collection,
        sortOrder: index,
        updatedAt: new Date().toISOString()
      }));
    });
  }, [setCollections]);

  // Clear all items from collection
  const clearCollection = useCallback((collectionId: string): boolean => {
    const collection = collections.find(c => c.id === collectionId);

    // Cannot clear default "all" collection
    if (!collection || collection.id === 'all') {
      return false;
    }

    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return {
          ...c,
          itemIds: [],
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    return true;
  }, [collections, setCollections]);

  // Duplicate collection
  const duplicateCollection = useCallback((collectionId: string): Collection | null => {
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      return null;
    }

    const duplicated: Collection = {
      ...collection,
      id: generateId(),
      name: `${collection.name} (copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
      sortOrder: collections.length
    };

    setCollections(prev => [...prev, duplicated]);
    return duplicated;
  }, [collections, generateId, setCollections]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setCollections(DEFAULT_COLLECTIONS);
    setActiveCollectionId('all');
  }, [setCollections]);

  return {
    // State
    collections,
    collectionsWithItems,
    activeCollection,
    activeCollectionId,

    // Getters
    getCollectionById,
    getCollectionsForItem,
    isItemInCollection,

    // Collection management
    createCollection,
    updateCollection,
    deleteCollection,
    duplicateCollection,
    clearCollection,
    reorderCollections,

    // Item management
    addItemToCollection,
    removeItemFromCollection,
    toggleItemInCollection,
    moveItem,

    // Bulk operations
    addItemsToCollection,
    removeItemsFromCollection,

    // Active collection
    setActiveCollectionId,

    // Reset
    resetToDefaults,

    // Stats
    totalCollections: collections.length,
    customCollectionsCount: collections.filter(c => !c.isDefault).length
  };
}

export default useCollections;
