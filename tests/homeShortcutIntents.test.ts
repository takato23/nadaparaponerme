import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClothingItem, FitResult, SavedOutfit } from '../types';
import { buildHomeShortcutPlan } from '../src/services/homeShortcutIntents';

vi.mock('../src/services/googleCalendarService', () => ({
  getConnection: vi.fn(() => ({ is_connected: false })),
  fetchUpcomingEvents: vi.fn(async () => []),
}));

const makeItem = (id: string, category: 'top' | 'bottom' | 'shoes', description: string): ClothingItem => ({
  id,
  imageDataUrl: `data:image/png;base64,${id}`,
  metadata: {
    category,
    subcategory: category,
    color_primary: category === 'top' ? 'negro' : category === 'bottom' ? 'azul' : 'blanco',
    description,
    vibe_tags: ['casual'],
    seasons: ['all'],
  },
});

const closet = [
  makeItem('top-1', 'top', 'remera negra'),
  makeItem('top-2', 'top', 'camisa blanca'),
  makeItem('bottom-1', 'bottom', 'jean recto'),
  makeItem('bottom-2', 'bottom', 'pantalón sastrero'),
  makeItem('shoes-1', 'shoes', 'zapatillas blancas'),
  makeItem('shoes-2', 'shoes', 'mocasines negros'),
];

const savedOutfits: SavedOutfit[] = [
  {
    id: 'saved-1',
    top_id: 'top-1',
    bottom_id: 'bottom-1',
    shoes_id: 'shoes-1',
    explanation: 'Look casual de referencia',
    name: 'Casual salvador',
  },
];

describe('homeShortcutIntents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    });
    localStorage.setItem('ojodeloca-weather-cache', JSON.stringify({
      data: { temp: 24, description: 'Soleado', city: 'Buenos Aires' },
      timestamp: Date.now(),
    }));
  });

  it('arma quick look con prompt directo y clima cacheado', async () => {
    const plan = await buildHomeShortcutPlan('quick-look', {
      closet,
      savedOutfits,
    });

    expect(plan.promptPayload.occasion).toContain('resolver qué me pongo hoy');
    expect(plan.promptPayload.style).toContain('rápido');
    expect(plan.promptPayload.weather).toContain('24°C');
  });

  it('arma vestime para hoy con contexto de hora, clima y looks recientes', async () => {
    const plan = await buildHomeShortcutPlan('dress-me-today', {
      closet,
      savedOutfits,
    });

    expect(plan.promptPayload.occasion).toContain('vestirme para hoy');
    expect(plan.promptPayload.style).toContain('Clima actual');
    expect(plan.promptPayload.style).toContain('No repetir exactamente estos looks recientes');
    expect(plan.promptPayload.excludeIds).toEqual(['top-1', 'bottom-1', 'shoes-1']);
  });

  it('arma plan b excluyendo el look base actual', async () => {
    const activeFitResult: FitResult = {
      top_id: 'top-2',
      bottom_id: 'bottom-2',
      shoes_id: 'shoes-2',
      explanation: 'Look actual base',
    };

    const plan = await buildHomeShortcutPlan('plan-b', {
      closet,
      savedOutfits,
      activeFitResult,
    });

    expect(plan.fallbackToQuickLook).toBeFalsy();
    expect(plan.promptPayload.occasion).toContain('plan B');
    expect(plan.promptPayload.excludeIds).toEqual(['top-2', 'bottom-2', 'shoes-2']);
  });

  it('plan b cae a quick look si no existe look base', async () => {
    const plan = await buildHomeShortcutPlan('plan-b', {
      closet,
      savedOutfits: [],
      activeFitResult: null,
    });

    expect(plan.fallbackToQuickLook).toBe(true);
    expect(plan.promptPayload.style).toContain('rápido');
  });

  it('con esto sí o sí filtra el closet para forzar la prenda elegida', async () => {
    const selectedItem = closet[0];

    const plan = await buildHomeShortcutPlan('build-around-item', {
      closet,
      savedOutfits,
      selectedItem,
    });

    expect(plan.selectedItem?.id).toBe('top-1');
    expect(plan.promptPayload.closet.filter((item) => item.metadata.category === 'top')).toHaveLength(1);
    expect(plan.promptPayload.closet[0].id).toBe('top-1');
    expect(plan.promptPayload.style).toContain('remera negra');
  });
});
