/**
 * Activity Comments Drawer
 *
 * Bottom drawer/modal for viewing and adding threaded comments to an activity.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ActivityFeedItem, ActivityComment } from '../types';
import {
  fetchActivityComments,
  createActivityComment,
  deleteActivityComment,
  toggleActivityCommentLike,
  formatRelativeTime,
  getActivityDescription,
} from '../src/services/activityFeedService';
import { reportContent, blockUser, getBlockedUserIds } from '../src/services/moderationService';
import { sanitizeUserInput } from '../utils/sanitize';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

interface ActivityCommentsDrawerProps {
  activity: ActivityFeedItem;
  onClose: () => void;
  onAddComment: (content: string, parentCommentId?: string | null) => void;
  onDeleteComment?: (comment: ActivityComment) => void;
  embedded?: boolean;
}

const ActivityCommentsDrawer = ({
  activity,
  onClose,
  onAddComment,
  onDeleteComment,
  embedded = false,
}: ActivityCommentsDrawerProps) => {
  const toast = useToast();
  const { user } = useAuth();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ActivityComment | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const rootComments = useMemo(
    () => comments.filter((comment) => !comment.parent_comment_id && !blockedUserIds.includes(comment.user_id)),
    [comments, blockedUserIds]
  );

  const commentsByParent = useMemo(() => {
    const map = new Map<string, ActivityComment[]>();
    for (const comment of comments) {
      if (blockedUserIds.includes(comment.user_id)) continue;
      if (!comment.parent_comment_id) continue;
      const current = map.get(comment.parent_comment_id) || [];
      current.push(comment);
      map.set(comment.parent_comment_id, current);
    }
    return map;
  }, [comments, blockedUserIds]);
  const visibleCommentsCount = rootComments.length + Array.from(commentsByParent.values()).reduce((sum, arr) => sum + arr.length, 0);

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

  useEffect(() => {
    void loadComments();
    void (async () => {
      const blocked = await getBlockedUserIds();
      setBlockedUserIds(blocked);
    })();

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    return () => clearTimeout(focusTimer);
  }, [activity.id]);

  const handleReportComment = async (commentId: string) => {
    try {
      await reportContent({
        targetType: 'comment',
        targetId: commentId,
        reason: 'other',
      });
      setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId));
      toast.success('Comentario reportado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reportar');
    } finally {
      setOpenMenuCommentId(null);
    }
  };

  const handleBlockCommentUser = async (comment: ActivityComment) => {
    try {
      await blockUser(comment.user_id);
      setBlockedUserIds((prev) => Array.from(new Set([...prev, comment.user_id])));
      toast.success(`Bloqueaste a ${comment.user_name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo bloquear');
    } finally {
      setOpenMenuCommentId(null);
    }
  };

  const handleDeleteComment = async (comment: ActivityComment) => {
    try {
      await deleteActivityComment(comment.id);
      setComments((prev) =>
        prev.filter(
          (entry) => entry.id !== comment.id && entry.parent_comment_id !== comment.id
        )
      );
      onDeleteComment?.(comment);
      toast.success('Comentario borrado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar');
    } finally {
      setOpenMenuCommentId(null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);

    try {
      const created = await createActivityComment(activity.id, newComment.trim(), replyingTo?.id || null);

      setComments((prev) => {
        const exists = prev.some((comment) => comment.id === created.id);
        if (exists) return prev;
        return [...prev, created];
      });
      onAddComment(newComment.trim(), replyingTo?.id || null);

      setNewComment('');
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo comentar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    if (likingCommentId === commentId) return;
    const current = comments.find((comment) => comment.id === commentId);
    if (!current) return;

    const nextLiked = !current.is_liked;
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
            ...comment,
            is_liked: nextLiked,
            likes_count: Math.max(0, (comment.likes_count || 0) + (nextLiked ? 1 : -1)),
          }
          : comment
      )
    );
    setLikingCommentId(commentId);

    try {
      const result = await toggleActivityCommentLike(commentId);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
              ...comment,
              is_liked: result.isActive,
              likes_count: result.likesCount,
            }
            : comment
        )
      );
    } catch (error) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
              ...comment,
              is_liked: current.is_liked,
              likes_count: current.likes_count || 0,
            }
            : comment
        )
      );
      toast.error(error instanceof Error ? error.message : 'No se pudo dar like');
    } finally {
      setLikingCommentId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmitComment(e as any);
    }
  };

  const activityDescription = getActivityDescription(activity);
  const overlayClassName = embedded
    ? 'absolute inset-0 bg-black/65 z-[120] backdrop-blur-[2px] animate-fade-in'
    : 'fixed inset-0 bg-black/65 z-[120] backdrop-blur-[2px] animate-fade-in';
  const drawerClassName = embedded
    ? 'absolute inset-x-0 bottom-0 z-[130] max-h-[88%] md:max-w-3xl md:mx-auto flex flex-col bg-white/96 dark:bg-gray-950/95 backdrop-blur-2xl rounded-t-3xl md:rounded-3xl shadow-2xl animate-slide-up border border-white/40 dark:border-white/10'
    : 'fixed inset-x-0 bottom-0 z-[130] max-h-[88vh] md:max-w-3xl md:mx-auto flex flex-col bg-white/96 dark:bg-gray-950/95 backdrop-blur-2xl rounded-t-3xl md:rounded-3xl shadow-2xl animate-slide-up border border-white/40 dark:border-white/10';

  const renderComment = (comment: ActivityComment, isReply = false) => (
    <div key={comment.id} className={`flex gap-3 animate-fade-in ${isReply ? 'ml-10' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-sm">{comment.user_avatar || '👤'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white/95 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-text-primary dark:text-gray-200">
              {comment.user_name}
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenuCommentId((prev) => (prev === comment.id ? null : comment.id))}
                className="p-1 rounded-full hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                aria-label="Más acciones"
              >
                <span className="material-symbols-outlined text-sm text-text-secondary">more_horiz</span>
              </button>
              {openMenuCommentId === comment.id && (
                <div className="absolute right-0 top-full mt-1 min-w-[150px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-30">
                  {user?.id === comment.user_id && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteComment(comment)}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Borrar comentario
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleReportComment(comment.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Reportar comentario
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBlockCommentUser(comment)}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Bloquear usuario
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-text-primary dark:text-gray-200 mt-1 break-words">
            {sanitizeUserInput(comment.content)}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-1 px-2">
          <span className="text-xs text-text-secondary dark:text-gray-400">
            {formatRelativeTime(comment.timestamp)}
          </span>
          <button
            type="button"
            onClick={() => void handleToggleLike(comment.id)}
            disabled={likingCommentId === comment.id}
            className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
              comment.is_liked ? 'text-red-500' : 'text-text-secondary dark:text-gray-400'
            }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: comment.is_liked ? '"FILL" 1' : '"FILL" 0' }}
            >
              favorite
            </span>
            {comment.likes_count || 0}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => {
                setReplyingTo(comment);
                inputRef.current?.focus();
              }}
              className="text-xs font-semibold text-accent-primary hover:underline"
            >
              Responder
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={overlayClassName}
        onClick={onClose}
      />

      <div className={drawerClassName}>
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 rounded-full bg-gray-300/90 dark:bg-gray-700/90" />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800">
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

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gradient-to-b from-transparent to-gray-50/60 dark:to-gray-900/60">
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
          ) : visibleCommentsCount === 0 ? (
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
              {rootComments.map((comment) => (
                <div key={comment.id} className="space-y-2.5">
                  {renderComment(comment)}
                  {(commentsByParent.get(comment.id) || []).map((reply) => renderComment(reply, true))}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmitComment}
          className="px-5 pt-3 pb-[max(calc(1rem+env(safe-area-inset-bottom)),6.75rem)] border-t border-gray-200 dark:border-gray-800 bg-white/92 dark:bg-gray-950/92"
        >
          {replyingTo && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-accent-primary/10 text-xs text-accent-primary flex items-center justify-between">
              <span>Respondiendo a {replyingTo.user_name}</span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="font-semibold"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-sm">👤</span>
            </div>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? `Responder a ${replyingTo.user_name}...` : 'Escribí un comentario...'}
                rows={1}
                className="w-full px-4 py-2 rounded-2xl bg-white/95 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 resize-none text-text-primary dark:text-gray-200 placeholder-text-secondary dark:placeholder-gray-500"
                style={{
                  minHeight: '40px',
                  maxHeight: '120px',
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
