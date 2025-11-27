import React, { useMemo } from 'react';
import type { ClothingItem } from '../types';
import { useVersatilityScores } from '../hooks/useVersatilityScores';
import ClosetItemCard from './closet/ClosetItemCard';
import EmptyClosetState from './EmptyClosetState';

interface ClosetGridProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  viewMode: 'grid' | 'list';
  showVersatilityScore?: boolean;
}

const ClosetGrid = ({ items, onItemClick, viewMode, showVersatilityScore = false }: ClosetGridProps) => {
  // Calculate versatility scores for all items (memoized)
  const itemsWithScores = useVersatilityScores(items, showVersatilityScore);

  if (items.length === 0) {
    return <EmptyClosetState />;
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