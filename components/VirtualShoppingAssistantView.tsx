import React, { useState, useRef, useEffect } from 'react';
import type { ClothingItem, ShoppingGap, ShoppingRecommendation, ShoppingChatMessage, ShoppingProduct } from '../types';
import Loader from './Loader';
import { sanitizeUserInput } from '../utils/sanitize';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface VirtualShoppingAssistantViewProps {
  onClose: () => void;
  closet: ClothingItem[];
  onAnalyzeGaps: () => Promise<void>;
  onGenerateRecommendations: () => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  chatMessages: ShoppingChatMessage[];
  currentGaps?: ShoppingGap[];
  currentRecommendations?: ShoppingRecommendation[];
  isTyping: boolean;
  isAnalyzing: boolean;
}

export default function VirtualShoppingAssistantView({
  onClose,
  closet,
  onAnalyzeGaps,
  onGenerateRecommendations,
  onSendMessage,
  chatMessages,
  currentGaps,
  currentRecommendations,
  isTyping,
  isAnalyzing
}: VirtualShoppingAssistantViewProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [selectedView, setSelectedView] = useState<'chat' | 'gaps' | 'recommendations'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && selectedView === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedView]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'ahora';
    if (minutes < 60) return `hace ${minutes}m`;
    if (minutes < 1440) return `hace ${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const allProducts = currentRecommendations?.flatMap(rec => rec.products) || [];
  const totalBudget = allProducts.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card variant="glass" padding="none" rounded="3xl" className="w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">
              🛍️ Asistente de Compras Virtual
            </h2>
            <p className="text-sm text-white/60">
              {closet.length} prendas analizadas
              {currentGaps && ` • ${currentGaps.length} gaps identificados`}
              {currentRecommendations && ` • ${allProducts.length} productos sugeridos`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl hover:bg-white/10 transition-all"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-white/10">
          <button
            onClick={() => setSelectedView('chat')}
            className={`px-4 py-2 rounded-t-xl font-medium transition-all ${
              selectedView === 'chat'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setSelectedView('gaps')}
            className={`px-4 py-2 rounded-t-xl font-medium transition-all ${
              selectedView === 'gaps'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            🔍 Gaps ({currentGaps?.length || 0})
          </button>
          <button
            onClick={() => setSelectedView('recommendations')}
            className={`px-4 py-2 rounded-t-xl font-medium transition-all ${
              selectedView === 'recommendations'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            ⭐ Recomendaciones ({allProducts.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Chat View */}
          {selectedView === 'chat' && (
            <div className="space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛍️</div>
                  <h3 className="text-xl font-semibold mb-2">¡Hola! Soy tu asistente de compras</h3>
                  <p className="text-white/60 mb-6 max-w-md mx-auto">
                    Te ayudo a encontrar las prendas perfectas para completar tu armario.
                    Podés preguntarme sobre gaps, recomendaciones o productos específicos.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={onAnalyzeGaps}
                      disabled={isAnalyzing}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left"
                    >
                      <div className="text-2xl mb-2">🔍</div>
                      <div className="font-semibold">Analizar gaps</div>
                      <div className="text-sm text-white/60">Encuentra qué te falta</div>
                    </button>
                    <button
                      onClick={onGenerateRecommendations}
                      disabled={isAnalyzing || !currentGaps}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left disabled:opacity-50"
                    >
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="font-semibold">Ver recomendaciones</div>
                      <div className="text-sm text-white/60">Productos sugeridos</div>
                    </button>
                  </div>
                </div>
              ) : (
                <div ref={messagesContainerRef} className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'bg-purple-500/20 border border-purple-400/30'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            <span>Asistente</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{sanitizeUserInput(msg.content)}</p>
                        <div className="text-xs text-white/40 mt-2">
                          {formatTimestamp(msg.timestamp)}
                        </div>

                        {/* Products in message */}
                        {msg.products && msg.products.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            {msg.products.slice(0, 4).map((product) => (
                              <a
                                key={product.id}
                                href={product.shop_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs"
                              >
                                <div className="font-semibold truncate">{product.title}</div>
                                <div className="text-white/60">{product.brand}</div>
                                <div className="text-purple-400 font-semibold">
                                  ${product.price.toLocaleString('es-AR')}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Gaps View */}
          {selectedView === 'gaps' && (
            <div className="space-y-4">
              {!currentGaps ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2">Analiza los gaps de tu armario</h3>
                  <p className="text-white/60 mb-6">
                    Descubrí qué prendas te faltan para maximizar tu versatilidad
                  </p>
                  <button
                    onClick={onAnalyzeGaps}
                    disabled={isAnalyzing}
                    className="px-6 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-all font-semibold disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Analizando...' : 'Analizar gaps'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {currentGaps.length} gaps identificados
                    </h3>
                    <button
                      onClick={onAnalyzeGaps}
                      disabled={isAnalyzing}
                      className="text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      🔄 Actualizar
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {currentGaps
                      .sort((a, b) => {
                        const priorityOrder = { essential: 0, recommended: 1, optional: 2 };
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                      })
                      .map((gap) => (
                        <div
                          key={gap.id}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={gap.priority === 'essential' ? 'error' : gap.priority === 'recommended' ? 'warning' : 'info'}
                                  size="sm"
                                >
                                  {gap.priority === 'essential' ? '⚠️ Esencial' : gap.priority === 'recommended' ? '⭐ Recomendado' : '💡 Opcional'}
                                </Badge>
                                <span className="text-xs text-white/50">
                                  {gap.category} • {gap.color_suggestion}
                                </span>
                              </div>
                              <h4 className="text-lg font-semibold">{gap.subcategory}</h4>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-purple-400">
                                +{gap.versatility_impact}% versatilidad
                              </div>
                              <div className="text-xs text-white/50">{gap.estimated_budget}</div>
                            </div>
                          </div>

                          <p className="text-sm text-white/70 mb-3">{gap.reasoning}</p>

                          <div className="flex flex-wrap gap-2">
                            {gap.occasions.map((occasion, idx) => (
                              <Badge key={idx} variant="default" size="sm">
                                {occasion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Recommendations View */}
          {selectedView === 'recommendations' && (
            <div className="space-y-4">
              {!currentRecommendations || currentRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⭐</div>
                  <h3 className="text-xl font-semibold mb-2">
                    {!currentGaps ? 'Primero analiza los gaps' : 'Genera recomendaciones'}
                  </h3>
                  <p className="text-white/60 mb-6">
                    {!currentGaps
                      ? 'Necesitás analizar los gaps antes de ver recomendaciones'
                      : 'Obtené sugerencias de productos específicos para llenar tus gaps'}
                  </p>
                  <button
                    onClick={currentGaps ? onGenerateRecommendations : onAnalyzeGaps}
                    disabled={isAnalyzing}
                    className="px-6 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-all font-semibold disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Generando...' : currentGaps ? 'Generar recomendaciones' : 'Analizar gaps'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {currentRecommendations.length} recomendaciones
                      </h3>
                      <p className="text-sm text-white/60">
                        {allProducts.length} productos • Total: ${totalBudget.toLocaleString('es-AR')}
                      </p>
                    </div>
                    <button
                      onClick={onGenerateRecommendations}
                      disabled={isAnalyzing}
                      className="text-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                    >
                      🔄 Actualizar
                    </button>
                  </div>

                  <div className="space-y-6">
                    {currentRecommendations
                      .sort((a, b) => a.priority_order - b.priority_order)
                      .map((rec) => (
                        <div
                          key={rec.gap.id}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10"
                        >
                          {/* Gap Header */}
                          <div className="mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">#{rec.priority_order}</span>
                              <h4 className="text-lg font-semibold">{rec.gap.subcategory}</h4>
                              <span className="text-xs text-white/50">
                                • {rec.gap.color_suggestion}
                              </span>
                            </div>
                            <p className="text-sm text-white/70">{rec.strategy_note}</p>
                          </div>

                          {/* Products Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rec.products.map((product) => (
                              <a
                                key={product.id}
                                href={product.shop_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-purple-400/30"
                              >
                                <div className="aspect-[3/4] mb-3 rounded-lg bg-white/5 overflow-hidden">
                                  <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <h5 className="font-semibold text-sm mb-1 line-clamp-2">
                                  {product.title}
                                </h5>
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="text-white/60">{product.brand}</span>
                                  <Badge
                                    variant={
                                      product.estimated_quality === 'premium' ? 'warning' :
                                      product.estimated_quality === 'mid-range' ? 'info' : 'success'
                                    }
                                    size="sm"
                                  >
                                    {product.estimated_quality}
                                  </Badge>
                                </div>
                                <div className="text-purple-400 font-bold">
                                  ${product.price.toLocaleString('es-AR')}
                                </div>
                                <p className="text-xs text-white/50 mt-2 line-clamp-2">
                                  {product.match_reasoning}
                                </p>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          )}
        </div>

        {/* Chat Input (only visible in chat view) */}
        {selectedView === 'chat' && (
          <div className="p-6 border-t border-white/10">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Preguntame sobre compras, gaps, recomendaciones..."
                className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-400/50 focus:outline-none transition-all"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="px-6 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 hover:bg-purple-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>

            {/* Quick Actions */}
            {chatMessages.length > 0 && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onAnalyzeGaps}
                  disabled={isAnalyzing}
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  🔍 Analizar gaps
                </button>
                <button
                  onClick={onGenerateRecommendations}
                  disabled={isAnalyzing || !currentGaps}
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  ⭐ Ver recomendaciones
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
