export type StructuredOutfitSuggestion = {
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  outerwear_id?: string | null;
  accessory_ids?: string[];
  explanation: string;
  confidence?: number;
  missing_piece_suggestion?: { item_name: string; reason: string };
  look_goal?: 'occasion' | 'reference_recreation' | 'improvement' | 'gap_fill';
  similarity_score?: number;
  styling_notes?: string[];
};

export type NormalizedCategory = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'other';

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
    value.includes('outerwear') ||
    value.includes('abrigo') ||
    value.includes('campera') ||
    value.includes('jacket') ||
    value.includes('blazer') ||
    value.includes('tapado')
  ) {
    return 'outerwear';
  }

  if (
    value.includes('accessory') ||
    value.includes('accesorio') ||
    value.includes('cartera') ||
    value.includes('bolso') ||
    value.includes('cinto') ||
    value.includes('cinturon') ||
    value.includes('collar') ||
    value.includes('aro') ||
    value.includes('lente') ||
    value.includes('bufanda')
  ) {
    return 'accessory';
  }

  if (
    value.includes('top') ||
    value.includes('remera') ||
    value.includes('camisa') ||
    value.includes('blusa') ||
    value.includes('hoodie') ||
    value.includes('buzo') ||
    value.includes('sweater') ||
    value.includes('cardigan')
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
  const outerwearId = suggestion?.outerwear_id == null ? null : String(suggestion?.outerwear_id || '').trim();
  const accessoryIds = Array.isArray(suggestion?.accessory_ids)
    ? suggestion.accessory_ids
      .map((value: unknown) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 2)
    : [];
  const explanation = String(suggestion?.explanation || '').trim();

  if (!topId || !bottomId || !shoesId) {
    warnings.push('Faltan IDs obligatorios para top, bottom o shoes.');
    return { suggestion: null, warnings };
  }

  const distinctIds = new Set([topId, bottomId, shoesId, ...(outerwearId ? [outerwearId] : []), ...accessoryIds]);
  const providedIds = [topId, bottomId, shoesId, ...(outerwearId ? [outerwearId] : []), ...accessoryIds];
  if (distinctIds.size !== providedIds.length) {
    warnings.push('El estilista devolvió IDs repetidos. Se descartó la sugerencia.');
    return { suggestion: null, warnings };
  }

  const topCategory = categoryById.get(topId);
  const bottomCategory = categoryById.get(bottomId);
  const shoesCategory = categoryById.get(shoesId);
  const outerwearCategory = outerwearId ? categoryById.get(outerwearId) : null;
  const accessoryCategories = accessoryIds.map((id: string) => ({ id, category: categoryById.get(id) }));

  if (!topCategory || !bottomCategory || !shoesCategory) {
    warnings.push('El estilista devolvió IDs inexistentes en el armario.');
    return { suggestion: null, warnings };
  }
  if (outerwearId && !outerwearCategory) {
    warnings.push('outerwear_id no existe en el armario.');
    return { suggestion: null, warnings };
  }
  if (accessoryCategories.some(({ category }: { id: string; category: NormalizedCategory | undefined }) => !category)) {
    warnings.push('accessory_ids contiene IDs inexistentes en el armario.');
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
  if (outerwearId && outerwearCategory !== 'outerwear') {
    warnings.push(`outerwear_id ${outerwearId} no pertenece a categoría outerwear.`);
  }
  for (const accessory of accessoryCategories) {
    if (accessory.category !== 'accessory') {
      warnings.push(`accessory_id ${accessory.id} no pertenece a categoría accessory.`);
    }
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
  if (outerwearId) {
    normalized.outerwear_id = outerwearId;
  }
  if (accessoryIds.length > 0) {
    normalized.accessory_ids = accessoryIds;
  }

  if (typeof suggestion?.confidence === 'number') {
    normalized.confidence = Math.max(0, Math.min(1, suggestion.confidence));
  }
  if (
    suggestion?.look_goal === 'occasion'
    || suggestion?.look_goal === 'reference_recreation'
    || suggestion?.look_goal === 'improvement'
    || suggestion?.look_goal === 'gap_fill'
  ) {
    normalized.look_goal = suggestion.look_goal;
  }
  if (typeof suggestion?.similarity_score === 'number') {
    normalized.similarity_score = Math.max(0, Math.min(1, suggestion.similarity_score));
  }
  if (Array.isArray(suggestion?.styling_notes)) {
    const notes = suggestion.styling_notes
      .map((note: unknown) => String(note || '').trim())
      .filter(Boolean)
      .slice(0, 4);
    if (notes.length > 0) {
      normalized.styling_notes = notes;
    }
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
