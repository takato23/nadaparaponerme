import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDataUrlToFile, mockAddClothingItem, mockGetClothingItems } = vi.hoisted(() => ({
  mockDataUrlToFile: vi.fn(),
  mockAddClothingItem: vi.fn(),
  mockGetClothingItems: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  dataUrlToFile: mockDataUrlToFile,
}));

vi.mock('../src/services/closetService', () => ({
  addClothingItem: mockAddClothingItem,
  getClothingItems: mockGetClothingItems,
}));

import { saveReviewedLookGarments } from '../src/services/lookGarmentSeparationService';

describe('saveReviewedLookGarments', () => {
  beforeEach(() => {
    mockDataUrlToFile.mockReset();
    mockAddClothingItem.mockReset();
    mockGetClothingItems.mockReset();
  });

  it('saves only selected garments and refreshes the closet once', async () => {
    mockDataUrlToFile.mockImplementation((dataUrl: string, name: string) => ({ dataUrl, name }));
    mockAddClothingItem.mockResolvedValue(undefined);
    mockGetClothingItems.mockResolvedValue([{ id: 'saved-1' }]);

    const result = await saveReviewedLookGarments([
      {
        id: 'garment-1',
        selected: true,
        imageDataUrl: 'data:image/jpeg;base64,a',
        metadata: {
          category: 'top',
          subcategory: 'blazer',
          color_primary: 'negro',
          vibe_tags: [],
          seasons: [],
        },
      },
      {
        id: 'garment-2',
        selected: false,
        imageDataUrl: 'data:image/jpeg;base64,b',
        metadata: {
          category: 'bottom',
          subcategory: 'jean',
          color_primary: 'azul',
          vibe_tags: [],
          seasons: [],
        },
      },
    ]);

    expect(mockDataUrlToFile).toHaveBeenCalledTimes(1);
    expect(mockAddClothingItem).toHaveBeenCalledTimes(1);
    expect(mockGetClothingItems).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 'saved-1' }]);
  });

  it('fails fast when no garment is selected', async () => {
    await expect(saveReviewedLookGarments([
      {
        id: 'garment-1',
        selected: false,
        imageDataUrl: 'data:image/jpeg;base64,a',
        metadata: {
          category: 'top',
          subcategory: 'blazer',
          color_primary: 'negro',
          vibe_tags: [],
          seasons: [],
        },
      },
    ])).rejects.toThrow('Elegí al menos una prenda para guardar.');

    expect(mockAddClothingItem).not.toHaveBeenCalled();
    expect(mockGetClothingItems).not.toHaveBeenCalled();
  });
});
