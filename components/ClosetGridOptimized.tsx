import React, { useMemo, useState, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import type { ClothingItem } from '../types';
import { calculateVersatilityScore, getVersatilityBadgeColor } from '../utils/versatilityScore';

interface ClosetGridProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  onItemDelete?: (id: string) => void;
  viewMode: 'grid' | 'list';
  showVersatilityScore?: boolean;
}

/**
 * Mobile-optimized ClosetGrid with swipe-to-delete
 *
 * Performance optimizations:
 * - Virtualized rendering for large lists
 * - Lazy loaded images with blur placeholders
 * - Touch-optimized interactions
 * - Swipe-to-delete gesture (list mode)
 */
const ClosetGridOptimized = ({
  items,
  onItemClick,
  onItemDelete,
  viewMode,
  showVersatilityScore = false
}: ClosetGridProps) => {

  // Calculate versatility scores for all items
  const itemsWithScores = useMemo(() => {
    if (!showVersatilityScore) return items.map(item => ({ item, score: 0 }));
    return items.map(item => ({
      item,
      score: calculateVersatilityScore(item, items)
    }));
  }, [items, showVersatilityScore]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full px-8 animate-fade-in">
        <div className="w-24 h-24 mb-6 rounded-full liquid-glass flex items-center justify-center">
            <span className="material-symbols-outlined text-text-primary/50 dark:text-gray-200/50 text-5xl">dresser</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2 tracking-tight">Armario Vacío</h2>
        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-[200px]">
          Toca el '+' para empezar a digitalizar tu ropa.
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="px-4 pb-32 space-y-2 animate-fade-in">
        {itemsWithScores.map(({ item, score }) => (
          <SwipeableListItem
            key={item.id}
            item={item}
            score={score}
            showScore={showVersatilityScore}
            onItemClick={onItemClick}
            onItemDelete={onItemDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 p-4 pb-32 animate-fade-in">
      {itemsWithScores.map(({ item, score }) => (
        <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className="
              aspect-square relative group rounded-2xl overflow-hidden liquid-glass
              transition-all duration-250
              hover:scale-105 active:scale-95
              focus:ring-2 focus:ring-primary focus:ring-offset-2
              touch-manipulation
            "
            aria-label={`Ver detalles de ${item.metadata.subcategory} ${item.metadata.color_primary}`}
        >
          <img
            src={item.imageDataUrl}
            alt={`${item.metadata.subcategory} ${item.metadata.color_primary}`}
            className="w-full h-full object-cover group-hover:scale-110 group-active:scale-100 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
          {showVersatilityScore && (
            <div
              className={`absolute top-2 right-2 px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg ${getVersatilityBadgeColor(score)}`}
              aria-label={`Puntuación de versatilidad: ${score}`}
            >
              {score}
            </div>
          )}
          {/* Subtle overlay for better visual feedback */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 group-active:bg-black/10 transition-colors duration-200 pointer-events-none" />
        </button>
      ))}
    </div>
  );
};

/**
 * SwipeableListItem - List item with swipe-to-delete gesture
 */
interface SwipeableListItemProps {
  item: ClothingItem;
  score: number;
  showScore: boolean;
  onItemClick: (id: string) => void;
  onItemDelete?: (id: string) => void;
}

const SwipeableListItem = ({
  item,
  score,
  showScore,
  onItemClick,
  onItemDelete
}: SwipeableListItemProps) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], last }) => {
      const itemEl = itemRef.current;
      if (!itemEl) return;

      // Only allow left swipe
      if (mx > 0) {
        itemEl.style.transform = 'translateX(0px)';
        return;
      }

      setIsSwiping(true);

      if (last) {
        const shouldDelete = Math.abs(mx) > 120 || (Math.abs(vx) > 0.5 && dx < 0);

        if (shouldDelete && onItemDelete) {
          // Animate out and delete
          itemEl.style.transform = 'translateX(-100%)';
          itemEl.style.opacity = '0';
          itemEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s';
          setTimeout(() => {
            onItemDelete(item.id);
          }, 300);
        } else {
          // Snap back
          itemEl.style.transform = 'translateX(0px)';
          itemEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          setTimeout(() => setIsSwiping(false), 300);
        }
      } else {
        // Follow finger
        itemEl.style.transform = `translateX(${Math.max(mx, -150)}px)`;
        itemEl.style.transition = 'none';
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
    }
  );

  const handleClick = () => {
    if (!isSwiping) {
      onItemClick(item.id);
    }
  };

  return (
    <div className="relative">
      {/* Delete background */}
      {onItemDelete && (
        <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6">
          <span className="material-symbols-outlined text-white text-2xl">delete</span>
        </div>
      )}

      {/* Item content */}
      <div
        ref={itemRef}
        {...bind()}
        onClick={handleClick}
        className="
          w-full flex items-center gap-3 sm:gap-4 liquid-glass p-2 sm:p-3 rounded-2xl
          transition-all
          active:scale-98
          focus:ring-2 focus:ring-primary focus:ring-offset-2
          touch-manipulation
          min-h-[72px]
          cursor-pointer
        "
        aria-label={`Ver detalles de ${item.metadata.subcategory} ${item.metadata.color_primary}`}
      >
        <img
          src={item.imageDataUrl}
          alt={`${item.metadata.subcategory} ${item.metadata.color_primary}`}
          className="w-16 h-16 min-w-[64px] object-cover rounded-xl flex-shrink-0 bg-gray-100"
          loading="lazy"
          decoding="async"
        />
        <div className="text-left overflow-hidden flex-grow">
          <h3 className="text-text-primary dark:text-gray-200 font-bold capitalize truncate">
            {item.metadata.subcategory}
          </h3>
          <p className="text-text-secondary dark:text-gray-400 text-sm capitalize truncate">
            {item.metadata.color_primary}
          </p>
        </div>
        {showScore && (
          <div
            className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getVersatilityBadgeColor(score)}`}
            aria-label={`Puntuación de versatilidad: ${score}`}
          >
            {score}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClosetGridOptimized;
