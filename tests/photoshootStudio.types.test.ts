import { describe, expect, it } from 'vitest';
import { shouldShowCompatibilityWarning } from '../components/studio/photoshootStudio.types';
import type { ClothingSlot, SlotSelection } from '../types';

const buildSlots = (slotIds: ClothingSlot[]) => {
  const slots = new Map<ClothingSlot, SlotSelection>();

  slotIds.forEach((slotId, index) => {
    slots.set(slotId, {
      slot: slotId,
      itemId: `item-${index}`,
      item: {
        id: `item-${index}`,
        imageDataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        metadata: {
          category: slotId === 'shoes' ? 'shoes' : slotId === 'bottom' ? 'bottom' : 'top',
          subcategory: slotId,
          color_primary: 'negro',
          vibe_tags: ['casual'],
          seasons: ['all'],
        },
      },
    });
  });

  return slots;
};

describe('shouldShowCompatibilityWarning', () => {
  it('muestra advertencia con selfie real y prendas de pierna o calzado', () => {
    expect(
      shouldShowCompatibilityWarning({
        slots: buildSlots(['top_base', 'bottom']),
        presetId: 'overlay',
        useVirtualModel: false,
        hasUserSelfie: true,
      }),
    ).toBe(true);
  });

  it('omite advertencia cuando se usa avatar virtual', () => {
    expect(
      shouldShowCompatibilityWarning({
        slots: buildSlots(['top_base', 'bottom', 'shoes']),
        presetId: 'overlay',
        useVirtualModel: true,
        hasUserSelfie: false,
      }),
    ).toBe(false);
  });

  it('omite advertencia con presets distintos a overlay', () => {
    expect(
      shouldShowCompatibilityWarning({
        slots: buildSlots(['bottom']),
        presetId: 'studio',
        useVirtualModel: false,
        hasUserSelfie: true,
      }),
    ).toBe(false);
  });
});
