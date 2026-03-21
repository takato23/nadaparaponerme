import type {
  ClothingItem,
  ReviewableLookGarmentItem,
  SeparateLookGarmentsResult,
} from '../../types';
import { dataUrlToFile } from '../lib/supabase';
import { addClothingItem, getClothingItems } from './closetService';
import {
  buildLookGarmentMetadata,
  cropLookGarmentImage,
  normalizeDetectedLookGarmentResult,
} from '../utils/lookGarmentSeparation';

export type { ReviewableLookGarmentItem } from '../../types';

export async function buildReviewableLookGarmentItems(
  sourceImageDataUrl: string,
  result: SeparateLookGarmentsResult,
): Promise<ReviewableLookGarmentItem[]> {
  const normalized = normalizeDetectedLookGarmentResult(result);

  return await Promise.all(
    normalized.items.map(async (candidate) => ({
      id: candidate.id,
      selected: true,
      confidence: candidate.confidence,
      visibility_note: candidate.visibility_note || null,
      metadata: buildLookGarmentMetadata(candidate),
      imageDataUrl: await cropLookGarmentImage(sourceImageDataUrl, candidate.crop),
    })),
  );
}

export async function saveReviewedLookGarments(
  items: ReviewableLookGarmentItem[],
): Promise<ClothingItem[]> {
  const selectedItems = items.filter((item) => item.selected);
  if (selectedItems.length === 0) {
    throw new Error('Elegí al menos una prenda para guardar.');
  }

  for (const item of selectedItems) {
    const file = dataUrlToFile(item.imageDataUrl, `${item.id}.jpg`);
    await addClothingItem(file, item.metadata, undefined, 'owned', 'ready');
  }

  return await getClothingItems();
}
