/**
 * Activity Comments Drawer
 *
 * Bottom drawer/modal for viewing and adding comments to an activity.
 * Includes mock comments generation and comment submission.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ActivityFeedItem, ActivityComment } from '../types';
import {
  fetchActivityComments,
  formatRelativeTime,
  getActivityDescription
} from '../services/activityFeedService';
import { sanitizeUserInput } from '../utils/sanitize';

interface ActivityCommentsDrawerProps {
  activity: ActivityFeedItem;
  onClose: () => void;
  onAddComment: (content: string) => void;
}

const ActivityCommentsDrawer = ({
  activity,
  onClose,
  onAddComment
}: ActivityCommentsDrawerProps) => {
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load comments when drawer opens
  useEffect(() => {
    loadComments();
    // Auto-focus input after drawer animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, [activity.id]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await fetchActivityComments(activity.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    }
    setLoading(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);

    // Simulate API submission
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create new comment
    const comment: ActivityComment = {
      id: `comment-${Date.now()}`,
      activity_id: activity.id,
      user_id: 'current-user',
      user_name: 'Tú',
      user_avatar: '👤',
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      likes_count: 0
    };

    // Add to local state
    setComments(prev => [...prev, comment]);
    onAddComment(newComment.trim());

    // Reset input
    setNewComment('');
    setSubmitting(false);

    // Keep focus on input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment(e as any);
    }
  };

  const activityDescription = getActivityDescription(activity);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] flex flex-col liquid-glass rounded-t-3xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200">
              Comentarios
            </h3>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {activity.user_name} {activityDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-3">
                chat_bubble
              </span>
              <p className="text-text-secondary dark:text-gray-400">
                Sé el primero en comentar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 animate-fade-in">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">{comment.user_avatar || '👤'}</span>
                  </div>

                  {/* Comment content */}
                  <div className="flex-1 min-w-0">
                    <div className="liquid-glass p-3 rounded-2xl">
                      <p className="font-semibold text-sm text-text-primary dark:text-gray-200">
                        {comment.user_name}
                      </p>
                      <p className="text-text-primary dark:text-gray-200 mt-1 break-words">
                        {sanitizeUserInput(comment.content)}
                      </p>
                    </div>

                    {/* Comment metadata */}
                    <div className="flex items-center gap-3 mt-1 px-3">
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        {formatRelativeTime(comment.timestamp)}
                      </span>
                      {comment.likes_count !== undefined && comment.likes_count > 0 && (
                        <span className="text-xs text-text-secondary dark:text-gray-400">
                          {comment.likes_count} {comment.likes_count === 1 ? 'like' : 'likes'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment input */}
        <form
          onSubmit={handleSubmitComment}
          className="px-6 py-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex gap-3">
            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm">👤</span>
            </div>

            {/* Input field */}
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí un comentario..."
                rows={1}
                className="w-full px-4 py-2 rounded-full liquid-glass border border-gray-200 dark:border-gray-700 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 resize-none text-text-primary dark:text-gray-200 placeholder-text-secondary dark:placeholder-gray-500"
                style={{
                  minHeight: '40px',
                  maxHeight: '120px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 px-4">
                Presiona Enter para enviar • Shift+Enter para nueva línea
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="p-2 rounded-full bg-accent-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-primary/90 transition-colors flex-shrink-0 self-start mt-1"
              aria-label="Enviar comentario"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined">send</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ActivityCommentsDrawer;
