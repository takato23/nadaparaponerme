import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockInvoke, mockGetSession, mockLoggerError } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockGetSession: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/config/features', () => ({
  getFeatureFlag: vi.fn(() => false),
}));

import { separateLookGarmentsViaEdge } from '../src/services/edgeFunctionClient';

describe('edgeFunctionClient.separateLookGarmentsViaEdge', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockGetSession.mockReset();
    mockLoggerError.mockReset();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
        },
      },
    });
  });

  it('sends the expected payload and maps the response', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        items: [
          {
            id: 'garment-1',
            label: 'Blazer',
            category: 'outerwear',
            subcategory: 'blazer',
            color_primary: 'negro',
            confidence: 0.88,
            crop: { x: 0.1, y: 0.08, width: 0.44, height: 0.56 },
            visibility_note: 'La manga izquierda está algo tapada.',
          },
        ],
        warnings: ['El calzado quedó fuera de cuadro.'],
        summary: 'Separé las prendas más claras del look.',
      },
      error: null,
    });

    const response = await separateLookGarmentsViaEdge('data:image/jpeg;base64,abc123');

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0]).toBe('separate-look-garments');
    expect(mockInvoke.mock.calls[0][1].body).toEqual({
      imageDataUrl: 'data:image/jpeg;base64,abc123',
    });
    expect(response).toEqual({
      items: [
        {
          id: 'garment-1',
          label: 'Blazer',
          category: 'outerwear',
          subcategory: 'blazer',
          color_primary: 'negro',
          confidence: 0.88,
          crop: { x: 0.1, y: 0.08, width: 0.44, height: 0.56 },
          visibility_note: 'La manga izquierda está algo tapada.',
        },
      ],
      warnings: ['El calzado quedó fuera de cuadro.'],
      summary: 'Separé las prendas más claras del look.',
    });
  });
});
