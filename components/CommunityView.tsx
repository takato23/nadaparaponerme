import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CommunityUser } from '../types';
import Loader from './Loader';
import { EmptyState } from './ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getSuggestedUsers,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type FriendProfile,
  type FriendWithProfile,
  type PendingRequest,
} from '../src/services/friendshipService';
import { getSafePublicDisplayName } from '../src/utils/publicProfile';

interface CommunityViewProps {
  friends: CommunityUser[];
  onViewFriendCloset: (friend: CommunityUser) => void;
}

type CommunityTab = 'friends' | 'requests' | 'discover';

type SearchState = {
  loading: boolean;
  results: FriendProfile[];
  error: string | null;
};

const LOAD_TIMEOUT_MS = 10000;
const SEARCH_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

function toCommunityUser(profile: FriendProfile): CommunityUser {
  const displayName = getSafePublicDisplayName(profile.display_name, profile.username);
  return {
    id: profile.id,
    name: displayName,
    username: profile.username,
    avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E5E7EB&color=1F2937`,
    closet: [],
    badges: profile.badges,
  };
}

function getInitials(profile: FriendProfile): string {
  const source = getSafePublicDisplayName(profile.display_name, profile.username, 'U');
  return source.slice(0, 1).toUpperCase();
}

function ProfileAvatar({ profile }: { profile: FriendProfile }) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = getSafePublicDisplayName(profile.display_name, profile.username);

  if (profile.avatar_url && !imageFailed) {
    return (
      <img
        src={profile.avatar_url}
        alt={displayName}
        className="h-14 w-14 rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#101828] text-lg font-semibold text-white">
      {getInitials(profile)}
    </div>
  );
}

function getRelationLabel(
  profileId: string,
  friends: FriendWithProfile[],
  pendingRequests: PendingRequest[],
  sentRequests: PendingRequest[]
): { label: string; disabled: boolean } {
  if (friends.some((entry) => entry.friend.id === profileId)) {
    return { label: 'Amigas', disabled: true };
  }

  if (pendingRequests.some((entry) => entry.requester.id === profileId)) {
    return { label: 'Te envió solicitud', disabled: true };
  }

  if (sentRequests.some((entry) => entry.requester.id === profileId)) {
    return { label: 'Solicitud enviada', disabled: true };
  }

  return { label: 'Agregar', disabled: false };
}

export default function CommunityView({ onViewFriendCloset }: CommunityViewProps) {
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<CommunityTab>('friends');
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<FriendProfile[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    loading: false,
    results: [],
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const loadRequestRef = React.useRef(0);

  const loadCommunity = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setSuggestedUsers([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);

    const watchdog = window.setTimeout(() => {
      if (loadRequestRef.current !== requestId) return;
      setLoading(false);
      setLoadError('La comunidad está tardando más de lo esperado. Reintentá en unos segundos.');
    }, LOAD_TIMEOUT_MS);

    try {
      const [friendRows, pendingRows, sentRows, suggestedRows] = await withTimeout(
        Promise.all([
          getFriends(),
          getPendingRequests(),
          getSentRequests(),
          getSuggestedUsers(12),
        ]),
        LOAD_TIMEOUT_MS,
        'CommunityView.loadCommunity'
      );

      if (loadRequestRef.current !== requestId) return;
      setFriends(friendRows);
      setPendingRequests(pendingRows);
      setSentRequests(sentRows);
      setSuggestedUsers(suggestedRows);
    } catch (error) {
      if (loadRequestRef.current !== requestId) return;
      console.error('Failed to load community view:', error);
      setLoadError('No pude cargar amigas, solicitudes y sugerencias.');
    } finally {
      window.clearTimeout(watchdog);
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void loadCommunity();
  }, [authLoading, loadCommunity]);

  useEffect(() => {
    if (authLoading) return;
    const trimmed = query.trim();
    if (!user || trimmed.length < 2) {
      setSearchState({ loading: false, results: [], error: null });
      return;
    }

    let cancelled = false;
    setSearchState((prev) => ({ ...prev, loading: true, error: null }));

    const timeoutId = window.setTimeout(() => {
      void withTimeout(searchUsers(trimmed), SEARCH_TIMEOUT_MS, 'CommunityView.searchUsers')
        .then((results) => {
          if (cancelled) return;
          setSearchState({ loading: false, results, error: null });
          setActiveTab('discover');
        })
        .catch((error) => {
          if (cancelled) return;
          console.error('Failed to search users:', error);
          setSearchState({
            loading: false,
            results: [],
            error: 'No pude completar la búsqueda ahora mismo.',
          });
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authLoading, query, user]);

  const discoverUsers = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) return searchState.results;
    return suggestedUsers;
  }, [query, searchState.results, suggestedUsers]);

  const handleOpenProfile = useCallback((profile: FriendProfile) => {
    onViewFriendCloset(toCommunityUser(profile));
  }, [onViewFriendCloset]);

  const handleSendRequest = useCallback(async (profile: FriendProfile) => {
    const actionId = `send:${profile.id}`;
    setActionKey(actionId);
    try {
      const result = await sendFriendRequest(profile.id);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo enviar la solicitud');
      }
      toast.success('Solicitud enviada');
      setSentRequests((prev) => [
        {
          id: `sent-${profile.id}`,
          requester: profile,
          created_at: new Date().toISOString(),
        },
        ...prev.filter((entry) => entry.requester.id !== profile.id),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la solicitud');
    } finally {
      setActionKey(null);
    }
  }, [toast]);

  const handleAcceptRequest = useCallback(async (request: PendingRequest) => {
    const actionId = `accept:${request.id}`;
    setActionKey(actionId);
    try {
      const result = await acceptFriendRequest(request.id);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo aceptar la solicitud');
      }
      toast.success('Ahora son amigas');
      setPendingRequests((prev) => prev.filter((entry) => entry.id !== request.id));
      setFriends((prev) => [
        {
          id: request.id,
          requester_id: request.requester.id,
          addressee_id: user?.id || '',
          status: 'accepted',
          created_at: request.created_at,
          updated_at: new Date().toISOString(),
          friend: request.requester,
          is_close_friend: false,
        },
        ...prev,
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo aceptar la solicitud');
    } finally {
      setActionKey(null);
    }
  }, [toast, user?.id]);

  const handleDeclineRequest = useCallback(async (request: PendingRequest) => {
    const actionId = `decline:${request.id}`;
    setActionKey(actionId);
    try {
      const result = await declineFriendRequest(request.id);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo rechazar la solicitud');
      }
      toast.success('Solicitud rechazada');
      setPendingRequests((prev) => prev.filter((entry) => entry.id !== request.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo rechazar la solicitud');
    } finally {
      setActionKey(null);
    }
  }, [toast]);

  const handleRemoveFriend = useCallback(async (friendship: FriendWithProfile) => {
    const actionId = `remove:${friendship.id}`;
    setActionKey(actionId);
    try {
      const result = await removeFriend(friendship.id);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo eliminar la amistad');
      }
      toast.success('Amistad eliminada');
      setFriends((prev) => prev.filter((entry) => entry.id !== friendship.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la amistad');
    } finally {
      setActionKey(null);
    }
  }, [toast]);

  const renderProfileRow = (profile: FriendProfile, contentRight: React.ReactNode, subtitle?: string) => (
    <div
      key={profile.id}
      className="flex items-center gap-3 rounded-[1.5rem] border border-white/65 bg-white/70 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => handleOpenProfile(profile)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ProfileAvatar profile={profile} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#26364a]">{getSafePublicDisplayName(profile.display_name, profile.username)}</p>
          <p className="truncate text-sm text-[#6c7a92]">@{profile.username}</p>
          {subtitle ? <p className="mt-1 text-xs text-[#8a94a7]">{subtitle}</p> : null}
        </div>
      </button>
      <div className="shrink-0">{contentRight}</div>
    </div>
  );

  const renderFriendsTab = () => {
    if (friends.length === 0) {
      return (
        <div className="rounded-[2.25rem] border border-white/65 bg-white/65 px-6 py-16 text-center shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <EmptyState
            icon="groups"
            title="Aún no tenés amigas"
            description="Buscá usuarios o mirá las sugerencias para empezar a conectar."
            actionLabel="Descubrir personas"
            onAction={() => setActiveTab('discover')}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {friends.map((entry) =>
          renderProfileRow(
            entry.friend,
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenProfile(entry.friend)}
                className="rounded-full border border-[#d5d8e3] px-4 py-2 text-sm font-semibold text-[#42506a] transition hover:bg-[#f4f6fb]"
              >
                Ver perfil
              </button>
              <button
                type="button"
                onClick={() => { void handleRemoveFriend(entry); }}
                disabled={actionKey === `remove:${entry.id}`}
                className="rounded-full bg-[#101828] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92 disabled:opacity-60"
              >
                {actionKey === `remove:${entry.id}` ? 'Quitando...' : 'Quitar'}
              </button>
            </div>,
            entry.friend.bio || 'Conectadas en la comunidad'
          )
        )}
      </div>
    );
  };

  const renderRequestsTab = () => {
    if (pendingRequests.length === 0 && sentRequests.length === 0) {
      return (
        <div className="rounded-[2.25rem] border border-white/65 bg-white/65 px-6 py-16 text-center shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <EmptyState
            icon="person_add"
            title="No hay solicitudes pendientes"
            description="Cuando alguien te mande una solicitud o envíes una nueva, la vas a ver acá."
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b7890]">Recibidas</h2>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#42506a]">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d8dce7] bg-white/60 px-5 py-8 text-center text-sm text-[#7a869c]">
                No tenés solicitudes recibidas.
              </div>
            ) : (
              pendingRequests.map((request) =>
                renderProfileRow(
                  request.requester,
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { void handleDeclineRequest(request); }}
                      disabled={actionKey === `decline:${request.id}` || actionKey === `accept:${request.id}`}
                      className="rounded-full border border-[#d5d8e3] px-4 py-2 text-sm font-semibold text-[#42506a] transition hover:bg-[#f4f6fb] disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleAcceptRequest(request); }}
                      disabled={actionKey === `accept:${request.id}` || actionKey === `decline:${request.id}`}
                      className="rounded-full bg-[#101828] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92 disabled:opacity-60"
                    >
                      {actionKey === `accept:${request.id}` ? 'Aceptando...' : 'Aceptar'}
                    </button>
                  </div>,
                  'Quiere conectar con vos'
                )
              )
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b7890]">Enviadas</h2>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#42506a]">
              {sentRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {sentRequests.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[#d8dce7] bg-white/60 px-5 py-8 text-center text-sm text-[#7a869c]">
                No enviaste solicitudes todavía.
              </div>
            ) : (
              sentRequests.map((request) =>
                renderProfileRow(
                  request.requester,
                  <span className="rounded-full bg-[#eef1f8] px-4 py-2 text-sm font-semibold text-[#5c6780]">
                    Pendiente
                  </span>,
                  'Esperando respuesta'
                )
              )
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderDiscoverTab = () => {
    if (searchState.error) {
      return (
        <div className="rounded-[2.25rem] border border-dashed border-[#d8dce7] bg-white/65 px-6 py-14 text-center shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <EmptyState
            icon="search_off"
            title="No pude completar la búsqueda"
            description={searchState.error}
          />
        </div>
      );
    }

    if (!searchState.loading && discoverUsers.length === 0) {
      const hasSearch = query.trim().length >= 2;
      return (
        <div className="rounded-[2.25rem] border border-dashed border-[#d8dce7] bg-white/65 px-6 py-14 text-center shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <EmptyState
            icon={hasSearch ? 'search_off' : 'travel_explore'}
            title={hasSearch ? 'No encontré usuarias con esa búsqueda' : 'Todavía no hay sugerencias'}
            description={hasSearch ? 'Probá buscando por usuario o email.' : 'Cuando haya más perfiles disponibles, te los voy a mostrar acá.'}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {discoverUsers.map((profile) => {
          const relation = getRelationLabel(profile.id, friends, pendingRequests, sentRequests);
          const actionId = `send:${profile.id}`;
          const isBusy = actionKey === actionId;

          return renderProfileRow(
            profile,
            relation.disabled ? (
              <span className="rounded-full bg-[#eef1f8] px-4 py-2 text-sm font-semibold text-[#5c6780]">
                {relation.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => { void handleSendRequest(profile); }}
                disabled={isBusy}
                className="rounded-full bg-[#5b4ff6] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92 disabled:opacity-60"
              >
                {isBusy ? 'Enviando...' : relation.label}
              </button>
            ),
            profile.bio || (profile.is_public ? 'Perfil público' : 'Perfil privado')
          );
        })}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_32%),linear-gradient(180deg,#f8f2ea_0%,#fbf8f4_38%,#f2ece4_100%)] text-[#171717]">
        <div className="noise-overlay opacity-[0.04]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-[7.5rem] pt-4 md:px-6 md:pb-8 md:pt-6">
          <div className="rounded-[2.4rem] border border-white/70 bg-white/60 p-6 shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px]">
            <Loader text="Cargando comunidad..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_32%),linear-gradient(180deg,#f8f2ea_0%,#fbf8f4_38%,#f2ece4_100%)] text-[#171717]">
      <div className="noise-overlay opacity-[0.04]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-[7.5rem] pt-4 md:px-6 md:pb-8 md:pt-6">
        <header className="rounded-[2.4rem] border border-white/70 bg-white/60 p-5 shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f8690]">Comunidad</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[#2d4752] md:text-5xl">Amigas</h1>
            <p className="mt-2 text-sm leading-6 text-[#6f8690] md:text-base">
              Conectá con amigas y compartí tu estilo.
            </p>
          </div>
        </header>

        <section className="rounded-[2.1rem] border border-white/70 bg-white/55 p-4 shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px]">
          <div className="flex items-center gap-3 rounded-full bg-[#f5f6fa] px-5 py-4">
            <span className="material-symbols-outlined text-[26px] text-[#708099]">search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por usuario o email..."
              className="w-full bg-transparent text-lg text-[#4a5568] outline-none placeholder:text-[#7f8aa3]"
            />
            {searchState.loading ? <Loader size="small" /> : null}
          </div>
        </section>

        <section className="rounded-[2.1rem] border border-white/70 bg-white/55 p-2 shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px]">
          <div className="grid gap-2 md:grid-cols-3">
            {[
              { id: 'friends', label: 'Amigas', icon: 'group' },
              { id: 'requests', label: 'Solicitudes', icon: 'person_add' },
              { id: 'discover', label: 'Descubrir', icon: 'explore' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as CommunityTab)}
                  className={`flex items-center justify-center gap-3 rounded-full px-4 py-4 text-xl font-semibold transition ${
                    isActive
                      ? 'bg-[#051225] text-white shadow-[0_12px_28px_rgba(5,18,37,0.22)]'
                      : 'text-[#708099] hover:bg-white/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2.4rem] border border-white/70 bg-white/55 p-5 shadow-[0_20px_40px_rgba(18,24,27,0.08)] backdrop-blur-[26px] md:p-6">
          {loadError ? (
            <EmptyState
              icon="cloud_off"
              title="No pude cargar la comunidad"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => { void loadCommunity(); }}
            />
          ) : activeTab === 'friends' ? (
            renderFriendsTab()
          ) : activeTab === 'requests' ? (
            renderRequestsTab()
          ) : (
            renderDiscoverTab()
          )}
        </section>
      </div>
    </div>
  );
}
