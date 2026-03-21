import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchSuggestedUsers, followUser, SuggestedUser } from '@/src/services/socialService';
import type { CommunityUser } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getSafePublicDisplayName } from '@/src/utils/publicProfile';

interface SuggestedUsersProps {
  onViewProfile?: (user: CommunityUser) => void;
}

const SuggestedUserAvatar = ({ user, displayName }: { user: SuggestedUser; displayName: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackInitial = displayName.slice(0, 1).toUpperCase() || 'U';

  if (!imageFailed) {
    return (
      <img
        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`}
        alt={displayName}
        className="w-16 h-16 rounded-full object-cover border-2 border-purple-100"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-purple-100 bg-purple-50 text-lg font-semibold text-purple-700">
      {fallbackInitial}
    </div>
  );
};

export const SuggestedUsers: React.FC<SuggestedUsersProps> = ({ onViewProfile }) => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingId, setFollowingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }
    void loadSuggestions();
  }, [authLoading, user?.id]);

  const loadSuggestions = async () => {
    try {
      const data = await fetchSuggestedUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load suggestions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    setFollowingId(userId);
    try {
      await followUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast.success('Ahora seguís a esta cuenta');
    } catch (error) {
      console.error('Failed to follow user', error);
      toast.error('Error al seguir usuario');
    } finally {
      setFollowingId(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-800 rounded-xl" />;
  }

  if (users.length === 0) {
    return null;
  }

  const openProfile = (user: SuggestedUser) => {
    const displayName = getSafePublicDisplayName(user.display_name, user.username);
    if (!onViewProfile) return;
    onViewProfile({
      id: user.id,
      name: displayName,
      username: user.username,
      avatarUrl: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
      closet: [],
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/20 mb-6 dark:bg-gray-900/60 dark:border-gray-800">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">Cuentas sugeridas</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 pr-4 scrollbar-hide snap-x snap-mandatory">
        {users.map((user) => {
          const displayName = getSafePublicDisplayName(user.display_name, user.username);
          const similarityPct = Math.round((user.similarity_score || 0) * 100);
          const mutuals = user.mutual_follows || 0;
          return (
            <div key={user.id} className="flex-shrink-0 w-40 snap-start flex flex-col items-center bg-white rounded-lg p-3 border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800">
              <button
                type="button"
                onClick={() => openProfile(user)}
                className="relative mb-2"
                aria-label={`Ver perfil de ${displayName}`}
              >
                <SuggestedUserAvatar user={user} displayName={displayName} />
                <div className="absolute -bottom-1 -right-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {similarityPct}%
                </div>
              </button>
              <button
                type="button"
                onClick={() => openProfile(user)}
                className="w-full"
                aria-label={`Abrir perfil de ${displayName}`}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full text-center block">
                  {displayName}
                </span>
                <span className="mb-1 block w-full break-all text-center text-xs text-gray-500 dark:text-gray-400">
                  @{user.username}
                </span>
              </button>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center min-h-[30px]">
                {mutuals > 0
                  ? `${mutuals} conexiones en común`
                  : `${user.common_preferences.length} gustos en común`}
              </span>
              <button
                onClick={() => void handleFollow(user.id)}
                disabled={followingId === user.id}
                className="w-full py-1.5 px-2 bg-black text-white text-xs font-medium rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {followingId === user.id ? 'Siguiendo...' : 'Seguir'}
              </button>
            </div>
          );
        })}
        <div className="w-4 flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
};
