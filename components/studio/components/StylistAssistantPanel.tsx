import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatReferencedItem, ChatUIAction, ClothingItem, StructuredOutfitSuggestion } from '../../../types';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { chatWithStudioStylist } from '../../../src/services/aiService';
import * as analytics from '../../../src/services/analyticsService';
import { trackKumbiSurfaceOpened, trackKumbiUiActionTriggered } from '../../../src/services/analyticsService';
import { recordStylistEvent, upsertStylistMemory } from '../../../src/services/stylistMemoryService';
import { ROUTES } from '../../../src/routes';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  outfitSuggestion?: StructuredOutfitSuggestion | null;
  referencedItems?: ChatReferencedItem[];
  uiActions?: ChatUIAction[];
  promptRef?: string;
  threadId?: string | null;
};

interface StylistAssistantPanelProps {
  isOpen: boolean;
  closet: ClothingItem[];
  onClose: () => void;
  onApplySuggestion: (
    suggestion: StructuredOutfitSuggestion,
    context: { threadId?: string | null; prompt?: string | null }
  ) => void;
}

const QUICK_PROMPTS = [
  'Look casual para hoy',
  'Outfit para oficina moderna',
  'Algo elegante para una cita',
  'Quiero verme más formal',
];

export function StylistAssistantPanel({
  isOpen,
  closet,
  onClose,
  onApplySuggestion,
}: StylistAssistantPanelProps) {
  const navigate = useNavigate();
  const enableStudioKumbiActions = useFeatureFlag('enableStudioKumbiActions');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-studio-stylist',
      role: 'assistant',
      content:
        'Soy Kumbi. Contame ocasión, clima o mood y te armo un look aplicable al Studio.',
    },
  ]);

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((m) => m.id !== 'welcome-studio-stylist')
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    trackKumbiSurfaceOpened({
      surface: 'studio',
      source: 'studio_panel',
      entry_mode: 'contextual',
      has_selected_look: false,
      has_inferred_look: false,
    });
  }, [isOpen]);

  const handleMessageAction = useCallback((message: AssistantMessage, action: ChatUIAction) => {
    trackKumbiUiActionTriggered({
      surface: 'studio',
      thread_id: message.threadId || threadId || null,
      action_type: action.type,
      source: 'studio',
    });

    if (action.type === 'view_outfit' && message.outfitSuggestion) {
      onApplySuggestion(message.outfitSuggestion, {
        threadId: message.threadId || threadId,
        prompt: message.promptRef || null,
      });
      return;
    }

    if (action.type === 'open_saved_looks') {
      navigate(ROUTES.SAVED);
      onClose();
      return;
    }

    if (action.type === 'open_wishlist') {
      navigate(ROUTES.CLOSET, {
        state: {
          stylistNavigation: {
            type: 'open_wishlist',
            filters: action.filters,
          },
        },
      });
      onClose();
      return;
    }

    if (action.type === 'open_closet_filtered') {
      navigate(ROUTES.CLOSET, {
        state: {
          stylistNavigation: {
            type: 'open_closet_filtered',
            filters: action.filters,
          },
        },
      });
      onClose();
      return;
    }

    if (action.type === 'open_recommended_item' && action.item_id) {
      navigate(ROUTES.CLOSET, {
        state: {
          stylistNavigation: {
            type: 'open_recommended_item',
            itemId: action.item_id,
          },
        },
      });
      onClose();
      return;
    }

    if (action.type === 'open_studio_with_selection') {
      navigate(ROUTES.STUDIO, {
        state: {
          preselectedItemIds: action.preselected_item_ids || [],
        },
      });
      onClose();
    }
  }, [navigate, onApplySuggestion, onClose, threadId]);

  if (!isOpen) return null;

  const sendPrompt = async (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isTyping) return;

    analytics.trackEvent('stylist_prompt_sent', { surface: 'studio' });

    const userMessage: AssistantMessage = {
      id: `stylist-user-${Date.now()}`,
      role: 'user',
      content: cleanPrompt,
      promptRef: cleanPrompt,
      threadId,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatWithStudioStylist(cleanPrompt, closet, conversationHistory, {
        threadId,
        surface: 'studio',
      });

      setThreadId(response.threadId || threadId);
      if (response.outfitSuggestion) {
        analytics.trackEvent('stylist_outfit_suggested', { surface: 'studio' });
      }
      void upsertStylistMemory({
        last_profile_json: {
          last_surface: 'studio',
          last_prompt: cleanPrompt,
          last_thread_id: response.threadId || threadId || null,
          last_model: response.model,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `stylist-assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content || 'No pude generar una recomendación ahora.',
          outfitSuggestion: response.outfitSuggestion || null,
          referencedItems: response.referencedItems || [],
          uiActions: response.uiActions || [],
          promptRef: cleanPrompt,
          threadId: response.threadId || threadId,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `stylist-assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'No pude responder ahora. Probá de nuevo en unos segundos.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <section className="mb-3 rounded-2xl border border-white/70 bg-white/65 p-3 shadow-sm backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--studio-ink-muted)]">Copiloto</p>
          <h3 className="text-sm font-semibold text-[color:var(--studio-ink)]">Kumbi</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--studio-ink-muted)] hover:bg-white/70"
        >
          Cerrar
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((quickPrompt) => (
          <button
            key={quickPrompt}
            disabled={isTyping}
            onClick={() => {
              void sendPrompt(quickPrompt);
            }}
            className="rounded-full border border-[color:var(--studio-ink)]/10 bg-white px-2.5 py-1 text-[11px] font-medium text-[color:var(--studio-ink)] hover:bg-gray-50 disabled:opacity-50"
          >
            {quickPrompt}
          </button>
        ))}
      </div>

      <div className="mb-2 max-h-44 space-y-2 overflow-y-auto rounded-xl bg-white/60 p-2">
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <div
              className={`rounded-xl px-2.5 py-2 text-xs leading-relaxed ${
                message.role === 'assistant'
                  ? 'bg-white text-[color:var(--studio-ink)]'
                  : 'bg-[color:var(--studio-ink)] text-white'
              }`}
            >
              {message.content}
            </div>

            {message.role === 'assistant' && message.outfitSuggestion && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    onApplySuggestion(message.outfitSuggestion!, {
                      threadId: message.threadId || threadId,
                      prompt: message.promptRef || null,
                    });
                    void recordStylistEvent({
                      action: 'accepted',
                      surface: 'studio',
                      thread_id: message.threadId || threadId,
                      prompt: message.promptRef || null,
                      suggestion_json: message.outfitSuggestion as Record<string, any>,
                    });
                    void upsertStylistMemory({
                      last_profile_json: {
                        last_surface: 'studio',
                        last_action: 'accepted',
                        last_thread_id: message.threadId || threadId || null,
                        last_prompt: message.promptRef || null,
                      },
                    });
                  }}
                  className="rounded-lg bg-[color:var(--studio-ink)] px-2.5 py-1.5 text-xs font-semibold text-white"
                >
                  Aplicar al look
                </button>
                <button
                  onClick={() => {
                    void recordStylistEvent({
                      action: 'rejected',
                      surface: 'studio',
                      thread_id: message.threadId || threadId,
                      prompt: message.promptRef || null,
                      suggestion_json: message.outfitSuggestion as Record<string, any>,
                    });
                    void upsertStylistMemory({
                      last_profile_json: {
                        last_surface: 'studio',
                        last_action: 'rejected',
                        last_thread_id: message.threadId || threadId || null,
                        last_prompt: message.promptRef || null,
                      },
                    });
                  }}
                  className="rounded-lg border border-[color:var(--studio-ink)]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[color:var(--studio-ink)]"
                >
                  No me gusta
                </button>
              </div>
            )}

            {message.role === 'assistant' && Array.isArray(message.referencedItems) && message.referencedItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.referencedItems.slice(0, 3).map((item) => (
                  <span
                    key={`${message.id}-${item.item_id}`}
                    className="rounded-full border border-[color:var(--studio-ink)]/10 bg-white px-2.5 py-1 text-[11px] font-medium text-[color:var(--studio-ink)]"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            )}

            {enableStudioKumbiActions && message.role === 'assistant' && Array.isArray(message.uiActions) && message.uiActions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.uiActions
                  .filter((action) => action.type !== 'save_to_wishlist')
                  .slice(0, 3)
                  .map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleMessageAction(message, action)}
                      className="rounded-full border border-[color:var(--studio-ink)]/10 bg-white px-2.5 py-1 text-[11px] font-medium text-[color:var(--studio-ink)] hover:bg-gray-50"
                    >
                      {action.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="rounded-xl bg-white px-2.5 py-2 text-xs text-[color:var(--studio-ink-muted)]">
            Pensando combinación...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendPrompt(input);
            }
          }}
          placeholder="Ej: look para cena formal con lluvia"
          className="h-10 flex-1 rounded-xl border border-[color:var(--studio-ink)]/15 bg-white px-3 text-sm outline-none focus:border-[color:var(--studio-ink)]/40"
        />
        <button
          onClick={() => {
            void sendPrompt(input);
          }}
          disabled={isTyping || !input.trim()}
          className="h-10 rounded-xl bg-[color:var(--studio-ink)] px-3 text-sm font-semibold text-white disabled:opacity-45"
        >
          Enviar
        </button>
      </div>
    </section>
  );
}
