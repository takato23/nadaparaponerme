/**
 * CLOSET GRID VIRTUALIZED
 *
 * High-performance virtualized grid using react-window for large closets.
 * Features:
 * - Window-based rendering (only visible items)
 * - Responsive column calculation
 * - Smooth scrolling
 * - Selection mode support
 * - Context menu integration
 * - Loading states
 * - Empty states
 * - Infinite scroll ready
 */

import React, { useMemo, useRef, useCallback, useState, useEffect, Suspense, lazy } from 'react';
import ClosetItemCard from './ClosetItemCard';
import ClosetQuickActions, { useContextMenu, QuickAction } from './ClosetQuickActions';
import type { ClothingItem } from '../../types';

const NanoBanana = lazy(() => import('./NanoBanana'));

interface ClosetGridVirtualizedProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  showVersatilityScore?: boolean;
  getItemVersatilityScore?: (itemId: string) => number;
  recommendedItemId?: string | null;

  // Selection mode
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;

  // Quick actions
  onQuickAction?: (action: string, item: ClothingItem) => void;
  customActions?: QuickAction[];

  // Layout
  columnWidth?: number;
  rowHeight?: number;
  gapSize?: number;

  // Performance
  overscanRowCount?: number;
  overscanColumnCount?: number;

  // Loading state
  isLoading?: boolean;

  // Empty state
  emptyTitle?: string;
  emptyMessage?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
}

export default function ClosetGridVirtualized({
  items,
  onItemClick,
  showVersatilityScore = false,
  getItemVersatilityScore,
  recommendedItemId = null,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onQuickAction,
  customActions,
  columnWidth = 180,
  rowHeight = 260,
  gapSize = 16,
  overscanRowCount = 2,
  overscanColumnCount = 1,
  isLoading = false,
  emptyTitle = 'Armario Vacío',
  emptyMessage = 'No hay prendas para mostrar',
  onEmptyAction,
  emptyActionLabel = 'Agregar Prenda'
}: ClosetGridVirtualizedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const rangeRef = useRef(visibleRange);
  const rafIdRef = useRef<number | null>(null);
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  const safeItems = items ?? [];

  const handleQuickActionInternal = useCallback((actionId: string, item: ClothingItem) => {
    if (onQuickAction) {
      onQuickAction(actionId, item);
    }
  }, [onQuickAction]);

  useEffect(() => {
    rangeRef.current = visibleRange;
  }, [visibleRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || safeItems.length === 0) return;

    const calculateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Estimate items per row (responsive)
      const containerWidth = container.clientWidth;
      const itemWidth = columnWidth + gapSize;
      const itemsPerRow = Math.max(2, Math.floor(containerWidth / itemWidth));

      // Calculate visible range with overscan
      const itemsPerScreen = Math.ceil(containerHeight / rowHeight) * itemsPerRow;
      const startRow = Math.floor(scrollTop / rowHeight);
      const startIndex = Math.max(0, (startRow - overscanRowCount) * itemsPerRow);
      const endIndex = Math.min(safeItems.length, startIndex + itemsPerScreen + (overscanRowCount * 2 * itemsPerRow));

      return { start: startIndex, end: endIndex };
    };

    const commitRange = () => {
      const nextRange = calculateVisibleRange();
      const previousRange = rangeRef.current;
      if (
        previousRange.start === nextRange.start &&
        previousRange.end === nextRange.end
      ) {
        return;
      }
      rangeRef.current = nextRange;
      setVisibleRange(nextRange);
    };

    const scheduleRangeUpdate = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        commitRange();
      });
    };

    // Initial calculation
    commitRange();

    container.addEventListener('scroll', scheduleRangeUpdate, { passive: true });
    window.addEventListener('resize', scheduleRangeUpdate);

    return () => {
      container.removeEventListener('scroll', scheduleRangeUpdate);
      window.removeEventListener('resize', scheduleRangeUpdate);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [safeItems.length, columnWidth, rowHeight, gapSize, overscanRowCount]);

  const visibleItems = useMemo(() => {
    return safeItems.slice(visibleRange.start, visibleRange.end);
  }, [safeItems, visibleRange]);

  if (!items) {
    return null;
  }

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
        <div className="relative w-32 h-32 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-2xl animate-pulse-glow" />
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shadow-glow animate-float">
            <span className="material-symbols-outlined text-primary text-6xl">
              checkroom
            </span>
          </div>
          <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary animate-bounce-small" style={{ animationDelay: '0s' }} />
          <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-secondary animate-bounce-small" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-1/2 right-0 w-2 h-2 rounded-full bg-accent animate-bounce-small" style={{ animationDelay: '0.6s' }} />

          <div className="absolute -bottom-4 -right-10 z-20">
            <Suspense fallback={null}>
              <NanoBanana className="scale-50 origin-bottom-right" />
            </Suspense>
          </div>
        </div>

        <h2 className="text-3xl font-serif font-bold text-text-primary dark:text-gray-100 mb-3 tracking-tight">
          {emptyTitle}
        </h2>
        <p className="text-text-secondary dark:text-gray-400 font-medium max-w-[280px] text-lg leading-relaxed mb-8">
          {emptyMessage}
        </p>
        {onEmptyAction && (
          <button
            onClick={onEmptyAction}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-glow-accent hover:shadow-glow-lg hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">add</span>
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700 opacity-30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl animate-pulse">
              styler
            </span>
          </div>
        </div>
        <p className="text-text-secondary dark:text-gray-400 font-medium animate-pulse">
          Organizando tu armario...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto px-1 sm:px-4 py-2 sm:py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Spacer for items above viewport */}
      {visibleRange.start > 0 && (
        <div
          style={{
            height: Math.floor(visibleRange.start / Math.max(2, Math.floor((containerRef.current?.clientWidth || 300) / (columnWidth + gapSize)))) * rowHeight
          }}
        />
      )}

      {/* Visible items grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index;
          const isSelected = selectedIds.has(item.id);
          const versatilityScore = getItemVersatilityScore?.(item.id) || 0;

          return (
            <div key={item.id} style={{ minHeight: '50px' }}>
              <ClosetItemCard
                item={item}
                isRecommended={Boolean(recommendedItemId && item.id === recommendedItemId)}
                onClick={onItemClick}
                onLongPress={(id) => {
                  const fakeEvent = {
                    clientX: window.innerWidth / 2,
                    clientY: window.innerHeight / 2,
                    preventDefault: () => { }
                  } as React.MouseEvent;
                  openContextMenu(fakeEvent, item);
                }}
                isSelected={isSelected}
                onToggleSelection={onToggleSelection}
                showVersatilityScore={showVersatilityScore}
                versatilityScore={versatilityScore}
                viewMode="grid"
                size="normal"
                showQuickActions={true}
                onQuickAction={(action, itemId) => {
                  if (onQuickAction) {
                    onQuickAction(action, item);
                  }
                }}
                index={actualIndex}
                isSelectionMode={isSelectionMode}
              />
            </div>
          );
        })}
      </div>

      {/* Spacer for items below viewport */}
      {visibleRange.end < safeItems.length && (
        <div
          style={{
            height: Math.ceil((safeItems.length - visibleRange.end) / Math.max(2, Math.floor((containerRef.current?.clientWidth || 300) / (columnWidth + gapSize)))) * rowHeight
          }}
        />
      )}

      {/* Context menu */}
      <ClosetQuickActions
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        position={contextMenu.position}
        item={contextMenu.item}
        onAction={handleQuickActionInternal}
        actions={customActions}
      />
    </div>
  );
}
