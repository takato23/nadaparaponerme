import type { ClothingItem } from '../../types';

export function getPreferredClothingImage(
  item: ClothingItem | null | undefined,
  variant: 'image' | 'thumbnail' = 'image',
): string {
  if (!item) return '';

  const normalized = item.normalizedImage;
  if (normalized?.status === 'ready') {
    const candidate = variant === 'thumbnail'
      ? (normalized.thumbnail_url || normalized.image_url)
      : (normalized.image_url || normalized.thumbnail_url);
    if (candidate) return candidate;
  }

  return item.imageDataUrl;
}
