import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  sanitizeReferencedItems,
  synthesizeReferencedItems,
} from './referencedItems.ts';

Deno.test('sanitizeReferencedItems drops invalid ids and dedupes entries', () => {
  const inventory = [
    { id: 'top-1', metadata: { category: 'top', subcategory: 'camisa', color_primary: 'azul grisacea' } },
    { id: 'shoes-1', metadata: { category: 'shoes', subcategory: 'zapatillas', color_primary: 'blanco' } },
  ];

  const sanitized = sanitizeReferencedItems([
    { item_id: 'missing', label: 'No existe', reason: 'invalida' },
    { item_id: 'top-1', label: 'Camisa azul grisacea', reason: 'Primera' },
    { item_id: 'top-1', label: 'Duplicada', reason: 'Segunda' },
    { item_id: 'shoes-1', label: 'Zapatillas blancas', reason: 'Complementan el look' },
  ], inventory);

  assertEquals(sanitized.length, 2);
  assertEquals(sanitized[0].item_id, 'top-1');
  assertEquals(sanitized[1].item_id, 'shoes-1');
});

Deno.test('sanitizeReferencedItems keeps labels and reasons free of ids', () => {
  const inventory = [
    { id: 'top-1', metadata: { category: 'top', subcategory: 'camisa', color_primary: 'azul' } },
  ];

  const sanitized = sanitizeReferencedItems([
    {
      item_id: 'top-1',
      label: 'Camisa azul (550e8400-e29b-41d4-a716-446655440000)',
      reason: 'Su ID es 550e8400-e29b-41d4-a716-446655440000',
    },
  ], inventory);

  assertEquals(sanitized.length, 1);
  assertEquals(sanitized[0].item_id, 'top-1');
  assertStringIncludes(sanitized[0].label, 'Camisa azul');
  assertEquals(/550e8400-e29b-41d4-a716-446655440000/.test(sanitized[0].label), false);
  assertEquals(/550e8400-e29b-41d4-a716-446655440000/.test(sanitized[0].reason), false);
});

Deno.test('synthesizeReferencedItems falls back to deterministic recommended item', () => {
  const inventory = [
    { id: 'top-1', metadata: { category: 'top', subcategory: 'camisa', color_primary: 'azul grisacea' } },
    { id: 'bottom-1', metadata: { category: 'bottom', subcategory: 'jean', color_primary: 'negro' } },
  ];

  const synthesized = synthesizeReferencedItems({
    current: [],
    inventory,
    recommendedItemId: 'top-1',
    recommendedReason: 'Va con la ocasión y estilo que pediste.',
  });

  assertEquals(synthesized.length, 1);
  assertEquals(synthesized[0].item_id, 'top-1');
  assertStringIncludes(synthesized[0].label, 'camisa');
});
