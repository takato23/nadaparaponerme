export type GuidedLookStatus =
  | 'idle'
  | 'collecting'
  | 'choosing_mode'
  | 'confirming'
  | 'generating'
  | 'generated'
  | 'editing'
  | 'tryon_confirming'
  | 'tryon_generating'
  | 'cancelled'
  | 'error';

export type GuidedLookErrorCode =
  | 'INSUFFICIENT_CREDITS'
  | 'GENERATION_TIMEOUT'
  | 'GENERATION_FAILED'
  | 'TRYON_FAILED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CONFIRMATION';

export type GuidedLookCategory = 'top' | 'bottom' | 'shoes';
export type GuidedLookMissingField = 'occasion' | 'style' | 'category';
export type GuidedLookStrategy = 'direct' | 'guided';
export type GuidedLookPendingAction = 'generate' | 'edit' | 'tryon';

export interface GuidedLookCollected {
  occasion?: string;
  style?: string;
  category?: GuidedLookCategory;
  requestText?: string;
}

export interface GuidedLookWorkflowResponse {
  mode: 'guided_look_creation';
  sessionId: string;
  status: GuidedLookStatus;
  strategy?: GuidedLookStrategy | null;
  pendingAction?: GuidedLookPendingAction | null;
  missingFields: GuidedLookMissingField[];
  collected: GuidedLookCollected;
  estimatedCostCredits: number;
  requiresConfirmation: boolean;
  confirmationToken?: string | null;
  generatedItem?: any;
  tryOnResultImageUrl?: string | null;
  editInstruction?: string | null;
  autosaveEnabled: boolean;
  errorCode?: GuidedLookErrorCode | null;
}

export const GUIDED_LOOK_MODE = 'guided_look_creation' as const;
export const GUIDED_LOOK_CREDIT_COST = 2;
export const LOOK_EDIT_CREDIT_COST = 2;
export const TRY_ON_CREDIT_COST = 4;
export const GUIDED_LOOK_TTL_HOURS = 12;

const BILLABLE_WORKFLOW_CHAT_ACTIONS = new Set([
  'start',
  'submit',
  'select_strategy',
  'request_edit',
]);

const CATEGORY_PATTERNS: Array<{ category: GuidedLookCategory; regex: RegExp }> = [
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

const COLOR_HEX_BY_KEYWORD: Array<{ keyword: string; hex: string }> = [
  { keyword: 'negro', hex: '#111111' },
  { keyword: 'negra', hex: '#111111' },
  { keyword: 'blanco', hex: '#F5F5F5' },
  { keyword: 'blanca', hex: '#F5F5F5' },
  { keyword: 'gris', hex: '#9CA3AF' },
  { keyword: 'azul', hex: '#2563EB' },
  { keyword: 'celeste', hex: '#38BDF8' },
  { keyword: 'rojo', hex: '#DC2626' },
  { keyword: 'roja', hex: '#DC2626' },
  { keyword: 'bordó', hex: '#7F1D1D' },
  { keyword: 'bordo', hex: '#7F1D1D' },
  { keyword: 'verde', hex: '#16A34A' },
  { keyword: 'oliva', hex: '#556B2F' },
  { keyword: 'amarillo', hex: '#FACC15' },
  { keyword: 'naranja', hex: '#F97316' },
  { keyword: 'rosa', hex: '#EC4899' },
  { keyword: 'fucsia', hex: '#D946EF' },
  { keyword: 'violeta', hex: '#8B5CF6' },
  { keyword: 'marrón', hex: '#8B5A2B' },
  { keyword: 'marron', hex: '#8B5A2B' },
  { keyword: 'beige', hex: '#D6C7A1' },
  { keyword: 'crema', hex: '#F3E8C8' },
];

export function parseLookCreationCategory(text: string): GuidedLookCategory | null {
  const normalized = String(text || '').trim();
  if (!normalized) return null;
  const match = CATEGORY_PATTERNS.find(({ regex }) => regex.test(normalized));
  return match?.category || null;
}

export function parseLookStrategy(text: string): GuidedLookStrategy | null {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return null;
  if (/guiad/.test(normalized)) return 'guided';
  if (/direct/.test(normalized)) return 'direct';
  if (/r[aá]pido|sin vueltas|ya mismo|ahora/.test(normalized)) return 'direct';
  return null;
}

export function parseLookCreationFields(text: string): Partial<GuidedLookCollected> {
  const normalized = String(text || '').trim();
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

export function getMissingLookFields(collected: GuidedLookCollected): GuidedLookMissingField[] {
  const missing: GuidedLookMissingField[] = [];
  if (!collected.occasion) missing.push('occasion');
  if (!collected.style) missing.push('style');
  if (!collected.category) missing.push('category');
  return missing;
}

export function getDirectMissingLookFields(collected: GuidedLookCollected): GuidedLookMissingField[] {
  if (!collected.category) return ['category'];
  return [];
}

export function getLookFieldQuestion(field: GuidedLookMissingField): string {
  if (field === 'occasion') {
    return 'Perfecto. ¿Para qué ocasión lo querés? (ej: oficina, cita, fiesta, fin de semana)';
  }
  if (field === 'style') {
    return 'Genial. ¿Qué estilo buscás? (ej: casual, elegante, formal, streetwear)';
  }
  return '¿Qué categoría querés crear? Elegí una: top, bottom o calzado.';
}

export function isAffirmative(text: string): boolean {
  const normalized = String(text || '').trim().toLowerCase();
  return /^(si|sí|dale|ok|de una|confirmo|confirmar|genera|generar|hag[aá]moslo|listo)$/.test(normalized);
}

export function isNegative(text: string): boolean {
  const normalized = String(text || '').trim().toLowerCase();
  return /^(no|cancelar|cancela|fren[aá]|mejor no|despu[eé]s)$/.test(normalized);
}

export function getCategoryLabel(category?: GuidedLookCategory): string {
  if (category === 'top') return 'Top';
  if (category === 'bottom') return 'Bottom';
  if (category === 'shoes') return 'Calzado';
  return '-';
}

export function buildModeChoiceMessage(): string {
  return [
    'Podemos hacerlo de dos formas:',
    `1) Modo directo: genero rápido con lo mínimo (${GUIDED_LOOK_CREDIT_COST} créditos al confirmar).`,
    `2) Modo guiado: te hago preguntas paso a paso (${GUIDED_LOOK_CREDIT_COST} créditos al confirmar).`,
    '',
    'Decime "directo" o "guiado".',
  ].join('\n');
}

export function buildLookCreationPrompt(collected: GuidedLookCollected): string {
  const parts = [
    collected.requestText ? `Pedido base: ${collected.requestText}.` : '',
    collected.occasion ? `Ocasión: ${collected.occasion}.` : '',
    collected.style ? `Estilo: ${collected.style}.` : '',
    collected.category ? `Categoría: ${collected.category}.` : '',
    'Foto de producto de moda, fondo limpio, enfoque e-commerce, alta calidad.',
  ].filter(Boolean);

  return parts.join(' ');
}

export function buildLookCostMessage(
  collected: GuidedLookCollected,
  costCredits = GUIDED_LOOK_CREDIT_COST,
): string {
  return `Tengo todo para generar tu prenda:\n- Ocasión: ${collected.occasion || 'uso diario'}\n- Estilo: ${collected.style || 'casual'}\n- Categoría: ${getCategoryLabel(collected.category)}\n\nEsta generación cuesta ${costCredits} créditos. ¿Confirmás que la genere ahora?`;
}

export function buildEditCostMessage(instruction: string): string {
  return `Perfecto. Puedo modificar la prenda aplicando "${instruction}". Esta edición cuesta ${LOOK_EDIT_CREDIT_COST} créditos. ¿Confirmás?`;
}

export function buildTryOnCostMessage(): string {
  return `El probador virtual con selfie cuesta ${TRY_ON_CREDIT_COST} créditos. ¿Confirmás que lo genere ahora?`;
}

export function normalizeCollected(
  previous: GuidedLookCollected,
  incoming: Partial<GuidedLookCollected>,
  fallbackText?: string,
): GuidedLookCollected {
  const next: GuidedLookCollected = {
    ...previous,
    ...incoming,
  };
  if (!next.requestText && fallbackText) {
    next.requestText = fallbackText.trim().slice(0, 240);
  }
  return next;
}

export function buildGuidedWorkflowResponse(input: {
  sessionId: string;
  status: GuidedLookStatus;
  strategy?: GuidedLookStrategy | null;
  pendingAction?: GuidedLookPendingAction | null;
  collected: GuidedLookCollected;
  missingFields?: GuidedLookMissingField[];
  pendingCostCredits?: number;
  requiresConfirmation?: boolean;
  confirmationToken?: string | null;
  generatedItem?: any;
  tryOnResultImageUrl?: string | null;
  editInstruction?: string | null;
  autosaveEnabled?: boolean;
  errorCode?: GuidedLookErrorCode | null;
}): GuidedLookWorkflowResponse {
  const missingFields = input.missingFields || getMissingLookFields(input.collected);
  const requiresConfirmation = input.requiresConfirmation
    ?? (input.status === 'confirming' || input.status === 'tryon_confirming');
  return {
    mode: GUIDED_LOOK_MODE,
    sessionId: input.sessionId,
    status: input.status,
    strategy: input.strategy || null,
    pendingAction: input.pendingAction || null,
    missingFields,
    collected: input.collected,
    estimatedCostCredits: input.pendingCostCredits || GUIDED_LOOK_CREDIT_COST,
    requiresConfirmation,
    confirmationToken: input.confirmationToken || null,
    generatedItem: input.generatedItem || null,
    tryOnResultImageUrl: input.tryOnResultImageUrl || null,
    editInstruction: input.editInstruction || null,
    autosaveEnabled: Boolean(input.autosaveEnabled),
    errorCode: input.errorCode || null,
  };
}

export function buildGarmentEditPrompt(params: {
  collected: GuidedLookCollected;
  instruction: string;
  basePrompt?: string;
}) {
  const trimmedInstruction = String(params.instruction || '').trim();
  const parts = [
    params.basePrompt ? `Base de la prenda original: ${params.basePrompt}.` : '',
    params.collected.occasion ? `Ocasión objetivo: ${params.collected.occasion}.` : '',
    params.collected.style ? `Estilo objetivo: ${params.collected.style}.` : '',
    params.collected.category ? `Categoría: ${params.collected.category}.` : '',
    trimmedInstruction ? `Cambios solicitados: ${trimmedInstruction}.` : '',
    'Reimaginar la misma prenda con esas modificaciones, foto de producto de moda, fondo limpio tipo e-commerce, alta calidad, sin modelo.',
  ].filter(Boolean);
  return parts.join(' ');
}

export function mapLookCategoryToTryOnSlot(category?: GuidedLookCategory): string {
  if (category === 'bottom') return 'bottom';
  if (category === 'shoes') return 'shoes';
  return 'top_base';
}

export function shouldChargeChatCreditsForWorkflowAction(action: string): boolean {
  return BILLABLE_WORKFLOW_CHAT_ACTIONS.has(String(action || '').trim());
}

export function buildGeneratedItemFromImage(params: {
  sessionId: string;
  imageUrl: string;
  prompt: string;
  collected: GuidedLookCollected;
  savedToCloset?: boolean;
}) {
  const category = params.collected.category || 'top';
  const styleTag = params.collected.style || 'casual';
  const combinedText = [
    params.collected.requestText || '',
    params.collected.style || '',
    params.collected.occasion || '',
  ].join(' ');
  const matchedColor = COLOR_HEX_BY_KEYWORD.find((entry) =>
    new RegExp(`\\b${entry.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(combinedText)
  );
  const colorPrimary = matchedColor?.hex || '#000000';
  const vibeTags = Array.from(new Set([
    'ai-generated',
    styleTag,
    params.collected.occasion || '',
  ].filter(Boolean)));

  return {
    id: `guided_ai_${params.sessionId}`,
    imageDataUrl: params.imageUrl,
    metadata: {
      category,
      subcategory: `Prenda IA - ${getCategoryLabel(category)} ${styleTag}`.trim(),
      color_primary: colorPrimary,
      vibe_tags: vibeTags,
      seasons: ['spring', 'summer', 'fall', 'winter'],
      description: params.prompt,
    },
    isAIGenerated: true,
    aiGenerationPrompt: params.prompt,
    saved_to_closet: Boolean(params.savedToCloset),
  };
}

export function buildOutfitSuggestionWithGeneratedItem(
  generatedItem: any,
  inventory: any[],
): {
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  explanation: string;
  confidence: number;
} | null {
  if (!generatedItem?.id || !generatedItem?.metadata?.category) return null;

  const topItems = inventory.filter((item) => item?.metadata?.category === 'top');
  const bottomItems = inventory.filter((item) => item?.metadata?.category === 'bottom');
  const shoesItems = inventory.filter((item) => item?.metadata?.category === 'shoes');
  const generatedCategory = generatedItem.metadata.category as GuidedLookCategory;

  const topId = generatedCategory === 'top' ? generatedItem.id : topItems[0]?.id;
  const bottomId = generatedCategory === 'bottom' ? generatedItem.id : bottomItems[0]?.id;
  const shoesId = generatedCategory === 'shoes' ? generatedItem.id : shoesItems[0]?.id;

  if (!topId || !bottomId || !shoesId) return null;

  return {
    top_id: topId,
    bottom_id: bottomId,
    shoes_id: shoesId,
    explanation: 'Te armé un outfit completo incorporando la prenda recién generada.',
    confidence: 0.78,
  };
}
