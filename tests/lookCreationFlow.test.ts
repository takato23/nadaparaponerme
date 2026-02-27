import { describe, expect, it } from 'vitest';
import {
  buildGarmentEditPrompt,
  buildLookCostMessage,
  buildLookCreationPrompt,
  detectGarmentEditIntent,
  detectLookCreationIntent,
  getMissingLookFields,
  isAffirmative,
  isNegative,
  mapLookCategoryToTryOnSlot,
  parseLookCreationCategory,
  parseLookCreationFields,
} from '../src/services/lookCreationFlow';

describe('lookCreationFlow', () => {
  it('detecta intención de crear look nuevo con IA', () => {
    expect(detectLookCreationIntent('creame un look nuevo')).toBe(true);
    expect(detectLookCreationIntent('quiero una prenda con IA para una cita')).toBe(true);
    expect(detectLookCreationIntent('armame un outfit con mi armario')).toBe(false);
  });

  it('detecta intención de editar una prenda existente', () => {
    expect(detectGarmentEditIntent('cambiarle el color a esta prenda')).toBe(true);
    expect(detectGarmentEditIntent('agregarle una estampa floral')).toBe(true);
    expect(detectGarmentEditIntent('armame un outfit con mi armario')).toBe(false);
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

    expect(costMessage).toContain('cuesta 2 créditos');
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
