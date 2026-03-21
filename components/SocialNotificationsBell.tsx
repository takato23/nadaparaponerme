import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getUnreadSocialNotificationsCount,
  subscribeToSocialNotifications,
} from '../src/services/notificationsService';

interface SocialNotificationsBellProps {
  onClick: () => void;
  className?: string;
}

export default function SocialNotificationsBell({ onClick, className }: SocialNotificationsBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const loadCount = async () => {
      const count = await getUnreadSocialNotificationsCount();
      setUnreadCount(count);
    };

    void loadCount();
    const unsubscribe = subscribeToSocialNotifications(user.id, () => {
      void loadCount();
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  return (
    <button
      onClick={onClick}
      className={className || 'relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors'}
      aria-label="Notificaciones"
      title="Notificaciones"
    >
      <span className="material-symbols-outlined text-2xl">notifications</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
