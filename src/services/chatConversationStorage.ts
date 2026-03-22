import type { ChatConversation, ChatMessage } from '../../types';
import { aiStorage } from '../utils/aiStorage';

export const CHAT_CONVERSATIONS_STORAGE_KEY = 'ojodeloca-chat-conversations';

const MAX_LOCAL_FALLBACK_CONVERSATIONS = 12;
const MAX_LOCAL_FALLBACK_MESSAGES = 12;
const TRANSIENT_ASSISTANT_ERROR_PATTERNS = [
  /^¡Ups! Algo salió mal\./i,
  /^No pude hablar con Kumbi/i,
  /^⏱️ Kumbi tardó más de lo esperado\./i,
];

function isTransientAssistantErrorMessage(message: ChatMessage): boolean {
  return message.role === 'assistant'
    && typeof message.content === 'string'
    && TRANSIENT_ASSISTANT_ERROR_PATTERNS.some((pattern) => pattern.test(message.content.trim()));
}

function sanitizeConversation(conversation: ChatConversation): ChatConversation | null {
  if (conversation.messages.some((message) => message.role === 'user')) {
    return conversation;
  }

  const messages = conversation.messages.filter((message) => !isTransientAssistantErrorMessage(message));
  if (messages.length === 0) {
    return null;
  }

  if (messages.length === conversation.messages.length) {
    return conversation;
  }

  return {
    ...conversation,
    messages,
    updatedAt: Date.now(),
  };
}

function sanitizeConversations(conversations: ChatConversation[]): ChatConversation[] {
  return conversations
    .map((conversation) => sanitizeConversation(conversation))
    .filter((conversation): conversation is ChatConversation => Boolean(conversation));
}

function stripOutfitSuggestion(
  outfitSuggestion?: ChatMessage['outfitSuggestion'],
): ChatMessage['outfitSuggestion'] | undefined {
  if (!outfitSuggestion) return undefined;
  return {
    ...outfitSuggestion,
    aiGeneratedItems: undefined,
  };
}

function stripSaveLookDraft(
  saveLookDraft?: ChatMessage['saveLookDraft'],
): ChatMessage['saveLookDraft'] | undefined {
  if (!saveLookDraft) return undefined;
  return {
    ...saveLookDraft,
    outfitSuggestion: stripOutfitSuggestion(saveLookDraft.outfitSuggestion),
  };
}

function toLocalFallbackMessage(message: ChatMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: typeof message.content === 'string' ? message.content.slice(0, 1200) : '',
    timestamp: message.timestamp,
    billing: message.billing,
    shoppingSuggestions: undefined,
    referencedItems: undefined,
    uiActions: undefined,
    outfitSuggestion: stripOutfitSuggestion(message.outfitSuggestion),
    saveLookDraft: stripSaveLookDraft(message.saveLookDraft),
  };
}

export function buildChatConversationsLocalFallback(conversations: ChatConversation[]): ChatConversation[] {
  return sanitizeConversations(conversations)
    .slice(0, MAX_LOCAL_FALLBACK_CONVERSATIONS)
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages
        .slice(-MAX_LOCAL_FALLBACK_MESSAGES)
        .map((message) => toLocalFallbackMessage(message)),
    }));
}

function parseStoredConversations(raw: string | null): ChatConversation[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed as ChatConversation[];
    }

    if (
      parsed
      && typeof parsed === 'object'
      && Array.isArray((parsed as { conversations?: unknown }).conversations)
    ) {
      return (parsed as { conversations: ChatConversation[] }).conversations;
    }
  } catch (error) {
    console.error('No se pudo leer el historial de Kumbi desde storage:', error);
  }

  return [];
}

export async function loadPersistedChatConversations(): Promise<ChatConversation[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  const storedFromIndexedDb = await aiStorage.get<{ conversations?: ChatConversation[] }>(
    CHAT_CONVERSATIONS_STORAGE_KEY,
  );
  if (Array.isArray(storedFromIndexedDb?.conversations)) {
    return sanitizeConversations(storedFromIndexedDb.conversations);
  }

  const legacyConversations = sanitizeConversations(parseStoredConversations(
    window.localStorage.getItem(CHAT_CONVERSATIONS_STORAGE_KEY),
  ));

  if (legacyConversations.length > 0) {
    await aiStorage.set(CHAT_CONVERSATIONS_STORAGE_KEY, {
      conversations: legacyConversations,
      migratedAt: Date.now(),
    });

    try {
      window.localStorage.setItem(
        CHAT_CONVERSATIONS_STORAGE_KEY,
        JSON.stringify(buildChatConversationsLocalFallback(legacyConversations)),
      );
    } catch (error) {
      console.warn('No se pudo compactar el fallback local del chat:', error);
    }
  }

  return legacyConversations;
}

export async function persistChatConversations(conversations: ChatConversation[]): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const sanitizedConversations = sanitizeConversations(conversations);

  try {
    await aiStorage.set(CHAT_CONVERSATIONS_STORAGE_KEY, {
      conversations: sanitizedConversations,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn('No se pudo guardar el historial completo de Kumbi en IndexedDB:', error);
  }

  try {
    const fallback = buildChatConversationsLocalFallback(sanitizedConversations);
    window.localStorage.setItem(
      CHAT_CONVERSATIONS_STORAGE_KEY,
      JSON.stringify(fallback),
    );
  } catch (error) {
    try {
      const emergencyFallback = buildChatConversationsLocalFallback(sanitizedConversations)
        .slice(0, 4)
        .map((conversation) => ({
          ...conversation,
          messages: conversation.messages.slice(-6).map((message) => ({
            id: message.id,
            role: message.role,
            content: typeof message.content === 'string' ? message.content.slice(0, 280) : '',
            timestamp: message.timestamp,
          })),
        }));
      window.localStorage.setItem(
        CHAT_CONVERSATIONS_STORAGE_KEY,
        JSON.stringify(emergencyFallback),
      );
    } catch (secondaryError) {
      try {
        window.localStorage.removeItem(CHAT_CONVERSATIONS_STORAGE_KEY);
      } catch {
        // no-op
      }
      console.warn('No se pudo guardar el fallback del chat; se limpió el cache local.', secondaryError);
      return;
    }
    console.warn('No se pudo guardar el fallback liviano del chat; se guardó una versión de emergencia.', error);
  }
}
