/**
 * Activity Card Component
 *
 * Individual card for displaying a single activity in the feed.
 */

import React, { useEffect, useState } from 'react';
import type { ActivityFeedItem, ClothingItem, SavedOutfit } from '../types';
import { Card } from './ui/Card';
import {
  getActivityIcon,
  getActivityDescription,
  formatRelativeTime,
  formatEngagementCount,
} from '../src/services/activityFeedService';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onViewUser?: (activity: ActivityFeedItem) => void;
  onLike: (activityId: string) => void;
  onComment: (activityId: string) => void;
  onShare: (activityId: string) => void;
  onReportActivity?: (activityId: string) => void | Promise<void>;
  onBlockUser?: (targetUserId: string) => void | Promise<void>;
  onSaveToCloset?: (activityId: string) => void | Promise<void>;
  onWishItem?: (activityId: string) => void | Promise<void>;
  isSaving?: boolean;
  isWishing?: boolean;
  onViewOutfit?: (outfit: SavedOutfit) => void;
  onViewItem?: (item: ClothingItem) => void;
}

const ActivityCard = ({
  activity,
  onViewUser,
  onLike,
  onComment,
  onShare,
  onReportActivity,
  onBlockUser,
  onSaveToCloset,
  onWishItem,
  isSaving = false,
  isWishing = false,
  onViewOutfit,
  onViewItem,
}: ActivityCardProps) => {
  const [didTapSave, setDidTapSave] = useState(false);
  const [didTapWish, setDidTapWish] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    if (!didTapSave) return;
    const timer = setTimeout(() => setDidTapSave(false), 1200);
    return () => clearTimeout(timer);
  }, [didTapSave]);

  useEffect(() => {
    if (!didTapWish) return;
    const timer = setTimeout(() => setDidTapWish(false), 1200);
    return () => clearTimeout(timer);
  }, [didTapWish]);

  const activityIcon = getActivityIcon(activity.activity_type);
  const activityDescription = getActivityDescription(activity);
  const relativeTime = formatRelativeTime(activity.timestamp);
  const safeUserName = activity.user_name?.trim() || 'Usuario';
  const avatarUrl = typeof activity.user_avatar === 'string' && /^https?:\/\//i.test(activity.user_avatar)
    ? activity.user_avatar
    : null;
  const avatarInitial = safeUserName.slice(0, 1).toUpperCase() || 'U';

  const outfitBundle = activity.metadata_payload?.outfit_bundle as {
    top?: ClothingItem;
    bottom?: ClothingItem;
    shoes?: ClothingItem;
  } | undefined;

  const hasItemSnapshot = Boolean(
    (activity.clothing_item?.imageDataUrl || (activity.clothing_item as any)?.image_url) &&
    (activity.clothing_item?.metadata?.subcategory || (activity.clothing_item as any)?.subcategory || (activity.clothing_item as any)?.name)
  );

  const hasOutfitSnapshots = Boolean(
    (outfitBundle?.top?.imageDataUrl || (outfitBundle?.top as any)?.image_url) &&
    (outfitBundle?.bottom?.imageDataUrl || (outfitBundle?.bottom as any)?.image_url) &&
    (outfitBundle?.shoes?.imageDataUrl || (outfitBundle?.shoes as any)?.image_url)
  );

  const supportsImportActions = activity.activity_type === 'item_added' || activity.activity_type === 'outfit_shared';
  const canImportFromActivity = activity.activity_type === 'item_added'
    ? hasItemSnapshot
    : activity.activity_type === 'outfit_shared'
      ? hasOutfitSnapshots
      : false;

  const renderActivityContent = () => {
    switch (activity.activity_type) {
      case 'outfit_shared':
      case 'outfit_saved':
        if (!activity.outfit) return null;
        return (
          <div className="mt-3">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative group bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-text-secondary dark:text-gray-500">checkroom</span>
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">Outfit de {activity.user_name}</p>
                </div>
              </div>

              {onViewOutfit && (
                <button
                  onClick={() => onViewOutfit(activity.outfit!)}
                  className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <Card variant="glass" padding="none" rounded="full" className="px-4 py-2 text-sm font-medium inline-block">
                    Ver detalles
                  </Card>
                </button>
              )}
            </div>
          </div>
        );

      case 'item_added':
        if (!activity.clothing_item) return null;
        return (
          <div className="mt-3">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative group bg-[#f7f7f7] dark:bg-[#111827]">
              {activity.clothing_item.imageDataUrl ? (
                <img
                  src={activity.clothing_item.imageDataUrl}
                  alt={activity.clothing_item.metadata.subcategory}
                  className="w-full h-full object-contain bg-white dark:bg-[#111827]"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <span className="material-symbols-outlined text-4xl text-gray-400">shopping_bag</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-sm font-medium">{activity.clothing_item.metadata.subcategory}</p>
                <p className="text-white/80 text-xs">{activity.clothing_item.metadata.color_primary}</p>
              </div>

              {onViewItem && (
                <button
                  onClick={() => onViewItem(activity.clothing_item!)}
                  className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <Card variant="glass" padding="none" rounded="full" className="px-4 py-2 text-sm font-medium inline-block">
                    Ver prenda
                  </Card>
                </button>
              )}
            </div>
          </div>
        );

      case 'challenge_completed':
        if (!activity.challenge) return null;
        return (
          <div className="mt-3 p-4 rounded-xl border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-yellow-500">emoji_events</span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">{activity.challenge.title}</h4>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  Dificultad: <span className="font-medium capitalize">{activity.challenge.difficulty}</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 'capsule_created':
        if (!activity.capsule) return null;
        return (
          <div className="mt-3 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-accent-primary">inventory_2</span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">{activity.capsule.name}</h4>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.capsule.total_outfits_possible} outfits posibles
                </p>
              </div>
            </div>
          </div>
        );

      case 'lookbook_created':
        if (!activity.lookbook) return null;
        return (
          <div className="mt-3 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-purple-500">photo_library</span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">{activity.lookbook.title}</h4>
                {activity.lookbook.description && (
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">{activity.lookbook.description}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'style_milestone':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-pink-500">stars</span>
              <p className="text-text-primary dark:text-gray-200 font-medium">{activity.caption}</p>
            </div>
          </div>
        );

      case 'borrow_request':
      case 'borrow_approved':
      case 'borrow_declined':
      case 'item_returned': {
        const configs: Record<string, { title: string; icon: string; wrapper: string; iconBg: string; iconColor: string; fallback: string }> = {
          borrow_request: {
            title: 'Solicitud de préstamo',
            icon: 'swap_horiz',
            wrapper: 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-200 dark:border-teal-800',
            iconBg: 'bg-teal-100 dark:bg-teal-900',
            iconColor: 'text-teal-600 dark:text-teal-400',
            fallback: 'Quiere prestarse una prenda tuya',
          },
          borrow_approved: {
            title: 'Préstamo aprobado',
            icon: 'check_circle',
            wrapper: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 dark:border-green-800',
            iconBg: 'bg-green-100 dark:bg-green-900',
            iconColor: 'text-green-600 dark:text-green-400',
            fallback: 'Tu solicitud fue aceptada',
          },
          borrow_declined: {
            title: 'Préstamo rechazado',
            icon: 'cancel',
            wrapper: 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800',
            iconBg: 'bg-red-100 dark:bg-red-900',
            iconColor: 'text-red-600 dark:text-red-400',
            fallback: 'La solicitud no fue aceptada',
          },
          item_returned: {
            title: 'Prenda devuelta',
            icon: 'assignment_return',
            wrapper: 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800',
            iconBg: 'bg-blue-100 dark:bg-blue-900',
            iconColor: 'text-blue-600 dark:text-blue-400',
            fallback: 'La prenda fue devuelta',
          },
        };

        const cfg = configs[activity.activity_type];
        return (
          <div className={`mt-3 p-4 rounded-xl ${cfg.wrapper}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined text-xl ${cfg.iconColor}`}>{cfg.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-text-primary dark:text-gray-200 font-medium">{cfg.title}</p>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.caption || cfg.fallback}
                </p>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card variant="glass" padding="md" rounded="2xl" className="animate-fade-in border border-black/5 bg-white/90 shadow-sm dark:border-white/8 dark:bg-[#0b1220]/92">
      <div className="flex items-start justify-between mb-3">
        <button
          type="button"
          onClick={() => onViewUser?.(activity)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-xl text-white">
            {avatarUrl && !avatarLoadError ? (
              <img
                src={avatarUrl}
                alt={safeUserName}
                className="h-full w-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <span className="text-sm font-semibold uppercase tracking-[0.12em]">{avatarInitial}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-text-primary dark:text-gray-200">{safeUserName}</p>
              <span className="text-xs text-text-secondary dark:text-gray-400">•</span>
              <span className="whitespace-nowrap text-xs text-text-secondary dark:text-gray-400">{relativeTime}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary dark:text-gray-400">
              <span className="material-symbols-outlined text-[15px]">{activityIcon}</span>
              <span className="truncate">{activityDescription}</span>
            </div>
          </div>
        </button>

        <div className="relative ml-3 flex items-center gap-1">
          {(onReportActivity || onBlockUser) && (
            <>
              <button
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Más acciones"
              >
                <span className="material-symbols-outlined text-base text-text-secondary">more_horiz</span>
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  {onReportActivity && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        void onReportActivity(activity.id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Reportar publicación
                    </button>
                  )}
                  {onBlockUser && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        void onBlockUser(activity.user_id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Bloquear usuario
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {activity.caption && (
        <p className="mb-2 text-[15px] leading-6 text-text-primary dark:text-gray-200">{activity.caption}</p>
      )}

      {activity.tags && activity.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {activity.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 rounded-full bg-accent-primary/10 text-accent-primary font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {renderActivityContent()}

      {supportsImportActions && (onSaveToCloset || onWishItem) && (
        <div className="relative z-20 mt-3 flex flex-wrap gap-2 pointer-events-auto">
          {onSaveToCloset && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDidTapSave(true);
                void onSaveToCloset(activity.id);
              }}
              disabled={isSaving || isWishing || !canImportFromActivity}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {isSaving ? 'Guardando...' : didTapSave ? 'Guardado ✓' : 'Guardar'}
            </button>
          )}
          {onWishItem && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDidTapWish(true);
                void onWishItem(activity.id);
              }}
              disabled={isSaving || isWishing || !canImportFromActivity}
              className="rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3.5 py-2 text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWishing ? 'Agregando...' : didTapWish ? 'Agregado ✓' : 'Lo deseo'}
            </button>
          )}
          {!canImportFromActivity && (
            <span className="text-xs text-text-secondary dark:text-gray-400 self-center">No disponible para guardar</span>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onLike(activity.id)}
              className={`rounded-full p-2 transition-all ${
                activity.is_liked
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-text-primary hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
              aria-label={activity.is_liked ? 'Quitar like' : 'Dar like'}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: activity.is_liked ? '"FILL" 1' : '"FILL" 0' }}
              >
                favorite
              </span>
            </button>
            <button
              onClick={() => onComment(activity.id)}
              className="rounded-full p-2 text-text-primary transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label="Comentar"
            >
              <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
            </button>
            <button
              onClick={() => onShare(activity.id)}
              className={`rounded-full p-2 transition-all ${
                activity.is_shared
                  ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  : 'text-text-primary hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
              }`}
              aria-label={activity.is_shared ? 'Dejar de compartir' : 'Compartir'}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: activity.is_shared ? '"FILL" 1' : '"FILL" 0' }}
              >
                share
              </span>
            </button>
          </div>

          <div className="text-xs text-text-secondary dark:text-gray-400">
            {formatEngagementCount(activity.shares_count)} compartidos
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm font-semibold text-text-primary dark:text-gray-200">
            {formatEngagementCount(activity.likes_count)} Me gusta
          </p>
          <button
            type="button"
            onClick={() => onComment(activity.id)}
            className="text-left text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-200"
          >
            Ver los {formatEngagementCount(activity.comments_count)} comentarios
          </button>
        </div>
      </div>
    </Card>
  );
};

export { ActivityCard };
export default ActivityCard;
