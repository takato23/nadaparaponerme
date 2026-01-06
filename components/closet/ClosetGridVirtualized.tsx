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

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import ClosetItemCard from './ClosetItemCard';
import ClosetQuickActions, { useContextMenu, QuickAction } from './ClosetQuickActions';
import type { ClothingItem } from '../../types';

// Type for Grid cell renderer props
type GridCellProps = {
  items: ClothingItem[];
  columnCount: number;
  selectedIds: Set<string>;
  getItemVersatilityScore?: (itemId: string) => number;
  gapSize: number;
  onItemClick: (id: string) => void;
  onToggleSelection?: (id: string) => void;
  onQuickAction?: (action: string, item: ClothingItem) => void;
  openContextMenu: (e: React.MouseEvent, item: ClothingItem) => void;
  isSelectionMode: boolean;
  showVersatilityScore: boolean;
};

type GridChildComponentProps = {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & GridCellProps;

interface ClosetGridVirtualizedProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  showVersatilityScore?: boolean;
  getItemVersatilityScore?: (itemId: string) => number;

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
  // ============================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
  // (before any conditional logic or returns)
  // ============================================

  const gridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // Safe items array (handle null/undefined)
  const safeItems = items ?? [];

  // Calculate responsive columns
  const getColumnCount = useCallback((containerWidth: number): number => {
    const effectiveWidth = containerWidth - gapSize;
    const columns = Math.floor(effectiveWidth / (columnWidth + gapSize));
    return Math.max(1, columns);
  }, [columnWidth, gapSize]);

  // Calculate row count based on items and columns
  const getRowCount = useCallback((columnCount: number): number => {
    return Math.ceil(safeItems.length / columnCount);
  }, [safeItems.length]);

  // Handle context menu (right-click or long-press)
  const handleContextMenu = useCallback((e: React.MouseEvent, item: ClothingItem) => {
    openContextMenu(e, item);
  }, [openContextMenu]);

  const handleQuickActionInternal = useCallback((actionId: string, item: ClothingItem) => {
    if (onQuickAction) {
      onQuickAction(actionId, item);
    }
  }, [onQuickAction]);

  // Cell renderer
  const Cell = useCallback(({
    columnIndex,
    rowIndex,
    style,
    data
  }: { columnIndex: number; rowIndex: number; style: React.CSSProperties; data: GridCellProps }) => {
    const {
      items: gridItems,
      columnCount,
      selectedIds,
      getItemVersatilityScore,
      gapSize: cellGapSize,
      onItemClick: cellOnItemClick,
      onToggleSelection: cellOnToggleSelection,
      onQuickAction: cellOnQuickAction,
      openContextMenu: cellOpenContextMenu,
      isSelectionMode: cellIsSelectionMode,
      showVersatilityScore: cellShowVersatilityScore
    } = data;
    const itemIndex = rowIndex * columnCount + columnIndex;

    if (itemIndex >= gridItems.length) {
      return null;
    }

    const item = gridItems[itemIndex];
    const isSelected = selectedIds.has(item.id);
    const versatilityScore = getItemVersatilityScore?.(item.id) || 0;

    return (
      <div
        style={{
          ...style,
          padding: `${cellGapSize / 2}px`,
          boxSizing: 'border-box'
        }}
      >
        <ClosetItemCard
          item={item}
          onClick={cellOnItemClick}
          onLongPress={(id) => {
            const itemForMenu = gridItems.find((i: ClothingItem) => i.id === id);
            if (itemForMenu) {
              const fakeEvent = {
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2,
                preventDefault: () => { }
              } as React.MouseEvent;
              cellOpenContextMenu(fakeEvent, itemForMenu);
            }
          }}
          isSelected={isSelected}
          onToggleSelection={cellOnToggleSelection}
          showVersatilityScore={cellShowVersatilityScore}
          versatilityScore={versatilityScore}
          viewMode="grid"
          size="normal"
          showQuickActions={true}
          onQuickAction={(action, itemId) => {
            const itemForAction = gridItems.find((i: ClothingItem) => i.id === itemId);
            if (itemForAction && cellOnQuickAction) {
              cellOnQuickAction(action, itemForAction);
            }
          }}
          index={itemIndex}
          isSelectionMode={cellIsSelectionMode}
        />
      </div>
    );
  }, []);

  // Calculate visible items based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container || safeItems.length === 0) return;

    const handleScroll = () => {
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

      setVisibleRange({ start: startIndex, end: endIndex });
    };

    // Initial calculation
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [safeItems.length, columnWidth, rowHeight, gapSize, overscanRowCount]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return safeItems.slice(visibleRange.start, visibleRange.end);
  }, [safeItems, visibleRange]);

  // ============================================
  // RENDER LOGIC (conditional rendering in JSX)
  // ============================================

  // Null/undefined items
  if (!items) {
    console.warn('ClosetGridVirtualized: items prop is null or undefined');
    return null;
  }

  // Empty state
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

  // Loading state
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
