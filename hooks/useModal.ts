import { useState, useCallback } from 'react';

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Custom hook for modal state management
 * Simplifies boolean state handling for modals/overlays
 */
export function useModal(initialState = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}

/**
 * Hook for managing multiple modals with unique identifiers
 */
export function useModals<T extends string>(
  modalIds: readonly T[]
): Record<T, UseModalReturn> {
  const modals = {} as Record<T, UseModalReturn>;

  modalIds.forEach(id => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    modals[id] = useModal();
  });

  return modals;
}
