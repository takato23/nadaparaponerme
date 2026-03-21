import type {
  ChatMessage,
  ChatReferencedItem,
  ClothingItem,
} from '../../types';
import {
  parseReferencedItemIntent,
  type ReferencedItemIntent,
} from './lookCreationFlow';

function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildFallbackLabel(item: ClothingItem): string {
  return [
    item.metadata?.subcategory,
    item.metadata?.color_primary,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Prenda de tu armario';
}

function resolveItemCategory(item: ClothingItem): 'top' | 'bottom' | 'shoes' | undefined {
  const raw = normalizeText(`${item.metadata?.category || ''} ${item.metadata?.subcategory || ''}`);
  if (/shoe|calzado|zapat|bota|sandalia/.test(raw)) return 'shoes';
  if (/bottom|pantalon|pantalones|jean|falda|pollera|short/.test(raw)) return 'bottom';
  if (/top|remera|camisa|blusa|camiseta|shirt|jacket|campera|abrigo|buzo|sweater/.test(raw)) return 'top';
  return undefined;
}

function matchesRequestedCategory(
  item: ClothingItem,
  requestedCategory?: 'top' | 'bottom' | 'shoes',
): boolean {
  if (!requestedCategory) return true;
  return resolveItemCategory(item) === requestedCategory;
}

export function buildReferencedItemFromClothingItem(
  item: ClothingItem,
  reason: string,
  label?: string,
): ChatReferencedItem {
  return {
    item_id: item.id,
    label: (label || buildFallbackLabel(item)).trim(),
    reason: reason.trim() || 'Es la prenda a la que me refiero.',
  };
}

function dedupeReferencedItems(items: ChatReferencedItem[]): ChatReferencedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.item_id || seen.has(item.item_id)) return false;
    seen.add(item.item_id);
    return true;
  });
}

function resolveFromExistingReferences(
  message: ChatMessage,
  closet: ClothingItem[],
  intent: ReferencedItemIntent,
): ChatReferencedItem[] {
  const items = (message.referencedItems || [])
    .map((referencedItem) => {
      const fullItem = closet.find((candidate) => candidate.id === referencedItem.item_id);
      if (!fullItem || !matchesRequestedCategory(fullItem, intent.category)) return null;
      return {
        item_id: referencedItem.item_id,
        label: referencedItem.label || buildFallbackLabel(fullItem),
        reason: referencedItem.reason || 'Es la prenda a la que me refiero.',
      };
    })
    .filter(Boolean) as ChatReferencedItem[];

  return dedupeReferencedItems(items).slice(0, 3);
}

function resolveOutfitReferencedItems(
  message: ChatMessage,
  closet: ClothingItem[],
  intent: ReferencedItemIntent,
): ChatReferencedItem[] {
  const outfit = message.outfitSuggestion;
  if (!outfit) return [];

  const candidateIds = intent.category === 'top'
    ? [outfit.top_id, outfit.outerwear_id]
    : intent.category === 'bottom'
      ? [outfit.bottom_id]
      : intent.category === 'shoes'
        ? [outfit.shoes_id]
        : [outfit.top_id, outfit.bottom_id, outfit.shoes_id, outfit.outerwear_id];

  const reasonByCategory: Record<'top' | 'bottom' | 'shoes', string> = {
    top: 'Es la prenda de arriba que usé en la recomendación.',
    bottom: 'Es la prenda de abajo que usé en la recomendación.',
    shoes: 'Es el calzado que usé en la recomendación.',
  };

  const items = candidateIds
    .filter(Boolean)
    .map((id) => closet.find((candidate) => candidate.id === id))
    .filter(Boolean)
    .map((item) => {
      const category = resolveItemCategory(item!);
      const reason = category
        ? reasonByCategory[category]
        : 'Es una de las prendas que usé en la recomendación.';
      return buildReferencedItemFromClothingItem(item!, reason);
    });

  return dedupeReferencedItems(items).slice(0, 3);
}

function buildFollowUpContent(items: ChatReferencedItem[], closet: ClothingItem[]): string {
  if (items.length <= 0) {
    return 'Te hablo de esta prenda.';
  }

  if (items.length === 1) {
    const item = closet.find((candidate) => candidate.id === items[0].item_id);
    const noun = normalizeText(item?.metadata?.subcategory || items[0].label).split(' ')[0] || 'prenda';
    return `Te hablo de esta ${noun}.`;
  }

  return 'Te hablo de estas opciones.';
}

function isGenericRevealFollowUp(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return /^(a ver|dale|esa|ese|esa misma|mostrame|mostrame eso|mostramela|mostramelo|cual|cual\?|cu[aá]l|cu[aá]l\?|ver|quiero ver|la quiero ver|show me|let me see)$/.test(normalized);
}

export function resolveReferencedItemFollowUp(params: {
  text: string;
  lastAssistantMessage?: ChatMessage | null;
  closet: ClothingItem[];
}): { content: string; referencedItems: ChatReferencedItem[] } | null {
  const intent = parseReferencedItemIntent(params.text);
  if (!params.lastAssistantMessage) return null;

  if (!intent && !isGenericRevealFollowUp(params.text)) return null;
  const resolvedIntent: ReferencedItemIntent = intent || { kind: 'item_clarification' };
  if (resolvedIntent.kind !== 'item_clarification') return null;

  const referencedItems = resolveFromExistingReferences(params.lastAssistantMessage, params.closet, resolvedIntent);
  const resolvedItems = referencedItems.length > 0
    ? referencedItems
    : resolveOutfitReferencedItems(params.lastAssistantMessage, params.closet, resolvedIntent);

  if (resolvedItems.length === 0) return null;

  return {
    content: buildFollowUpContent(resolvedItems, params.closet),
    referencedItems: resolvedItems,
  };
}
