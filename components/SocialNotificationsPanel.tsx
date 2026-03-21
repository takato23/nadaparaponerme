import React, { useEffect, useMemo, useState } from 'react';
import type { SocialNotification } from '../types';
import {
  getSocialNotifications,
  markSocialNotificationsRead,
} from '../src/services/notificationsService';
import { formatRelativeTime } from '../src/services/activityFeedService';

interface SocialNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (notification: SocialNotification) => void;
  embedded?: boolean;
}

const EVENT_LABELS: Record<SocialNotification['event_type'], string> = {
  follow: 'empezó a seguirte',
  post_like: 'le dio like a tu publicación',
  post_comment: 'comentó tu publicación',
  comment_reply: 'respondió un comentario',
  post_shared: 'compartió tu publicación',
  challenge_invite: 'te invitó a un desafío',
  challenge_voted: 'votó en un desafío',
  report_status: 'actualizó un reporte',
};

function getNotificationTitle(notification: SocialNotification): string {
  const customTitle = typeof notification.metadata?.title === 'string'
    ? notification.metadata.title.trim()
    : '';
  if (customTitle) return customTitle;

  return `${notification.actor_display_name || notification.actor_username || 'Usuario'} ${EVENT_LABELS[notification.event_type]}`;
}

function getNotificationSubtitle(notification: SocialNotification): string | null {
  const customSubtitle = typeof notification.metadata?.subtitle === 'string'
    ? notification.metadata.subtitle.trim()
    : '';
  return customSubtitle || null;
}

export default function SocialNotificationsPanel({
  isOpen,
  onClose,
  onSelectNotification,
  embedded = false,
}: SocialNotificationsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.read_at).map((item) => item.id),
    [notifications]
  );

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSocialNotifications(40, 0, false);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0) return;
    await markSocialNotificationsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  };

  const handleSelect = async (notification: SocialNotification) => {
    if (!notification.read_at) {
      await markSocialNotificationsRead([notification.id]);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    }

    onSelectNotification?.(notification);
  };

  if (!isOpen) return null;

  const overlayClassName = embedded
    ? 'absolute inset-0 z-50 bg-black/40'
    : 'fixed inset-0 z-50 bg-black/40';
  const panelClassName = embedded
    ? 'absolute inset-x-4 top-20 z-[60] w-auto max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl flex flex-col'
    : 'fixed right-4 top-20 z-[60] w-[min(90vw,380px)] max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl flex flex-col';

  return (
    <>
      <div className={overlayClassName} onClick={onClose} />
      <div className={panelClassName}>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary dark:text-gray-200">Notificaciones</h3>
            <p className="text-xs text-text-secondary dark:text-gray-400">{unreadIds.length} sin leer</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-primary disabled:opacity-40"
              disabled={unreadIds.length === 0}
            >
              Marcar leídas
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Cerrar notificaciones"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {loading && (
            <div className="p-4 text-sm text-text-secondary dark:text-gray-400">Cargando...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="p-8 text-center text-sm text-text-secondary dark:text-gray-400">
              No tenés notificaciones por ahora.
            </div>
          )}

          {!loading && notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => void handleSelect(notification)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                !notification.read_at ? 'bg-primary/5 dark:bg-primary/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(notification.actor_display_name || notification.actor_username || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary dark:text-gray-200">
                    {getNotificationTitle(notification)}
                  </p>
                  {getNotificationSubtitle(notification) && (
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 truncate">
                      {getNotificationSubtitle(notification)}
                    </p>
                  )}
                  <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
