export type LookCreationCategory = 'top' | 'bottom' | 'shoes';
export type MissingLookField = 'occasion' | 'style' | 'category';
export type StylistIntent =
  | 'chat_general'
  | 'outfit_from_wardrobe'
  | 'generate_new_garment'
  | 'app_navigation'
  | 'item_recommendation';
export type AmbiguousLookRequestResolution = 'wardrobe_outfit' | 'new_garment' | 'delegate';
export type ReferencedItemIntentKind = 'category_browse' | 'item_clarification';

export interface ReferencedItemIntent {
  kind: ReferencedItemIntentKind;
  category?: LookCreationCategory;
}

export type StylistNavigationIntent =
  | {
    type: 'open_saved_looks';
    route: '/guardados';
  }
  | {
    type: 'open_wishlist';
    route: '/armario';
  }
  | {
    type: 'open_closet_filtered';
    route: '/armario';
    filters: {
      category?: LookCreationCategory;
      color?: string;
      occasion?: string;
      status?: 'wishlist';
    };
  };

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

const AMBIGUOUS_LOOK_INTENT_PATTERNS = [
  /crear\s+un?\s+look\s+nuevo(?:\s+con\s+(?:ia|ai))?/i,
  /look\s+nuevo\s+con\s+(?:ia|ai)/i,
  /quiero\s+un?\s+look\s+nuevo(?:\s+con\s+(?:ia|ai))?/i,
];

const WARDROBE_OUTFIT_INTENT_PATTERNS = [
  /armame\s+un?\s+(?:outfit|look)/i,
  /quiero\s+un?\s+(?:outfit|look).*(?:con\s+mi\s+armario|con\s+lo\s+que\s+tengo)/i,
  /combina(?:me|r)?\s+/i,
  /que\s+me\s+pongo/i,
];

const NAVIGATION_SAVED_LOOKS_PATTERNS = [
  /(?:mostra(?:me)?|ver|abr(?:i|ime)|ensen(?:a|ame)|lleva(?:me)?).*(?:mis )?(?:looks|outfits)(?: guardados)?/i,
  /(?:mis )?(?:looks|outfits) guardados/i,
  /armario de looks/i,
];

const NAVIGATION_WISHLIST_PATTERNS = [
  /wishlist/i,
  /deseados/i,
];

const GARMENT_EDIT_INTENT_PATTERNS = [
  /(?:modifica|modificar|editar|edita|cambia|cambiar).*(?:prenda|look|remera|camisa|pantal[oó]n|zapatillas|calzado)/i,
  /(?:agrega|agregar|pone|poner|suma|sumar).*(?:estampa|estampado|print|logo)/i,
  /(?:cambia|cambiar).*(?:color|tono|paleta)/i,
  /(?:quiero|pod[eé]s).*(?:estampa|estampado|color)/i,
];

const ITEM_RECOMMENDATION_INTENT_PATTERNS = [
  /(?:recomendame|recom[eé]ndame|sugerime|sugi[eé]reme).*(?:prenda|item|look)/i,
  /(?:recomend[aá]|suger[ií]|aconsej[aá]).*(?:prenda|item|ropa|armario|closet)/i,
  /(?:qu[eé]|que)\s+me\s+recomend[aá]s.*(?:armario|closet|ropa)/i,
  /(?:qu[eé]|que).*(?:remera|camisa|top|blusa|camiseta|pantal[oó]n|jean|falda|pollera|short|zapato|zapatilla|bota).*(?:me pongo|uso|conviene)/i,
  /(?:decime|dime|mostrame|mostra)\s+.*(?:prenda|item).*(?:recomend|conviene)/i,
  /(?:dame|quiero).*(?:recomendaci[oó]n|sugerencia).*(?:prenda|ropa)/i,
  /(?:eleg[ií]|elige|seleccion[aá]).*(?:una|1).*(?:prenda|item).*(?:para|de)/i,
  /(?:mostra(?:me)?|mostrar|show).*(?:una|un).*(?:camisa|remera|top|blusa|camiseta|pantal[oó]n|jean|falda|pollera|short|zapato|zapatilla|bota).*(?:m[ií]a|m[ií]o|of mine)/i,
  /(?:qu[eé]|que|cual|cu[aá]l).*(?:camisa|remera|top|blusa|camiseta|pantal[oó]n|jean|falda|pollera|short|zapato|zapatilla|bota).*(?:dec[ií]s|dices|habl[aá]s)/i,
  /(?:cual|cu[aá]l)\s+de\s+mis\s+(?:tops|remeras|camisas|zapatos|zapatillas)/i,
  /(?:mostra(?:me)?|mostrar|show).*(?:remera|camisa|top|blusa|camiseta|pantal[oó]n|jean|falda|pollera|short|zapato|zapatilla|bota).*(?:me pongo|uso)/i,
  /(?:mostra(?:me)?|mostrar|show).*(?:eso|esa|ese|that).*(?:foto|fotos|photos?)?/i,
];

const CATEGORY_PATTERNS: Array<{ category: LookCreationCategory; regex: RegExp }> = [
  { category: 'top', regex: /\b(top|tops|remer\w*|camisa|camisas|blusa|blusas|camiset\w*|shirt|shirts)\b/i },
  { category: 'bottom', regex: /\b(bottom|bottoms|pantal[oó]n|pantalones|jean|jeans|falda|faldas|short|shorts|pollera|polleras)\b/i },
  { category: 'shoes', regex: /\b(shoes|shoe|calzado|zapatilla|zapatillas|zapas|zapato|zapatos|bota|botas)\b/i },
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

const AUTO_CATEGORY_PATTERNS = [
  /\belegi vos\b/i,
  /\belige vos\b/i,
  /\blo que vos veas\b/i,
  /\bcomo vos veas\b/i,
  /\blo que quieras\b/i,
  /\bsorprendeme\b/i,
  /\bsorprendeme vos\b/i,
  /\bdecid[ií] vos\b/i,
  /\bconf[ií]o en vos\b/i,
  /\bla que mejor vaya\b/i,
  /\blo que mejor quede\b/i,
];

const CATEGORY_BROWSE_PATTERNS: Array<{ category: LookCreationCategory; regex: RegExp }> = [
  { category: 'top', regex: /\b(tops|remeras|camisas|blusas|camisetas|shirts|jackets|camperas|abrigos|buzos|sweaters)\b/i },
  { category: 'bottom', regex: /\b(bottoms|pantalones|jeans|faldas|polleras|shorts)\b/i },
  { category: 'shoes', regex: /\b(shoes|zapatos|zapatillas|zapas|botas)\b/i },
];

const ITEM_CLARIFICATION_PATTERNS = [
  /\b(?:que|qué|cual|cu[aá]l)\b.*\b(?:camisa|remera|top|blusa|camiseta|jacket|campera|abrigo|pantal[oó]n|jean|falda|pollera|short|zapato|zapatilla|bota)\b.*\b(?:decis|dec[ií]s|dices|hablas|habl[aá]s)\b/i,
  /\b(?:cual|cu[aá]l)\s+de\s+mis\b/i,
  /\b(?:mostra(?:me)?|mostrar|show)\b.*\b(?:eso|esa|ese|that)\b(?:.*\b(?:foto|fotos|photos?)\b)?/i,
  /\b(?:which)\s+\b(?:shirt|top|jacket|pants|shoes?)\b/i,
  /\b(?:mostra(?:me)?|mostrar|show)\b.*\b(?:una|un)\b.*\b(?:m[ií]a|m[ií]o|of mine)\b/i,
];

function normalizeIntentText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractBrowseCategory(text: string): LookCreationCategory | null {
  const normalized = text.trim();
  const matched = CATEGORY_BROWSE_PATTERNS.find(({ regex }) => regex.test(normalized));
  if (matched) return matched.category;
  return parseLookCreationCategory(normalized);
}

function hasBrowseVerb(text: string): boolean {
  return /\b(mostra(?:me)?|mostrar|show|ver|abr(?:i|ime)|open|filtra(?:me)?)\b/i.test(text);
}

export function detectLookCreationIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return LOOK_CREATION_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isAmbiguousAICreationRequest(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  if (!LOOK_CREATION_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return AMBIGUOUS_LOOK_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectWardrobeOutfitIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  if (detectLookCreationIntent(normalized) && !/armario|lo que tengo|outfit/.test(normalized.toLowerCase())) {
    return false;
  }
  return WARDROBE_OUTFIT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function parseAmbiguousLookRequestResolution(text: string): AmbiguousLookRequestResolution | null {
  const normalized = normalizeIntentText(text);
  if (!normalized) return null;
  if (/elegi vos|elige vos|sorprendeme|lo que vos veas|como vos veas|confio en vos/.test(normalized)) {
    return 'delegate';
  }
  if (/outfit|con mi armario|con lo que tengo|armario/.test(normalized)) {
    return 'wardrobe_outfit';
  }
  if (/prenda|remera|camisa|blusa|top|pantalon|jean|falda|pollera|short|zapatillas|zapatos|botas|calzado/.test(normalized)) {
    return 'new_garment';
  }
  return null;
}

function extractColor(text: string): string | undefined {
  const normalized = (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const colorPatterns: Array<{ canonical: string; regex: RegExp }> = [
    { canonical: 'negro', regex: /\bnegr(?:o|a|os|as)\b/i },
    { canonical: 'blanco', regex: /\bblanc(?:o|a|os|as)\b/i },
    { canonical: 'gris', regex: /\bgris(?:es)?\b/i },
    { canonical: 'azul', regex: /\bazul(?:es)?\b/i },
    { canonical: 'celeste', regex: /\bceleste(?:s)?\b/i },
    { canonical: 'rojo', regex: /\broj(?:o|a|os|as)\b/i },
    { canonical: 'verde', regex: /\bverde(?:s)?\b/i },
    { canonical: 'rosa', regex: /\brosa(?:s)?\b/i },
    { canonical: 'beige', regex: /\bbeige\b/i },
    { canonical: 'marron', regex: /\bmarron(?:es)?\b/i },
  ];
  return colorPatterns.find(({ regex }) => regex.test(normalized))?.canonical;
}

function extractOccasion(text: string): string | undefined {
  return OCCASION_PATTERNS.find((occasion) => {
    const escaped = occasion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}

export function parseReferencedItemIntent(text: string): ReferencedItemIntent | null {
  const normalized = (text || '').trim();
  if (!normalized) return null;

  const plain = normalizeIntentText(normalized);
  const category = extractBrowseCategory(normalized) || undefined;
  const hasPluralCategory = CATEGORY_BROWSE_PATTERNS.some(({ regex }) => regex.test(normalized));
  const asksForPhotos = /\b(foto|fotos|photos?)\b/i.test(normalized);
  const asksForSpecificOwnedItem = /\b(mio|mia|mias|mios|of mine)\b/i.test(plain) && /\b(un|una)\b/i.test(normalized);

  if (
    hasBrowseVerb(normalized)
    && (hasPluralCategory || /\bmis\b/i.test(normalized))
    && !asksForSpecificOwnedItem
    && !asksForPhotos
  ) {
    return { kind: 'category_browse', category };
  }

  if (ITEM_CLARIFICATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { kind: 'item_clarification', category };
  }

  if (hasBrowseVerb(normalized) && asksForSpecificOwnedItem && category) {
    return { kind: 'item_clarification', category };
  }

  return null;
}

export function parseAppNavigationIntent(text: string): StylistNavigationIntent | null {
  const normalized = (text || '').trim();
  if (!normalized) return null;

  if (NAVIGATION_SAVED_LOOKS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: 'open_saved_looks', route: '/guardados' };
  }

  if (NAVIGATION_WISHLIST_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: 'open_wishlist', route: '/armario' };
  }

  const referencedItemIntent = parseReferencedItemIntent(normalized);
  if (referencedItemIntent?.kind === 'category_browse' && hasBrowseVerb(normalized)) {
    const category = referencedItemIntent.category;
    const color = extractColor(normalized);
    const occasion = extractOccasion(normalized);
    if (category || color || occasion) {
      return {
        type: 'open_closet_filtered',
        route: '/armario',
        filters: {
          category,
          color,
          occasion,
        },
      };
    }
  }

  return null;
}

export function classifyStylistIntent(text: string): StylistIntent {
  if (parseAppNavigationIntent(text)) return 'app_navigation';
  if (detectItemRecommendationIntent(text)) return 'item_recommendation';
  if (detectWardrobeOutfitIntent(text) && !detectLookCreationIntent(text)) return 'outfit_from_wardrobe';
  if (detectWardrobeOutfitIntent(text) && /armario|lo que tengo|outfit/.test(text.toLowerCase())) return 'outfit_from_wardrobe';
  if (detectLookCreationIntent(text)) return 'generate_new_garment';
  return 'chat_general';
}

export function detectGarmentEditIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return GARMENT_EDIT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function detectItemRecommendationIntent(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  if (ITEM_RECOMMENDATION_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  // Heurística tolerante a typos comunes (ej: "reocmeinda una prenda").
  const plain = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const hasRecommendationVerb = /(recom|reocm|suger|aconsej|convien|elegi|elige|seleccion|mostra|mostrar|show)/.test(plain);
  const hasGarmentContext = /(prenda|item|ropa|armario|closet|guardarropa|vestuario|remera|camisa|top|blusa|camiseta|pantalon|jean|falda|pollera|short|zapato|zapatilla|bota)/.test(plain);
  return hasRecommendationVerb && hasGarmentContext;
}

export function parseLookCreationCategory(text: string): LookCreationCategory | null {
  const normalized = (text || '').trim();
  if (!normalized) return null;
  const match = CATEGORY_PATTERNS.find(({ regex }) => regex.test(normalized));
  return match?.category || null;
}

export function wantsAutoCategorySelection(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) return false;
  return AUTO_CATEGORY_PATTERNS.some((pattern) => pattern.test(normalized));
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

  const parsed: Partial<LookCreationDraft> = {};
  if (category) parsed.category = category;
  if (styleMatch) parsed.style = styleMatch;
  if (occasionMatch) parsed.occasion = occasionMatch;
  return parsed;
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
    return '¿Para qué ocasión lo querés? (ej: oficina, cita, fiesta, fin de semana). Si querés, también podés decir ocasión + estilo en una sola frase.';
  }
  if (field === 'style') {
    return '¿Qué estilo buscás? (ej: casual, elegante, formal, streetwear).';
  }
  return '¿Qué categoría querés crear? Puede ser top, bottom o calzado. Si preferís, decime "elegí vos" y la elijo por contexto.';
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
  return `Tengo todo para generar tu prenda:\n- Ocasión: ${draft.occasion}\n- Estilo: ${draft.style}\n- Categoría: ${draft.category ? getCategoryLabel(draft.category) : '-'}\n\nEsta generación premium cuesta ${LOOK_CREATION_CREDIT_COST} usos premium. ¿Confirmás que la genere ahora?`;
}
