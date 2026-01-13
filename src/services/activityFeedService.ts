/**
 * Activity Feed Service (re-export from root services)
 * 
 * This module re-exports the activity feed service for unified imports.
 */

export {
    fetchActivityFeed,
    formatRelativeTime,
    likeActivity,
    unlikeActivity,
    addComment,
    deleteComment,
    shareActivity,
} from '../../services/activityFeedService';
