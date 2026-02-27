import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildGeneratedItemFromImage,
  buildGuidedWorkflowResponse,
  buildLookCostMessage,
  buildLookCreationPrompt,
  buildOutfitSuggestionWithGeneratedItem,
  getMissingLookFields,
  isAffirmative,
  isNegative,
  normalizeCollected,
  parseLookCreationCategory,
  parseLookCreationFields,
} from './workflow.ts';

Deno.test('parseLookCreationCategory identifies top/bottom/shoes', () => {
  assertEquals(parseLookCreationCategory('quiero un top elegante'), 'top');
  assertEquals(parseLookCreationCategory('necesito pantalon formal'), 'bottom');
  assertEquals(parseLookCreationCategory('generame zapatillas'), 'shoes');
  assertEquals(parseLookCreationCategory('algo lindo'), null);
});

Deno.test('parseLookCreationFields extracts style, occasion and category', () => {
  const parsed = parseLookCreationFields('quiero un look formal para oficina con top blanco');
  assertEquals(parsed.style, 'formal');
  assertEquals(parsed.occasion, 'oficina');
  assertEquals(parsed.category, 'top');
});

Deno.test('normalizeCollected keeps previous values and request text fallback', () => {
  const normalized = normalizeCollected(
    { occasion: 'cita' },
    { style: 'casual' },
    'quiero algo negro',
  );
  assertEquals(normalized.occasion, 'cita');
  assertEquals(normalized.style, 'casual');
  assertEquals(normalized.requestText, 'quiero algo negro');
});

Deno.test('workflow response reflects missing fields and confirmation state', () => {
  const response = buildGuidedWorkflowResponse({
    sessionId: 'session-1',
    status: 'confirming',
    collected: {
      occasion: 'oficina',
      style: 'formal',
      category: 'top',
    },
    confirmationToken: 'token-1',
    autosaveEnabled: true,
  });

  assertEquals(response.status, 'confirming');
  assertEquals(response.requiresConfirmation, true);
  assertEquals(response.missingFields.length, 0);
  assertEquals(response.confirmationToken, 'token-1');
  assertEquals(response.autosaveEnabled, true);
});

Deno.test('build look copy and prompt includes canonical credit wording', () => {
  const collected = { occasion: 'fiesta', style: 'elegante', category: 'top' as const };
  const costMessage = buildLookCostMessage(collected);
  const prompt = buildLookCreationPrompt(collected);
  assertStringIncludes(costMessage, 'cuesta 2 créditos');
  assertStringIncludes(prompt, 'Ocasión: fiesta');
});

Deno.test('affirmative and negative confirmations are detected', () => {
  assertEquals(isAffirmative('sí'), true);
  assertEquals(isAffirmative('confirmo'), true);
  assertEquals(isNegative('no'), true);
  assertEquals(isNegative('cancelar'), true);
});

Deno.test('buildOutfitSuggestionWithGeneratedItem returns null when categories are missing', () => {
  const generated = {
    id: 'generated-top',
    metadata: { category: 'top' },
  };
  const inventory = [{ id: 'bottom-1', metadata: { category: 'bottom' } }];
  const suggestion = buildOutfitSuggestionWithGeneratedItem(generated, inventory);
  assertEquals(suggestion, null);
});

Deno.test('buildOutfitSuggestionWithGeneratedItem creates valid suggestion with full inventory', () => {
  const generated = {
    id: 'generated-top',
    metadata: { category: 'top' },
  };
  const inventory = [
    generated,
    { id: 'bottom-1', metadata: { category: 'bottom' } },
    { id: 'shoes-1', metadata: { category: 'shoes' } },
  ];
  const suggestion = buildOutfitSuggestionWithGeneratedItem(generated, inventory);
  assertExists(suggestion);
  assertEquals(suggestion?.top_id, 'generated-top');
  assertEquals(suggestion?.bottom_id, 'bottom-1');
  assertEquals(suggestion?.shoes_id, 'shoes-1');
});

Deno.test('getMissingLookFields returns remaining required fields', () => {
  const missing = getMissingLookFields({ occasion: 'cita', style: 'casual' });
  assertEquals(missing, ['category']);
});

Deno.test('buildGeneratedItemFromImage enriches metadata from collected fields', () => {
  const generated = buildGeneratedItemFromImage({
    sessionId: 'session-color',
    imageUrl: 'https://cdn.example.com/item.jpg',
    prompt: 'Prompt',
    collected: {
      category: 'top',
      style: 'elegante',
      occasion: 'fiesta',
      requestText: 'quiero una prenda roja',
    },
  });

  assertEquals(generated.metadata.category, 'top');
  assertEquals(generated.metadata.color_primary, '#DC2626');
  assertEquals(generated.metadata.vibe_tags.includes('elegante'), true);
  assertEquals(generated.metadata.vibe_tags.includes('fiesta'), true);
});
