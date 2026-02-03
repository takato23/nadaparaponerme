/**
 * Activity Card Component
 *
 * Individual card for displaying a single activity in the feed.
 * Supports various activity types with appropriate content rendering.
 */

import React from 'react';
import type { ActivityFeedItem, ClothingItem, SavedOutfit } from '../types';
import { Card } from './ui/Card';
import {
  getActivityIcon,
  getActivityDescription,
  formatRelativeTime,
  formatEngagementCount
} from '../src/services/activityFeedService';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  onLike: (activityId: string) => void;
  onComment: (activityId: string) => void;
  onShare: (activityId: string) => void;
  onViewOutfit?: (outfit: SavedOutfit) => void;
  onViewItem?: (item: ClothingItem) => void;
}

const ActivityCard = ({
  activity,
  onLike,
  onComment,
  onShare,
  onViewOutfit,
  onViewItem
}: ActivityCardProps) => {
  const activityIcon = getActivityIcon(activity.activity_type);
  const activityDescription = getActivityDescription(activity);
  const relativeTime = formatRelativeTime(activity.timestamp);

  // Render activity content based on type
  const renderActivityContent = () => {
    switch (activity.activity_type) {
      case 'outfit_shared':
      case 'outfit_saved':
        if (!activity.outfit) return null;
        return (
          <div className="mt-3">
            <div className="aspect-video rounded-xl overflow-hidden relative group">
              {/* Placeholder for outfit visualization */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-text-secondary dark:text-gray-500">
                    checkroom
                  </span>
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                    Outfit de {activity.user_name}
                  </p>
                </div>
              </div>

              {/* Clickable overlay */}
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
            <div className="aspect-[3/4] rounded-xl overflow-hidden relative group max-w-xs">
              {activity.clothing_item.imageDataUrl ? (
                <img
                  src={activity.clothing_item.imageDataUrl}
                  alt={activity.clothing_item.metadata.subcategory}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <span className="material-symbols-outlined text-4xl text-gray-400">
                    shopping_bag
                  </span>
                </div>
              )}

              {/* Item metadata overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-sm font-medium">
                  {activity.clothing_item.metadata.subcategory}
                </p>
                <p className="text-white/80 text-xs">
                  {activity.clothing_item.metadata.color_primary}
                </p>
              </div>

              {/* Clickable overlay */}
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
              <span className="material-symbols-outlined text-3xl text-yellow-500">
                emoji_events
              </span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">
                  {activity.challenge.title}
                </h4>
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
              <span className="material-symbols-outlined text-3xl text-accent-primary">
                inventory_2
              </span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">
                  {activity.capsule.name}
                </h4>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.capsule.total_outfits_possible} outfits posibles
                </p>
                {activity.capsule.color_palette && (
                  <div className="flex gap-2 mt-2">
                    {activity.capsule.color_palette.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'lookbook_created':
        if (!activity.lookbook) return null;
        return (
          <div className="mt-3 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-purple-500">
                photo_library
              </span>
              <div>
                <h4 className="font-semibold text-text-primary dark:text-gray-200">
                  {activity.lookbook.title}
                </h4>
                {activity.lookbook.description && (
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                    {activity.lookbook.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'rating_given':
        if (!activity.outfit_rating) return null;
        return (
          <div className="mt-3 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`material-symbols-outlined text-xl ${i < activity.outfit_rating!.overall_rating
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-700'
                      }`}
                    style={{ fontVariationSettings: i < activity.outfit_rating!.overall_rating ? '"FILL" 1' : '"FILL" 0' }}
                  >
                    star
                  </span>
                ))}
              </div>
              <div className="flex-1">
                {activity.outfit_rating.feedback && (
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    "{activity.outfit_rating.feedback}"
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'style_milestone':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-3xl text-pink-500">
                stars
              </span>
              <p className="text-text-primary dark:text-gray-200 font-medium">
                {activity.caption}
              </p>
            </div>
          </div>
        );

      case 'borrow_requested':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-200 dark:border-teal-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl text-teal-600 dark:text-teal-400">
                  swap_horiz
                </span>
              </div>
              <div className="flex-1">
                <p className="text-text-primary dark:text-gray-200 font-medium">
                  Solicitud de préstamo
                </p>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.caption || 'Quiere prestarse una prenda tuya'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'borrow_approved':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl text-green-600 dark:text-green-400">
                  check_circle
                </span>
              </div>
              <div className="flex-1">
                <p className="text-text-primary dark:text-gray-200 font-medium">
                  Préstamo aprobado
                </p>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.caption || 'Tu solicitud fue aceptada'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'borrow_declined':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl text-red-600 dark:text-red-400">
                  cancel
                </span>
              </div>
              <div className="flex-1">
                <p className="text-text-primary dark:text-gray-200 font-medium">
                  Préstamo rechazado
                </p>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.caption || 'La solicitud no fue aceptada'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'item_returned':
        return (
          <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">
                  assignment_return
                </span>
              </div>
              <div className="flex-1">
                <p className="text-text-primary dark:text-gray-200 font-medium">
                  Prenda devuelta
                </p>
                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                  {activity.caption || 'La prenda fue devuelta'}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card variant="glass" padding="md" rounded="2xl" className="shadow-soft animate-fade-in">
      {/* Header: User info + timestamp */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-xl">
            {activity.user_avatar || '👤'}
          </div>

          {/* User name + activity description */}
          <div>
            <p className="font-semibold text-text-primary dark:text-gray-200">
              {activity.user_name}
            </p>
            <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
              <span className="material-symbols-outlined text-base">
                {activityIcon}
              </span>
              <span>{activityDescription}</span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">
          {relativeTime}
        </span>
      </div>

      {/* Caption */}
      {activity.caption && (
        <p className="text-text-primary dark:text-gray-200 mb-2">
          {activity.caption}
        </p>
      )}

      {/* Tags */}
      {activity.tags && activity.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
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

      {/* Activity-specific content */}
      {renderActivityContent()}

      {/* Engagement bar: Like, Comment, Share */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        {/* Engagement counts */}
        <div className="flex items-center gap-4 text-sm text-text-secondary dark:text-gray-400">
          <span>{formatEngagementCount(activity.likes_count)} likes</span>
          <span>{formatEngagementCount(activity.comments_count)} comentarios</span>
          <span>{formatEngagementCount(activity.shares_count)} compartidos</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            onClick={() => onLike(activity.id)}
            className={`p-2 rounded-full transition-all ${activity.is_liked
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            aria-label={activity.is_liked ? 'Quitar like' : 'Dar like'}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: activity.is_liked ? '"FILL" 1' : '"FILL" 0' }}
            >
              favorite
            </span>
          </button>

          {/* Comment button */}
          <button
            onClick={() => onComment(activity.id)}
            className="p-2 rounded-full text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Comentar"
          >
            <span className="material-symbols-outlined text-xl">
              chat_bubble
            </span>
          </button>

          {/* Share button */}
          <button
            onClick={() => onShare(activity.id)}
            className={`p-2 rounded-full transition-all ${activity.is_shared
                ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            aria-label={activity.is_shared ? 'Dejar de compartir' : 'Compartir'}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: activity.is_shared ? '"FILL" 1' : '"FILL" 0' }}
            >
              share
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export { ActivityCard };
export default ActivityCard;
