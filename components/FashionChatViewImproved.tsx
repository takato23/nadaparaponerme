import React, { useState, useRef, useEffect } from 'react';
import type { ClothingItem, ChatMessage, ChatConversation } from '../types';
import { chatWithFashionAssistant, parseOutfitFromChat } from '../src/services/aiService';
import { sanitizeUserInput } from '../utils/sanitize';

interface FashionChatViewImprovedProps {
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (topId: string, bottomId: string, shoesId: string) => void;
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onUpdateTitle: (title: string) => void;
}

const OCCASION_PRESETS = [
  { label: 'Entrevista', prompt: 'Necesito un outfit para una entrevista de trabajo' },
  { label: 'Primera Cita', prompt: 'Quiero un look para una primera cita' },
  { label: 'Casual', prompt: 'Dame un outfit casual para el día a día' },
  { label: 'Formal', prompt: 'Necesito vestirme formal para un evento' },
];

const FashionChatViewImproved = ({
  closet,
  onClose,
  onViewOutfit,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onMessagesUpdate,
  onUpdateTitle
}: FashionChatViewImprovedProps) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];
  const conversationTitle = currentConversation?.title || 'Nueva Conversación';

  // Filter conversations by search
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Swipe gesture handlers
  const minSwipeDistance = 50;
  const edgeSwipeZone = 50; // 50px from left edge to trigger drawer open

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Close sidebar on left swipe (when sidebar is open)
    if (isLeftSwipe && showSidebar) {
      setShowSidebar(false);
    }

    // Open sidebar on right swipe from left edge
    if (isRightSwipe && !showSidebar && touchStart < edgeSwipeZone) {
      setShowSidebar(true);
    }

    setIsSwiping(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping || !currentConversation) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInputValue('');
    setIsTyping(true);
    setStreamingMessage('');

    // Auto-generate title from first user message
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
          setStreamingMessage(prev => prev + chunk);
        }
      );

      // Parse outfit suggestion from response
      console.log('🔍 Parsing outfit from chat response...');
      const outfitSuggestion = await parseOutfitFromChat(response, closet);

      if (outfitSuggestion) {
        console.log('✅ Outfit parsed successfully:', {
          top: outfitSuggestion.top_id.substring(0, 20) + '...',
          bottom: outfitSuggestion.bottom_id.substring(0, 20) + '...',
          shoes: outfitSuggestion.shoes_id.substring(0, 20) + '...'
        });
      } else {
        console.warn('⚠️ Chat response did not contain valid outfit IDs');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        outfitSuggestion: outfitSuggestion || undefined
      };

      onMessagesUpdate([...updatedMessages, assistantMessage]);
      setStreamingMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intentá de nuevo.',
        timestamp: Date.now()
      };
      onMessagesUpdate([...updatedMessages, errorMessage]);
      setStreamingMessage('');
    } finally {
      setIsTyping(false);
    }
  };

  const handlePresetClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(conversationId);
  };

  const confirmDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(conversationId);
    setShowDeleteConfirm(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(null);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const cleanContent = message.content.replace(/\[(?:top|bottom|shoes):\s*[a-f0-9-]+\]/gi, '');

    // Find items in closet by ID
    const getItemById = (id: string) => closet.find(item => item.id === id);

    const topItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.top_id) : null;
    const bottomItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.bottom_id) : null;
    const shoesItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.shoes_id) : null;

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}
      >
        <div
          className={`max-w-[75%] px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-primary text-white rounded-br-sm'
              : 'liquid-glass text-text-primary dark:text-gray-200 rounded-bl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{sanitizeUserInput(cleanContent)}</p>

          {message.outfitSuggestion && (topItem || bottomItem || shoesItem) && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold opacity-70">Outfit sugerido:</p>
              <div className="grid grid-cols-3 gap-2">
                {topItem && (
                  <div className="aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img src={topItem.imageDataUrl} alt="Top" className="w-full h-full object-cover" />
                  </div>
                )}
                {bottomItem && (
                  <div className="aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img src={bottomItem.imageDataUrl} alt="Bottom" className="w-full h-full object-cover" />
                  </div>
                )}
                {shoesItem && (
                  <div className="aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img src={shoesItem.imageDataUrl} alt="Shoes" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onViewOutfit(
                    message.outfitSuggestion!.top_id,
                    message.outfitSuggestion!.bottom_id,
                    message.outfitSuggestion!.shoes_id
                  );
                }}
                className="mt-2 w-full px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">checkroom</span>
                Ver Outfit Completo
              </button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="relative w-full h-full md:h-[95vh] md:max-w-7xl md:rounded-3xl overflow-hidden shadow-2xl animate-fade-in flex bg-white dark:bg-gray-900"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

        {/* Mobile Overlay - must be inside container and before sidebar */}
        {showSidebar && (
          <div
            onClick={() => setShowSidebar(false)}
            className="md:hidden absolute inset-0 bg-black/50 z-20"
          />
        )}

        {/* Swipe indicator - subtle edge hint for mobile */}
        {!showSidebar && (
          <div className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-1 h-16 bg-gradient-to-r from-primary/30 to-transparent rounded-r-full" />
          </div>
        )}

        {/* Sidebar/Drawer - Desktop: always visible, Mobile: toggle */}
        <div
          className={`${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 absolute md:relative z-30 w-80 h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-200">Conversaciones</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="md:hidden w-8 h-8 rounded-full liquid-glass flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 text-sm liquid-glass rounded-xl border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-gray-200"
              />
            </div>

            {/* New Conversation Button */}
            <button
              onClick={() => {
                onNewConversation();
                setShowSidebar(false);
              }}
              className="mt-3 w-full px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nueva Conversación
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-gray-400">chat_bubble_outline</span>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                  {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    setShowSidebar(false);
                  }}
                  className={`relative p-3 rounded-xl cursor-pointer transition-all ${
                    conversation.id === currentConversationId
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'liquid-glass hover:shadow-md'
                  }`}
                >
                  {showDeleteConfirm === conversation.id ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => confirmDelete(conversation.id, e)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded-lg text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleDeleteClick(conversation.id, e)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10"
                      >
                        <span className="material-symbols-outlined text-xs text-red-500">delete</span>
                      </button>

                      <h4 className="font-semibold text-sm text-text-primary dark:text-gray-200 mb-1 pr-8 truncate">
                        {conversation.title}
                      </h4>

                      {conversation.preview && (
                        <p className="text-xs text-text-secondary dark:text-gray-400 line-clamp-2 mb-2">
                          {conversation.preview}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-500">
                        <span>{conversation.messages.length} mensajes</span>
                        <span>{formatDate(conversation.updatedAt)}</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden w-10 h-10 rounded-full liquid-glass flex items-center justify-center"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">auto_awesome</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-text-primary dark:text-gray-200 truncate">
                  {conversationTitle}
                </h2>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  {isTyping ? 'Escribiendo...' : 'En línea'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Occasion Presets */}
            {messages.length === 1 && (
              <div className="mb-6">
                <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">Sugerencias rápidas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {OCCASION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset.prompt)}
                      disabled={isTyping}
                      className="px-4 py-2 liquid-glass rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(renderMessage)}

            {isTyping && streamingMessage && (
              <div className="flex justify-start mb-4 animate-fade-in">
                <div className="max-w-[75%] px-4 py-3 rounded-2xl liquid-glass text-text-primary dark:text-gray-200 rounded-bl-sm">
                  <p className="whitespace-pre-wrap break-words">{sanitizeUserInput(streamingMessage)}</p>
                </div>
              </div>
            )}

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
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
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
                placeholder="Escribe tu mensaje..."
                disabled={isTyping}
                className="flex-1 px-4 py-3 liquid-glass rounded-xl border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-gray-200 placeholder-text-secondary dark:placeholder-gray-500 disabled:opacity-50"
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
    </div>
  );
};

export default FashionChatViewImproved;
