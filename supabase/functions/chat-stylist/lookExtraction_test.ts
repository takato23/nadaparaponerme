import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  isLookGarmentExtractionIntent,
  resolveLookGarmentExtractionAttachment,
} from './lookExtraction.ts';

Deno.test('isLookGarmentExtractionIntent detects guardar ropa requests', () => {
  assertEquals(isLookGarmentExtractionIntent('Guardame la ropa de este look en mi armario'), true);
  assertEquals(isLookGarmentExtractionIntent('Separá las prendas de esta foto'), true);
  assertEquals(isLookGarmentExtractionIntent('Recreame este look con mi armario'), false);
});

Deno.test('resolveLookGarmentExtractionAttachment prioritizes extractable attachment', () => {
  const attachment = resolveLookGarmentExtractionAttachment([
    { kind: 'reference_look', imageDataUrl: 'data:image/png;base64,ref' },
    { kind: 'extractable_look', imageDataUrl: 'data:image/png;base64,extract' },
  ], 'Recreame esto');

  assertExists(attachment);
  assertEquals(attachment.kind, 'extractable_look');
});

Deno.test('resolveLookGarmentExtractionAttachment reuses reference look for explicit extraction requests', () => {
  const attachment = resolveLookGarmentExtractionAttachment([
    { kind: 'reference_look', imageDataUrl: 'data:image/png;base64,ref' },
  ], 'Guardame la ropa de este look');

  assertExists(attachment);
  assertEquals(attachment.kind, 'reference_look');
});
