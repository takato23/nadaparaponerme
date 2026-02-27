export type StructuredOutfitSuggestion = {
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  explanation: string;
  confidence?: number;
  missing_piece_suggestion?: { item_name: string; reason: string };
};

export type NormalizedCategory = 'top' | 'bottom' | 'shoes' | 'other';

export const MAX_CLOSET_ITEMS = 250;

function toEpoch(value: unknown): number {
  if (!value) return 0;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function trimClosetContext(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item: any) => ({
      id: String(item?.id || '').trim(),
      metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : {},
      updatedAt: toEpoch(item?.metadata?.updated_at || item?.updated_at),
    }))
    .filter((item: any) => item.id.length > 0)
    .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CLOSET_ITEMS)
    .map((item: any) => ({ id: item.id, metadata: item.metadata }));
}

export function normalizeCategory(rawCategory: unknown, rawSubcategory: unknown): NormalizedCategory {
  const category = String(rawCategory || '').toLowerCase();
  const subcategory = String(rawSubcategory || '').toLowerCase();
  const value = `${category} ${subcategory}`;

  if (
    value.includes('shoe') ||
    value.includes('calzado') ||
    value.includes('zapat') ||
    value.includes('bota') ||
    value.includes('sandalia')
  ) {
    return 'shoes';
  }

  if (
    value.includes('bottom') ||
    value.includes('pant') ||
    value.includes('jean') ||
    value.includes('falda') ||
    value.includes('short')
  ) {
    return 'bottom';
  }

  if (
    value.includes('top') ||
    value.includes('remera') ||
    value.includes('camisa') ||
    value.includes('blusa') ||
    value.includes('hoodie') ||
    value.includes('buzo') ||
    value.includes('sweater') ||
    value.includes('outerwear') ||
    value.includes('campera') ||
    value.includes('jacket')
  ) {
    return 'top';
  }

  return 'other';
}

export function buildCategoryMap(inventory: any[]): Map<string, NormalizedCategory> {
  const categoryById = new Map<string, NormalizedCategory>();
  for (const item of inventory || []) {
    const id = String(item?.id || '').trim();
    if (!id) continue;
    const metadata = item?.metadata || {};
    const normalized = normalizeCategory(metadata?.category, metadata?.subcategory);
    categoryById.set(id, normalized);
  }
  return categoryById;
}

export function validateOutfitSuggestion(
  suggestion: any,
  categoryById: Map<string, NormalizedCategory>,
): { suggestion: StructuredOutfitSuggestion | null; warnings: string[] } {
  const warnings: string[] = [];
  if (!suggestion) {
    return { suggestion: null, warnings };
  }

  const topId = String(suggestion?.top_id || '').trim();
  const bottomId = String(suggestion?.bottom_id || '').trim();
  const shoesId = String(suggestion?.shoes_id || '').trim();
  const explanation = String(suggestion?.explanation || '').trim();

  if (!topId || !bottomId || !shoesId) {
    warnings.push('Faltan IDs obligatorios para top, bottom o shoes.');
    return { suggestion: null, warnings };
  }

  const distinctIds = new Set([topId, bottomId, shoesId]);
  if (distinctIds.size !== 3) {
    warnings.push('El estilista devolvió IDs repetidos. Se descartó la sugerencia.');
    return { suggestion: null, warnings };
  }

  const topCategory = categoryById.get(topId);
  const bottomCategory = categoryById.get(bottomId);
  const shoesCategory = categoryById.get(shoesId);

  if (!topCategory || !bottomCategory || !shoesCategory) {
    warnings.push('El estilista devolvió IDs inexistentes en el armario.');
    return { suggestion: null, warnings };
  }

  if (topCategory !== 'top') {
    warnings.push(`top_id ${topId} no pertenece a categoría top.`);
  }
  if (bottomCategory !== 'bottom') {
    warnings.push(`bottom_id ${bottomId} no pertenece a categoría bottom.`);
  }
  if (shoesCategory !== 'shoes') {
    warnings.push(`shoes_id ${shoesId} no pertenece a categoría shoes.`);
  }

  if (warnings.length > 0) {
    return { suggestion: null, warnings };
  }

  const normalized: StructuredOutfitSuggestion = {
    top_id: topId,
    bottom_id: bottomId,
    shoes_id: shoesId,
    explanation,
  };

  if (typeof suggestion?.confidence === 'number') {
    normalized.confidence = Math.max(0, Math.min(1, suggestion.confidence));
  }
  if (
    suggestion?.missing_piece_suggestion &&
    typeof suggestion.missing_piece_suggestion === 'object'
  ) {
    const itemName = String(suggestion.missing_piece_suggestion.item_name || '').trim();
    const reason = String(suggestion.missing_piece_suggestion.reason || '').trim();
    if (itemName || reason) {
      normalized.missing_piece_suggestion = { item_name: itemName, reason };
    }
  }

  return { suggestion: normalized, warnings };
}
