import type { ActiveWardrobeRecommendation, ClothingItem, FitResult, SavedOutfit } from '../../types';
import { buildStylistContext } from './stylistContextService';
import { fetchUpcomingEvents, getConnection } from './googleCalendarService';

import type { HomeShortcutIntent } from './homeShortcutPersistence';

export interface HomeShortcutConfig {
  intent: Exclude<HomeShortcutIntent, 'weather-look'>;
  title: string;
  idleTitle: string;
  idleBody: string;
  generatingTitle: string;
  completedBadge: string;
  cta: string;
}

export interface HomeShortcutGenerationPlan {
  promptPayload: {
    closet: ClothingItem[];
    occasion?: string;
    style?: string;
    weather?: string;
    excludeIds?: string[];
  };
  selectedItem?: ClothingItem | null;
  fallbackToQuickLook?: boolean;
}

export interface HomeShortcutContext {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  activeFitResult?: FitResult | null;
  activeRecommendation?: ActiveWardrobeRecommendation | null;
  selectedItem?: ClothingItem | null;
}

const SUPPORTED_BUILD_AROUND_CATEGORIES = new Set(['top', 'bottom', 'shoes']);

const TIME_OF_DAY_LABELS = {
  morning: 'mañana',
  afternoon: 'tarde',
  night: 'noche',
} as const;

function getTimeOfDay(now = new Date()): keyof typeof TIME_OF_DAY_LABELS {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'night';
}

function describeItem(item: ClothingItem): string {
  const description = item.metadata.description?.trim();
  const color = item.metadata.color_primary?.trim();
  const category = item.metadata.category?.trim() || 'prenda';
  const vibe = item.metadata.vibe_tags?.slice(0, 2).join(', ');

  return [description, color, category, vibe].filter(Boolean).join(' · ');
}

function getRecentLookSummary(savedOutfits: SavedOutfit[]): string[] {
  return savedOutfits.slice(0, 3).map((look) => {
    const pieces = [look.top_id, look.bottom_id, look.shoes_id].filter(Boolean).join(' + ');
    return look.name || look.occasion || pieces;
  });
}

function getBaseLook(activeFitResult: FitResult | null | undefined, savedOutfits: SavedOutfit[]): FitResult | null {
  if (activeFitResult) return activeFitResult;

  const recent = savedOutfits[0];
  if (!recent) return null;

  return {
    top_id: recent.top_id,
    bottom_id: recent.bottom_id,
    shoes_id: recent.shoes_id,
    explanation: recent.explanation,
  };
}

async function getUpcomingEventSummary(): Promise<string | null> {
  try {
    const connection = getConnection();
    if (!connection.is_connected) return null;

    const events = await fetchUpcomingEvents();
    const nextEvent = events[0];
    if (!nextEvent) return null;

    return nextEvent.summary || 'evento próximo';
  } catch {
    return null;
  }
}

export const HOME_SHORTCUT_CONFIG: Record<Exclude<HomeShortcutIntent, 'weather-look'>, HomeShortcutConfig> = {
  'quick-look': {
    intent: 'quick-look',
    title: '1 look rápido',
    idleTitle: 'Resolvelo en un toque.',
    idleBody: 'Te armamos algo fácil de usar, con criterio y sin vueltas.',
    generatingTitle: 'Generando tu look rápido...',
    completedBadge: 'Listo para hoy',
    cta: 'Generar look rápido',
  },
  'dress-me-today': {
    intent: 'dress-me-today',
    title: 'Vestime para hoy',
    idleTitle: 'Tomamos contexto y resolvemos.',
    idleBody: 'Usamos clima, hora, eventos y lo último que venís usando para no repetir al pedo.',
    generatingTitle: 'Leyendo tu día y armando el look...',
    completedBadge: 'Hoy ya está resuelto',
    cta: 'Vestime para hoy',
  },
  'plan-b': {
    intent: 'plan-b',
    title: 'Plan B',
    idleTitle: 'Una alternativa real, no un clon.',
    idleBody: 'Si hay look base, hacemos una variante distinta. Si no, caemos a un look rápido.',
    generatingTitle: 'Buscando una segunda opción...',
    completedBadge: 'Plan B listo',
    cta: 'Dame un plan B',
  },
  'build-around-item': {
    intent: 'build-around-item',
    title: 'Con esto sí o sí',
    idleTitle: 'Elegí una prenda y la hacemos funcionar.',
    idleBody: 'Seleccionás una pieza y armamos el resto alrededor sin mandarte a otro flujo.',
    generatingTitle: 'Armando el look alrededor de esa prenda...',
    completedBadge: 'Esa prenda ya quedó resuelta',
    cta: 'Usar esta prenda',
  },
};

export async function buildHomeShortcutPlan(
  intent: Exclude<HomeShortcutIntent, 'weather-look'>,
  context: HomeShortcutContext,
): Promise<HomeShortcutGenerationPlan> {
  const stylistContext = buildStylistContext({
    activeRecommendation: context.activeRecommendation,
    savedOutfits: context.savedOutfits,
  });
  const weatherContext = stylistContext.weatherContext;
  const recentLooks = getRecentLookSummary(context.savedOutfits);
  const timeOfDay = TIME_OF_DAY_LABELS[getTimeOfDay()];

  if (intent === 'quick-look') {
    return {
      promptPayload: {
        closet: context.closet,
        occasion: 'resolver qué me pongo hoy en un toque',
        style: 'rápido, canchero, fácil de usar y sin vueltas',
        weather: weatherContext || undefined,
      },
    };
  }

  if (intent === 'dress-me-today') {
    const upcomingEvent = await getUpcomingEventSummary();
    const contextLine = [
      `Momento del día: ${timeOfDay}`,
      weatherContext ? `Clima actual: ${weatherContext}` : null,
      upcomingEvent ? `Evento próximo: ${upcomingEvent}` : null,
      recentLooks.length > 0 ? `No repetir exactamente estos looks recientes: ${recentLooks.join(', ')}` : null,
      context.activeRecommendation?.reason ? `Recomendación activa: ${context.activeRecommendation.reason}` : null,
    ].filter(Boolean).join('. ');

    return {
      promptPayload: {
        closet: context.closet,
        occasion: 'vestirme para hoy con el contexto real del día',
        style: `usable, canchero, coherente con el día y sin repetir lo obvio. ${contextLine}`,
        weather: weatherContext || undefined,
        excludeIds: getBaseLook(context.activeFitResult, context.savedOutfits)
          ? [
            getBaseLook(context.activeFitResult, context.savedOutfits)!.top_id,
            getBaseLook(context.activeFitResult, context.savedOutfits)!.bottom_id,
            getBaseLook(context.activeFitResult, context.savedOutfits)!.shoes_id,
          ]
          : undefined,
      },
    };
  }

  if (intent === 'plan-b') {
    const baseLook = getBaseLook(context.activeFitResult, context.savedOutfits);
    if (!baseLook) {
      return {
        promptPayload: {
          closet: context.closet,
          occasion: 'resolver qué me pongo hoy en un toque',
          style: 'rápido, canchero y distinto a lo obvio',
          weather: weatherContext || undefined,
        },
        fallbackToQuickLook: true,
      };
    }

    return {
      promptPayload: {
        closet: context.closet,
        occasion: `armar un plan B usando otra combinación que funcione distinto al look base ${baseLook.top_id} + ${baseLook.bottom_id} + ${baseLook.shoes_id}`,
        style: `alternativa real: puede ser más arreglada, más relajada o con otra energía, pero sin repetir el mismo combo. ${baseLook.explanation}`,
        weather: weatherContext || undefined,
        excludeIds: [baseLook.top_id, baseLook.bottom_id, baseLook.shoes_id],
      },
    };
  }

  const selectedItem = context.selectedItem;
  if (!selectedItem) {
    throw new Error('Necesito una prenda para construir el look alrededor.');
  }

  if (!SUPPORTED_BUILD_AROUND_CATEGORIES.has(selectedItem.metadata.category)) {
    throw new Error('Elegí un top, un bottom o un par de zapatos para este atajo.');
  }

  const filteredCloset = context.closet.filter((item) => {
    if (item.metadata.category !== selectedItem.metadata.category) return true;
    return item.id === selectedItem.id;
  });

  return {
    selectedItem,
    promptPayload: {
      closet: filteredCloset,
      occasion: `armar un outfit alrededor de esta prenda obligatoria: ${selectedItem.id}`,
      style: `la prenda clave es ${describeItem(selectedItem)}. Tiene que usarse sí o sí y el resto debe acompañarla sin competir.`,
      weather: weatherContext || undefined,
    },
  };
}
