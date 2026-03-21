type SelectedItemContext = {
  id: string;
  category?: string | null;
  subcategory?: string | null;
  color_primary?: string | null;
  description?: string | null;
};

type CategoryMap = Map<string, string>;

const PROBLEM_ITEM_PROMPT_REGEX = /\b(usar|combinar|resolver|destrabar|armame|ayudame).*(prenda|item|esto|esta prenda|esta ropa)|\b(con que|como)\s+combinar/i;

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function shouldUseProblemItemGuidance(params: {
  message: string;
  selectedItem: SelectedItemContext | null;
  chatHistoryLength: number;
}): boolean {
  if (!params.selectedItem?.id) return false;

  const normalized = normalizeForMatch(params.message || '');
  if (params.chatHistoryLength <= 1) return true;
  return PROBLEM_ITEM_PROMPT_REGEX.test(normalized);
}

export function buildProblemItemInstruction(selectedItem: SelectedItemContext): string {
  const label = [
    selectedItem.subcategory || 'prenda',
    selectedItem.color_primary || null,
  ].filter(Boolean).join(' ').trim();

  return `\nMODO PRENDA PROBLEMA:
- La prenda protagonista obligatoria es: ${label || selectedItem.id}.
- Proponé hasta 3 caminos distintos para usarla dentro del armario actual.
- Cada camino debe sentirse realmente diferente entre sí.
- Si armás outfitSuggestion dentro de un camino, esa prenda protagonista tiene que estar incluida sí o sí.
- No mandes shopping ni piezas faltantes. Trabajá solo con lo que ya tiene.
- Si no llegás a 3 caminos sólidos, devolvé 1 o 2 buenos y explicá la limitación.`;
}

function hasCompleteOutfitSuggestion(value: any): boolean {
  return Boolean(value?.top_id && value?.bottom_id && value?.shoes_id);
}

function isSelectedItemInSuggestion(outfitSuggestion: any, selectedItemId: string): boolean {
  if (!selectedItemId) return false;
  return [
    outfitSuggestion?.top_id,
    outfitSuggestion?.bottom_id,
    outfitSuggestion?.shoes_id,
    outfitSuggestion?.outerwear_id,
    ...(Array.isArray(outfitSuggestion?.accessory_ids) ? outfitSuggestion.accessory_ids : []),
  ].some((id) => id === selectedItemId);
}

function sanitizeReferencedItems(
  value: unknown,
  inventoryIds: Set<string>,
): Array<{ item_id: string; label: string; reason: string }> {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: Array<{ item_id: string; label: string; reason: string }> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    const itemId = typeof raw.item_id === 'string' ? raw.item_id.trim() : '';
    if (!itemId || !inventoryIds.has(itemId) || seen.has(itemId)) continue;
    seen.add(itemId);
    items.push({
      item_id: itemId,
      label: typeof raw.label === 'string' ? raw.label.trim() : 'Prenda del armario',
      reason: typeof raw.reason === 'string' ? raw.reason.trim() : 'Funciona en este camino.',
    });
  }

  return items;
}

function sanitizeOutfitSuggestion(
  value: unknown,
  categoryById: CategoryMap,
  selectedItemId: string,
): any | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const topId = typeof raw.top_id === 'string' ? raw.top_id.trim() : '';
  const bottomId = typeof raw.bottom_id === 'string' ? raw.bottom_id.trim() : '';
  const shoesId = typeof raw.shoes_id === 'string' ? raw.shoes_id.trim() : '';

  if (!topId || !bottomId || !shoesId) return null;
  if (categoryById.get(topId) !== 'top') return null;
  if (categoryById.get(bottomId) !== 'bottom') return null;
  if (categoryById.get(shoesId) !== 'shoes') return null;

  const sanitized = {
    top_id: topId,
    bottom_id: bottomId,
    shoes_id: shoesId,
    outerwear_id: typeof raw.outerwear_id === 'string' ? raw.outerwear_id.trim() : undefined,
    accessory_ids: Array.isArray(raw.accessory_ids)
      ? raw.accessory_ids.filter((id): id is string => typeof id === 'string' && categoryById.get(id) === 'accessory')
      : undefined,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : undefined,
    confidence: Number.isFinite(raw.confidence) ? Number(raw.confidence) : undefined,
  };

  if (!isSelectedItemInSuggestion(sanitized, selectedItemId)) return null;
  return sanitized;
}

export function sanitizeProblemItemSuggestions(
  value: unknown,
  categoryById: CategoryMap,
  selectedItemId: string,
): Array<{
  id: string;
  title: string;
  summary: string;
  reason: string;
  pathType: 'base_segura' | 'mas_elevada' | 'mas_relajada' | 'mas_jugada';
  referencedItems?: Array<{ item_id: string; label: string; reason: string }>;
  outfitSuggestion?: any | null;
}> {
  if (!Array.isArray(value)) return [];

  const inventoryIds = new Set(Array.from(categoryById.keys()));
  const results: Array<{
    id: string;
    title: string;
    summary: string;
    reason: string;
    pathType: 'base_segura' | 'mas_elevada' | 'mas_relajada' | 'mas_jugada';
    referencedItems?: Array<{ item_id: string; label: string; reason: string }>;
    outfitSuggestion?: any | null;
  }> = [];

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const raw = entry as Record<string, unknown>;
    const suggestion = sanitizeOutfitSuggestion(raw.outfitSuggestion, categoryById, selectedItemId);
    const referencedItems = sanitizeReferencedItems(raw.referencedItems, inventoryIds);

    if (!suggestion && referencedItems.length === 0) return;

    results.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `problem-item-${index + 1}`,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `Camino ${index + 1}`,
      summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : 'Una forma concreta de usar esta prenda.',
      reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : 'Funciona con tu armario actual.',
      pathType: raw.pathType === 'mas_elevada' || raw.pathType === 'mas_relajada' || raw.pathType === 'mas_jugada'
        ? raw.pathType
        : 'base_segura',
      referencedItems: referencedItems.length > 0 ? referencedItems : undefined,
      outfitSuggestion: suggestion || null,
    });
  });

  return results.slice(0, 3);
}
