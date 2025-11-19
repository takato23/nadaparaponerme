/**
 * CLOSET ITEM CARD - Enhanced
 *
 * Advanced clothing item card with:
 * - Framer Motion animations (hover, tap, entrance)
 * - Desktop hover overlay with quick actions
 * - Mobile optimized touch targets
 * - Versatility badge
 * - Selection mode checkbox
 * - Lazy loaded images with blur placeholder
 * - Responsive sizing
 * - Dark mode support
 * - Premium "Modern Editorial" aesthetic
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface ClosetItemCardProps {
  item: ClothingItem;
  onClick?: (id: string) => void;
  onLongPress?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  showVersatilityScore?: boolean;
  versatilityScore?: number;
  viewMode?: 'grid' | 'list';
  size?: 'compact' | 'normal' | 'large';
  showQuickActions?: boolean;
  onQuickAction?: (action: 'edit' | 'delete' | 'favorite' | 'share', itemId: string) => void;
  index?: number;
  isSelectionMode?: boolean;
}

export default function ClosetItemCard({
  item,
  onClick,
  onLongPress,
  isSelected = false,
  onToggleSelection,
  showVersatilityScore = false,
  versatilityScore = 0,
  viewMode = 'grid',
  size = 'normal',
  showQuickActions = true,
  onQuickAction,
  index = 0,
  isSelectionMode = false
}: ClosetItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onToggleSelection) {
      e.stopPropagation();
      onToggleSelection(item.id);
    } else if (onClick) {
      onClick(item.id);
    }
  };

  // Handle long press (mobile)
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      if (onLongPress) {
        onLongPress(item.id);
      }
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Quick action handlers
  const handleQuickAction = (action: 'edit' | 'delete' | 'favorite' | 'share', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickAction) {
      onQuickAction(action, item.id);
    }
  };

  // Size classes
  const sizeClasses = {
    compact: 'h-40',
    normal: 'h-64',
    large: 'h-80'
  };

  const imageSizeClasses = {
    compact: 'h-28',
    normal: 'h-48',
    large: 'h-64'
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
        className={`
          flex items-center gap-4 p-3 rounded-2xl glass-card
          hover:shadow-glow transition-all cursor-pointer group
          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark' : ''}
        `}
        onClick={handleClick}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div className="flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.(item.id)}
              className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Image */}
        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-sm relative">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
          <img
            src={item.imageDataUrl}
            alt={item.metadata?.subcategory || 'Clothing item'}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Info */}
        <div className="flex-grow min-w-0">
          <h3 className="font-serif font-bold text-lg text-text-primary dark:text-gray-100 capitalize truncate group-hover:text-primary transition-colors">
            {item.metadata?.subcategory || 'Sin categoría'}
          </h3>
          <p className="text-sm text-text-secondary dark:text-gray-400 capitalize truncate font-medium">
            {item.metadata?.color_primary || 'Sin color'}
          </p>
          {item.metadata?.vibe_tags && item.metadata.vibe_tags.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {item.metadata.vibe_tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Versatility badge */}
        {showVersatilityScore && versatilityScore > 0 && (
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 border border-green-500/30 text-green-700 dark:text-green-400">
            <span className="text-xs font-bold">{versatilityScore}</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex-shrink-0">
          <button
            onClick={(e) => handleQuickAction('edit', e)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-text-secondary"
            aria-label="Editar"
          >
            <span className="material-symbols-outlined text-xl">edit</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // Grid view layout
  return (
    <motion.div
      layout
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`
        relative rounded-2xl overflow-hidden cursor-pointer glass-card group
        ${sizeClasses[size]}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image container */}
      <div className={`relative ${imageSizeClasses[size]} overflow-hidden`}>
        {/* Blur placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse shimmer-effect" />
        )}

        <img
          src={item.imageDataUrl || (item as any).image_url || 'https://via.placeholder.com/300?text=No+Image'}
          alt={item.metadata?.subcategory || 'Clothing item'}
          className={`
            w-full h-full object-cover transition-all duration-700 ease-out
            ${imageLoaded ? 'opacity-100 shimmer-effect' : 'opacity-0'}
            group-hover:scale-110
          `}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Fallback on error
            e.currentTarget.src = 'https://via.placeholder.com/300?text=Error';
            setImageLoaded(true);
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        {/* Selection checkbox (top-left) */}
        {isSelectionMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 left-3 z-20"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.(item.id)}
              className="w-6 h-6 rounded-full border-2 border-white text-primary focus:ring-primary bg-white/50 backdrop-blur-sm shadow-lg cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}

        {/* Versatility badge (top-right) */}
        {showVersatilityScore && versatilityScore > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-3 right-3 z-10"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-600/30 backdrop-blur-md border border-green-400/50 text-white shadow-lg animate-pulse-glow">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span className="text-xs font-bold">{versatilityScore}</span>
            </div>
          </motion.div>
        )}

        {/* Desktop hover overlay */}
        <AnimatePresence>
          {isHovered && showQuickActions && !isSelectionMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-0 right-0 z-20 hidden md:flex items-center justify-center gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleQuickAction('favorite', e)}
                className="w-10 h-10 rounded-full bg-white/90 text-primary shadow-lg flex items-center justify-center backdrop-blur-sm hover:bg-white"
                title="Favorito"
              >
                <span className="material-symbols-outlined text-xl">favorite</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleQuickAction('edit', e)}
                className="w-10 h-10 rounded-full bg-white/90 text-gray-700 shadow-lg flex items-center justify-center backdrop-blur-sm hover:bg-white"
                title="Editar"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleQuickAction('delete', e)}
                className="w-10 h-10 rounded-full bg-white/90 text-red-500 shadow-lg flex items-center justify-center backdrop-blur-sm hover:bg-white"
                title="Eliminar"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info section */}
      <div className="relative p-4 flex flex-col justify-between flex-grow bg-white/40 dark:bg-black/40 backdrop-blur-md">
        <div>
          <h3 className="font-serif font-bold text-lg text-text-primary dark:text-gray-100 capitalize truncate leading-tight group-hover:text-primary transition-colors">
            {item.metadata?.subcategory || 'Sin categoría'}
          </h3>
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary dark:text-gray-400 mt-1 truncate">
            {item.metadata?.color_primary || 'Sin color'}
          </p>
        </div>

        {/* Tags (max 2) */}
        {item.metadata?.vibe_tags && item.metadata.vibe_tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-hidden">
            {item.metadata.vibe_tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-white/50 dark:bg-white/10 text-text-secondary dark:text-gray-300 truncate border border-white/20 dark:border-white/5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
