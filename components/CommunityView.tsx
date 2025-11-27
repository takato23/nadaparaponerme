/**
 * CommunityView - Vista de Amigos (/amigos)
 *
 * Vista completa de la comunidad con:
 * 1. Lista de amigos aceptados con búsqueda
 * 2. Solicitudes pendientes (recibidas y enviadas)
 * 3. Descubrir nuevos usuarios
 * 4. Sección de amigos cercanos
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CommunityUser, ClothingItem } from '../types';
import { Card } from './ui/Card';
import Loader from './Loader';
import { EmptyState } from './ui/EmptyState';
import Skeleton, { ListItemSkeleton } from './ui/Skeleton';
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  getSuggestedUsers,
  searchUsers,
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  removeFriend,
  type FriendWithProfile,
  type PendingRequest,
  type FriendProfile,
} from '../services/friendshipService';

// ===== Types =====

interface CommunityViewProps {
  friends: CommunityUser[];
  onViewFriendCloset: (friend: CommunityUser) => void;
}

type TabType = 'friends' | 'requests' | 'discover';

// ===== Sub-components =====

interface FriendCardProps {
  friend: FriendWithProfile;
  onView: () => void;
  onRemove: () => void;
}

const FriendCard = ({ friend, onView, onRemove }: FriendCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onView}
        className="w-full flex items-center gap-4 liquid-glass p-3 rounded-2xl hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <div className="relative">
          <img
            src={friend.friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friend.username}`}
            alt={friend.friend.display_name || friend.friend.username}
            className="w-14 h-14 object-cover rounded-full ring-2 ring-white dark:ring-gray-800"
          />
          {friend.is_close_friend && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-xs">star</span>
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-text-primary dark:text-gray-200">
            {friend.friend.display_name || friend.friend.username}
          </h3>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            @{friend.friend.username}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-text-secondary">more_vert</span>
        </button>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 liquid-glass rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            <button
              onClick={() => {
                onView();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              Ver perfil
            </button>
            <button
              onClick={() => {
                onRemove();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">person_remove</span>
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

interface RequestCardProps {
  request: PendingRequest;
  type: 'received' | 'sent';
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const RequestCard = ({ request, type, onAccept, onDecline, onCancel, isLoading }: RequestCardProps) => (
  <Card variant="glass" padding="sm" rounded="2xl" className="flex items-center gap-3">
    <img
      src={request.requester.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requester.username}`}
      alt={request.requester.display_name || request.requester.username}
      className="w-12 h-12 object-cover rounded-full"
    />
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-text-primary dark:text-gray-200 truncate">
        {request.requester.display_name || request.requester.username}
      </h3>
      <p className="text-xs text-text-secondary dark:text-gray-400">
        @{request.requester.username}
      </p>
    </div>
    {type === 'received' ? (
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          disabled={isLoading}
          className="px-3 py-1.5 bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold rounded-xl transition-transform active:scale-95 disabled:opacity-50"
        >
          Aceptar
        </button>
        <button
          onClick={onDecline}
          disabled={isLoading}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-text-secondary text-sm font-semibold rounded-xl transition-transform active:scale-95 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    ) : (
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-text-secondary text-sm font-semibold rounded-xl transition-transform active:scale-95 disabled:opacity-50"
      >
        Cancelar
      </button>
    )}
  </Card>
);

interface UserSuggestionCardProps {
  user: FriendProfile;
  onFollow: () => void;
  isLoading?: boolean;
  isSent?: boolean;
}

const UserSuggestionCard = ({ user, onFollow, isLoading, isSent }: UserSuggestionCardProps) => (
  <Card variant="glass" padding="sm" rounded="2xl" className="flex items-center gap-3">
    <img
      src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
      alt={user.display_name || user.username}
      className="w-12 h-12 object-cover rounded-full"
    />
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-text-primary dark:text-gray-200 truncate">
        {user.display_name || user.username}
      </h3>
      <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
        {user.bio || `@${user.username}`}
      </p>
    </div>
    <button
      onClick={onFollow}
      disabled={isLoading || isSent}
      className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
        isSent
          ? 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
          : 'bg-gradient-to-r from-primary to-purple-600 text-white'
      }`}
    >
      {isSent ? 'Enviado' : 'Seguir'}
    </button>
  </Card>
);

// ===== Main Component =====

const CommunityView = ({ friends: propFriends, onViewFriendCloset }: CommunityViewProps) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Data states
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<FriendProfile[]>([]);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());

  // Loading states
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadFriends();
    loadRequests();
    loadSuggestedUsers();
  }, []);

  // Search effect with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Data loaders
  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const data = await getFriends();
      setFriends(data);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const [pending, sent] = await Promise.all([
        getPendingRequests(),
        getSentRequests(),
      ]);
      setPendingRequests(pending);
      setSentRequests(sent);
      setSentRequestIds(new Set(sent.map(r => r.requester.id)));
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadSuggestedUsers = async () => {
    setLoadingSuggested(true);
    try {
      const data = await getSuggestedUsers(15);
      setSuggestedUsers(data);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoadingSuggested(false);
    }
  };

  // Actions
  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const result = await acceptFriendRequest(requestId);
      if (result.success) {
        // Reload both friends and requests
        await Promise.all([loadFriends(), loadRequests()]);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const result = await declineFriendRequest(requestId);
      if (result.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setActionLoading(userId);
    try {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        setSentRequestIds(prev => new Set([...prev, userId]));
        // Reload sent requests
        const sent = await getSentRequests();
        setSentRequests(sent);
      }
    } catch (error) {
      console.error('Error sending request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const result = await removeFriend(friendshipId);
      if (result.success) {
        setFriends(prev => prev.filter(f => f.id !== friendshipId));
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Convert FriendWithProfile to CommunityUser for onViewFriendCloset
  const handleViewFriend = (friend: FriendWithProfile) => {
    const communityUser: CommunityUser = {
      id: friend.friend.id,
      name: friend.friend.display_name || friend.friend.username,
      username: friend.friend.username,
      avatarUrl: friend.friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friend.username}`,
      closet: [], // Will be loaded by FriendProfileView
    };
    onViewFriendCloset(communityUser);
  };

  // Filtered friends based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const query = searchQuery.toLowerCase();
    return friends.filter(
      f =>
        f.friend.username.toLowerCase().includes(query) ||
        (f.friend.display_name?.toLowerCase().includes(query))
    );
  }, [friends, searchQuery]);

  // Close friends
  const closeFriends = useMemo(() => friends.filter(f => f.is_close_friend), [friends]);

  // Tab counts
  const requestsCount = pendingRequests.length;

  return (
    <div className="w-full h-full flex flex-col pt-10 animate-fade-in">
      {/* Header */}
      <header className="px-6 pb-4">
        <h1 className="text-4xl font-bold text-text-primary dark:text-gray-200">Amigos</h1>
        <p className="text-text-secondary dark:text-gray-400 mt-1">
          Conectá con amigas y compartí tu estilo
        </p>
      </header>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar amigas o usuarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-text-primary dark:text-gray-200 placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <span className="material-symbols-outlined text-sm text-text-secondary">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
          {[
            { key: 'friends' as TabType, label: 'Amigas', icon: 'group', count: friends.length },
            { key: 'requests' as TabType, label: 'Solicitudes', icon: 'person_add', count: requestsCount },
            { key: 'discover' as TabType, label: 'Descubrir', icon: 'explore' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto px-4 pb-32">
        {/* Search Results */}
        {searchQuery.trim() && activeTab !== 'discover' && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">search</span>
              Resultados de búsqueda
            </h2>
            {isSearching ? (
              <div className="space-y-2">
                {[1, 2].map(i => <ListItemSkeleton key={i} />)}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map(user => (
                  <UserSuggestionCard
                    key={user.id}
                    user={user}
                    onFollow={() => handleSendRequest(user.id)}
                    isLoading={actionLoading === user.id}
                    isSent={sentRequestIds.has(user.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm text-center py-4">
                No se encontraron usuarios
              </p>
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            {/* Close Friends Section */}
            {closeFriends.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-500 text-lg">star</span>
                  Amigas cercanas
                </h2>
                <div className="space-y-2">
                  {closeFriends.map(friend => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      onView={() => handleViewFriend(friend)}
                      onRemove={() => handleRemoveFriend(friend.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Friends */}
            <div>
              {closeFriends.length > 0 && (
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">group</span>
                  Todas las amigas
                </h2>
              )}

              {loadingFriends ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <ListItemSkeleton key={i} />)}
                </div>
              ) : filteredFriends.length > 0 ? (
                <div className="space-y-2">
                  {filteredFriends
                    .filter(f => !f.is_close_friend)
                    .map(friend => (
                      <FriendCard
                        key={friend.id}
                        friend={friend}
                        onView={() => handleViewFriend(friend)}
                        onRemove={() => handleRemoveFriend(friend.id)}
                      />
                    ))}
                </div>
              ) : (
                <EmptyState
                  icon="group"
                  title={searchQuery ? 'No se encontraron amigas' : 'Aún no tenés amigas'}
                  description={
                    searchQuery
                      ? 'Probá con otros términos de búsqueda'
                      : 'Buscá usuarios o mirá las sugerencias para empezar a conectar'
                  }
                  actionLabel={!searchQuery ? 'Descubrir personas' : undefined}
                  onAction={!searchQuery ? () => setActiveTab('discover') : undefined}
                />
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Received Requests */}
            <div>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">inbox</span>
                Solicitudes recibidas
                {pendingRequests.length > 0 && (
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </h2>

              {loadingRequests ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <ListItemSkeleton key={i} />)}
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-2">
                  {pendingRequests.map(request => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      type="received"
                      onAccept={() => handleAcceptRequest(request.id)}
                      onDecline={() => handleDeclineRequest(request.id)}
                      isLoading={actionLoading === request.id}
                    />
                  ))}
                </div>
              ) : (
                <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">
                    inbox
                  </span>
                  <p className="text-text-secondary text-sm">No tenés solicitudes pendientes</p>
                </Card>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">outbox</span>
                Solicitudes enviadas
                {sentRequests.length > 0 && (
                  <span className="bg-gray-200 dark:bg-gray-700 text-text-secondary text-xs px-2 py-0.5 rounded-full">
                    {sentRequests.length}
                  </span>
                )}
              </h2>

              {loadingRequests ? (
                <div className="space-y-2">
                  {[1].map(i => <ListItemSkeleton key={i} />)}
                </div>
              ) : sentRequests.length > 0 ? (
                <div className="space-y-2">
                  {sentRequests.map(request => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      type="sent"
                      onCancel={() => handleDeclineRequest(request.id)}
                      isLoading={actionLoading === request.id}
                    />
                  ))}
                </div>
              ) : (
                <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">
                    send
                  </span>
                  <p className="text-text-secondary text-sm">No tenés solicitudes enviadas</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Search in Discover */}
            {searchQuery.trim() && (
              <div>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">search</span>
                  Resultados para "{searchQuery}"
                </h2>
                {isSearching ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <ListItemSkeleton key={i} />)}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <UserSuggestionCard
                        key={user.id}
                        user={user}
                        onFollow={() => handleSendRequest(user.id)}
                        isLoading={actionLoading === user.id}
                        isSent={sentRequestIds.has(user.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">
                      search_off
                    </span>
                    <p className="text-text-secondary text-sm">No se encontraron usuarios</p>
                  </Card>
                )}
              </div>
            )}

            {/* Suggestions */}
            {!searchQuery.trim() && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    Sugerencias para vos
                  </h2>
                  <button
                    onClick={loadSuggestedUsers}
                    className="text-xs text-primary font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Actualizar
                  </button>
                </div>

                {loadingSuggested ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <ListItemSkeleton key={i} />)}
                  </div>
                ) : suggestedUsers.length > 0 ? (
                  <div className="space-y-2">
                    {suggestedUsers.map(user => (
                      <UserSuggestionCard
                        key={user.id}
                        user={user}
                        onFollow={() => handleSendRequest(user.id)}
                        isLoading={actionLoading === user.id}
                        isSent={sentRequestIds.has(user.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="explore"
                    title="No hay sugerencias"
                    description="Buscá usuarios por nombre o username para encontrar amigas"
                  />
                )}
              </div>
            )}

            {/* Quick Tips */}
            {!searchQuery.trim() && (
              <Card variant="glass" padding="md" rounded="2xl" className="mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white">tips_and_updates</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary dark:text-gray-200 mb-1">
                      Conectá con más estilo
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Seguí a personas con estilos similares para inspirarte, pedir prendas prestadas y generar outfits juntas.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityView;
