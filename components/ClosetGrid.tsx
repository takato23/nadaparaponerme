import React, { useMemo } from 'react';
import type { ClothingItem } from '../types';
import { calculateVersatilityScore } from '../utils/versatilityScore';
import ClosetItemCard from './closet/ClosetItemCard';

interface ClosetGridProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  viewMode: 'grid' | 'list';
  showVersatilityScore?: boolean;
}

const ClosetGrid = ({ items, onItemClick, viewMode, showVersatilityScore = false }: ClosetGridProps) => {
  // Calculate versatility scores for all items (memoized)
  const itemsWithScores = useMemo(() => {
    if (!showVersatilityScore) return items.map(item => ({ item, score: 0 }));
    return items.map(item => ({
      item,
      score: calculateVersatilityScore(item, items)
    }));
  }, [items, showVersatilityScore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 animate-fade-in py-20">
        <div className="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shadow-glow animate-float">
          <span className="material-symbols-outlined text-primary text-6xl">checkroom</span>
        </div>
        <h2 className="text-3xl font-serif font-bold text-text-primary dark:text-gray-100 mb-3 tracking-tight">
          Tu Armario Digital
        </h2>
        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-[280px] text-lg leading-relaxed mb-8">
          Empieza a construir tu colección digital. Sube fotos de tus prendas favoritas.
        </p>
        <div className="flex gap-2 text-sm text-primary/60 font-medium uppercase tracking-wider">
          <span>• Organiza</span>
          <span>• Combina</span>
          <span>• Descubre</span>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="px-4 pb-32 space-y-3 animate-fade-in">
        {itemsWithScores.map(({ item, score }, idx) => (
          <ClosetItemCard
            key={item.id}
            item={item}
            onClick={onItemClick}
            viewMode="list"
            showVersatilityScore={showVersatilityScore}
            versatilityScore={score}
            index={idx}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-4 p-2 sm:p-4 pb-32 animate-fade-in">
      {itemsWithScores.map(({ item, score }, idx) => (
        <ClosetItemCard
          key={item.id}
          item={item}
          onClick={onItemClick}
          viewMode="grid"
          showVersatilityScore={showVersatilityScore}
          versatilityScore={score}
          index={idx}
        />
      ))}
    </div>
  );
};

export default ClosetGrid;