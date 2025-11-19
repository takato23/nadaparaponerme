import React, { useState, useMemo } from 'react';
import type { ChatConversation } from '../types';

interface ChatConversationsViewProps {
  conversations: ChatConversation[];
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onClose: () => void;
}

const ChatConversationsView = ({
  conversations,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose
}: ChatConversationsViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Sort conversations by most recent first
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations]);

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return sortedConversations;
    const query = searchQuery.toLowerCase();
    return sortedConversations.filter(conv =>
      conv.title.toLowerCase().includes(query) ||
      conv.preview?.toLowerCase().includes(query)
    );
  }, [searchQuery, sortedConversations]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short'
      });
    }
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl h-[90vh] overflow-hidden shadow-2xl animate-fade-in flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white">forum</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary dark:text-gray-200">Conversaciones</h2>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                {conversations.length} {conversations.length === 1 ? 'conversación' : 'conversaciones'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-10 pr-4 py-2 liquid-glass rounded-xl border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-gray-200 placeholder-text-secondary dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* New Conversation Button */}
        <div className="px-6 py-4 shrink-0">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full px-4 py-3 bg-primary text-white rounded-xl font-semibold transition-all active:scale-95 shadow-soft shadow-primary/30 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Nueva Conversación
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-grow overflow-y-auto px-6 pb-6">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-gray-400">chat_bubble_outline</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-2">
                {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
              </h3>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-4">
                {searchQuery
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Inicia una nueva conversación con tu asistente de moda'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    onClose();
                  }}
                  className="liquid-glass p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md active:scale-98 relative"
                >
                  {/* Delete Button */}
                  {showDeleteConfirm === conversation.id ? (
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                      <button
                        onClick={(e) => confirmDelete(conversation.id, e)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold transition-transform active:scale-95"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="px-3 py-1 bg-gray-300 dark:bg-gray-700 text-text-primary dark:text-gray-200 rounded-lg text-xs font-semibold transition-transform active:scale-95"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteClick(conversation.id, e)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/50 dark:bg-gray-800/50 flex items-center justify-center transition-transform active:scale-95 z-10"
                    >
                      <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                    </button>
                  )}

                  {/* Conversation Title */}
                  <h3 className="font-semibold text-text-primary dark:text-gray-200 mb-1 pr-10">
                    {conversation.title}
                  </h3>

                  {/* Preview */}
                  {conversation.preview && (
                    <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2 mb-2">
                      {conversation.preview}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">forum</span>
                      <span>{conversation.messages.length} mensajes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{formatDate(conversation.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ChatConversationsView;
