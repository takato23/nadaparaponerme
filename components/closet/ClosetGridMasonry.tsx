/**
 * CLOSET GRID MASONRY
 *
 * Pinterest-style masonry layout for desktop with:
 * - Variable item heights (natural content flow)
 * - Smart column distribution (balance heights)
 * - Framer Motion stagger animations
 * - Desktop optimized (>= 768px)
 * - Selection mode support
 * - Context menu integration
 * - Responsive column calculation
 * - Smooth transitions
 */

import React, { useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ClosetItemCard from './ClosetItemCard';
import ClosetQuickActions, { useContextMenu, QuickAction } from './ClosetQuickActions';
import type { ClothingItem } from '../../types';

const NanoBanana = lazy(() => import('./NanoBanana'));

interface ClosetGridMasonryProps {
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
  columns?: number | 'auto'; // number of columns or 'auto' for responsive
  minColumnWidth?: number; // minimum width per column (for auto mode)
  gapSize?: number;

  // Animation
  staggerDelay?: number;
  enableAnimations?: boolean;

  // Empty state
  emptyTitle?: string;
  emptyMessage?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
}

export default function ClosetGridMasonry({
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
  columns = 'auto',
  minColumnWidth = 280,
  gapSize = 16,
  staggerDelay = 0.05,
  enableAnimations = true,
  emptyTitle = 'Armario Vacío',
  emptyMessage = 'No hay prendas para mostrar',
  onEmptyAction,
  emptyActionLabel = 'Agregar Prenda'
}: ClosetGridMasonryProps) {
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu();

  // Handle quick action
  const handleQuickActionInternal = useCallback((actionId: string, item: ClothingItem) => {
    if (onQuickAction) {
      onQuickAction(actionId, item);
    }
  }, [onQuickAction]);

  // Empty state
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
        <div className="relative w-64 h-64 mb-6 animate-float">
          <div className="absolute inset-0 bg-secondary/10 blur-[80px] rounded-full"></div>
          <img
            src="/images/ai-assets/empty_closet_illustration.png"
            alt="Empty Closet"
            className="relative w-full h-full object-contain drop-shadow-2xl z-10"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute -bottom-8 -right-8 z-20">
            <Suspense fallback={null}>
              <NanoBanana className="scale-75 origin-bottom-right" />
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

  return (
    <div className="w-full h-full overflow-y-auto px-1 sm:px-4 py-2 sm:py-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Standard Grid for Debugging */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 sm:gap-4 w-full"
      >
        {items.map((item, index) => {
          const isSelected = selectedIds.has(item.id);
          const versatilityScore = getItemVersatilityScore?.(item.id) || 0;

          return (
            <motion.div
              key={item.id}
              layout
              transition={{
                duration: 0.3,
                ease: 'easeOut'
              }}
              style={{ minHeight: '50px' }}
            >
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(e, item);
                }}
              >
                <ClosetItemCard
                  item={item}
                  isRecommended={Boolean(recommendedItemId && item.id === recommendedItemId)}
                  onClick={onItemClick}
                  onLongPress={(id) => {
                    // For mobile long-press
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
                  index={index}
                  isSelectionMode={isSelectionMode}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

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
