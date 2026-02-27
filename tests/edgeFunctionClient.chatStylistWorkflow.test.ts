import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuidedLookWorkflowResponse } from '../types';

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

import { chatWithStylistViaEdge, generateVirtualTryOnWithSlots } from '../src/services/edgeFunctionClient';

describe('edgeFunctionClient.chatWithStylistViaEdge workflow contract', () => {
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

  it('sends workflow payload and maps workflow response', async () => {
    const workflow: GuidedLookWorkflowResponse = {
      mode: 'guided_look_creation',
      sessionId: 'session-1',
      status: 'confirming',
      missingFields: [],
      collected: {
        occasion: 'oficina',
        style: 'formal',
        category: 'top',
      },
      estimatedCostCredits: 2,
      requiresConfirmation: true,
      confirmationToken: 'token-1',
      generatedItem: null,
      autosaveEnabled: false,
      errorCode: null,
    };

    mockInvoke.mockResolvedValue({
      data: {
        content: 'Esta generación cuesta 2 créditos. ¿Confirmás?',
        role: 'assistant',
        model: 'guided-look-workflow',
        credits_used: 0,
        cache_hit: false,
        workflow,
      },
      error: null,
    });

    const response = await chatWithStylistViaEdge(
      'creame un look nuevo',
      [],
      [],
      {
        workflow: {
          mode: 'guided_look_creation',
          action: 'start',
          sessionId: null,
        },
      },
    );

    expect(response.workflow?.mode).toBe('guided_look_creation');
    expect(response.workflow?.status).toBe('confirming');
    expect(response.workflow?.estimatedCostCredits).toBe(2);
    expect(response.content).toContain('2 créditos');

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0]).toBe('chat-stylist');
    expect(mockInvoke.mock.calls[0][1].body.workflow).toEqual({
      mode: 'guided_look_creation',
      action: 'start',
      sessionId: null,
    });
    expect(mockInvoke.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  it('maps edge rate limit payload into user-facing error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: async () => ({
            code: 'rate_limited',
            retry_after_seconds: 42,
          }),
        },
      },
    });

    await expect(
      chatWithStylistViaEdge('hola', [], [], {
        workflow: {
          mode: 'guided_look_creation',
          action: 'submit',
          sessionId: 'session-1',
          payload: { message: 'oficina' },
        },
      }),
    ).rejects.toThrow('Esperá 42 segundos y reintentá.');
  });

  it('maps virtual try-on insufficient credits into clear error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          json: async () => ({
            error: 'No tenés créditos suficientes. Upgradeá tu plan para continuar.',
          }),
        },
      },
    });

    await expect(
      generateVirtualTryOnWithSlots(
        'data:image/jpeg;base64,selfie',
        { top_base: 'data:image/jpeg;base64,prenda' },
      ),
    ).rejects.toThrow('No tenés créditos suficientes para usar el probador virtual');
  });

  it('maps virtual try-on timeout into clear error', async () => {
    mockInvoke.mockRejectedValue(new Error('Request timed out after 90000ms'));

    await expect(
      generateVirtualTryOnWithSlots(
        'data:image/jpeg;base64,selfie',
        { top_base: 'data:image/jpeg;base64,prenda' },
      ),
    ).rejects.toThrow('El probador virtual tardó más de lo esperado');
  });
});
