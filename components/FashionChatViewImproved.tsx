import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const edgeSwipeZone = 50;

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

    if (isLeftSwipe && showSidebar) {
      setShowSidebar(false);
    }

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

      const outfitSuggestion = await parseOutfitFromChat(response, closet);

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

    const getItemById = (id: string) => closet.find(item => item.id === id);

    const topItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.top_id) : null;
    const bottomItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.bottom_id) : null;
    const shoesItem = message.outfitSuggestion ? getItemById(message.outfitSuggestion.shoes_id) : null;

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      >
        <div
          className={`max-w-[85%] md:max-w-[80%] px-5 py-4 rounded-3xl shadow-sm ${isUser
            ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-sm shadow-lg shadow-purple-500/20'
            : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
            }`}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{sanitizeUserInput(cleanContent)}</p>

          {message.outfitSuggestion && (topItem || bottomItem || shoesItem) && (
            <div className="mt-4 space-y-3 bg-white/40 dark:bg-black/10 rounded-2xl p-3 border border-white/30">
              <p className="text-xs font-bold opacity-80 uppercase tracking-wider flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined text-sm">checkroom</span>
                Outfit Sugerido
              </p>
              <div className="grid grid-cols-3 gap-2">
                {topItem && (
                  <div className="aspect-square rounded-xl overflow-hidden bg-white/50 shadow-sm border border-white/20">
                    <img src={topItem.imageDataUrl} alt="Top" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                {bottomItem && (
                  <div className="aspect-square rounded-xl overflow-hidden bg-white/50 shadow-sm border border-white/20">
                    <img src={bottomItem.imageDataUrl} alt="Bottom" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                {shoesItem && (
                  <div className="aspect-square rounded-xl overflow-hidden bg-white/50 shadow-sm border border-white/20">
                    <img src={shoesItem.imageDataUrl} alt="Shoes" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
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
                className="w-full py-2.5 bg-white/50 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-purple-700 dark:text-purple-300 border border-white/40"
              >
                Probador Virtual
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}

          <p className={`text-[10px] mt-2 text-right ${isUser ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end isolate pointer-events-none">
      {/* Backdrop - Visible only on mobile for closing */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] md:hidden pointer-events-auto"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full md:w-[400px] h-full liquid-glass border-l border-white/20 flex flex-col overflow-hidden pointer-events-auto md:mt-0 md:mr-0 shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

        {/* Sidebar (History) Overlay */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-20 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-serif">Historial</h3>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    onNewConversation();
                    setShowSidebar(false);
                  }}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Nueva Conversación
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-400">forum</span>
                    <p className="text-sm text-gray-500">No hay conversaciones</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        onSelectConversation(conversation.id);
                        setShowSidebar(false);
                      }}
                      className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${conversation.id === currentConversationId
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md'
                        }`}
                    >
                      {showDeleteConfirm === conversation.id ? (
                        <div className="flex gap-2 justify-end items-center h-full">
                          <span className="text-xs font-medium mr-auto text-red-500">¿Eliminar?</span>
                          <button
                            onClick={(e) => confirmDelete(conversation.id, e)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold"
                          >
                            Si
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs font-bold"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleDeleteClick(conversation.id, e)}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center group transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-red-500 transition-colors">delete</span>
                          </button>

                          <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1 pr-8 truncate">
                            {conversation.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                            {conversation.preview || 'Nueva conversación...'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                            <span>{conversation.messages.length} msgs</span>
                            <span>{formatDate(conversation.updatedAt)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Header */}
        <div className="px-6 py-5 border-b border-white/20 dark:border-gray-700/30 flex items-center justify-between shrink-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setShowSidebar(true)}
              className="w-10 h-10 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 flex items-center justify-center transition-colors border border-white/20"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">history</span>
            </button>

            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate flex items-center gap-2 font-serif">
                {conversationTitle}
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {isTyping ? 'Escribiendo...' : 'Asistente de Estilo'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 flex items-center justify-center transition-all border border-white/20"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-white/30 dark:bg-black/10 backdrop-blur-sm custom-scrollbar">
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 animate-float">
                  <span className="material-symbols-outlined text-4xl text-white">auto_awesome</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-serif">¡Hola!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm max-w-xs mx-auto">
                  Soy tu estilista personal con IA. Estoy lista para ayudarte a combinar tus prendas y darte consejos de moda.
                </p>
              </div>

              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Sugerencias</p>
              <div className="grid grid-cols-2 gap-3">
                {OCCASION_PRESETS.map((preset, idx) => (
                  <motion.button
                    key={preset.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handlePresetClick(preset.prompt)}
                    disabled={isTyping}
                    className="p-4 bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700 rounded-3xl hover:shadow-lg hover:shadow-purple-500/10 transition-all group flex flex-col items-center justify-center text-center aspect-[4/3]"
                  >
                    <span className="block font-bold text-gray-800 dark:text-gray-200 text-sm mb-1 group-hover:text-purple-600 transition-colors">{preset.label}</span>
                    <span className="block text-[10px] text-gray-500 line-clamp-2">{preset.prompt}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map(renderMessage)}

          {isTyping && streamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-6"
            >
              <div className="max-w-[85%] px-5 py-4 rounded-3xl rounded-bl-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-sm">
                <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{sanitizeUserInput(streamingMessage)}</p>
              </div>
            </motion.div>
          )}

          {isTyping && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-6"
            >
              <div className="px-5 py-4 rounded-3xl rounded-bl-sm bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-white/20 dark:border-gray-700/30 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="relative flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder="Escribe un mensaje..."
                disabled={isTyping}
                rows={1}
                className="w-full pl-5 pr-12 py-4 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-white/30 dark:border-gray-600/30 focus:ring-2 focus:ring-purple-500/50 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none min-h-[56px] max-h-[120px] transition-all text-sm shadow-inner"
                style={{
                  height: 'auto',
                  scrollbarWidth: 'none'
                }}
              />
              <div className="absolute right-2 bottom-2">
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </form>
          <p className="text-[10px] text-center text-gray-400 mt-3">
            La IA puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FashionChatViewImproved;
