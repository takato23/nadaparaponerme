import { describe, expect, it } from 'vitest';
import { colorEquals, normalizeColorValue, resolveColorSwatch } from '../src/utils/colorUtils';

describe('colorUtils', () => {
  it('normalizes color tokens in spanish and english', () => {
    expect(normalizeColorValue('  Azul Marino  ')).toBe('navy');
    expect(normalizeColorValue('GRIS')).toBe('gray');
    expect(normalizeColorValue('#ABC')).toBe('#aabbcc');
  });

  it('compares colors after normalization', () => {
    expect(colorEquals('Azul', 'blue')).toBe(true);
    expect(colorEquals('Gris', 'grey')).toBe(true);
    expect(colorEquals('beige', 'rojo')).toBe(false);
  });

  it('returns stable swatches for known and unknown names', () => {
    const known = resolveColorSwatch('Azul marino');
    expect(known.cssColor).toBe('#1e3a8a');

    const unknown = resolveColorSwatch('tono personalizado ultra');
    expect(unknown.cssColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(unknown.key).toBe('tono personalizado ultra');
  });
});
