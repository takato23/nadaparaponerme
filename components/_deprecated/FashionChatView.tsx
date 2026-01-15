
import React, { useState, useRef, useEffect } from 'react';
import type { ClothingItem, ChatMessage } from '../types';
import { chatWithFashionAssistant, parseOutfitFromChat } from '../src/services/aiService';
import Loader from './Loader';
import { sanitizeUserInput } from '../utils/sanitize';

interface FashionChatViewProps {
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (
    topId: string,
    bottomId: string,
    shoesId: string,
    aiGeneratedItems?: {
      top?: ClothingItem;
      bottom?: ClothingItem;
      shoes?: ClothingItem;
    }
  ) => void;
  conversationId: string;
  conversationTitle: string;
  initialMessages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onShowConversations: () => void;
  onUpdateTitle: (title: string) => void;
}

const OCCASION_PRESETS = [
  { label: 'Entrevista', prompt: 'Necesito un outfit para una entrevista de trabajo' },
  { label: 'Primera Cita', prompt: 'Quiero un look para una primera cita' },
  { label: 'Casual', prompt: 'Dame un outfit casual para el día a día' },
  { label: 'Formal', prompt: 'Necesito vestirme formal para un evento' },
];

const FashionChatView = ({
  closet,
  onClose,
  onViewOutfit,
  conversationId,
  conversationTitle,
  initialMessages,
  onMessagesUpdate,
  onShowConversations,
  onUpdateTitle
}: FashionChatViewProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showOutfitPreview, setShowOutfitPreview] = useState(false);
  const [previewOutfit, setPreviewOutfit] = useState<{ topId: string; bottomId: string; shoesId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages with parent
  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId]); // Reset when conversation changes

  // Update parent when messages change
  useEffect(() => {
    onMessagesUpdate(messages);
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSendMessage = async (text: string) => {
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

    // Auto-generate title from first user message if conversation is "Nueva Conversación"
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0 && conversationTitle === 'Nueva Conversación') {
      const autoTitle = text.trim().slice(0, 50) + (text.trim().length > 50 ? '...' : '');
      onUpdateTitle(autoTitle);
    }

    try {
      const response = await chatWithFashionAssistant(
        text.trim(),
        closet,
        messages,
        (chunk) => {
          // Update streaming message as chunks arrive
          setStreamingMessage(prev => prev + chunk);
        }
      );

      // Parse outfit suggestion from response (now with AI item generation!)
      console.log('🔍 Parsing outfit from chat response...');
      const outfitSuggestion = await parseOutfitFromChat(response, closet);
      console.log('✅ Outfit parsed:', outfitSuggestion);

      if (outfitSuggestion?.aiGeneratedItems) {
        console.log('🤖 AI-generated items detected:', {
          hasTop: !!outfitSuggestion.aiGeneratedItems.top,
          hasBottom: !!outfitSuggestion.aiGeneratedItems.bottom,
          hasShoes: !!outfitSuggestion.aiGeneratedItems.shoes
        });
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        outfitSuggestion: outfitSuggestion || undefined
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
    } finally {
      setIsTyping(false);
    }
  };

  const handlePresetClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    // Remove IDs from text for cleaner display
    const cleanContent = message.content.replace(/\[(?:top|bottom|shoes):\s*[a-f0-9-]+\]/gi, '');

    // Find the items for the outfit suggestion
    // First check closet, then check AI-generated items
    const getItemById = (id: string, category?: 'top' | 'bottom' | 'shoes') => {
      // First try to find in closet
      const closetItem = closet.find(item => item.id === id);
      if (closetItem) return closetItem;

      // If not found and we have AI items, check there
      if (message.outfitSuggestion?.aiGeneratedItems && category) {
        return message.outfitSuggestion.aiGeneratedItems[category];
      }

      return null;
    };

    const topItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.top_id, 'top') : null;
    const bottomItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.bottom_id, 'bottom') : null;
    const shoesItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.shoes_id, 'shoes') : null;

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
      >
        <div
          className={`max-w-[75%] px-4 py-3 rounded-2xl ${isUser
              ? 'bg-primary text-white rounded-br-sm'
              : 'liquid-glass text-text-primary dark:text-gray-200 rounded-bl-sm'
            }`}
        >
          <p className="whitespace-pre-wrap break-words">{sanitizeUserInput(cleanContent)}</p>

          {/* Outfit preview with images */}
          {message.outfitSuggestion && (topItem || bottomItem || shoesItem) && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold opacity-70">Outfit sugerido:</p>
              <div className="grid grid-cols-3 gap-2">
                {topItem && (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img
                      src={topItem.imageDataUrl}
                      alt="Top"
                      className="w-full h-full object-cover"
                    />
                    {topItem.isAIGenerated && (
                      <div className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>auto_awesome</span>
                        AI
                      </div>
                    )}
                  </div>
                )}
                {bottomItem && (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img
                      src={bottomItem.imageDataUrl}
                      alt="Bottom"
                      className="w-full h-full object-cover"
                    />
                    {bottomItem.isAIGenerated && (
                      <div className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>auto_awesome</span>
                        AI
                      </div>
                    )}
                  </div>
                )}
                {shoesItem && (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img
                      src={shoesItem.imageDataUrl}
                      alt="Shoes"
                      className="w-full h-full object-cover"
                    />
                    {shoesItem.isAIGenerated && (
                      <div className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>auto_awesome</span>
                        AI
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  onViewOutfit(
                    message.outfitSuggestion!.top_id,
                    message.outfitSuggestion!.bottom_id,
                    message.outfitSuggestion!.shoes_id,
                    message.outfitSuggestion!.aiGeneratedItems
                  )
                }
                className="mt-2 w-full px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">checkroom</span>
                Ver Outfit Completo
              </button>
              {message.outfitSuggestion?.aiGeneratedItems && (
                <p className="text-xs text-center text-purple-400 dark:text-purple-300 mt-1 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>auto_awesome</span>
                  Incluye items generados por IA
                </p>
              )}
            </div>
          )}

          <p className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-text-secondary dark:text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl h-[90vh] overflow-hidden shadow-2xl animate-fade-in flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onShowConversations}
              className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center transition-transform active:scale-95 shrink-0"
              title="Ver historial de conversaciones"
            >
              <span className="material-symbols-outlined text-text-primary dark:text-gray-200">history</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white">auto_awesome</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-text-primary dark:text-gray-200 truncate">{conversationTitle}</h2>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                {isTyping ? 'Escribiendo...' : 'En línea'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center transition-transform active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">

          {/* Occasion Presets (only show if no user messages yet) */}
          {messages.length === 1 && (
            <div className="mb-6">
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">Sugerencias rápidas:</p>
              <div className="grid grid-cols-2 gap-2">
                {OCCASION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.prompt)}
                    disabled={isTyping}
                    className="px-4 py-2 liquid-glass rounded-xl text-sm font-semibold transition-all active:scale-95 text-text-primary dark:text-gray-200 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(renderMessage)}

          {/* Streaming message */}
          {isTyping && streamingMessage && (
            <div className="flex justify-start mb-4 animate-fade-in">
              <div className="max-w-[75%] px-4 py-3 rounded-2xl liquid-glass text-text-primary dark:text-gray-200 rounded-bl-sm">
                <p className="whitespace-pre-wrap break-words">{sanitizeUserInput(streamingMessage)}</p>
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isTyping && !streamingMessage && (
            <div className="flex justify-start mb-4 animate-fade-in">
              <div className="px-4 py-3 rounded-2xl liquid-glass rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-text-secondary dark:bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-text-secondary dark:bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-text-secondary dark:bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribí tu mensaje..."
              disabled={isTyping}
              className="flex-grow px-4 py-3 liquid-glass rounded-xl border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-gray-200 placeholder-text-secondary dark:placeholder-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center transition-all active:scale-95 shadow-soft shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-white">send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default FashionChatView;
