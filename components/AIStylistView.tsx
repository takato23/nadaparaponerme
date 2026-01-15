/**
 * AIStylistView - Estilista IA Premium
 *
 * Interfaz moderna y elegante para el asistente de moda con IA.
 * Diseño profesional inspirado en ChatGPT/Claude.
 *
 * @version 4.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, ChatMessage, ChatConversation } from '../types';
import { chatWithFashionAssistant, parseOutfitFromChat } from '../src/services/aiService';
import { sanitizeUserInput } from '../utils/sanitize';
import { useSubscription } from '../hooks/useSubscription';
import { LimitReachedModal } from './QuotaIndicator';
import { getCreditStatus } from '../services/usageTrackingService';

// ============================================================================
// TYPES
// ============================================================================

interface AIStylistViewProps {
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
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onUpdateTitle: (title: string) => void;
  userName?: string;
}

interface Suggestion {
  id: string;
  icon: string;
  label: string;
  description: string;
  prompt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'work',
    icon: 'work',
    label: 'Oficina',
    description: 'Look profesional para el trabajo',
    prompt: 'Necesito un outfit profesional y elegante para ir a la oficina hoy.',
  },
  {
    id: 'date',
    icon: 'favorite',
    label: 'Cita',
    description: 'Romántico pero casual',
    prompt: 'Armame un look para una primera cita, que sea romántico pero no exagerado.',
  },
  {
    id: 'casual',
    icon: 'weekend',
    label: 'Fin de semana',
    description: 'Cómodo y relajado',
    prompt: 'Quiero un outfit casual y cómodo para salir a pasear.',
  },
  {
    id: 'party',
    icon: 'nightlife',
    label: 'Noche',
    description: 'Para destacar en la fiesta',
    prompt: 'Voy a una fiesta, necesito algo que destaque y sea divertido.',
  },
];

const QUICK_ACTIONS = [
  { id: 'formal', label: 'Más formal', icon: 'straighten' },
  { id: 'casual', label: 'Más casual', icon: 'spa' },
  { id: 'colors', label: 'Cambiar colores', icon: 'palette' },
  { id: 'alternative', label: 'Otra opción', icon: 'autorenew' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const AIStylistView: React.FC<AIStylistViewProps> = ({
  closet,
  onClose,
  onViewOutfit,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onMessagesUpdate,
  onUpdateTitle,
  userName,
}) => {
  // State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Subscription hook for tracking usage
  const subscription = useSubscription();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Computed
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];
  const isNewChat = messages.length <= 1;

  // Get chat credits status - recalculate after each message
  const chatCreditsStatus = useMemo(() => getCreditStatus(), [messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input on mount
  useEffect(() => {
    if (!isNewChat) {
      inputRef.current?.focus();
    }
  }, [isNewChat]);

  // Send message handler
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping || !currentConversation) return;

    // Check if user can use AI feature before proceeding
    const canUseStatus = subscription.canUseAIFeature('fashion_chat');
    if (!canUseStatus.canUse) {
      setShowLimitModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInputValue('');
    setIsTyping(true);
    setStreamingMessage('');

    // Auto-title
    if (messages.filter(m => m.role === 'user').length === 0) {
      const title = text.trim().slice(0, 40) + (text.length > 40 ? '...' : '');
      onUpdateTitle(title);
    }

    try {
      const response = await chatWithFashionAssistant(
        text.trim(),
        closet,
        messages,
        (chunk) => setStreamingMessage(prev => prev + chunk)
      );

      const outfitSuggestion = await parseOutfitFromChat(response, closet);

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        outfitSuggestion: outfitSuggestion || undefined,
      };

      onMessagesUpdate([...updatedMessages, assistantMessage]);
      setStreamingMessage('');

      // Record usage after successful chat
      await subscription.incrementUsage('fashion_chat');
    } catch (error: any) {
      console.error('Error in AIStylistView:', error);

      // Determine specific error message based on error type
      let userFacingError = '¡Ups! Algo salió mal. Intentá de nuevo en unos segundos.';

      const errorMsg = error?.message || String(error);

      if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        userFacingError = '⏳ Demasiadas solicitudes. Por favor esperá unos segundos e intentá de nuevo.';
      } else if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE')) {
        userFacingError = '🔧 El servicio de IA está temporalmente sobrecargado. Intentá de nuevo en unos segundos.';
      } else if (errorMsg.includes('API not configured') || errorMsg.includes('VITE_GEMINI_API_KEY')) {
        userFacingError = '⚠️ El servicio de chat no está configurado correctamente. Contactá al administrador.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        userFacingError = '📶 Error de conexión. Verificá tu conexión a internet e intentá de nuevo.';
      }

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: userFacingError,
        timestamp: Date.now(),
      };
      onMessagesUpdate([...updatedMessages, errorMessage]);
      setStreamingMessage('');
    } finally {
      setIsTyping(false);
    }
  }, [closet, currentConversation, isTyping, messages, onMessagesUpdate, onUpdateTitle, subscription]);

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  // Format date
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  // Get item helper
  const getItem = useCallback((id: string, msg: ChatMessage, cat?: 'top' | 'bottom' | 'shoes') => {
    const item = closet.find(i => i.id === id);
    if (item) return item;
    if (msg.outfitSuggestion?.aiGeneratedItems && cat) {
      return msg.outfitSuggestion.aiGeneratedItems[cat];
    }
    return null;
  }, [closet]);

  // Clean message content (remove IDs)
  const cleanContent = (content: any) => {
    if (typeof content !== 'string') return '';
    return content.replace(/\[(?:top|bottom|shoes):\s*[^\]]+\]/gi, '').trim();
  };

  // Credits progress bar color
  const getCreditsColor = () => {
    if (chatCreditsStatus.limit === -1) return 'bg-emerald-500';
    const percent = (chatCreditsStatus.remaining / chatCreditsStatus.limit) * 100;
    if (percent <= 15) return 'bg-red-500';
    if (percent <= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // ========== RENDER ==========

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex"
      >
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
              >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { onNewConversation(); setShowSidebar(false); }}
                    className="w-full py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-rounded text-lg">add</span>
                    Nueva conversación
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-700 block mb-2">forum</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay conversaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { onSelectConversation(conv.id); setShowSidebar(false); }}
                          className={`group p-3 rounded-lg cursor-pointer transition-all ${conv.id === currentConversationId
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                        >
                          {deleteConfirmId === conv.id ? (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-600 dark:text-red-400">¿Eliminar?</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); setDeleteConfirmId(null); }}
                                  className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                  className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-rounded text-gray-400 text-lg mt-0.5">chat_bubble_outline</span>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {conv.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(conv.updatedAt)}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                              >
                                <span className="material-symbols-rounded text-gray-400 text-lg">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-rounded text-gray-600 dark:text-gray-400">menu</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="material-symbols-rounded text-white text-lg">checkroom</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">Estilista IA</span>
              </div>
            </div>

            {/* Credits Indicator - PROMINENT */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-gray-500 dark:text-gray-400 text-lg">toll</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {chatCreditsStatus.limit === -1 ? (
                        'Ilimitado'
                      ) : (
                        <>
                          <span className={chatCreditsStatus.remaining <= 5 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                            {chatCreditsStatus.remaining}
                          </span>
                          <span className="text-gray-400 mx-0.5">/</span>
                          <span>{chatCreditsStatus.limit}</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-gray-400">mensajes</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                {chatCreditsStatus.limit !== -1 && (
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCreditsColor()} rounded-full transition-all`}
                      style={{ width: `${(chatCreditsStatus.remaining / chatCreditsStatus.limit) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-rounded text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto">
            {isNewChat ? (
              /* Welcome Screen */
              <div className="h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center mb-10"
                >
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-500/20">
                    <span className="material-symbols-rounded text-white text-3xl">checkroom</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {userName ? `¡Hola, ${userName}!` : 'Tu Estilista Personal'}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Contame qué tenés planeado y te ayudo a armar el outfit perfecto usando las prendas de tu armario.
                  </p>
                </motion.div>

                {/* Suggestion Cards */}
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUGGESTIONS.map((sug, i) => (
                    <motion.button
                      key={sug.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSend(sug.prompt)}
                      disabled={isTyping}
                      className="p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all disabled:opacity-50 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                          <span className="material-symbols-rounded text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {sug.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{sug.label}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{sug.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Closet info */}
                <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
                  <span className="material-symbols-rounded text-lg">inventory_2</span>
                  <span>{closet.length} prendas en tu armario</span>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="max-w-3xl mx-auto p-4 space-y-6">
                {messages.map(msg => {
                  const isUser = msg.role === 'user';
                  const content = cleanContent(msg.content);
                  const outfit = msg.outfitSuggestion;
                  const top = outfit ? getItem(outfit.top_id, msg, 'top') : null;
                  const bottom = outfit ? getItem(outfit.bottom_id, msg, 'bottom') : null;
                  const shoes = outfit ? getItem(outfit.shoes_id, msg, 'shoes') : null;
                  const hasOutfit = top || bottom || shoes;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${isUser
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                        }`}>
                        <span className={`material-symbols-rounded text-lg ${isUser ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>
                          {isUser ? 'person' : 'checkroom'}
                        </span>
                      </div>

                      {/* Message */}
                      <div className={`flex-1 ${isUser ? 'max-w-[80%]' : ''}`}>
                        <div className={`rounded-2xl px-4 py-3 ${isUser
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 ml-auto'
                          : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
                          }`}>
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                            {sanitizeUserInput(content)}
                          </p>
                        </div>

                        {/* Outfit Preview */}
                        {hasOutfit && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-rounded text-violet-500 text-sm">style</span>
                              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                Outfit sugerido
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {[
                                { item: top, label: 'Top' },
                                { item: bottom, label: 'Bottom' },
                                { item: shoes, label: 'Calzado' }
                              ].map(({ item, label }, idx) => item && (
                                <div key={idx} className="space-y-1.5">
                                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-600">
                                    <img src={item.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                    {item.isAIGenerated && (
                                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] rounded font-medium">
                                        AI
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => onViewOutfit(outfit!.top_id, outfit!.bottom_id, outfit!.shoes_id, outfit!.aiGeneratedItems)}
                              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-rounded text-lg">view_in_ar</span>
                              Ver outfit completo
                            </button>
                          </motion.div>
                        )}

                        <p className={`text-[10px] mt-1.5 px-1 text-gray-400 ${isUser ? 'text-right' : ''}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Streaming message */}
                {isTyping && streamingMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-rounded text-white text-lg">checkroom</span>
                    </div>
                    <div className="flex-1">
                      <div className="rounded-2xl px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <p className="text-[15px]">{sanitizeUserInput(streamingMessage)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Typing indicator */}
                {isTyping && !streamingMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-rounded text-white text-lg">checkroom</span>
                    </div>
                    <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex gap-1.5">
                        {[0, 150, 300].map((delay, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Actions */}
                {!isTyping && messages.length > 1 && messages[messages.length - 1]?.outfitSuggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 justify-center py-2"
                  >
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleSend(`Hacelo ${action.label.toLowerCase()}`)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-rounded text-sm">{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí tu mensaje..."
                    disabled={isTyping}
                    rows={1}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl resize-none text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-sm disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-rounded">send</span>
                </button>
              </div>

              {/* Credits warning */}
              {chatCreditsStatus.limit !== -1 && chatCreditsStatus.remaining <= 5 && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
                  <span className="material-symbols-rounded text-sm">warning</span>
                  Te quedan {chatCreditsStatus.remaining} mensajes este mes
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          // Could trigger upgrade flow here
        }}
        tier={subscription.tier}
      />
    </motion.div>
  );
};

export default AIStylistView;
