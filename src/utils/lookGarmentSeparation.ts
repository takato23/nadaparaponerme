import type {
  ClothingItemMetadata,
  DetectedLookGarmentCandidate,
  LookGarmentCrop,
  SeparateLookGarmentsResult,
} from '../../types';

const MIN_CROP_SIZE = 0.05;
const DEFAULT_PADDING = 0.06;
const MAX_COORDINATE = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeLookGarmentCrop(crop: LookGarmentCrop): LookGarmentCrop | null {
  if (!crop) return null;

  const x = Number(crop.x);
  const y = Number(crop.y);
  const width = Number(crop.width);
  const height = Number(crop.height);

  if (![x, y, width, height].every((value) => Number.isFinite(value))) {
    return null;
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function isAlreadyNormalizedCrop(crop: LookGarmentCrop): boolean {
  return crop.x <= MAX_COORDINATE
    && crop.y <= MAX_COORDINATE
    && crop.width <= MAX_COORDINATE
    && crop.height <= MAX_COORDINATE;
}

function looksLikePixelCrop(crop: LookGarmentCrop): boolean {
  return [crop.x, crop.y, crop.width, crop.height].some((value) => value > 2);
}

export function normalizeLookGarmentCrop(
  crop: LookGarmentCrop,
  imageSize?: { width: number; height: number },
): LookGarmentCrop | null {
  const sanitized = sanitizeLookGarmentCrop(crop);
  if (!sanitized) return null;

  let nextCrop = sanitized;

  if (!isAlreadyNormalizedCrop(sanitized) && looksLikePixelCrop(sanitized)) {
    if (!imageSize?.width || !imageSize?.height || imageSize.width <= 0 || imageSize.height <= 0) {
      return sanitized;
    }

    nextCrop = {
      x: sanitized.x / imageSize.width,
      y: sanitized.y / imageSize.height,
      width: sanitized.width / imageSize.width,
      height: sanitized.height / imageSize.height,
    };
  }

  const x = clamp(Number(nextCrop.x), 0, MAX_COORDINATE);
  const y = clamp(Number(nextCrop.y), 0, MAX_COORDINATE);
  const width = clamp(Number(nextCrop.width), 0, MAX_COORDINATE);
  const height = clamp(Number(nextCrop.height), 0, MAX_COORDINATE);

  if (width < MIN_CROP_SIZE || height < MIN_CROP_SIZE) {
    return null;
  }

  const right = clamp(x + width, 0, MAX_COORDINATE);
  const bottom = clamp(y + height, 0, MAX_COORDINATE);

  return {
    x,
    y,
    width: clamp(right - x, MIN_CROP_SIZE, MAX_COORDINATE),
    height: clamp(bottom - y, MIN_CROP_SIZE, MAX_COORDINATE),
  };
}

export function normalizeDetectedLookGarmentResult(
  result: SeparateLookGarmentsResult,
): SeparateLookGarmentsResult {
  const items = Array.isArray(result?.items)
    ? result.items.flatMap((item, index) => {
      const crop = normalizeLookGarmentCrop(item?.crop);
      if (!crop) return [];

      return [{
        id: item?.id || `garment-${index + 1}`,
        label: item?.label || item?.subcategory || 'Prenda detectada',
        category: item?.category || 'top',
        subcategory: item?.subcategory || item?.label || 'Prenda detectada',
        color_primary: item?.color_primary || 'por definir',
        confidence: Number.isFinite(item?.confidence) ? Number(item.confidence) : 0.5,
        crop,
        visibility_note: item?.visibility_note || null,
      }];
    })
    : [];

  return {
    items,
    warnings: Array.isArray(result?.warnings)
      ? result.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
      : [],
    summary: typeof result?.summary === 'string' ? result.summary : null,
  };
}

export function buildLookGarmentMetadata(candidate: DetectedLookGarmentCandidate): ClothingItemMetadata {
  return {
    category: candidate.category || 'top',
    subcategory: candidate.subcategory || candidate.label || 'Prenda detectada',
    color_primary: candidate.color_primary || 'por definir',
    vibe_tags: [],
    seasons: [],
    description: candidate.visibility_note || undefined,
  };
}

export async function cropLookGarmentImage(
  imageDataUrl: string,
  crop: LookGarmentCrop,
  options: { padding?: number } = {},
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('No pude procesar la foto del look.'));
    nextImage.src = imageDataUrl;
  });

  const normalizedCrop = normalizeLookGarmentCrop(crop, {
    width: image.naturalWidth,
    height: image.naturalHeight,
  });
  if (!normalizedCrop) {
    throw new Error('No pude recortar esa prenda.');
  }

  const padding = clamp(options.padding ?? DEFAULT_PADDING, 0, 0.2);

  const sourceX = clamp(normalizedCrop.x - padding, 0, 1);
  const sourceY = clamp(normalizedCrop.y - padding, 0, 1);
  const sourceRight = clamp(normalizedCrop.x + normalizedCrop.width + padding, 0, 1);
  const sourceBottom = clamp(normalizedCrop.y + normalizedCrop.height + padding, 0, 1);

  const sx = Math.round(sourceX * image.naturalWidth);
  const sy = Math.round(sourceY * image.naturalHeight);
  const sw = Math.max(1, Math.round((sourceRight - sourceX) * image.naturalWidth));
  const sh = Math.max(1, Math.round((sourceBottom - sourceY) * image.naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No pude preparar el recorte de la prenda.');
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL('image/jpeg', 0.92);
}
