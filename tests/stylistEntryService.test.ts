import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumePendingStylistPrompt,
  setPendingStylistEntry,
} from '../src/services/stylistEntryService';

function createStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };
}

describe('stylistEntryService', () => {
  beforeEach(() => {
    const localStorage = createStorage();
    vi.stubGlobal('window', {
      localStorage,
    });
  });

  it('persists and consumes reference look attachments', () => {
    setPendingStylistEntry({
      prompt: 'Ayudame con este look',
      source: 'saved_looks_inferred',
      surface: 'saved_looks',
      attachments: [{ kind: 'reference_look', imageDataUrl: 'data:image/png;base64,abc123' }],
    });

    const pending = consumePendingStylistPrompt();

    expect(pending?.prompt).toBe('Ayudame con este look');
    expect(pending?.attachments).toEqual([
      { kind: 'reference_look', imageDataUrl: 'data:image/png;base64,abc123' },
    ]);
  });

  it('filters invalid attachments when consuming the pending entry', () => {
    const payload = {
      prompt: 'Hola',
      createdAt: Date.now(),
      attachments: [
        { kind: 'reference_look', imageDataUrl: 'data:image/png;base64,valid' },
        { kind: 'extractable_look', imageDataUrl: 'data:image/png;base64,extract' },
        { kind: 'broken_kind', imageDataUrl: 'oops' },
        { kind: 'reference_look', imageDataUrl: 123 },
      ],
    };

    window.localStorage.setItem('ojodeloca-pending-stylist-entry', JSON.stringify(payload));

    const pending = consumePendingStylistPrompt();

    expect(pending?.attachments).toEqual([
      { kind: 'reference_look', imageDataUrl: 'data:image/png;base64,valid' },
      { kind: 'extractable_look', imageDataUrl: 'data:image/png;base64,extract' },
    ]);
  });
});
