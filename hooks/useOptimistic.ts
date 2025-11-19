import { useCallback } from 'react';

/**
 * Hook for optimistic UI updates with automatic rollback on error
 *
 * @example
 * const optimistic = useOptimistic();
 *
 * const handleDelete = async (id: string) => {
 *   await optimistic.update(
 *     // Optimistic update (runs immediately)
 *     () => setItems(prev => prev.filter(item => item.id !== id)),
 *     // API call (async)
 *     () => deleteItemAPI(id),
 *     // Rollback (runs if API fails)
 *     () => setItems(originalItems),
 *     // Optional callbacks
 *     {
 *       onSuccess: () => toast.success('Deleted!'),
 *       onError: () => toast.error('Failed to delete')
 *     }
 *   );
 * };
 */
export const useOptimistic = () => {
  const update = useCallback(async <T,>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<T>,
    rollback: () => void,
    callbacks?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> => {
    // 1. Apply optimistic update immediately
    optimisticUpdate();

    try {
      // 2. Execute API call
      const result = await apiCall();

      // 3. Call success callback if provided
      callbacks?.onSuccess?.(result);
    } catch (error) {
      // 4. Rollback on error
      rollback();

      // 5. Call error callback if provided
      callbacks?.onError?.(error as Error);

      throw error; // Re-throw for caller to handle if needed
    }
  }, []);

  return { update };
};

/**
 * Alternative hook for optimistic state updates with built-in state management
 *
 * @example
 * const [items, setItems] = useState<Item[]>([]);
 * const optimisticState = useOptimisticState(items, setItems);
 *
 * const handleToggleLike = async (id: string) => {
 *   await optimisticState.update(
 *     // Optimistic state transformation
 *     items => items.map(item =>
 *       item.id === id ? { ...item, liked: !item.liked } : item
 *     ),
 *     // API call
 *     () => toggleLikeAPI(id)
 *   );
 * };
 */
export const useOptimisticState = <T,>(
  state: T,
  setState: React.Dispatch<React.SetStateAction<T>>
) => {
  const update = useCallback(async (
    optimisticTransform: (current: T) => T,
    apiCall: () => Promise<void>,
    callbacks?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> => {
    // Store original state for rollback
    const originalState = state;

    // Apply optimistic update
    setState(optimisticTransform(state));

    try {
      // Execute API call
      await apiCall();
      callbacks?.onSuccess?.();
    } catch (error) {
      // Rollback to original state
      setState(originalState);
      callbacks?.onError?.(error as Error);
      throw error;
    }
  }, [state, setState]);

  return { update };
};
