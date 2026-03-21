import { describe, expect, it } from 'vitest';
import type { ChatMessage, ClothingItem } from '../types';
import { resolveReferencedItemFollowUp } from '../src/services/stylistReferencedItems';

const closet: ClothingItem[] = [
  {
    id: 'top-1',
    imageDataUrl: 'top-image',
    metadata: {
      category: 'top',
      subcategory: 'camisa',
      color_primary: 'azul grisacea',
      vibe_tags: [],
      seasons: [],
    },
  },
  {
    id: 'bottom-1',
    imageDataUrl: 'bottom-image',
    metadata: {
      category: 'bottom',
      subcategory: 'jean',
      color_primary: 'negro',
      vibe_tags: [],
      seasons: [],
    },
  },
  {
    id: 'shoes-1',
    imageDataUrl: 'shoes-image',
    metadata: {
      category: 'shoes',
      subcategory: 'zapatillas',
      color_primary: 'blanco',
      vibe_tags: [],
      seasons: [],
    },
  },
];

describe('stylistReferencedItems', () => {
  it('reuses referencedItems from the last assistant message', () => {
    const lastAssistantMessage: ChatMessage = {
      id: 'assistant-1',
      role: 'assistant',
      content: 'Te recomiendo esta camisa.',
      timestamp: Date.now(),
      referencedItems: [
        {
          item_id: 'top-1',
          label: 'Camisa azul grisácea',
          reason: 'Va con la ocasión.',
        },
      ],
    };

    const resolved = resolveReferencedItemFollowUp({
      text: 'que camisa decis',
      lastAssistantMessage,
      closet,
    });

    expect(resolved).toEqual({
      content: 'Te hablo de esta camisa.',
      referencedItems: [
        {
          item_id: 'top-1',
          label: 'Camisa azul grisácea',
          reason: 'Va con la ocasión.',
        },
      ],
    });
  });

  it('falls back to outfitSuggestion when there are no referencedItems yet', () => {
    const lastAssistantMessage: ChatMessage = {
      id: 'assistant-2',
      role: 'assistant',
      content: 'Te armé un look.',
      timestamp: Date.now(),
      outfitSuggestion: {
        top_id: 'top-1',
        bottom_id: 'bottom-1',
        shoes_id: 'shoes-1',
      },
    };

    const resolved = resolveReferencedItemFollowUp({
      text: 'mostrame eso en fotos',
      lastAssistantMessage,
      closet,
    });

    expect(resolved?.referencedItems.map((item) => item.item_id)).toEqual(['top-1', 'bottom-1', 'shoes-1']);
    expect(resolved?.content).toBe('Te hablo de estas opciones.');
  });

  it('accepts short reveal follow-ups like "a ver"', () => {
    const lastAssistantMessage: ChatMessage = {
      id: 'assistant-3',
      role: 'assistant',
      content: 'Te recomiendo esta camisa.',
      timestamp: Date.now(),
      referencedItems: [
        {
          item_id: 'top-1',
          label: 'Camisa azul grisácea',
          reason: 'Va con la ocasión.',
        },
      ],
    };

    const resolved = resolveReferencedItemFollowUp({
      text: 'a ver',
      lastAssistantMessage,
      closet,
    });

    expect(resolved?.referencedItems.map((item) => item.item_id)).toEqual(['top-1']);
    expect(resolved?.content).toBe('Te hablo de esta camisa.');
  });

  it('accepts pronoun reveal follow-ups like "mostramela"', () => {
    const lastAssistantMessage: ChatMessage = {
      id: 'assistant-4',
      role: 'assistant',
      content: 'Te recomiendo esta camisa.',
      timestamp: Date.now(),
      referencedItems: [
        {
          item_id: 'top-1',
          label: 'Camisa azul grisácea',
          reason: 'Va con la ocasión.',
        },
      ],
    };

    const resolved = resolveReferencedItemFollowUp({
      text: 'mostramela',
      lastAssistantMessage,
      closet,
    });

    expect(resolved?.referencedItems.map((item) => item.item_id)).toEqual(['top-1']);
    expect(resolved?.content).toBe('Te hablo de esta camisa.');
  });
});
