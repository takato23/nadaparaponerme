// FIX: Create component to resolve 'not a module' error.
import React, { useState } from 'react';
import type { CommunityUser, ClothingItem } from '../types';
import ClosetGrid from './ClosetGrid';

interface FriendClosetViewProps {
  friend: CommunityUser;
  onClose: () => void;
  onGenerateWithItems: (items: ClothingItem[]) => void;
}

const FriendClosetView = ({ friend, onClose, onGenerateWithItems }: FriendClosetViewProps) => {
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleItemClick = (id: string) => {
    const item = friend.closet.find(i => i.id === id);
    if (!item) return;

    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);

    const newSelectedItems = friend.closet.filter(i => newSelectedIds.has(i.id));
    setSelectedItems(newSelectedItems);
  };
  
  const modifiedCloset = friend.closet.map(item => ({
      ...item,
      imageDataUrl: selectedIds.has(item.id) ? `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><foreignObject width="100%" height="100%"><img src="${item.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.5)"/></foreignObject><circle cx="50" cy="50" r="20" fill="white"/><path d="M45 55 L35 45 L40 40 L45 45 L60 30 L65 35 Z" fill="%230D9488"/></svg>` : item.imageDataUrl
  }));

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-40 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-2xl bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:p-4">
       <header className="flex items-center justify-between pb-4">
        <button onClick={onClose} className="p-2 dark:text-gray-200">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Armario de {friend.name}</h1>
        <div className="w-10"></div>
      </header>
      
      <p className="text-center text-text-secondary dark:text-gray-400 pb-4">Selecciona prendas para pedir prestadas y crear un outfit.</p>
      
      <div className="flex-grow overflow-y-auto -mx-4">
        <ClosetGrid items={modifiedCloset} onItemClick={handleItemClick} viewMode="grid" />
      </div>

      <div className="pt-4">
        <button 
          onClick={() => onGenerateWithItems(selectedItems)} 
          disabled={selectedItems.length === 0}
          className="w-full bg-primary text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-all"
        >
          {selectedItems.length > 0 ? `Generar con ${selectedItems.length} prendas` : 'Selecciona prendas'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default FriendClosetView;