import React from 'react';
import Skeleton from './Skeleton';
import { Card } from './Card';

/**
 * ChatSkeleton - Loading state for AI chat messages
 * 
 * Shows animated placeholder while AI is processing response
 */
export const ChatSkeleton = () => (
    <div className="flex gap-3 animate-fade-in">
        {/* Avatar */}
        <Skeleton variant="circular" width={40} height={40} />

        {/* Message bubble */}
        <Card variant="glass" padding="md" rounded="2xl" className="flex-1 max-w-[80%] space-y-2">
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
            <Skeleton variant="text" width="60%" />
        </Card>
    </div>
);

/**
 * ChatTypingIndicator - Animated dots for AI is typing
 */
export const ChatTypingIndicator = () => (
    <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">auto_awesome</span>
        </div>
        <div className="flex gap-1.5">
            <span
                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                style={{ animationDelay: '0ms' }}
            />
            <span
                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                style={{ animationDelay: '150ms' }}
            />
            <span
                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                style={{ animationDelay: '300ms' }}
            />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
            Pensando...
        </span>
    </div>
);

/**
 * MessageListSkeleton - Full chat view skeleton
 */
export const MessageListSkeleton = () => (
    <div className="space-y-4 p-4">
        {/* AI message */}
        <ChatSkeleton />

        {/* User message (right aligned) */}
        <div className="flex justify-end">
            <Card variant="glass" padding="md" rounded="2xl" className="max-w-[70%] space-y-2 bg-purple-500/10">
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="50%" />
            </Card>
        </div>

        {/* AI message */}
        <ChatSkeleton />
    </div>
);

export default ChatSkeleton;
