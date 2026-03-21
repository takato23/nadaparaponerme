import { describe, expect, it } from 'vitest';
import {
  buildGarmentEditPrompt,
  buildLookCostMessage,
  buildLookCreationPrompt,
  classifyStylistIntent,
  detectGarmentEditIntent,
  detectItemRecommendationIntent,
  detectLookCreationIntent,
  detectWardrobeOutfitIntent,
  getMissingLookFields,
  isAmbiguousAICreationRequest,
  isAffirmative,
  isNegative,
  mapLookCategoryToTryOnSlot,
  parseAppNavigationIntent,
  parseAmbiguousLookRequestResolution,
  parseLookCreationCategory,
  parseLookCreationFields,
  parseReferencedItemIntent,
  wantsAutoCategorySelection,
} from '../src/services/lookCreationFlow';

describe('lookCreationFlow', () => {
  it('detecta intención de crear look nuevo con IA', () => {
    expect(detectLookCreationIntent('creame un look nuevo')).toBe(true);
    expect(detectLookCreationIntent('quiero una prenda con IA para una cita')).toBe(true);
    expect(detectLookCreationIntent('quiero hacer una remera nueva')).toBe(true);
    expect(detectLookCreationIntent('armame un outfit con mi armario')).toBe(false);
    expect(detectLookCreationIntent('quiero combinar mi remera azul con un jean')).toBe(false);
  });

  it('detecta intención de editar una prenda existente', () => {
    expect(detectGarmentEditIntent('cambiarle el color a esta prenda')).toBe(true);
    expect(detectGarmentEditIntent('agregarle una estampa floral')).toBe(true);
    expect(detectGarmentEditIntent('armame un outfit con mi armario')).toBe(false);
  });

  it('detecta intención explícita de recomendación de prenda', () => {
    expect(detectItemRecommendationIntent('recomendame una prenda para hoy')).toBe(true);
    expect(detectItemRecommendationIntent('que me recomendas de mi armario para una cita')).toBe(true);
    expect(detectItemRecommendationIntent('reocmeinda una prenda para mi closet')).toBe(true);
    expect(detectItemRecommendationIntent('aconsejame ropa de mi armario')).toBe(true);
    expect(detectItemRecommendationIntent('que remera me pongo mostrame')).toBe(true);
    expect(detectItemRecommendationIntent('armame un outfit con mi armario')).toBe(false);
    expect(detectItemRecommendationIntent('recomendame una peli para hoy')).toBe(false);
  });

  it('detecta outfit con armario y pedidos ambiguos por separado', () => {
    expect(detectWardrobeOutfitIntent('armame un outfit para una fiesta con mi armario')).toBe(true);
    expect(isAmbiguousAICreationRequest('quiero crear un look nuevo con IA')).toBe(true);
    expect(isAmbiguousAICreationRequest('generame una remera formal')).toBe(false);
    expect(classifyStylistIntent('armame un outfit para oficina con mi armario')).toBe('outfit_from_wardrobe');
    expect(classifyStylistIntent('quiero crear un look nuevo con IA')).toBe('generate_new_garment');
  });

  it('parsea resolución de pedido ambiguo y delegación', () => {
    expect(parseAmbiguousLookRequestResolution('outfit con mi armario')).toBe('wardrobe_outfit');
    expect(parseAmbiguousLookRequestResolution('prenda nueva')).toBe('new_garment');
    expect(parseAmbiguousLookRequestResolution('elegí vos')).toBe('delegate');
    expect(wantsAutoCategorySelection('sorprendeme')).toBe(true);
  });

  it('parsea intents de navegación dentro de la app', () => {
    expect(parseAppNavigationIntent('mostrame mis looks')).toEqual({
      type: 'open_saved_looks',
      route: '/guardados',
    });
    expect(parseAppNavigationIntent('abrime la wishlist')).toEqual({
      type: 'open_wishlist',
      route: '/armario',
    });
    expect(parseAppNavigationIntent('mostrame tops negros')).toEqual({
      type: 'open_closet_filtered',
      route: '/armario',
      filters: {
        category: 'top',
        color: 'negro',
        occasion: undefined,
      },
    });
    expect(parseAppNavigationIntent('mostrame mis remeras')).toEqual({
      type: 'open_closet_filtered',
      route: '/armario',
      filters: {
        category: 'top',
        color: undefined,
        occasion: undefined,
      },
    });
    expect(parseAppNavigationIntent('mostrame mis zapatos')).toEqual({
      type: 'open_closet_filtered',
      route: '/armario',
      filters: {
        category: 'shoes',
        color: undefined,
        occasion: undefined,
      },
    });
    expect(parseAppNavigationIntent('mostrame una camisa mia')).toBeNull();
  });

  it('parsea intents de aclaración sobre prendas concretas', () => {
    expect(parseReferencedItemIntent('mostrame una camisa mia')).toEqual({
      kind: 'item_clarification',
      category: 'top',
    });
    expect(parseReferencedItemIntent('que camisa decis')).toEqual({
      kind: 'item_clarification',
      category: 'top',
    });
    expect(parseReferencedItemIntent('cual de mis tops')).toEqual({
      kind: 'item_clarification',
      category: 'top',
    });
    expect(parseReferencedItemIntent('mostrame eso en fotos')).toEqual({
      kind: 'item_clarification',
      category: undefined,
    });
  });

  it('parsea categoría desde texto libre', () => {
    expect(parseLookCreationCategory('Quiero un top elegante')).toBe('top');
    expect(parseLookCreationCategory('Necesito un pantalón de oficina')).toBe('bottom');
    expect(parseLookCreationCategory('Generá zapatillas urbanas')).toBe('shoes');
    expect(parseLookCreationCategory('Quiero algo lindo')).toBeNull();
  });

  it('extrae campos parciales cuando hay info', () => {
    const parsed = parseLookCreationFields('Quiero un look formal para oficina con top blanco');
    expect(parsed.style).toBe('formal');
    expect(parsed.occasion).toBe('oficina');
    expect(parsed.category).toBe('top');
  });

  it('no sobrescribe campos con undefined en parseos parciales', () => {
    expect(parseLookCreationFields('fiesta')).toEqual({ occasion: 'fiesta' });
    expect(parseLookCreationFields('casual')).toEqual({ style: 'casual' });
  });

  it('detecta campos faltantes para el flujo guiado', () => {
    const missing = getMissingLookFields({ occasion: 'cita', style: 'casual' });
    expect(missing).toEqual(['category']);
  });

  it('reconoce confirmación y cancelación', () => {
    expect(isAffirmative('sí')).toBe(true);
    expect(isAffirmative('confirmo')).toBe(true);
    expect(isNegative('no')).toBe(true);
    expect(isNegative('cancelar')).toBe(true);
  });

  it('arma mensaje de costo y prompt final', () => {
    const draft = {
      occasion: 'fiesta',
      style: 'elegante',
      category: 'top' as const,
      requestText: 'quiero algo negro',
    };

    const costMessage = buildLookCostMessage(draft);
    const prompt = buildLookCreationPrompt(draft);

    expect(costMessage).toContain('cuesta 2 usos premium');
    expect(prompt).toContain('Ocasión: fiesta');
    expect(prompt).toContain('Estilo: elegante');
    expect(prompt).toContain('Categoría: top');
  });

  it('mapea categoría de look a slot de try-on', () => {
    expect(mapLookCategoryToTryOnSlot('top')).toBe('top_base');
    expect(mapLookCategoryToTryOnSlot('bottom')).toBe('bottom');
    expect(mapLookCategoryToTryOnSlot('shoes')).toBe('shoes');
    expect(mapLookCategoryToTryOnSlot(undefined)).toBe('top_base');
  });

  it('arma prompt de edición de prenda', () => {
    const prompt = buildGarmentEditPrompt(
      {
        occasion: 'cita',
        style: 'elegante',
        category: 'top',
      },
      'Cambiar a color negro y sumar estampa minimalista',
      'Top rojo base con corte clásico',
    );

    expect(prompt).toContain('Base de la prenda original');
    expect(prompt).toContain('Cambios solicitados');
    expect(prompt).toContain('sin modelo');
  });
});
