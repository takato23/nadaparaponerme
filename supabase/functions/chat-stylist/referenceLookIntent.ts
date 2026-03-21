type StylistTurnIntent =
  | 'free_consult'
  | 'look_item_extraction'
  | 'problem_item_guidance'
  | 'reference_recreation'
  | 'wardrobe_outfit'
  | 'look_improvement'
  | 'gap_or_shopping'
  | 'generate_new_garment'
  | 'edit_generated_garment'
  | 'try_on';

const REFERENCE_LOOK_RECREATION_PATTERNS = [
  /\b(recrea(?:me|r)?|replica(?:me|r)?|copia(?:me|r)?|inspira(?:me|r)?|basa(?:te|r)?|adapta(?:me|r)?)\b/i,
  /\b(armame|arma|proponeme|propone|haceme|hace)\b.*\b(asi|similar|parecido|inspirado|basado|este|esta|referencia|foto|look|outfit)\b/i,
  /\b(con mi armario|con mi closet)\b/i,
];

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isReferenceLookRecreationIntent(message: string): boolean {
  const normalized = normalizeForMatch(message || '');
  if (!normalized) return false;
  return REFERENCE_LOOK_RECREATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildReferenceLookObjective(turnIntent: StylistTurnIntent): string {
  switch (turnIntent) {
    case 'reference_recreation':
      return 'recrear la esencia del look con el armario del usuario, aunque no sea idéntico';
    case 'wardrobe_outfit':
    case 'look_improvement':
      return 'usar esta imagen como referencia visual para proponer una variante o mejora compatible con el armario del usuario';
    case 'gap_or_shopping':
      return 'usar esta imagen como referencia visual para detectar qué funciona y qué piezas faltan o conviene buscar';
    default:
      return 'usar esta imagen como contexto visual para analizarla y opinar sin asumir que hay que recrearla';
  }
}
