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
        billing: {
          charged: false,
          credits_used: 0,
          reason: 'wardrobe_recommendation',
        },
        detectedLookGarments: {
          summary: 'Detecté top y bottom principales.',
          warnings: ['El calzado no se ve completo.'],
          items: [
            {
              id: 'garment-1',
              label: 'Blazer',
              category: 'top',
              subcategory: 'blazer',
              color_primary: 'negro',
              confidence: 0.88,
              crop: {
                x: 0.1,
                y: 0.12,
                width: 0.4,
                height: 0.38,
              },
            },
          ],
        },
        referencedItems: [
          {
            item_id: 'item-1',
            label: 'Camisa azul grisácea',
            reason: 'Es la prenda que mejor encaja con la ocasión.',
          },
        ],
        cache_hit: false,
        uiActions: [
          {
            id: 'action_view_outfit',
            type: 'view_outfit',
            label: 'Ver outfit completo',
          },
          {
            id: 'action_save_wishlist_1',
            type: 'save_to_wishlist',
            label: 'Guardar pantalón',
            suggestion_id: 'shop-1',
          },
          {
            id: 'action_open_saved_looks',
            type: 'open_saved_looks',
            label: 'Abrir looks guardados',
            route: '/guardados',
          },
          {
            id: 'action_open_closet_filtered',
            type: 'open_closet_filtered',
            label: 'Abrir armario filtrado',
            route: '/armario',
            filters: {
              category: 'top',
              color: 'negro',
            },
          },
        ],
        recommendedItemCandidate: {
          item_id: 'item-1',
          reason: 'Color y ocasión alineados',
          score_total: 0.82,
          score_breakdown: {
            colorimetry: 0.9,
            occasion_style: 0.8,
            season_climate: 0.7,
            usage: 0.6,
          },
        },
        workflow,
      },
      error: null,
    });

    const response = await chatWithStylistViaEdge(
      'creame un look nuevo',
      [],
      [],
      {
        savedLookContext: [
          {
            id: 'look-1',
            name: 'Oficina base',
            clothing_item_ids: ['top-1', 'bottom-1', 'shoes-1'],
          },
        ],
        selectedLookContext: {
          id: 'look-2',
          name: 'Look favorito',
          clothing_item_ids: ['top-2', 'bottom-2', 'shoes-2'],
          explanation: 'Base para variante',
        },
        workflow: {
          mode: 'guided_look_creation',
          action: 'start',
          sessionId: null,
        },
        attachments: [
          {
            kind: 'extractable_look',
            imageDataUrl: 'data:image/png;base64,abc123',
          },
        ],
        recommendationContext: {
          explicit: true,
          excludeItemIds: ['item-9'],
        },
      },
    );

    expect(response.workflow?.mode).toBe('guided_look_creation');
    expect(response.workflow?.status).toBe('confirming');
    expect(response.workflow?.estimatedCostCredits).toBe(2);
    expect(response.content).toContain('2 créditos');
    expect(response.recommendedItemCandidate?.item_id).toBe('item-1');
    expect(response.referencedItems).toEqual([
      {
        item_id: 'item-1',
        label: 'Camisa azul grisácea',
        reason: 'Es la prenda que mejor encaja con la ocasión.',
      },
    ]);
    expect(response.billing).toEqual({
      charged: false,
      credits_used: 0,
      reason: 'wardrobe_recommendation',
    });
    expect(response.detectedLookGarments).toEqual({
      summary: 'Detecté top y bottom principales.',
      warnings: ['El calzado no se ve completo.'],
      items: [
        {
          id: 'garment-1',
          label: 'Blazer',
          category: 'top',
          subcategory: 'blazer',
          color_primary: 'negro',
          confidence: 0.88,
          crop: {
            x: 0.1,
            y: 0.12,
            width: 0.4,
            height: 0.38,
          },
        },
      ],
    });
    expect(response.uiActions).toEqual([
      {
        id: 'action_view_outfit',
        type: 'view_outfit',
        label: 'Ver outfit completo',
      },
      {
        id: 'action_save_wishlist_1',
        type: 'save_to_wishlist',
        label: 'Guardar pantalón',
        suggestion_id: 'shop-1',
      },
      {
        id: 'action_open_saved_looks',
        type: 'open_saved_looks',
        label: 'Abrir looks guardados',
        route: '/guardados',
      },
      {
        id: 'action_open_closet_filtered',
        type: 'open_closet_filtered',
        label: 'Abrir armario filtrado',
        route: '/armario',
        filters: {
          category: 'top',
          color: 'negro',
        },
      },
    ]);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke.mock.calls[0][0]).toBe('chat-stylist');
    expect(mockInvoke.mock.calls[0][1].body.workflow).toEqual({
      mode: 'guided_look_creation',
      action: 'start',
      sessionId: null,
    });
    expect(mockInvoke.mock.calls[0][1].body.attachments).toEqual([
      {
        kind: 'extractable_look',
        imageDataUrl: 'data:image/png;base64,abc123',
      },
    ]);
    expect(mockInvoke.mock.calls[0][1].body.savedLookContext).toEqual([
      {
        id: 'look-1',
        name: 'Oficina base',
        clothing_item_ids: ['top-1', 'bottom-1', 'shoes-1'],
      },
    ]);
    expect(mockInvoke.mock.calls[0][1].body.selectedLookContext).toEqual({
      id: 'look-2',
      name: 'Look favorito',
      clothing_item_ids: ['top-2', 'bottom-2', 'shoes-2'],
      explanation: 'Base para variante',
    });
    expect(mockInvoke.mock.calls[0][1].body.recommendationContext).toEqual({
      explicit: true,
      excludeItemIds: ['item-9'],
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
