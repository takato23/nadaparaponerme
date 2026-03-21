import { isForbiddenHost } from './security.ts';

type ShoppingSource = 'ml_api' | 'gemini_grounded' | 'manual_fallback';

type ImagePayload = {
  base64Data: string;
  mimeType: string;
};

type DupeIntent = {
  itemId: string;
  category: string;
  subcategory: string;
  color: string;
  brand: string;
  countryCode: string;
  locale: string;
  query: string;
  originalPriceUsd: number;
};

type NormalizedCandidate = {
  title: string;
  brand: string;
  price: number;
  currency: string;
  shop_name: string;
  shop_url: string;
  image_url?: string;
  source: ShoppingSource;
  country_code: string;
  similarity_score: number;
  rank_score: number;
  link_verified?: boolean;
};

type RawCandidate = {
  title?: unknown;
  brand?: unknown;
  price?: unknown;
  currency?: unknown;
  shop_name?: unknown;
  shop_url?: unknown;
  image_url?: unknown;
  source: ShoppingSource;
  country_code?: unknown;
};

type BuildDupeResultInput = {
  item: any;
  brandInfo: any;
  imagePayload: ImagePayload;
  modelWithSearch: any;
  countryCode?: string;
  locale?: string;
  enableLinkVerification?: boolean;
  toApproxUsd: (price: number, currency: string) => number;
};

const SUPPORTED_COUNTRIES = ['AR', 'MX', 'CL', 'CO', 'PE'] as const;
const ML_SITE_BY_COUNTRY: Record<string, string> = {
  AR: 'MLA',
  MX: 'MLM',
  CL: 'MLC',
  CO: 'MCO',
  PE: 'MPE',
};

const ML_LISTING_BASE_BY_COUNTRY: Record<string, string> = {
  AR: 'https://listado.mercadolibre.com.ar',
  MX: 'https://listado.mercadolibre.com.mx',
  CL: 'https://listado.mercadolibre.cl',
  CO: 'https://listado.mercadolibre.com.co',
  PE: 'https://listado.mercadolibre.com.pe',
};

const AMAZON_BASE_BY_COUNTRY: Record<string, string> = {
  AR: 'https://www.amazon.com',
  MX: 'https://www.amazon.com.mx',
  CL: 'https://www.amazon.com',
  CO: 'https://www.amazon.com',
  PE: 'https://www.amazon.com',
};

const GOOGLE_BASE_BY_COUNTRY: Record<string, string> = {
  AR: 'https://www.google.com.ar',
  MX: 'https://www.google.com.mx',
  CL: 'https://www.google.cl',
  CO: 'https://www.google.com.co',
  PE: 'https://www.google.com.pe',
};

const MAX_DUPES = 5;
const FETCH_TIMEOUT_MS = 7000;
const VERIFY_TIMEOUT_MS = 3000;

function normalizeCountryCode(countryCode: unknown, fallback: string = 'AR'): string {
  if (typeof countryCode !== 'string') return fallback;
  const normalized = countryCode.trim().toUpperCase();
  if ((SUPPORTED_COUNTRIES as readonly string[]).includes(normalized)) return normalized;
  return fallback;
}

function resolveCountryCode(countryCode?: string, locale?: string): string {
  const direct = normalizeCountryCode(countryCode);
  if (direct !== 'AR' || (countryCode || '').toUpperCase() === 'AR') return direct;

  const normalizedLocale = String(locale || '').trim().replace('_', '-');
  if (!normalizedLocale) return 'AR';
  const parts = normalizedLocale.split('-');
  const fromLocale = normalizeCountryCode(parts[1] || parts[0]);
  return fromLocale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function safeParseJson(raw: string): any {
  const text = String(raw || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const objectStart = cleaned.indexOf('{');
      const objectEnd = cleaned.lastIndexOf('}');
      if (objectStart >= 0 && objectEnd > objectStart) {
        const objectCandidate = cleaned.slice(objectStart, objectEnd + 1);
        return JSON.parse(objectCandidate);
      }

      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        const arrayCandidate = cleaned.slice(arrayStart, arrayEnd + 1);
        return JSON.parse(arrayCandidate);
      }

      return {};
    }
  }
}

function scoreSimilarity(intent: DupeIntent, title: string): number {
  const intentTokens = new Set(tokenize(`${intent.subcategory} ${intent.color} ${intent.brand}`));
  const titleTokens = tokenize(title);
  if (intentTokens.size === 0 || titleTokens.length === 0) return 0.35;

  let overlap = 0;
  for (const token of titleTokens) {
    if (intentTokens.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.max(intentTokens.size, 1);
  return clamp(ratio, 0, 1);
}

function sourceTrust(source: ShoppingSource): number {
  if (source === 'ml_api') return 1;
  if (source === 'gemini_grounded') return 0.82;
  return 0.65;
}

function toCurrencyFromUsd(usd: number, currency: string): number {
  if (currency === 'ARS') return usd * 1000;
  if (currency === 'EUR') return usd / 1.1;
  return usd;
}

function estimateQuality(priceUsd: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return 'unknown';
  if (priceUsd >= 70) return 'high';
  if (priceUsd >= 28) return 'medium';
  return 'low';
}

function buildKeyDifferences(intent: DupeIntent, candidate: NormalizedCandidate): string[] {
  const diffs: string[] = [];
  const titleNorm = normalizeText(candidate.title);

  if (intent.color && !titleNorm.includes(normalizeText(intent.color))) {
    diffs.push(`Puede variar el tono respecto al color ${intent.color}.`);
  }

  if (candidate.link_verified === false) {
    diffs.push('El link no pudo verificarse automáticamente.');
  }

  const quality = estimateQuality(candidate.price > 0 ? candidate.price : 0);
  if (quality === 'low') {
    diffs.push('Se percibe como opción budget, probablemente con materiales más simples.');
  } else if (quality === 'high') {
    diffs.push('Precio más alto dentro de las alternativas, posible mejor terminación.');
  }

  if (candidate.source === 'manual_fallback') {
    diffs.push('Resultado de búsqueda manual, requiere revisar variantes en tienda.');
  }

  if (diffs.length === 0) {
    diffs.push('Puede variar el calce exacto según marca y talle.');
  }

  return diffs.slice(0, 3);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function sanitizeCandidateUrl(urlValue: unknown): string | null {
  if (typeof urlValue !== 'string') return null;
  const trimmed = urlValue.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (isForbiddenHost(parsed.hostname.toLowerCase())) return null;
  return parsed.toString();
}

function dedupeKey(candidate: NormalizedCandidate): string {
  const domain = new URL(candidate.shop_url).hostname.toLowerCase();
  const title = normalizeText(candidate.title);
  const priceBucket = candidate.price > 0 ? Math.floor(candidate.price / 15) : 0;
  return `${title}|${domain}|${candidate.currency}|${priceBucket}`;
}

async function runWithConcurrency<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  worker: (item: TIn) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const headResponse = await withTimeout(fetch(url, { method: 'HEAD', redirect: 'follow' }), VERIFY_TIMEOUT_MS);
    if (headResponse.ok || (headResponse.status >= 300 && headResponse.status < 400)) {
      return true;
    }
  } catch {
    // Fallback to GET below.
  }

  try {
    const getResponse = await withTimeout(fetch(url, { method: 'GET', redirect: 'follow' }), VERIFY_TIMEOUT_MS);
    if (!(getResponse.ok || (getResponse.status >= 300 && getResponse.status < 400))) return false;

    const contentType = String(getResponse.headers.get('content-type') || '').toLowerCase();
    if (!contentType) return true;
    return (
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml') ||
      contentType.includes('text/plain')
    );
  } catch {
    return false;
  }
}

function normalizeRawCandidate(raw: RawCandidate, intent: DupeIntent, toApproxUsd: (price: number, currency: string) => number): NormalizedCandidate | null {
  const shopUrl = sanitizeCandidateUrl(raw.shop_url);
  if (!shopUrl) return null;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title || title.length < 3) return null;

  const currency = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : 'USD';
  const price = clamp(safeNumber(raw.price), 0, 999999999);
  const brand = typeof raw.brand === 'string' && raw.brand.trim() ? raw.brand.trim() : 'Sin marca';
  const shopName = typeof raw.shop_name === 'string' && raw.shop_name.trim()
    ? raw.shop_name.trim()
    : new URL(shopUrl).hostname.replace(/^www\./, '');

  const imageUrl = sanitizeCandidateUrl(raw.image_url) || undefined;
  const similarity = scoreSimilarity(intent, title);
  const priceUsd = toApproxUsd(price, currency);
  const priceAdvantage = intent.originalPriceUsd > 0 && priceUsd > 0
    ? clamp((intent.originalPriceUsd - priceUsd) / Math.max(intent.originalPriceUsd, 1), 0, 1)
    : priceUsd > 0
      ? clamp((80 - priceUsd) / 80, 0, 1)
      : 0.2;
  const normalizedCountry = normalizeCountryCode(raw.country_code, intent.countryCode);
  const geoScore = normalizedCountry === intent.countryCode ? 1 : 0.6;
  const trust = sourceTrust(raw.source);

  const rankScore = Math.round(
    clamp(
      100 * (
        similarity * 0.43 +
        priceAdvantage * 0.25 +
        trust * 0.16 +
        geoScore * 0.16
      ),
      0,
      100,
    ),
  );

  return {
    title,
    brand,
    price,
    currency,
    shop_name: shopName,
    shop_url: shopUrl,
    image_url: imageUrl,
    source: raw.source,
    country_code: normalizedCountry,
    similarity_score: Math.round(clamp(rankScore, 10, 99)),
    rank_score: rankScore,
  };
}

async function fetchMercadoLibreCandidates(intent: DupeIntent): Promise<RawCandidate[]> {
  const siteId = ML_SITE_BY_COUNTRY[intent.countryCode] || ML_SITE_BY_COUNTRY.AR;
  const endpoint = `https://api.mercadolibre.com/sites/${siteId}/search?limit=20&q=${encodeURIComponent(intent.query)}`;

  try {
    const response = await withTimeout(fetch(endpoint, { method: 'GET' }), FETCH_TIMEOUT_MS);
    if (!response.ok) return [];

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];
    return results.map((result: any) => ({
      title: result?.title,
      brand: result?.attributes?.find((attr: any) => attr?.id === 'BRAND')?.value_name || result?.official_store_name,
      price: result?.price,
      currency: result?.currency_id,
      shop_name: result?.official_store_name || result?.seller?.nickname || 'Mercado Libre',
      shop_url: result?.permalink,
      image_url: typeof result?.thumbnail === 'string' ? result.thumbnail.replace(/^http:\/\//, 'https://') : undefined,
      source: 'ml_api' as const,
      country_code: intent.countryCode,
    }));
  } catch {
    return [];
  }
}

function extractGroundingCandidates(generated: any, intent: DupeIntent): RawCandidate[] {
  try {
    const candidates = generated?.response?.candidates || [];
    const chunks = candidates[0]?.groundingMetadata?.groundingChunks || [];
    if (!Array.isArray(chunks)) return [];

    return chunks
      .map((chunk: any) => chunk?.web)
      .filter((web: any) => web?.uri && web?.title)
      .slice(0, 8)
      .map((web: any) => ({
        title: web.title,
        brand: 'Sin marca',
        price: 0,
        currency: 'USD',
        shop_name: (() => {
          try {
            return new URL(web.uri).hostname.replace(/^www\./, '');
          } catch {
            return 'Web';
          }
        })(),
        shop_url: web.uri,
        source: 'gemini_grounded' as const,
        country_code: intent.countryCode,
      }));
  } catch {
    return [];
  }
}

async function fetchGeminiCandidates(intent: DupeIntent, imagePayload: ImagePayload, modelWithSearch: any): Promise<{ candidates: RawCandidate[]; strategy: string }> {
  const prompt = `
Analizá la imagen y buscá productos similares para comprar en ${intent.countryCode}.
Contexto: categoría ${intent.category}, subcategoría ${intent.subcategory}, color ${intent.color}, marca ${intent.brand}.

Devolvé SOLO JSON con esta estructura:
{
  "products": [
    {
      "title": "string",
      "brand": "string",
      "price": number,
      "currency": "ARS|USD|EUR",
      "shop_name": "string",
      "shop_url": "https://...",
      "image_url": "https://... opcional",
      "country_code": "${intent.countryCode}"
    }
  ],
  "search_strategy": "string corto"
}

Reglas:
- Máximo 10 productos.
- Priorizá tiendas reales y links directos.
- No inventes URLs.
- Si no tenés precio, usar 0.
`;

  try {
    const generated: any = await withTimeout(
      modelWithSearch.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: imagePayload.base64Data, mimeType: imagePayload.mimeType } } as any,
            { text: prompt },
          ],
        }],
      }),
      14_000,
    );

    const parsed = safeParseJson(generated?.response?.text?.() || '');
    const products = Array.isArray(parsed?.products) ? parsed.products : [];
    const normalizedProducts: RawCandidate[] = products.map((product: any) => ({
      title: product?.title,
      brand: product?.brand,
      price: product?.price,
      currency: product?.currency,
      shop_name: product?.shop_name,
      shop_url: product?.shop_url,
      image_url: product?.image_url,
      source: 'gemini_grounded',
      country_code: product?.country_code || intent.countryCode,
    }));

    const grounding = extractGroundingCandidates(generated, intent);
    return {
      candidates: [...normalizedProducts, ...grounding],
      strategy: typeof parsed?.search_strategy === 'string' && parsed.search_strategy.trim()
        ? parsed.search_strategy.trim()
        : 'Búsqueda web guiada por IA y grounding.',
    };
  } catch {
    return {
      candidates: [],
      strategy: 'Búsqueda web guiada por IA (sin resultados estructurados).',
    };
  }
}

function buildManualFallbackCandidates(intent: DupeIntent): RawCandidate[] {
  const encodedQuery = encodeURIComponent(intent.query);
  const mlBase = ML_LISTING_BASE_BY_COUNTRY[intent.countryCode] || ML_LISTING_BASE_BY_COUNTRY.AR;
  const amazonBase = AMAZON_BASE_BY_COUNTRY[intent.countryCode] || AMAZON_BASE_BY_COUNTRY.AR;
  const googleBase = GOOGLE_BASE_BY_COUNTRY[intent.countryCode] || GOOGLE_BASE_BY_COUNTRY.AR;
  const mlTerm = intent.query.replace(/\s+/g, '-');

  return [
    {
      title: `${intent.subcategory} similar en Mercado Libre`,
      brand: 'Mercado Libre',
      price: 0,
      currency: 'ARS',
      shop_name: 'Mercado Libre',
      shop_url: `${mlBase}/${encodeURIComponent(mlTerm)}`,
      source: 'manual_fallback',
      country_code: intent.countryCode,
    },
    {
      title: `${intent.subcategory} alternatives en Amazon`,
      brand: 'Amazon',
      price: 0,
      currency: 'USD',
      shop_name: 'Amazon',
      shop_url: `${amazonBase}/s?k=${encodedQuery}`,
      source: 'manual_fallback',
      country_code: intent.countryCode,
    },
    {
      title: `${intent.subcategory} shopping en Google`,
      brand: 'Google Shopping',
      price: 0,
      currency: 'USD',
      shop_name: 'Google Shopping',
      shop_url: `${googleBase}/search?tbm=shop&q=${encodedQuery}`,
      source: 'manual_fallback',
      country_code: intent.countryCode,
    },
  ];
}

function resolveIntent(input: BuildDupeResultInput): DupeIntent {
  const metadata = input.item?.metadata || {};
  const countryCode = resolveCountryCode(input.countryCode, input.locale);
  const category = typeof metadata?.category === 'string' ? metadata.category : 'unknown';
  const subcategory = typeof metadata?.subcategory === 'string' ? metadata.subcategory : 'prenda';
  const color = typeof metadata?.color_primary === 'string' ? metadata.color_primary : 'neutro';
  const brand = typeof input.brandInfo?.brand?.name === 'string' && input.brandInfo.brand.name.trim()
    ? input.brandInfo.brand.name.trim()
    : 'sin marca visible';
  const originalPrice = safeNumber(input.brandInfo?.price_estimate?.average_price);
  const originalCurrency = typeof input.brandInfo?.price_estimate?.currency === 'string'
    ? input.brandInfo.price_estimate.currency.toUpperCase()
    : 'USD';
  const originalPriceUsd = originalPrice > 0 ? input.toApproxUsd(originalPrice, originalCurrency) : 0;
  const locale = String(input.locale || '').trim() || 'es-AR';

  const query = [color, subcategory, brand !== 'sin marca visible' ? `similar a ${brand}` : '', 'mujer']
    .filter(Boolean)
    .join(' ');

  return {
    itemId: typeof input.item?.id === 'string' ? input.item.id : `tmp-${Date.now()}`,
    category,
    subcategory,
    color,
    brand,
    countryCode,
    locale,
    query,
    originalPriceUsd,
  };
}

function computeSavingsSummary(intent: DupeIntent, dupes: any[], toApproxUsd: (price: number, currency: string) => number) {
  const pricesUsd = dupes
    .map((dupe) => toApproxUsd(safeNumber(dupe?.price), String(dupe?.currency || 'USD')))
    .filter((price: number) => price > 0);

  const cheapestDupe = pricesUsd.length > 0 ? Math.min(...pricesUsd) : 0;
  const averageDupe = pricesUsd.length > 0
    ? pricesUsd.reduce((acc: number, value: number) => acc + value, 0) / pricesUsd.length
    : 0;
  const normalizedOriginal = intent.originalPriceUsd > 0 ? intent.originalPriceUsd : (averageDupe > 0 ? averageDupe * 2.2 : 50);

  return {
    original_price: Math.round(normalizedOriginal * 100) / 100,
    cheapest_dupe_price: Math.round(cheapestDupe * 100) / 100,
    max_savings: Math.round((normalizedOriginal - cheapestDupe) * 100) / 100,
    average_dupe_price: Math.round(averageDupe * 100) / 100,
    average_savings: Math.round((normalizedOriginal - averageDupe) * 100) / 100,
    currency: 'USD',
  };
}

export async function buildDupeFinderResultV2(input: BuildDupeResultInput): Promise<any> {
  const intent = resolveIntent(input);
  const enableLinkVerification = input.enableLinkVerification !== false;

  const [mlCandidates, geminiResult] = await Promise.all([
    fetchMercadoLibreCandidates(intent),
    fetchGeminiCandidates(intent, input.imagePayload, input.modelWithSearch),
  ]);

  const rawCandidates = [
    ...mlCandidates,
    ...geminiResult.candidates,
    ...buildManualFallbackCandidates(intent),
  ];

  const normalized = rawCandidates
    .map((candidate) => normalizeRawCandidate(candidate, intent, input.toApproxUsd))
    .filter((candidate): candidate is NormalizedCandidate => Boolean(candidate));

  const dedupMap = new Map<string, NormalizedCandidate>();
  for (const candidate of normalized) {
    const key = dedupeKey(candidate);
    const existing = dedupMap.get(key);
    if (!existing || candidate.rank_score > existing.rank_score) {
      dedupMap.set(key, candidate);
    }
  }

  let deduped = Array.from(dedupMap.values());

  if (enableLinkVerification) {
    deduped = await runWithConcurrency(deduped.slice(0, 16), 5, async (candidate) => ({
      ...candidate,
      link_verified: await verifyUrl(candidate.shop_url),
    }));
  }

  deduped = deduped
    .map((candidate) => {
      const verificationWeight = candidate.link_verified === true ? 1 : candidate.link_verified === false ? 0.3 : 0.75;
      return {
        ...candidate,
        rank_score: Math.round(candidate.rank_score * 0.88 + verificationWeight * 12),
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);

  const preferred = deduped.filter((candidate) => candidate.price > 0).slice(0, MAX_DUPES);
  const combined = preferred.length >= 3
    ? preferred
    : [...preferred, ...deduped.filter((candidate) => !preferred.includes(candidate)).slice(0, MAX_DUPES - preferred.length)];

  const dupes = combined.map((candidate) => {
    const candidateUsd = input.toApproxUsd(candidate.price, candidate.currency);
    const originalInCandidateCurrency = toCurrencyFromUsd(
      intent.originalPriceUsd > 0 ? intent.originalPriceUsd : 50,
      candidate.currency,
    );
    const savingsAmount = Math.max(0, originalInCandidateCurrency - candidate.price);
    const savingsPercentage = originalInCandidateCurrency > 0
      ? clamp((savingsAmount / originalInCandidateCurrency) * 100, 0, 95)
      : 0;

    return {
      title: candidate.title,
      brand: candidate.brand,
      price: Math.round(candidate.price * 100) / 100,
      currency: candidate.currency,
      shop_name: candidate.shop_name,
      shop_url: candidate.shop_url,
      image_url: candidate.image_url,
      similarity_score: Math.round(clamp(candidate.similarity_score, 1, 99)),
      key_differences: buildKeyDifferences(intent, candidate),
      savings_amount: Math.round(savingsAmount * 100) / 100,
      savings_percentage: Math.round(savingsPercentage * 10) / 10,
      estimated_quality: estimateQuality(candidateUsd),
      source: candidate.source,
      link_verified: candidate.link_verified,
      country_code: candidate.country_code,
    };
  });

  if (dupes.length === 0) {
    return {
      original_item: {
        id: intent.itemId,
        brand: intent.brand !== 'sin marca visible' ? intent.brand : undefined,
        estimated_price: intent.originalPriceUsd > 0 ? intent.originalPriceUsd : undefined,
        category: intent.category,
        subcategory: intent.subcategory,
      },
      dupes: [],
      visual_comparison: {
        similarities: ['No encontramos resultados confiables para esta búsqueda.'],
        differences: ['Puede ayudar probar con otra foto o una prenda más específica.'],
        overall_match: 0,
      },
      savings: computeSavingsSummary(intent, [], input.toApproxUsd),
      search_strategy: `${geminiResult.strategy} Fallback manual habilitado para ${intent.countryCode}.`,
      confidence_level: 'low',
      analyzed_at: new Date().toISOString(),
    };
  }

  const overallMatch = Math.round(
    dupes.reduce((acc: number, dupe: any) => acc + safeNumber(dupe.similarity_score), 0) / dupes.length,
  );
  const verifiedCount = dupes.filter((dupe: any) => dupe.link_verified === true).length;
  const avgSimilarity = overallMatch;

  let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
  if (dupes.length >= 4 && avgSimilarity >= 72 && verifiedCount >= 2) {
    confidenceLevel = 'high';
  } else if (dupes.length >= 2 && avgSimilarity >= 58) {
    confidenceLevel = 'medium';
  }

  const sourceMix = Array.from(new Set(dupes.map((dupe: any) => dupe.source).filter(Boolean))).join(', ');

  return {
    original_item: {
      id: intent.itemId,
      brand: intent.brand !== 'sin marca visible' ? intent.brand : undefined,
      estimated_price: intent.originalPriceUsd > 0 ? intent.originalPriceUsd : undefined,
      category: intent.category,
      subcategory: intent.subcategory,
    },
    dupes,
    visual_comparison: {
      similarities: [
        `Se priorizaron resultados de ${intent.subcategory} con estilo equivalente.`,
        `Color objetivo considerado: ${intent.color}.`,
        `Coincidencia promedio de similitud: ${overallMatch}%.`,
      ],
      differences: [
        'Puede variar la calidad percibida entre tiendas y marcas.',
        enableLinkVerification
          ? 'Los links marcados como verificados pasaron chequeo técnico.'
          : 'Verificación de links desactivada por configuración.',
        'Revisá talle/material en tienda antes de comprar.',
      ],
      overall_match: overallMatch,
    },
    savings: computeSavingsSummary(intent, dupes, input.toApproxUsd),
    search_strategy: `Pipeline híbrido (${sourceMix || 'sin fuentes'}) con foco en ${intent.countryCode}. ${geminiResult.strategy}`,
    confidence_level: confidenceLevel,
    analyzed_at: new Date().toISOString(),
  };
}
