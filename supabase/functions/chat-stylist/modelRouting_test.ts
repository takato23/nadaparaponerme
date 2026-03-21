import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GEMINI_31_FLASH_LITE_MODEL, GEMINI_3_FLASH_MODEL } from '../_shared/geminiModels.ts';
import { resolveStylistModelPlan, shouldEscalateStylistModel } from './modelRouting.ts';

Deno.test('resolveStylistModelPlan keeps extraction on lite', () => {
  const plan = resolveStylistModelPlan({
    turnIntent: 'look_item_extraction',
    message: 'Guardame la ropa de este look',
    inventoryCount: 0,
    hasAttachments: true,
  });

  assertEquals(plan.primaryModel, GEMINI_31_FLASH_LITE_MODEL);
  assertEquals(plan.routingDecision, 'lite');
  assertEquals(plan.allowEscalation, false);
});

Deno.test('resolveStylistModelPlan keeps simple recreation on lite', () => {
  const plan = resolveStylistModelPlan({
    turnIntent: 'reference_recreation',
    message: 'Recreame este look con mi armario',
    inventoryCount: 12,
    hasAttachments: true,
  });

  assertEquals(plan.primaryModel, GEMINI_31_FLASH_LITE_MODEL);
  assertEquals(plan.routingDecision, 'lite');
});

Deno.test('resolveStylistModelPlan sends comparison/adaptation prompts to flash', () => {
  const comparisonPlan = resolveStylistModelPlan({
    turnIntent: 'look_improvement',
    message: 'Compará estos dos looks y adaptá el mejor a una cita manteniendo su esencia',
    inventoryCount: 15,
    hasAttachments: false,
  });

  assertEquals(comparisonPlan.primaryModel, GEMINI_3_FLASH_MODEL);
  assertEquals(comparisonPlan.routingDecision, 'flash');
});

Deno.test('resolveStylistModelPlan sends large inventory complex surfaces to flash', () => {
  const plan = resolveStylistModelPlan({
    turnIntent: 'wardrobe_outfit',
    message: 'Ayudame con un look para oficina',
    inventoryCount: 58,
    hasAttachments: true,
  });

  assertEquals(plan.primaryModel, GEMINI_3_FLASH_MODEL);
  assertEquals(plan.routingDecision, 'flash');
});

Deno.test('shouldEscalateStylistModel escalates lite when confidence is low', () => {
  const result = shouldEscalateStylistModel({
    currentPlan: {
      primaryModel: GEMINI_31_FLASH_LITE_MODEL,
      routingDecision: 'lite',
      routingReason: 'default_lite',
      allowEscalation: true,
    },
    turnIntent: 'wardrobe_outfit',
    inventoryCount: 10,
    confidence: 0.51,
    hasCompleteOutfitSuggestion: true,
  });

  assertEquals(result.escalate, true);
  assertEquals(result.reason, 'low_confidence');
});

Deno.test('shouldEscalateStylistModel escalates lite when outfit is incomplete', () => {
  const result = shouldEscalateStylistModel({
    currentPlan: {
      primaryModel: GEMINI_31_FLASH_LITE_MODEL,
      routingDecision: 'lite',
      routingReason: 'default_lite',
      allowEscalation: true,
    },
    turnIntent: 'reference_recreation',
    inventoryCount: 24,
    confidence: 0.8,
    hasCompleteOutfitSuggestion: false,
  });

  assertEquals(result.escalate, true);
  assertEquals(result.reason, 'missing_complete_outfit');
});
