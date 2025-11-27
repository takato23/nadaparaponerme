import { useState, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';
import type { ChatConversation, ChatMessage } from '../types';

/**
 * Hook for managing chat conversations
 * Extracts chat logic from App.tsx for better separation of concerns
 */
export function useChatConversations() {
  const [conversations, setConversations] = useLocalStorage<ChatConversation[]>(
    'ojodeloca-chat-conversations',
    []
  );
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Create a new conversation with welcome message
  const createConversation = useCallback(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de moda personal. ¿En qué puedo ayudarte hoy? Puedo sugerirte outfits para cualquier ocasión basándome en tu armario.',
      timestamp: Date.now()
    };

    const newConversation: ChatConversation = {
      id: `chat_${crypto.randomUUID()}`,
      title: 'Nueva Conversación',
      messages: [welcomeMessage],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);

    return newConversation;
  }, [setConversations]);

  // Select an existing conversation
  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  // Update messages in current conversation
  const updateMessages = useCallback((messages: ChatMessage[]) => {
    if (!currentConversationId) return;

    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        // Generate preview from first user message
        const firstUserMessage = messages.find(m => m.role === 'user');
        const preview = firstUserMessage?.content.slice(0, 100);

        return {
          ...conv,
          messages,
          updatedAt: Date.now(),
          preview: preview || conv.preview
        };
      }
      return conv;
    }));
  }, [currentConversationId, setConversations]);

  // Update conversation title
  const updateTitle = useCallback((title: string) => {
    if (!currentConversationId) return;

    setConversations(prev => prev.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, title, updatedAt: Date.now() }
        : conv
    ));
  }, [currentConversationId, setConversations]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
    }

    return currentConversationId === conversationId;
  }, [currentConversationId, setConversations]);

  // Get current conversation
  const getCurrentConversation = useCallback((): ChatConversation | null => {
    if (!currentConversationId) return null;
    return conversations.find(conv => conv.id === currentConversationId) || null;
  }, [currentConversationId, conversations]);

  // Clear current conversation selection
  const clearCurrentConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  return {
    // State
    conversations,
    currentConversationId,
    currentConversation: getCurrentConversation(),

    // Actions
    createConversation,
    selectConversation,
    updateMessages,
    updateTitle,
    deleteConversation,
    clearCurrentConversation,

    // Setters for external control
    setCurrentConversationId
  };
}
