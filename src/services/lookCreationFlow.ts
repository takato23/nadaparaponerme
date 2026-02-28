export type LookCreationCategory = 'top' | 'bottom' | 'shoes';
export type MissingLookField = 'occasion' | 'style' | 'category';

export interface LookCreationDraft {
  occasion?: string;
  style?: string;
  category?: LookCreationCategory;
  requestText?: string;
}

export const LOOK_CREATION_CREDIT_COST = 2;
export const LOOK_EDIT_CREDIT_COST = LOOK_CREATION_CREDIT_COST;
export const TRY_ON_CREDIT_COST = 4;

const LOOK_CREATION_INTENT_PATTERNS = [
  /crea(?:me|r)?\s+.*(?:look|prenda)/i,
  /genera(?:me|r)?\s+.*(?:look|prenda)/i,
  /dise(?:ñ|n)a(?:me|r)?\s+.*(?:look|prenda)/i,
  /(?:hacer|hace|haceme|crear|crea|creame|generar|genera|generame|dise(?:ñ|n)ar|dise(?:ñ|n)a|dise(?:ñ|n)ame).*(?:remera|camisa|blusa|camiseta|top|pantal[oó]n|jean|falda|pollera|short|zapatillas|zapas|zapatos|botas|calzado)/i,
  /(?:look|prenda)\s+(?:nuevo|nueva)/i,
  /(?:remera|camisa|blusa|camiseta|top|pantal[oó]n|jean|falda|pollera|short|zapatillas|zapas|zapatos|botas|calzado)\s+(?:nuevo|nueva)/i,
  /(?:look|prenda).*(?:con ia|con ai)/i,
  /(?:con ia|con ai).*(?:look|prenda)/i,
];

const GARMENT_EDIT_INTENT_PATTERNS = [
  /(?:modifica|modificar|editar|edita|cambia|cambiar).*(?:prenda|look|remera|camisa|pantal[oó]n|zapatillas|calzado)/i,
  /(?:agrega|agregar|pone|poner|suma|sumar).*(?:estampa|estampado|print|logo)/i,
  /(?:cambia|cambiar).*(?:color|tono|paleta)/i,
  /(?:quiero|pod[eé]s).*(?:estampa|estampado|color)/i,
];

const CATEGORY_PATTERNS: Array<{ category: LookCreationCategory; regex: RegExp }> = [
  { category: 'top', regex: /\b(top|remera|camisa|blusa|camiseta|shirt)\b/i },
  { category: 'bottom', regex: /\b(bottom|pantal[oó]n|jean|falda|short|pollera)\b/i },
  { category: 'shoes', regex: /\b(shoes|calzado|zapatillas|zapas|zapatos|botas)\b/i },
];

const STYLE_PATTERNS = [
  'casual',
  'formal',
  'elegante',
  'minimalista',
  'urbano',
  'streetwear',
  'deportivo',
  'boho',
  'romantico',
  'romántico',
  'clasico',
  'clásico',
];

const OCCASION_PATTERNS = [
  'oficina',
  'trabajo',
  'cita',
  'fiesta',
  'evento',
  'casamiento',
  'boda',
  'viaje',
  'salida',
  'universidad',
  'facultad',
  'gimnasio',
  'noche',
  'fin de semana',
];

export function detectLookCreationIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return LOOK_CREATION_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectGarmentEditIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return GARMENT_EDIT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function parseLookCreationCategory(text: string): LookCreationCategory | null {
  const normalized = (text || '').trim();
  if (!normalized) return null;
  const match = CATEGORY_PATTERNS.find(({ regex }) => regex.test(normalized));
  return match?.category || null;
}

export function parseLookCreationFields(text: string): Partial<LookCreationDraft> {
  const normalized = (text || '').trim();
  if (!normalized) return {};

  const category = parseLookCreationCategory(normalized) || undefined;

  const styleMatch = STYLE_PATTERNS.find((style) => {
    const escaped = style.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(normalized);
  });

  const occasionMatch = OCCASION_PATTERNS.find((occasion) => {
    const escaped = occasion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(normalized);
  });

  return {
    category,
    style: styleMatch,
    occasion: occasionMatch,
  };
}

export function getMissingLookFields(draft: LookCreationDraft): MissingLookField[] {
  const missing: MissingLookField[] = [];
  if (!draft.occasion) missing.push('occasion');
  if (!draft.style) missing.push('style');
  if (!draft.category) missing.push('category');
  return missing;
}

export function getLookFieldQuestion(field: MissingLookField): string {
  if (field === 'occasion') {
    return 'Perfecto. ¿Para qué ocasión lo querés? (ej: oficina, cita, fiesta, fin de semana)';
  }
  if (field === 'style') {
    return 'Genial. ¿Qué estilo buscás? (ej: casual, elegante, formal, streetwear)';
  }
  return '¿Qué categoría querés crear? Elegí una: top, bottom o calzado.';
}

export function isAffirmative(text: string): boolean {
  const normalized = (text || '').trim().toLowerCase();
  return /^(si|sí|dale|ok|de una|confirmo|confirmar|genera|generar|hag[aá]moslo|listo)$/.test(normalized);
}

export function isNegative(text: string): boolean {
  const normalized = (text || '').trim().toLowerCase();
  return /^(no|cancelar|cancela|fren[aá]|mejor no|despu[eé]s)$/.test(normalized);
}

export function getCategoryLabel(category: LookCreationCategory): string {
  if (category === 'top') return 'Top';
  if (category === 'bottom') return 'Bottom';
  return 'Calzado';
}

export function mapLookCategoryToTryOnSlot(category?: LookCreationCategory): string {
  if (category === 'bottom') return 'bottom';
  if (category === 'shoes') return 'shoes';
  return 'top_base';
}

export function buildLookCreationPrompt(draft: LookCreationDraft): string {
  const parts = [
    draft.requestText ? `Pedido base: ${draft.requestText}.` : '',
    draft.occasion ? `Ocasión: ${draft.occasion}.` : '',
    draft.style ? `Estilo: ${draft.style}.` : '',
    draft.category ? `Categoría: ${draft.category}.` : '',
    'Foto de producto de moda, fondo limpio, enfoque e-commerce, alta calidad.',
  ].filter(Boolean);

  return parts.join(' ');
}

export function buildGarmentEditPrompt(
  draft: LookCreationDraft,
  editInstruction: string,
  basePrompt?: string,
): string {
  const trimmedInstruction = (editInstruction || '').trim();
  const parts = [
    basePrompt ? `Base de la prenda original: ${basePrompt}.` : '',
    draft.occasion ? `Ocasión objetivo: ${draft.occasion}.` : '',
    draft.style ? `Estilo objetivo: ${draft.style}.` : '',
    draft.category ? `Categoría: ${draft.category}.` : '',
    trimmedInstruction ? `Cambios solicitados: ${trimmedInstruction}.` : '',
    'Reimaginar la misma prenda con esas modificaciones, foto de producto de moda, fondo limpio tipo e-commerce, alta calidad, sin modelo.',
  ].filter(Boolean);

  return parts.join(' ');
}

export function buildLookCostMessage(draft: LookCreationDraft): string {
  return `Tengo todo para generar tu prenda:\n- Ocasión: ${draft.occasion}\n- Estilo: ${draft.style}\n- Categoría: ${draft.category ? getCategoryLabel(draft.category) : '-'}\n\nEsta generación cuesta ${LOOK_CREATION_CREDIT_COST} créditos. ¿Confirmás que la genere ahora?`;
}
