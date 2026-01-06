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

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClothingItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import { PLACEHOLDERS, getImageUrl } from '../../src/utils/imagePlaceholder';

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
  onDelete?: (id: string) => void; // Added onDelete prop
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
  onDelete, // Added onDelete
  index = 0,
  isSelectionMode = false
}: ClosetItemCardProps) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Get safe image URL using centralized helper
  // preferThumbnail=true for grid views to improve performance
  const imageUrl = useMemo(() => {
    return getImageUrl(item as any, viewMode === 'grid');
  }, [item, viewMode]);

  const statusBadge = useMemo(() => {
    if (item.status === 'virtual') {
      return {
        label: 'Prestado',
        className: 'bg-white/85 text-gray-700 border-white/70'
      };
    }
    if (item.status === 'wishlist') {
      return {
        label: 'Wishlist',
        className: 'bg-amber-100/90 text-amber-700 border-amber-200/70'
      };
    }
    return null;
  }, [item.status]);

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

  const entryDelay = Math.min(index, 12) * 0.04;

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
              className="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Seleccionar ${item.metadata?.subcategory || 'prenda'}`}
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
          {statusBadge && (
            <span
              className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}
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
            type="button"
            onClick={(e) => handleQuickAction('edit', e)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={`Editar ${item.metadata?.subcategory || 'prenda'}`}
            title="Editar"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">edit</span>
          </button>
        </div>
      </motion.div>
    );
  }

  // Grid view layout
  return (
    <motion.div
      layoutId={`item-${item.id}`}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      transition={{
        default: { duration: 0.4, ease: "easeOut", delay: entryDelay },
        layout: { duration: 0.3, ease: "easeOut" }
      }}
      className={`
        relative rounded-2xl overflow-hidden cursor-pointer glass-card group
        ${sizeClasses[size]}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark' : ''}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label={`${item.metadata?.subcategory || 'Prenda'} - ${item.metadata?.color_primary || 'sin color'}${isSelected ? ' - Seleccionada' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* Image container */}
      <div className={`relative ${imageSizeClasses[size]} overflow-hidden`}>
        {/* Blur placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse shimmer-effect" />
        )}

        <img
          src={imageUrl}
          alt={item.metadata?.subcategory || 'Clothing item'}
          className={`
            w-full h-full object-cover transition-all duration-300 ease-out
            ${imageLoaded ? 'opacity-100 shimmer-effect' : 'opacity-0'}
            group-hover:scale-110
          `}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            // Fallback on error - only change if not already showing error placeholder
            if (!e.currentTarget.src.includes('data:image/svg+xml')) {
              e.currentTarget.src = PLACEHOLDERS.error;
            }
            // Always set loaded to make it visible
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

        {statusBadge && (
          <div className={`absolute top-3 ${isSelectionMode ? 'left-12' : 'left-3'} z-20`}>
            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-sm ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
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

        {/* Top-Right Actions (Independent of versatility) */}
        {!isSelectionMode && (
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            {/* Only show versatility here if we want to stack them, otherwise keep separate positioning. 
                     Actually, let's keep versatility separate if present. 
                     If versatility is present, we might overlap. Let's position actions below it or to the side?
                     Let's put actions at top-right, and versatility slightly left of it or below.
                     Simplest: Actions at top-right. Versatility at top-left (next to checkbox) or ensure they don't collision.
                     
                     Let's put Actions at Top Right.
                     If Versatility exists, let's move it to Bottom Right or Top Left?
                     Looking at previous code, versatility was Top Right.
                     Let's put Actions Top Right, and push Versatility to Top Left (if no checkbox) or just below Actions.
                 */}

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(ROUTES.STUDIO, { state: { preselectedItemIds: [item.id] } });
                }}
                className="bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all group/btn"
                title="Probar Ahora"
              >
                <span className="material-symbols-outlined text-[18px] text-gray-700 dark:text-gray-200 group-hover/btn:text-primary">auto_fix_high</span>
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all text-red-500"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Glass Info Card on Hover - NEW */}
        <AnimatePresence>
          {isHovered && !isSelectionMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute bottom-0 left-0 right-0 z-30 p-4 pointer-events-none"
              style={{
                backdropFilter: 'blur(24px) saturate(180%)',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.5)'
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60 pointer-events-none" />

              <div className="relative">
                <h4 className="font-bold text-base text-gray-900 capitalize mb-1 line-clamp-1">
                  {item.metadata?.subcategory || 'Sin categoría'}
                </h4>
                <p className="text-sm text-gray-700 capitalize mb-2">
                  {item.metadata?.category || 'Prenda'}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Color badge */}
                  {item.metadata?.color_primary && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs font-medium text-gray-800 shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: item.metadata.color_primary.toLowerCase() }}></span>
                      {item.metadata.color_primary}
                    </span>
                  )}

                  {/* First vibe tag */}
                  {item.metadata?.vibe_tags && item.metadata.vibe_tags.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 text-xs font-semibold text-purple-900 uppercase tracking-wide">
                      {item.metadata.vibe_tags[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions - Integrated into Card */}
              {showQuickActions && !isSelectionMode && (
                <div className="flex items-center justify-center gap-3 mt-3 pointer-events-auto">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleQuickAction('favorite', e)}
                    className="w-8 h-8 rounded-full bg-white/80 text-primary shadow-sm flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
                    title="Favorito"
                  >
                    <span className="material-symbols-outlined text-lg">favorite</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleQuickAction('edit', e)}
                    className="w-8 h-8 rounded-full bg-white/80 text-gray-700 shadow-sm flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleQuickAction('delete', e)}
                    className="w-8 h-8 rounded-full bg-white/80 text-red-500 shadow-sm flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </motion.button>
                </div>
              )}

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
    </motion.div >
  );
}
