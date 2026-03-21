import { describe, expect, it } from 'vitest';
import {
  buildLookGarmentMetadata,
  normalizeDetectedLookGarmentResult,
  normalizeLookGarmentCrop,
} from '../src/utils/lookGarmentSeparation';

describe('lookGarmentSeparation utilities', () => {
  it('clamps and validates normalized garment crops', () => {
    expect(normalizeLookGarmentCrop({
      x: -0.2,
      y: 0.1,
      width: 1.4,
      height: 0.4,
    })).toEqual({
      x: 0,
      y: 0.1,
      width: 1,
      height: 0.4,
    });

    expect(normalizeLookGarmentCrop({
      x: 0.2,
      y: 0.1,
      width: 0.02,
      height: 0.4,
    })).toBeNull();
  });

  it('drops invalid candidates and keeps warnings', () => {
    const normalized = normalizeDetectedLookGarmentResult({
      items: [
        {
          id: 'ok-1',
          label: 'Tapado',
          category: 'outerwear',
          subcategory: 'tapado',
          color_primary: 'camel',
          confidence: 0.82,
          crop: { x: 0.1, y: 0.12, width: 0.36, height: 0.5 },
        },
        {
          id: 'bad-1',
          label: 'No usable',
          category: 'top',
          subcategory: 'remera',
          color_primary: 'negro',
          confidence: 0.9,
          crop: { x: 0.2, y: 0.2, width: 0.01, height: 0.2 },
        },
      ],
      warnings: ['La prenda de abajo está medio tapada.'],
      summary: 'Separé las prendas más claras del look.',
    });

    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].id).toBe('ok-1');
    expect(normalized.warnings).toEqual(['La prenda de abajo está medio tapada.']);
    expect(normalized.summary).toBe('Separé las prendas más claras del look.');
  });

  it('keeps pixel-based crops so the UI can normalize them with real image dimensions later', () => {
    const normalized = normalizeDetectedLookGarmentResult({
      items: [
        {
          id: 'px-1',
          label: 'Campera',
          category: 'outerwear',
          subcategory: 'campera',
          color_primary: 'celeste',
          confidence: 0.95,
          crop: { x: 230, y: 225, width: 540, height: 330 },
        },
      ],
      warnings: [],
      summary: 'Crop en pixeles.',
    });

    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].crop).toEqual({
      x: 230,
      y: 225,
      width: 540,
      height: 330,
    });
  });

  it('builds editable metadata from a detected garment candidate', () => {
    expect(buildLookGarmentMetadata({
      id: 'garment-1',
      label: 'Jean recto',
      category: 'bottom',
      subcategory: 'jean recto',
      color_primary: 'azul',
      confidence: 0.76,
      crop: { x: 0.2, y: 0.3, width: 0.4, height: 0.5 },
      visibility_note: 'La botamanga no se ve completa.',
    })).toEqual({
      category: 'bottom',
      subcategory: 'jean recto',
      color_primary: 'azul',
      vibe_tags: [],
      seasons: [],
      description: 'La botamanga no se ve completa.',
    });
  });
});
