import React, { useState } from 'react';
import type { ClothingItem, CommunityUser } from '../types';

interface ShareItemViewProps {
  item: ClothingItem;
  friends: CommunityUser[];
  onClose: () => void;
  onShare: (friendIds: string[]) => void;
}

const ShareItemView = ({ item, friends, onClose, onShare }: ShareItemViewProps) => {
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  const handleToggleFriend = (friendId: string) => {
    const newSelection = new Set(selectedFriendIds);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriendIds(newSelection);
  };

  const handleShare = () => {
    onShare(Array.from(selectedFriendIds));
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl rounded-3xl p-6 flex flex-col max-h-[80vh]">
        <header className="w-full flex items-center justify-between mb-4 flex-shrink-0">
          <div className="w-8"></div>
          <h2 className="text-xl font-bold text-text-primary dark:text-gray-200">Compartir Prenda</h2>
          <button onClick={onClose} className="p-2 -m-2 dark:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex items-center gap-4 p-3 rounded-2xl mb-4 liquid-glass flex-shrink-0">
            <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
            <div>
              <p className="text-text-secondary dark:text-gray-400 text-sm">Compartiendo:</p>
              <h3 className="font-bold capitalize text-text-primary dark:text-gray-200">{item.metadata.subcategory}</h3>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
            {friends.map(friend => {
                const isSelected = selectedFriendIds.has(friend.id);
                return (
                    <button 
                        key={friend.id} 
                        onClick={() => handleToggleFriend(friend.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                    >
                        <img src={friend.avatarUrl} alt={friend.name} className="w-12 h-12 object-cover rounded-full" />
                        <div className="text-left flex-grow">
                            <h4 className="font-bold text-text-primary dark:text-gray-200">{friend.name}</h4>
                            <p className="text-text-secondary dark:text-gray-400 text-sm">{friend.username}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-500'}`}>
                            {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                        </div>
                    </button>
                )
            })}
        </div>

        <button 
          onClick={handleShare}
          disabled={selectedFriendIds.size === 0}
          className="w-full mt-6 bg-primary text-white font-bold py-3 px-4 rounded-xl disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors flex-shrink-0"
        >
          Compartir
        </button>
      </div>
    </div>
  );
};

export default ShareItemView;
