export type ChatScope = 'fashion_domain' | 'non_fashion_domain' | 'prompt_injection_attempt';

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const TECHNICAL_BLOCK_PATTERN = /\[(?:top|bottom|shoes|outerwear|accessories?)[^\]]*\]/gi;
const PROMPT_INJECTION_PATTERN = /\b(ignore|ignora|olvida|bypass|saltate|evita|revela|mostra(?:me)?|decime|dame)\b[\s\S]{0,120}\b(system prompt|prompt interno|reglas|instrucciones|policies|policy|clave|secret|api key|apikey|base de datos|database|sql|schema|headers?)\b/i;
const NON_FASHION_PATTERN = /\b(dolar|usd|bitcoin|btc|cript[oó]|acciones|presidente|elecciones|programaci[oó]n|javascript|python|typescript|c[oó]digo|f[uú]tbol|partido|nba|tenis|clima en|capital de|noticias|pel[ií]cula|serie)\b/i;
const FASHION_PATTERN = /\b(look|looks|outfit|armario|closet|ropa|prenda|prendas|vestir|ponerme|remera|camisa|blusa|camiseta|top|tops|pantal[oó]n|pantalones|jean|jeans|falda|pollera|short|calzado|zapatillas|zapatos|botas|oficina|cita|fiesta|shopping|wishlist|accesorios|colorimetr[ií]a|morfolog[ií]a|estilo|studio|probador|try-on|kumbi)\b/i;

function normalize(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function classifyChatScope(message: string): ChatScope {
  const normalized = normalize(message);
  if (!normalized) return 'fashion_domain';
  if (PROMPT_INJECTION_PATTERN.test(normalized)) return 'prompt_injection_attempt';
  if (FASHION_PATTERN.test(normalized)) return 'fashion_domain';
  if (NON_FASHION_PATTERN.test(normalized)) return 'non_fashion_domain';
  return 'fashion_domain';
}

function compactSpaces(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeStylistContent(content: string, fallback = 'Puedo ayudarte con looks, armario y compras relacionadas.'): string {
  const raw = typeof content === 'string' ? content : '';
  const cleaned = compactSpaces(
    raw
      .replace(TECHNICAL_BLOCK_PATTERN, '')
      .replace(/\(\s*[0-9a-f-]{20,}\s*\)/gi, '')
      .replace(UUID_PATTERN, '')
      .replace(/\b(?:top_id|bottom_id|shoes_id|outerwear_id|accessory_ids?)\b[^\n]*/gi, '')
      .replace(/\{[^{}]*(?:top_id|bottom_id|shoes_id)[^{}]*\}/gi, '')
      .replace(/\(\s*ID:\s*\)/gi, '')
      .replace(/\b(?:su\s+)?id\s+es\s*(?:[\w-]+|\.|,|;|$)/gi, '')
      .replace(/\bID:\s*(?:\.|,|;|$)/gi, '')
      .replace(/^\s*\*\s+/gm, '• ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*/g, '')
      .replace(/\(\s*\)/g, '')
  );

  return cleaned || fallback;
}

function toLabelPart(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 60) : undefined;
}

export function summarizeInventoryForConversation(inventory: any[]): Array<Record<string, unknown>> {
  if (!Array.isArray(inventory)) return [];
  return inventory.slice(0, 80).map((item) => {
    const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const category = toLabelPart(metadata.category);
    const subcategory = toLabelPart(metadata.subcategory);
    const color = toLabelPart(metadata.color_primary);
    const vibeTags = Array.isArray(metadata.vibe_tags) ? metadata.vibe_tags.map(toLabelPart).filter(Boolean).slice(0, 4) : [];
    const seasons = Array.isArray(metadata.seasons) ? metadata.seasons.map(toLabelPart).filter(Boolean).slice(0, 4) : [];
    const displayLabel = [subcategory, color].filter(Boolean).join(' · ') || [category, subcategory].filter(Boolean).join(' · ') || 'prenda';
    return {
      display_label: displayLabel,
      category,
      subcategory,
      color_primary: color,
      vibe_tags: vibeTags,
      seasons,
    };
  });
}
