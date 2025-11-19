import { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  outfitSuggestion?: {
    top_id: string;
    bottom_id: string;
    shoes_id: string;
  };
}

export interface UseChatOptions {
  initialMessages?: ChatMessage[];
  onSendMessage: (message: string, messages: ChatMessage[]) => Promise<string>;
  onStreamChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  autoScroll?: boolean;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isTyping: boolean;
  streamingMessage: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
}

/**
 * Custom hook for chat functionality
 * Handles message state, streaming, auto-scroll, and error handling
 */
export function useChat({
  initialMessages = [],
  onSendMessage,
  onStreamChunk,
  onError,
  autoScroll = true
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setStreamingMessage('');

    try {
      const response = await onSendMessage(text.trim(), [...messages, userMessage]);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingMessage('');
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intentá de nuevo.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage('');

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const clearMessages = () => {
    setMessages(initialMessages);
    setStreamingMessage('');
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  return {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    streamingMessage,
    messagesEndRef,
    sendMessage,
    clearMessages,
    addMessage
  };
}
