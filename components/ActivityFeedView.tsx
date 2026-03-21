/**
 * Activity Feed View
 *
 * Social feed showing friend/community activity, import actions, comments and notifications.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ActivityFeedItem, ActivityType, ClothingItem, CommunityUser, SavedOutfit, TimelineVisibility } from '../types';
import {
  fetchActivityFeed,
  importFromActivity,
  type ImportFromActivityResult,
  publishSocialPostToTimeline,
  toggleActivityLike,
  toggleActivityShare,
  toggleActivityReaction,
} from '../src/services/activityFeedService';
import { getChallenges, getChallenge, joinChallenge, leaveChallenge } from '../src/services/challengesService';
import { reportContent, blockUser, getBlockedUserIds } from '../src/services/moderationService';
import ActivityCard from './ActivityCard';
import ActivityCommentsDrawer from './ActivityCommentsDrawer';
import Loader from './Loader';
import { EmptyState } from './ui/EmptyState';
import { Card } from './ui/Card';
import { SuggestedUsers } from './SuggestedUsers';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useNavigateTransition } from '../hooks/useNavigateTransition';
import SocialNotificationsBell from './SocialNotificationsBell';
import SocialNotificationsPanel from './SocialNotificationsPanel';
import type { SocialNotification } from '../types';
import { ROUTES } from '../src/routes';

interface ActivityFeedViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onViewOutfit?: (outfit: SavedOutfit) => void;
  onViewItem?: (item: ClothingItem) => void;
  onViewUserProfile?: (user: CommunityUser) => void;
  onImportedFromActivity?: (items: ClothingItem[], importedOutfit?: SavedOutfit | null) => void;
  onOpenStylistWithPrompt?: (prompt: string) => void;
  embedded?: boolean;
}

type FilterOption = 'all' | 'community' | ActivityType;

const ActivityFeedView = ({
  closet,
  savedOutfits,
  onClose,
  onViewOutfit,
  onViewItem,
  onViewUserProfile,
  onImportedFromActivity,
  onOpenStylistWithPrompt,
  embedded = false,
}: ActivityFeedViewProps) => {
  const toast = useToast();
  const navigate = useNavigateTransition();
  const { user } = useAuth();
  void savedOutfits;
  const useSupabaseCloset = useFeatureFlag('useSupabaseCloset');
  const enableActivitySaveToCloset = useFeatureFlag('enableActivitySaveToCloset');
  const enableLinkedSourceItems = useFeatureFlag('enableLinkedSourceItems');
  const enableSocialModeration = useFeatureFlag('enableSocialModeration');
  const enableSocialNotificationsCenter = useFeatureFlag('enableSocialNotificationsCenter');

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [selectedActivityForComments, setSelectedActivityForComments] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);
  const [wishingActivityId, setWishingActivityId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postVisibility, setPostVisibility] = useState<TimelineVisibility>('followers');
  const [postImageDataUrl, setPostImageDataUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState<{ id: string; title: string; description: string } | null>(null);
  const [weeklyJoined, setWeeklyJoined] = useState(false);
  const [weeklyActionLoading, setWeeklyActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadFeed(selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    void (async () => {
      const blocked = await getBlockedUserIds();
      setBlockedUserIds(blocked);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const challenges = await getChallenges({ status: 'active', limit: 1 });
      if (challenges.length > 0) {
        const challenge = challenges[0];
        setWeeklyChallenge({
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
        });
        if (user?.id) {
          const fullChallenge = await getChallenge(challenge.id);
          setWeeklyJoined(Boolean(fullChallenge?.participant_ids?.includes(user.id)));
        }
      }
    })();
  }, [user?.id]);

  const loadFeed = async (filter: FilterOption) => {
    setLoading(true);
    try {
      const sourceFilter = filter === 'community' ? 'community' : 'all';
      const data = await fetchActivityFeed(sourceFilter);

      let next = data;
      if (filter !== 'all' && filter !== 'community') {
        next = next.filter((activity) => activity.activity_type === filter);
      }

      if (blockedUserIds.length > 0) {
        next = next.filter((activity) => !blockedUserIds.includes(activity.user_id));
      }

      setActivities(next);
    } catch (error) {
      console.error('Failed to load feed:', error);
      toast.error('No se pudo cargar el feed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(selectedFilter);
    setRefreshing(false);
  };

  const handleLike = async (activityId: string) => {
    const previous = activities;
    setActivities((prev) => toggleActivityLike(activityId, prev));
    try {
      const result = await toggleActivityReaction(activityId, 'like');
      setActivities((prev) => toggleActivityLike(activityId, prev, result));
    } catch (error) {
      setActivities(previous);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el like');
    }
  };

  const handleShare = async (activityId: string) => {
    const previous = activities;
    setActivities((prev) => toggleActivityShare(activityId, prev));
    try {
      const result = await toggleActivityReaction(activityId, 'share');
      setActivities((prev) => toggleActivityShare(activityId, prev, result));
    } catch (error) {
      setActivities(previous);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el compartido');
    }
  };

  const handleCommentClick = (activityId: string) => {
    setSelectedActivityForComments(activityId);
  };

  const handlePostImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPostImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setPostCaption('');
    setPostVisibility('followers');
    setPostImageDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublishPost = async () => {
    setPosting(true);
    try {
      await publishSocialPostToTimeline({
        caption: postCaption,
        imageDataUrl: postImageDataUrl || undefined,
        visibility: postVisibility,
      });
      toast.success('Publicación creada');
      resetComposer();
      setShowComposer(false);
      await loadFeed(selectedFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar');
    } finally {
      setPosting(false);
    }
  };

  const importFromActivityLocal = (
    activity: ActivityFeedItem,
    mode: 'save' | 'wish'
  ): ImportFromActivityResult => {
    const isFavorite = mode === 'wish';
    const linkMode: ClothingItem['linkMode'] = enableLinkedSourceItems ? 'linked' : 'copy';
    const importedItems: ClothingItem[] = [];
    const missingSlots: string[] = [];
    const now = Date.now();

    const importSnapshot = (snapshot: ClothingItem, slot?: 'top' | 'bottom' | 'shoes') => {
      const slotSuffix = slot ? `:${slot}` : '';
      const dedupeKey = `${activity.id}:${snapshot.id || 'snapshot'}:local${slotSuffix}`;
      const alreadyExists = closet.some((item) => item.sourceRef?.dedupeKey === dedupeKey);
      if (alreadyExists) return;

      importedItems.push({
        id: `item_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        imageDataUrl: snapshot.imageDataUrl,
        metadata: {
          category: snapshot.metadata?.category || 'top',
          subcategory: snapshot.metadata?.subcategory || 'Prenda descubierta',
          color_primary: snapshot.metadata?.color_primary || 'desconocido',
          neckline: snapshot.metadata?.neckline,
          sleeve_type: snapshot.metadata?.sleeve_type,
          vibe_tags: snapshot.metadata?.vibe_tags || [],
          seasons: snapshot.metadata?.seasons || [],
          description: snapshot.metadata?.description,
        },
        status: 'wishlist',
        isFavorite,
        linkMode,
        sourceRef: {
          originType: slot ? 'activity_outfit' : 'activity_item',
          originActivityId: activity.id,
          originUserId: activity.user_id,
          originItemId: snapshot.id,
          originOutfitId: activity.outfit?.id,
          originUrl: snapshot.imageDataUrl,
          dedupeKey,
        },
      });
    };

    if (activity.activity_type === 'item_added') {
      const snapshot = activity.clothing_item || (activity.metadata_payload?.clothing_item as ClothingItem | undefined);
      if (!snapshot?.imageDataUrl || !snapshot?.metadata?.subcategory) {
        throw new Error('No disponible para guardar');
      }
      importSnapshot(snapshot);
    } else if (activity.activity_type === 'outfit_shared') {
      const bundle = activity.metadata_payload?.outfit_bundle || {};
      const top = bundle.top as ClothingItem | undefined;
      const bottom = bundle.bottom as ClothingItem | undefined;
      const shoes = bundle.shoes as ClothingItem | undefined;

      if (!top?.imageDataUrl) missingSlots.push('top');
      if (!bottom?.imageDataUrl) missingSlots.push('bottom');
      if (!shoes?.imageDataUrl) missingSlots.push('shoes');

      if (top?.imageDataUrl) importSnapshot(top, 'top');
      if (bottom?.imageDataUrl) importSnapshot(bottom, 'bottom');
      if (shoes?.imageDataUrl) importSnapshot(shoes, 'shoes');
    } else {
      throw new Error('Actividad no soportada');
    }

    let importedOutfit: SavedOutfit | null = null;
    if (activity.activity_type === 'outfit_shared' && importedItems.length === 3) {
      importedOutfit = {
        id: `outfit_${now}`,
        top_id: importedItems[0].id,
        bottom_id: importedItems[1].id,
        shoes_id: importedItems[2].id,
        explanation: activity.outfit?.explanation || activity.caption || 'Outfit importado desde actividad',
      };
    }

    return { importedItems, importedOutfit, missingSlots };
  };

  const handleImport = async (activityId: string, mode: 'save' | 'wish') => {
    if (!enableActivitySaveToCloset) {
      toast.info('Guardado temporalmente desactivado');
      return;
    }
    const targetActivity = activities.find((activity) => activity.id === activityId);
    if (!targetActivity) {
      toast.error('No se encontró la publicación, actualizá el feed');
      return;
    }

    if (mode === 'save') {
      setSavingActivityId(activityId);
    } else {
      setWishingActivityId(activityId);
    }

    try {
      const result = useSupabaseCloset
        ? await importFromActivity(targetActivity, mode)
        : importFromActivityLocal(targetActivity, mode);

      if (result.importedItems.length === 0) {
        toast.info('No había nuevas prendas para importar');
        return;
      }

      onImportedFromActivity?.(result.importedItems, result.importedOutfit);
      toast.success(mode === 'wish' ? 'Agregado a deseados' : 'Prenda guardada en tu armario');
    } catch (error) {
      console.error('Failed to import activity:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar desde actividad');
    } finally {
      setSavingActivityId(null);
      setWishingActivityId(null);
    }
  };

  const handleReportActivity = async (activityId: string) => {
    try {
      await reportContent({
        targetType: 'activity',
        targetId: activityId,
        reason: 'other',
      });
      setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
      toast.success('Reporte enviado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reportar');
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    try {
      await blockUser(targetUserId);
      setBlockedUserIds((prev) => Array.from(new Set([...prev, targetUserId])));
      setActivities((prev) => prev.filter((activity) => activity.user_id !== targetUserId));
      toast.success('Usuario bloqueado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo bloquear usuario');
    }
  };

  const handleCloseComments = () => {
    setSelectedActivityForComments(null);
  };

  const handleWeeklyChallengeToggle = async () => {
    if (!weeklyChallenge || weeklyActionLoading) return;
    setWeeklyActionLoading(true);
    try {
      const ok = weeklyJoined
        ? await leaveChallenge(weeklyChallenge.id)
        : await joinChallenge(weeklyChallenge.id);
      if (!ok) {
        throw new Error('No se pudo actualizar la participación');
      }
      setWeeklyJoined(!weeklyJoined);
      toast.success(weeklyJoined ? 'Saliste del reto semanal' : 'Te uniste al reto semanal');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el reto');
    } finally {
      setWeeklyActionLoading(false);
    }
  };

  const handleSelectNotification = async (notification: SocialNotification) => {
    setShowNotifications(false);

    const activityId =
      notification.entity_type === 'activity'
        ? notification.entity_id
        : (notification.metadata?.activity_id as string | undefined);

    if (!activityId) return;

    let targetExists = activities.some((activity) => activity.id === activityId);
    if (!targetExists) {
      await loadFeed('all');
      targetExists = true;
    }

    if (targetExists && (notification.event_type === 'post_comment' || notification.event_type === 'comment_reply')) {
      setSelectedActivityForComments(activityId);
    }
  };

  const handleOpenUserProfile = (activity: ActivityFeedItem) => {
    if (!onViewUserProfile) return;
    onViewUserProfile({
      id: activity.user_id,
      name: activity.user_name || 'Usuario',
      username: activity.user_name || 'usuario',
      avatarUrl: activity.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user_id}`,
      closet: [],
    });
  };

  const filterOptions: { value: FilterOption; label: string; icon: string }[] = [
    { value: 'all', label: 'Todo', icon: 'dynamic_feed' },
    { value: 'outfit_shared', label: 'Outfits', icon: 'checkroom' },
    { value: 'item_added', label: 'Prendas', icon: 'add_shopping_cart' },
    { value: 'challenge_completed', label: 'Desafíos', icon: 'emoji_events' },
    { value: 'outfit_saved', label: 'Guardados', icon: 'favorite' },
    { value: 'community', label: 'Comunidad', icon: 'groups' },
  ];

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityForComments),
    [activities, selectedActivityForComments]
  );
  const containerClassName = embedded
    ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-background-primary dark:bg-gray-900'
    : 'fixed inset-0 z-50 flex flex-col bg-background-primary dark:bg-gray-900';
  const loadingCardClassName = embedded
    ? 'flex h-full min-h-full items-center justify-center'
    : 'fixed inset-0 z-50 flex items-center justify-center';
  const refreshIndicatorClassName = embedded
    ? 'absolute top-safe-20 left-1/2 z-30 -translate-x-1/2'
    : 'fixed top-safe-20 left-1/2 z-30 -translate-x-1/2';

  if (loading && activities.length === 0) {
    return (
      <Card variant="glass" padding="none" rounded="none" className={loadingCardClassName}>
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-text-secondary dark:text-gray-400">Cargando actividad social...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={containerClassName}>
      <Card variant="glass" padding="none" rounded="none" className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800" component="header">
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary dark:text-gray-200">Feed Social</h1>
              <p className="text-sm text-text-secondary dark:text-gray-400">{activities.length} publicaciones</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {enableSocialNotificationsCenter && (
              <SocialNotificationsBell onClick={() => setShowNotifications(true)} />
            )}
            <button
              onClick={() => setShowComposer((prev) => !prev)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Crear publicación"
              title="Crear publicación"
            >
              <span className="material-symbols-outlined text-2xl">add_a_photo</span>
            </button>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              aria-label="Actualizar feed"
            >
              <span className={`material-symbols-outlined text-2xl ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                transition-all whitespace-nowrap
                ${selectedFilter === option.value
                  ? 'bg-accent-primary text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="material-symbols-outlined text-lg">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {!showComposer && (
            <Card variant="glass" padding="md" rounded="2xl" className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-gray-200">¿Qué querés compartir hoy?</p>
                <p className="text-xs text-text-secondary dark:text-gray-400">Subí una foto o publicá un texto.</p>
              </div>
              <button
                onClick={() => setShowComposer(true)}
                className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-semibold"
              >
                Publicar
              </button>
            </Card>
          )}

          {showComposer && (
            <Card variant="glass" padding="md" rounded="2xl" className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary dark:text-gray-200">Nueva publicación</h3>
                <button
                  onClick={() => {
                    setShowComposer(false);
                    resetComposer();
                  }}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
              </div>

              <textarea
                value={postCaption}
                onChange={(event) => setPostCaption(event.target.value)}
                rows={3}
                placeholder="¿Qué querés compartir?"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 text-sm focus:outline-none"
              />

              {postImageDataUrl && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={postImageDataUrl} alt="Preview publicación" className="w-full max-h-56 object-cover" />
                  <button
                    onClick={() => setPostImageDataUrl(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"
                    aria-label="Quitar imagen"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePostImageSelected}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Subir foto
                </button>
                <select
                  value={postVisibility}
                  onChange={(event) => setPostVisibility(event.target.value as TimelineVisibility)}
                  className="px-3 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800"
                >
                  <option value="followers">Seguidores</option>
                  <option value="community">Comunidad</option>
                </select>
                <button
                  onClick={() => void handlePublishPost()}
                  disabled={posting || (!postCaption.trim() && !postImageDataUrl)}
                  className="ml-auto px-4 py-2 rounded-xl bg-accent-primary text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {posting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </Card>
          )}

          {weeklyChallenge && (
            <Card variant="glass" padding="md" rounded="2xl" className="border border-primary/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Reto semanal</p>
                  <h3 className="text-base font-bold text-text-primary dark:text-gray-200 mt-1">{weeklyChallenge.title}</h3>
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{weeklyChallenge.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigate(ROUTES.MULTIPLAYER_CHALLENGES)}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold"
                  >
                    Ver desafío
                  </button>
                  <button
                    onClick={() => void handleWeeklyChallengeToggle()}
                    disabled={weeklyActionLoading}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      weeklyJoined
                        ? 'border-gray-300 dark:border-gray-700 text-text-secondary'
                        : 'border-primary text-primary'
                    }`}
                  >
                    {weeklyActionLoading
                      ? 'Guardando...'
                      : weeklyJoined
                        ? 'Salir del reto'
                        : 'Unirme'}
                  </button>
                </div>
              </div>
            </Card>
          )}
          {selectedFilter === 'all' && onViewUserProfile && (
            <SuggestedUsers onViewProfile={onViewUserProfile} />
          )}

          {activities.length === 0 && !loading && (
            <EmptyState
              icon="sentiment_dissatisfied"
              title="No hay actividad"
              description={
                selectedFilter === 'all'
                  ? 'Seguí cuentas para ver su actividad acá.'
                  : 'No hay actividades de este tipo para mostrar.'
              }
            />
          )}

          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onViewUser={(entry) => handleOpenUserProfile(entry)}
              onLike={(activityId) => void handleLike(activityId)}
              onComment={handleCommentClick}
              onShare={(activityId) => void handleShare(activityId)}
              onSaveToCloset={enableActivitySaveToCloset ? (activityId) => handleImport(activityId, 'save') : undefined}
              onWishItem={enableActivitySaveToCloset ? (activityId) => handleImport(activityId, 'wish') : undefined}
              onReportActivity={enableSocialModeration ? (activityId) => handleReportActivity(activityId) : undefined}
              onBlockUser={enableSocialModeration ? (targetUserId) => handleBlockUser(targetUserId) : undefined}
              isSaving={savingActivityId === activity.id}
              isWishing={wishingActivityId === activity.id}
              onViewOutfit={onViewOutfit}
              onViewItem={onViewItem}
            />
          ))}

          {activities.length > 0 && (
            <div className="text-center py-8 text-text-secondary dark:text-gray-400 text-sm">
              <span className="material-symbols-outlined text-2xl mb-2">check_circle</span>
              <p>Estás al día con la actividad social</p>
            </div>
          )}
        </div>
      </div>

      {selectedActivity && (
        <ActivityCommentsDrawer
          activity={selectedActivity}
          embedded={embedded}
          onClose={handleCloseComments}
          onAddComment={(_content) => {
            setActivities((prev) =>
              prev.map((entry) =>
                entry.id === selectedActivity.id
                  ? { ...entry, comments_count: entry.comments_count + 1 }
                  : entry
              )
            );
          }}
          onDeleteComment={() => {
            setActivities((prev) =>
              prev.map((entry) =>
                entry.id === selectedActivity.id
                  ? { ...entry, comments_count: Math.max(0, entry.comments_count - 1) }
                  : entry
              )
            );
          }}
        />
      )}

      {enableSocialNotificationsCenter && (
        <SocialNotificationsPanel
          isOpen={showNotifications}
          embedded={embedded}
          onClose={() => setShowNotifications(false)}
          onSelectNotification={(notification) => {
            void handleSelectNotification(notification);
          }}
        />
      )}

      {refreshing && (
        <div className={refreshIndicatorClassName}>
          <Card variant="glass" padding="sm" rounded="full" className="shadow-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
            <span className="text-sm font-medium">Actualizando...</span>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ActivityFeedView;
