import type { GuidedLookErrorCode, GuidedLookStatus } from '../../types';

export type LookCreationUiStatus = 'idle' | 'collecting' | 'confirming' | 'generating' | 'result';

export function mapGuidedStatusToLookCreationStatus(status: GuidedLookStatus): LookCreationUiStatus {
  if (status === 'collecting') return 'collecting';
  if (status === 'confirming') return 'confirming';
  if (status === 'generating') return 'generating';
  if (status === 'generated') return 'result';
  return 'idle';
}

export function getGuidedLookErrorMessage(errorCode?: GuidedLookErrorCode | null): string | null {
  if (!errorCode) return null;
  if (errorCode === 'INSUFFICIENT_CREDITS') {
    return 'No tenés créditos suficientes para generar esta prenda. Hacé upgrade o sumá créditos para continuar.';
  }
  if (errorCode === 'GENERATION_TIMEOUT') {
    return '⏱️ La generación tardó más de lo esperado. Probá de nuevo en unos segundos.';
  }
  if (errorCode === 'SESSION_EXPIRED') {
    return 'La sesión para crear el look expiró. Empezá una nueva y lo hacemos de nuevo.';
  }
  if (errorCode === 'INVALID_CONFIRMATION') {
    return 'No pude validar la confirmación. Volvé a confirmar el costo para continuar.';
  }
  return 'No pude generar la prenda. Probá de nuevo en unos segundos.';
}
