import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildReferenceLookObjective,
  isReferenceLookRecreationIntent,
} from './referenceLookIntent.ts';

Deno.test('isReferenceLookRecreationIntent detects recreate-style requests', () => {
  assertEquals(isReferenceLookRecreationIntent('Recreame este look con mi armario'), true);
  assertEquals(isReferenceLookRecreationIntent('Armame algo similar a esta foto'), true);
  assertEquals(isReferenceLookRecreationIntent('Decime qué opinás de este look'), false);
  assertEquals(isReferenceLookRecreationIntent('Qué te parece esta prenda?'), false);
});

Deno.test('buildReferenceLookObjective adapts to the turn intent', () => {
  assertEquals(
    buildReferenceLookObjective('reference_recreation'),
    'recrear la esencia del look con el armario del usuario, aunque no sea idéntico',
  );
  assertEquals(
    buildReferenceLookObjective('free_consult'),
    'usar esta imagen como contexto visual para analizarla y opinar sin asumir que hay que recrearla',
  );
});
