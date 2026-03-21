import { describe, expect, it } from 'vitest';
import { getPreferredClothingImage } from '../src/utils/closetImages';
import type { ClothingItem } from '../types';

const baseItem: ClothingItem = {
  id: 'item-1',
  imageDataUrl: 'original-image',
  metadata: {
    category: 'top',
    subcategory: 'Camisa',
    color_primary: 'blanco',
    vibe_tags: [],
    seasons: [],
  },
};

describe('closetImages.getPreferredClothingImage', () => {
  it('prefers normalized image when ready', () => {
    const item: ClothingItem = {
      ...baseItem,
      normalizedImage: {
        image_url: 'normalized-image',
        thumbnail_url: 'normalized-thumb',
        status: 'ready',
        mode: 'local_white_background',
      },
    };

    expect(getPreferredClothingImage(item)).toBe('normalized-image');
    expect(getPreferredClothingImage(item, 'thumbnail')).toBe('normalized-thumb');
  });

  it('falls back to original image when normalization is not ready', () => {
    const item: ClothingItem = {
      ...baseItem,
      normalizedImage: {
        image_url: 'normalized-image',
        status: 'failed',
        mode: 'local_white_background',
      },
    };

    expect(getPreferredClothingImage(item)).toBe('original-image');
  });
});
