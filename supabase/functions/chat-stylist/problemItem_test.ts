import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildCategoryMap } from './guards.ts';
import {
  sanitizeProblemItemSuggestions,
  shouldUseProblemItemGuidance,
} from './problemItem.ts';

Deno.test('shouldUseProblemItemGuidance activates on first turn with selected item', () => {
  const result = shouldUseProblemItemGuidance({
    message: 'hola',
    selectedItem: { id: 'item-1', subcategory: 'blazer' },
    chatHistoryLength: 0,
  });

  assertEquals(result, true);
});

Deno.test('shouldUseProblemItemGuidance activates on explicit follow-up prompt', () => {
  const result = shouldUseProblemItemGuidance({
    message: 'Ayudame a combinar esta prenda',
    selectedItem: { id: 'item-1', subcategory: 'blazer' },
    chatHistoryLength: 4,
  });

  assertEquals(result, true);
});

Deno.test('sanitizeProblemItemSuggestions keeps only paths that include the selected item', () => {
  const categoryById = buildCategoryMap([
    { id: 'top-1', metadata: { category: 'top' } },
    { id: 'bottom-1', metadata: { category: 'bottom' } },
    { id: 'shoes-1', metadata: { category: 'shoes' } },
    { id: 'top-2', metadata: { category: 'top' } },
  ]);

  const suggestions = sanitizeProblemItemSuggestions([
    {
      id: 'path-1',
      title: 'Base segura',
      summary: 'Con jean y zapatillas.',
      reason: 'La prenda protagonista ordena el look.',
      pathType: 'base_segura',
      outfitSuggestion: {
        top_id: 'top-1',
        bottom_id: 'bottom-1',
        shoes_id: 'shoes-1',
      },
    },
    {
      id: 'path-2',
      title: 'Inválido',
      summary: 'No usa la prenda seleccionada.',
      reason: 'No debería pasar.',
      pathType: 'mas_jugada',
      outfitSuggestion: {
        top_id: 'top-2',
        bottom_id: 'bottom-1',
        shoes_id: 'shoes-1',
      },
    },
  ], categoryById, 'top-1');

  assertEquals(suggestions.length, 1);
  assertEquals(suggestions[0].id, 'path-1');
});
