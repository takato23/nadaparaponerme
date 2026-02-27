import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem, ClothingSlot, GenerationFit, SlotSelection } from '../../../types';
import { SLOT_CONFIGS } from '../../../types';
import { getValidSlotsForItem } from '../photoshootStudio.types';

interface UseSlotManagerParams {
  closet: ClothingItem[];
  maxSlotsPerGeneration: number;
}

export function useSlotManager({ closet, maxSlotsPerGeneration }: UseSlotManagerParams) {
  const [slotSelections, setSlotSelections] = useState<Map<ClothingSlot, SlotSelection>>(new Map());

  const selectedItemIds = useMemo(() => {
    return new Set(Array.from(slotSelections.values()).map((selection) => selection.itemId));
  }, [slotSelections]);

  const isItemSelected = useCallback(
    (itemId: string): boolean => selectedItemIds.has(itemId),
    [selectedItemIds],
  );

  const addItemToSlot = useCallback(
    (item: ClothingItem, slot: ClothingSlot) => {
      let didAdd = false;
      setSlotSelections((prev) => {
        if (prev.size >= maxSlotsPerGeneration && !prev.has(slot)) {
          toast.error(`Máximo ${maxSlotsPerGeneration} prendas`);
          return prev;
        }

        const next = new Map(prev);
        next.set(slot, { slot, itemId: item.id, item, fit: 'regular' });
        didAdd = true;
        return next;
      });
      return didAdd;
    },
    [maxSlotsPerGeneration],
  );

  const updateSlotFit = useCallback((slot: ClothingSlot, newFit: GenerationFit) => {
    setSlotSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(slot);
      if (current) {
        next.set(slot, { ...current, fit: newFit });
      }
      return next;
    });
  }, []);

  const cycleFit = useCallback(
    (slot: ClothingSlot) => {
      const current = slotSelections.get(slot);
      const currentFit = current?.fit || 'regular';
      const fitOrder: GenerationFit[] = ['tight', 'regular', 'oversized'];
      const currentIndex = fitOrder.indexOf(currentFit);
      const nextFit = fitOrder[(currentIndex + 1) % fitOrder.length];
      updateSlotFit(slot, nextFit);
    },
    [slotSelections, updateSlotFit],
  );

  const removeFromSlot = useCallback((slot: ClothingSlot) => {
    setSlotSelections((prev) => {
      const next = new Map(prev);
      next.delete(slot);
      return next;
    });
  }, []);

  const handleItemClick = useCallback(
    (item: ClothingItem, setActiveSlotPicker: (value: string | null) => void) => {
      const existingSlot = Array.from(slotSelections.entries()).find(
        ([, selection]) => selection.itemId === item.id,
      )?.[0];

      if (existingSlot) {
        removeFromSlot(existingSlot);
        return;
      }

      const validSlots = getValidSlotsForItem(item);
      if (validSlots.length === 1) {
        addItemToSlot(item, validSlots[0]);
        return;
      }

      setActiveSlotPicker(item.id);
    },
    [slotSelections, removeFromSlot, addItemToSlot],
  );

  const relevantSlots = useMemo(() => {
    const safeCloset = closet || [];
    return SLOT_CONFIGS.filter((config) => {
      if (slotSelections.has(config.id)) return true;
      if (config.required) return true;
      return safeCloset.some((item) => getValidSlotsForItem(item).includes(config.id));
    });
  }, [slotSelections, closet]);

  return {
    slotSelections,
    setSlotSelections,
    selectedItemIds,
    isItemSelected,
    addItemToSlot,
    updateSlotFit,
    cycleFit,
    removeFromSlot,
    handleItemClick,
    relevantSlots,
  };
}
