import { describe, expect, it } from 'vitest';
import {
  getGuidedLookErrorMessage,
  mapGuidedStatusToLookCreationStatus,
} from '../src/services/guidedLookWorkflowUi';

describe('guidedLookWorkflowUi', () => {
  it('mapea estados del workflow backend al estado de UI', () => {
    expect(mapGuidedStatusToLookCreationStatus('idle')).toBe('idle');
    expect(mapGuidedStatusToLookCreationStatus('collecting')).toBe('collecting');
    expect(mapGuidedStatusToLookCreationStatus('confirming')).toBe('confirming');
    expect(mapGuidedStatusToLookCreationStatus('generating')).toBe('generating');
    expect(mapGuidedStatusToLookCreationStatus('generated')).toBe('result');
    expect(mapGuidedStatusToLookCreationStatus('cancelled')).toBe('idle');
    expect(mapGuidedStatusToLookCreationStatus('error')).toBe('idle');
  });

  it('mapea errores tipados a mensajes en español', () => {
    expect(getGuidedLookErrorMessage('INSUFFICIENT_CREDITS')).toContain('créditos');
    expect(getGuidedLookErrorMessage('GENERATION_TIMEOUT')).toContain('tardó');
    expect(getGuidedLookErrorMessage('SESSION_EXPIRED')).toContain('expiró');
    expect(getGuidedLookErrorMessage('INVALID_CONFIRMATION')).toContain('confirmación');
    expect(getGuidedLookErrorMessage('GENERATION_FAILED')).toContain('No pude generar');
    expect(getGuidedLookErrorMessage(null)).toBeNull();
  });
});
