import { describe, expect, it } from 'vitest';
import type { ChatConversation } from '../types';
import { buildChatConversationsLocalFallback } from '../src/services/chatConversationStorage';

describe('chatConversationStorage', () => {
  it('strips heavy image payloads from the local fallback snapshot', () => {
    const conversations: ChatConversation[] = [
      {
        id: 'chat-1',
        title: 'Chat con foto',
        createdAt: 1,
        updatedAt: 2,
        preview: 'Quiero recrear este look',
        messages: [
          {
            id: 'user-1',
            role: 'user',
            content: 'Quiero recrear este look',
            timestamp: 1,
            attachments: [
              {
                kind: 'reference_look',
                imageDataUrl: 'data:image/jpeg;base64,very-large-image',
              },
            ],
          },
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Te armé una propuesta.',
            timestamp: 2,
            outfitSuggestion: {
              top_id: 'top-1',
              bottom_id: 'bottom-1',
              shoes_id: 'shoes-1',
              explanation: 'Look sugerido',
              aiGeneratedItems: {
                top: {
                  id: 'top-ai',
                  imageDataUrl: 'data:image/jpeg;base64,top-image',
                  metadata: {
                    category: 'top',
                    subcategory: 'Top IA',
                    color_primary: 'negro',
                    vibe_tags: ['ai-generated'],
                    seasons: ['all'],
                  },
                  isAIGenerated: true,
                },
              },
            },
            saveLookDraft: {
              status: 'idle',
              name: 'Look de Kumbi',
              note: null,
              occasion: null,
              tags: [],
              folderId: null,
              outfitSuggestion: {
                top_id: 'top-1',
                bottom_id: 'bottom-1',
                shoes_id: 'shoes-1',
                explanation: 'Look guardable',
                aiGeneratedItems: {
                  bottom: {
                    id: 'bottom-ai',
                    imageDataUrl: 'data:image/jpeg;base64,bottom-image',
                    metadata: {
                      category: 'bottom',
                      subcategory: 'Bottom IA',
                      color_primary: 'azul',
                      vibe_tags: ['ai-generated'],
                      seasons: ['all'],
                    },
                    isAIGenerated: true,
                  },
                },
              },
            },
          },
        ],
      },
    ];

    const snapshot = buildChatConversationsLocalFallback(conversations);

    expect(snapshot[0].messages[0].attachments).toBeUndefined();
    expect(snapshot[0].messages[1].outfitSuggestion?.aiGeneratedItems).toBeUndefined();
    expect(snapshot[0].messages[1].saveLookDraft?.outfitSuggestion?.aiGeneratedItems).toBeUndefined();
  });
});
