import { describe, expect, it } from 'vitest';
import { deriveSaveLookDraft, parseLookDraftTagsInput } from '../src/services/kumbiLookSaveDraft';

describe('kumbiLookSaveDraft', () => {
  it('derives a guided draft with sensible defaults', () => {
    const draft = deriveSaveLookDraft({
      outfit: {
        top_id: 'top-1',
        bottom_id: 'bottom-1',
        shoes_id: 'shoes-1',
        look_goal: 'reference_recreation',
        styling_notes: ['Sumar blazer estructurado', 'Mantener paleta neutra'],
      },
      assistantContent: 'Te armé un look para oficina.',
      surface: 'closet',
      suggestedOccasion: 'oficina',
    });

    expect(draft.status).toBe('editing');
    expect(draft.name).toBe('Look oficina');
    expect(draft.occasion).toBe('oficina');
    expect(draft.folderId).toBeNull();
    expect(draft.tags).toEqual(['oficina', 'referencia', 'closet']);
  });

  it('falls back to a generic name when there is no occasion or content', () => {
    const draft = deriveSaveLookDraft({
      outfit: {
        top_id: 'top-1',
        bottom_id: 'bottom-1',
        shoes_id: 'shoes-1',
      },
    });

    expect(draft.name).toBe('Look de Kumbi');
    expect(draft.tags).toEqual(['kumbi']);
  });

  it('normalizes and caps tags to three', () => {
    expect(parseLookDraftTagsInput('Oficina, oficina, noche elegante,   fin de semana,  blazer')).toEqual([
      'oficina',
      'noche-elegante',
      'fin-de-semana',
    ]);
  });
});
