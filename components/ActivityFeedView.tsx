/**
 * Activity Feed View
 *
 * Social feed showing friend activities including shared outfits,
 * new items, completed challenges, and more.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { ActivityFeedItem, ActivityType, ClothingItem, SavedOutfit } from '../types';
import {
  fetchActivityFeed,
  getActivityIcon,
  getActivityDescription,
  formatRelativeTime,
  formatEngagementCount,
  toggleActivityLike,
  toggleActivityShare
} from '../services/activityFeedService';
import ActivityCard from './ActivityCard';
import ActivityCommentsDrawer from './ActivityCommentsDrawer';
import Loader from './Loader';
import { EmptyState } from './ui/EmptyState';
import { Card } from './ui/Card';
import { SuggestedUsers } from '../src/components/SuggestedUsers';

interface ActivityFeedViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onViewOutfit?: (outfit: SavedOutfit) => void;
  onViewItem?: (item: ClothingItem) => void;
}

type FilterOption = 'all' | 'community' | ActivityType;

const ActivityFeedView = ({
  closet,
  savedOutfits,
  onClose,
  onViewOutfit,
  onViewItem
}: ActivityFeedViewProps) => {
  // State management
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [selectedActivityForComments, setSelectedActivityForComments] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load feed when filter changes
  useEffect(() => {
    loadFeed(selectedFilter);
  }, [selectedFilter]);

  const loadFeed = async (filter: FilterOption) => {
    setLoading(true);
    try {
      // Determine source filter for API
      const sourceFilter = filter === 'community' ? 'community' : 'all';

      // Fetch data
      const data = await fetchActivityFeed(sourceFilter);

      // Apply type filtering client-side if needed
      if (filter !== 'all' && filter !== 'community') {
        setActivities(data.filter(a => a.activity_type === filter));
      } else {
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh feed
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(selectedFilter);
    setRefreshing(false);
  };

  // Handle like toggle
  const handleLike = (activityId: string) => {
    setActivities(prev => toggleActivityLike(activityId, prev));
  };

  // Handle share toggle
  const handleShare = (activityId: string) => {
    setActivities(prev => toggleActivityShare(activityId, prev));
  };

  // Handle comment button click
  const handleCommentClick = (activityId: string) => {
    setSelectedActivityForComments(activityId);
  };

  // Close comments drawer
  const handleCloseComments = () => {
    setSelectedActivityForComments(null);
  };

  // Filter options configuration
  const filterOptions: { value: FilterOption, label: string, icon: string }[] = [
    { value: 'all', label: 'Todo', icon: 'dynamic_feed' },
    { value: 'outfit_shared', label: 'Outfits', icon: 'checkroom' },
    { value: 'item_added', label: 'Prendas', icon: 'add_shopping_cart' },
    { value: 'challenge_completed', label: 'Desafíos', icon: 'emoji_events' },
    { value: 'outfit_saved', label: 'Guardados', icon: 'favorite' },
    { value: 'community', label: 'Comunidades', icon: 'groups' },
  ];

  if (loading && activities.length === 0) {
    return (
      <Card variant="glass" padding="none" rounded="none" className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-text-secondary dark:text-gray-400">
            Cargando actividad de amigos...
          </p>
        </div>
      </Card>
    );
  }

  const selectedActivity = activities.find(a => a.id === selectedActivityForComments);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background-primary dark:bg-gray-900">
      {/* Header with close button and title */}
      <Card variant="glass" padding="none" rounded="none" className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800" component="header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                Feed de Amigos
              </h1>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                {activities.length} actividades
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Actualizar feed"
          >
            <span className={`material-symbols-outlined text-2xl ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {filterOptions.map(option => (
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

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Suggested Users (Discovery) */}
          {selectedFilter === 'all' && <SuggestedUsers />}

          {/* Empty state */}
          {activities.length === 0 && !loading && (
            <EmptyState
              icon="sentiment_dissatisfied"
              title="No hay actividad"
              description={
                selectedFilter === 'all'
                  ? 'Seguí a más amigos para ver su actividad aquí'
                  : 'No hay actividades de este tipo para mostrar'
              }
            />
          )}

          {/* Activity cards */}
          {activities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onLike={handleLike}
              onComment={handleCommentClick}
              onShare={handleShare}
              onViewOutfit={onViewOutfit}
              onViewItem={onViewItem}
            />
          ))}

          {/* Load more indicator (placeholder for future infinite scroll) */}
          {activities.length > 0 && (
            <div className="text-center py-8 text-text-secondary dark:text-gray-400 text-sm">
              <span className="material-symbols-outlined text-2xl mb-2">
                check_circle
              </span>
              <p>Estás al día con la actividad de tus amigos</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments drawer */}
      {selectedActivity && (
        <ActivityCommentsDrawer
          activity={selectedActivity}
          onClose={handleCloseComments}
          onAddComment={(content) => {
            // This would be handled by parent in production
            console.log('New comment:', content);
          }}
        />
      )}

      {/* Refreshing indicator */}
      {refreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30">
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
