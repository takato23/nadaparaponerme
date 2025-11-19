// FIX: Create component to resolve 'not a module' error.
import React from 'react';
import type { CommunityUser } from '../types';

interface CommunityViewProps {
  friends: CommunityUser[];
  onViewFriendCloset: (friend: CommunityUser) => void;
}

const CommunityView = ({ friends, onViewFriendCloset }: CommunityViewProps) => {
  return (
    <div className="w-full h-full flex flex-col pt-10 animate-fade-in">
      <header className="px-6 pb-4">
        <h1 className="text-4xl font-bold text-text-primary dark:text-gray-200">Comunidad</h1>
      </header>
      <div className="flex-grow overflow-y-auto px-4">
        <div className="max-w-4xl mx-auto space-y-3">
            {friends.map(friend => (
            <button 
                key={friend.id} 
                onClick={() => onViewFriendCloset(friend)}
                className="w-full flex items-center gap-4 liquid-glass p-3 rounded-2xl"
            >
                <img src={friend.avatarUrl} alt={friend.name} className="w-16 h-16 object-cover rounded-full" />
                <div className="text-left">
                <h3 className="font-bold text-text-primary dark:text-gray-200">{friend.name}</h3>
                <p className="text-text-secondary dark:text-gray-400">{friend.username}</p>
                </div>
            </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityView;