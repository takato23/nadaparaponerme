import type { ActiveWardrobeRecommendation, ProfessionalProfile, SavedLookContext, SavedOutfit } from '../../types';

const WEATHER_CACHE_KEY = 'ojodeloca-weather-cache';

export interface StylistContextSummary {
  profileContext?: ProfessionalProfile;
  weatherContext?: string;
  occasion?: string;
  recentLookIds: string[];
  savedLookContext: SavedLookContext[];
  activeRecommendationItemId?: string | null;
  summaryText: string;
}

function readCachedWeatherContext(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached) as {
      data?: { temp?: number; description?: string; city?: string };
      timestamp?: number;
    };

    if (!parsed?.data) return undefined;
    const { temp, description, city } = parsed.data;
    const fragments = [
      typeof temp === 'number' ? `${temp}°C` : null,
      description || null,
      city || null,
    ].filter(Boolean);

    return fragments.length > 0 ? fragments.join(' · ') : undefined;
  } catch {
    return undefined;
  }
}

export function buildStylistContext(params: {
  professionalProfile?: ProfessionalProfile | null;
  explicitOccasion?: string;
  activeRecommendation?: ActiveWardrobeRecommendation | null;
  savedOutfits?: SavedOutfit[];
}): StylistContextSummary {
  const weatherContext = readCachedWeatherContext();
  const recentLooks = (params.savedOutfits || []).slice(0, 3);
  const savedLookContext: SavedLookContext[] = recentLooks.map((look) => ({
    id: look.id,
    name: look.name,
    occasion: look.occasion,
    source: look.source,
    tags: look.tags || [],
    folder_id: look.folder_id || null,
    reference_summary: look.reference_summary || null,
    clothing_item_ids: [look.top_id, look.bottom_id, look.shoes_id].filter(Boolean),
  }));
  const summaryParts = [
    params.explicitOccasion ? `Ocasión: ${params.explicitOccasion}` : null,
    weatherContext ? `Clima: ${weatherContext}` : null,
    params.professionalProfile?.colorimetry?.color_season
      ? `Colorimetría: ${params.professionalProfile.colorimetry.color_season}`
      : null,
    params.activeRecommendation?.item_id
      ? `Recomendación activa: ${params.activeRecommendation.item_id}`
      : null,
  ].filter(Boolean);

  return {
    profileContext: params.professionalProfile || undefined,
    weatherContext,
    occasion: params.explicitOccasion,
    recentLookIds: recentLooks.map((look) => look.id),
    savedLookContext,
    activeRecommendationItemId: params.activeRecommendation?.item_id || null,
    summaryText: [...summaryParts, savedLookContext.length > 0 ? `Looks recientes: ${savedLookContext.map((look) => look.name || look.id).join(', ')}` : null]
      .filter(Boolean)
      .join(' | '),
  };
}
