import { GEMINI_31_FLASH_LITE_MODEL, GEMINI_3_FLASH_MODEL } from '../_shared/geminiModels.ts';

export type StylistModelRoutingDecision = 'lite' | 'flash';

export type StylistModelPlan = {
  primaryModel: string;
  routingDecision: StylistModelRoutingDecision;
  routingReason: string;
  allowEscalation: boolean;
};

type ResolveStylistModelPlanParams = {
  turnIntent: string;
  message: string;
  inventoryCount: number;
  hasAttachments: boolean;
};

type EscalationCheckParams = {
  currentPlan: StylistModelPlan;
  turnIntent: string;
  inventoryCount: number;
  confidence?: number | null;
  hasCompleteOutfitSuggestion: boolean;
};

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const COMPARISON_PATTERN = /\b(compara|comparame|versus|vs\.?|cual de (estos|estas|los|las)|entre .* y .*)\b/i;
const ADAPTATION_PATTERN = /\b(adapta|adaptame|adaptar|pasalo|llevalo|manteniendo|sin perder)\b/i;
const MULTI_VARIANT_PATTERN = /\b(2|3|dos|tres).*(opciones|variantes|alternativas)|\b(variantes|alternativas|opciones)\b/i;
const HARD_CONSTRAINT_PATTERN = /\b(sin|pero|aunque|manteniendo|evitando|priorizando)\b/i;
const STYLING_COMPLEXITY_PATTERN = /\b(editorial|mas jugado|mas arriesgado|mas sofisticado|mas sexy|mas sobrio|mas elevado|mas interesante)\b/i;

function countConstraintSignals(normalized: string): number {
  const signals = [
    /\bclima\b/i,
    /\boficina\b/i,
    /\bcita\b/i,
    /\bfiesta\b/i,
    /\bformal\b/i,
    /\bcasual\b/i,
    /\bcolorimetr/i,
    /\bprenda\b/i,
    HARD_CONSTRAINT_PATTERN,
  ];

  return signals.reduce((count, pattern) => count + (pattern.test(normalized) ? 1 : 0), 0);
}

function hasDirectComplexitySignals(normalized: string): boolean {
  return COMPARISON_PATTERN.test(normalized)
    || ADAPTATION_PATTERN.test(normalized)
    || MULTI_VARIANT_PATTERN.test(normalized)
    || STYLING_COMPLEXITY_PATTERN.test(normalized)
    || countConstraintSignals(normalized) >= 4;
}

export function resolveStylistModelPlan(
  params: ResolveStylistModelPlanParams,
): StylistModelPlan {
  const normalized = normalizeForMatch(params.message || '');

  if (params.turnIntent === 'look_item_extraction') {
    return {
      primaryModel: GEMINI_31_FLASH_LITE_MODEL,
      routingDecision: 'lite',
      routingReason: 'look_item_extraction',
      allowEscalation: false,
    };
  }

  if (params.turnIntent === 'reference_recreation' && !hasDirectComplexitySignals(normalized)) {
    return {
      primaryModel: GEMINI_31_FLASH_LITE_MODEL,
      routingDecision: 'lite',
      routingReason: 'simple_reference_recreation',
      allowEscalation: true,
    };
  }

  if (hasDirectComplexitySignals(normalized)) {
    return {
      primaryModel: GEMINI_3_FLASH_MODEL,
      routingDecision: 'flash',
      routingReason: 'complex_prompt',
      allowEscalation: false,
    };
  }

  if (params.inventoryCount >= 40 && (params.turnIntent === 'look_improvement' || params.turnIntent === 'wardrobe_outfit' || params.hasAttachments)) {
    return {
      primaryModel: GEMINI_3_FLASH_MODEL,
      routingDecision: 'flash',
      routingReason: 'large_inventory_complex_surface',
      allowEscalation: false,
    };
  }

  return {
    primaryModel: GEMINI_31_FLASH_LITE_MODEL,
    routingDecision: 'lite',
    routingReason: 'default_lite',
    allowEscalation: true,
  };
}

export function shouldEscalateStylistModel(
  params: EscalationCheckParams,
): { escalate: boolean; reason: string | null } {
  if (!params.currentPlan.allowEscalation) {
    return { escalate: false, reason: null };
  }

  if (params.turnIntent === 'look_item_extraction') {
    return { escalate: false, reason: null };
  }

  if (typeof params.confidence === 'number' && params.confidence < 0.65) {
    return { escalate: true, reason: 'low_confidence' };
  }

  if (!params.hasCompleteOutfitSuggestion && (
    params.turnIntent === 'wardrobe_outfit'
    || params.turnIntent === 'reference_recreation'
    || params.turnIntent === 'look_improvement'
  )) {
    return { escalate: true, reason: 'missing_complete_outfit' };
  }

  if (!params.hasCompleteOutfitSuggestion && params.inventoryCount >= 40) {
    return { escalate: true, reason: 'large_inventory_without_clear_outfit' };
  }

  return { escalate: false, reason: null };
}
