import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildCategoryMap, trimClosetContext, validateOutfitSuggestion } from './guards.ts';

Deno.test('validateOutfitSuggestion accepts valid top/bottom/shoes IDs', () => {
  const inventory = [
    { id: 't1', metadata: { category: 'top', subcategory: 'remera' } },
    { id: 'b1', metadata: { category: 'bottom', subcategory: 'jeans' } },
    { id: 's1', metadata: { category: 'shoes', subcategory: 'zapatillas' } },
  ];
  const categoryById = buildCategoryMap(inventory);
  const result = validateOutfitSuggestion(
    {
      top_id: 't1',
      bottom_id: 'b1',
      shoes_id: 's1',
      explanation: 'Look balanceado',
      confidence: 0.9,
    },
    categoryById,
  );

  assertExists(result.suggestion);
  assertEquals(result.warnings.length, 0);
  assertEquals(result.suggestion?.top_id, 't1');
  assertEquals(result.suggestion?.bottom_id, 'b1');
  assertEquals(result.suggestion?.shoes_id, 's1');
});

Deno.test('validateOutfitSuggestion rejects duplicated IDs', () => {
  const inventory = [
    { id: 't1', metadata: { category: 'top' } },
    { id: 'b1', metadata: { category: 'bottom' } },
    { id: 's1', metadata: { category: 'shoes' } },
  ];
  const categoryById = buildCategoryMap(inventory);
  const result = validateOutfitSuggestion(
    {
      top_id: 't1',
      bottom_id: 't1',
      shoes_id: 's1',
      explanation: 'Duplicado',
    },
    categoryById,
  );

  assertEquals(result.suggestion, null);
  assertStringIncludes(result.warnings[0], 'IDs repetidos');
});

Deno.test('validateOutfitSuggestion rejects mismatched categories', () => {
  const inventory = [
    { id: 'x1', metadata: { category: 'bottom' } },
    { id: 'b1', metadata: { category: 'bottom' } },
    { id: 's1', metadata: { category: 'shoes' } },
  ];
  const categoryById = buildCategoryMap(inventory);
  const result = validateOutfitSuggestion(
    {
      top_id: 'x1',
      bottom_id: 'b1',
      shoes_id: 's1',
      explanation: 'Categoría cruzada',
    },
    categoryById,
  );

  assertEquals(result.suggestion, null);
  assertStringIncludes(result.warnings.join(' '), 'categoría top');
});

Deno.test('trimClosetContext keeps latest items and caps at MAX_CLOSET_ITEMS', () => {
  const now = Date.now();
  const items = Array.from({ length: 300 }).map((_, index) => ({
    id: `item-${index}`,
    metadata: { updated_at: new Date(now - index * 1000).toISOString() },
  }));

  const trimmed = trimClosetContext(items);
  assertEquals(trimmed.length, 250);
  assertEquals(trimmed[0].id, 'item-0');
  assertEquals(trimmed[249].id, 'item-249');
});
