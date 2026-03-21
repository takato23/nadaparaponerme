import { sanitizeStylistContent } from './contentSafety.ts';

export type ReferencedInventoryItem = {
  id: string;
  metadata?: {
    category?: string;
    subcategory?: string;
    color_primary?: string;
  };
};

export type ReferencedItemPayload = {
  item_id: string;
  label: string;
  reason: string;
};

function toCleanString(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function buildFallbackLabel(item: ReferencedInventoryItem): string {
  const subcategory = toCleanString(item.metadata?.subcategory, 60);
  const color = toCleanString(item.metadata?.color_primary, 60);
  const category = toCleanString(item.metadata?.category, 40);
  return [subcategory, color].filter(Boolean).join(' ') || subcategory || category || 'Prenda de tu armario';
}

export function buildReferencedItemFromInventory(
  item: ReferencedInventoryItem,
  reason?: string,
  label?: string,
): ReferencedItemPayload {
  return {
    item_id: item.id,
    label: sanitizeStylistContent(label || buildFallbackLabel(item), buildFallbackLabel(item)).slice(0, 80),
    reason: sanitizeStylistContent(reason || 'Es la prenda a la que me refiero.', 'Es la prenda a la que me refiero.').slice(0, 180),
  };
}

export function sanitizeReferencedItems(
  value: unknown,
  inventory: ReferencedInventoryItem[],
): ReferencedItemPayload[] {
  if (!Array.isArray(value)) return [];

  const inventoryById = new Map(
    inventory
      .filter((item) => Boolean(item?.id))
      .map((item) => [item.id, item]),
  );

  const seen = new Set<string>();
  const sanitized: ReferencedItemPayload[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    const itemId = toCleanString(raw.item_id, 120);
    if (!itemId || seen.has(itemId)) continue;

    const inventoryItem = inventoryById.get(itemId);
    if (!inventoryItem) continue;

    const label = sanitizeStylistContent(
      toCleanString(raw.label, 80) || buildFallbackLabel(inventoryItem),
      buildFallbackLabel(inventoryItem),
    ).slice(0, 80);
    const reason = sanitizeStylistContent(
      toCleanString(raw.reason, 180) || 'Es la prenda a la que me refiero.',
      'Es la prenda a la que me refiero.',
    ).slice(0, 180);

    seen.add(itemId);
    sanitized.push({
      item_id: itemId,
      label,
      reason,
    });

    if (sanitized.length >= 3) break;
  }

  return sanitized;
}

export function synthesizeReferencedItems(params: {
  current: ReferencedItemPayload[];
  inventory: ReferencedInventoryItem[];
  recommendedItemId?: string | null;
  recommendedReason?: string | null;
  fallbackItemIds?: Array<string | null | undefined>;
}): ReferencedItemPayload[] {
  if (params.current.length > 0) return params.current.slice(0, 3);

  const inventoryById = new Map(
    params.inventory
      .filter((item) => Boolean(item?.id))
      .map((item) => [item.id, item]),
  );

  const recommendedItem = params.recommendedItemId
    ? inventoryById.get(params.recommendedItemId)
    : null;
  if (recommendedItem) {
    return [
      buildReferencedItemFromInventory(
        recommendedItem,
        params.recommendedReason || 'Es la prenda que mejor encaja con lo que pediste.',
      ),
    ];
  }

  const fallbackIds = Array.from(
    new Set((params.fallbackItemIds || []).filter(Boolean) as string[]),
  );
  if (fallbackIds.length !== 1) return [];

  const fallbackItem = inventoryById.get(fallbackIds[0]);
  if (!fallbackItem) return [];

  return [
    buildReferencedItemFromInventory(
      fallbackItem,
      'Es la prenda concreta a la que me refiero.',
    ),
  ];
}
