/**
 * CLOSET TOOLBAR
 *
 * Main toolbar for closet view with:
 * - Search bar with glassmorphism
 * - Filter button with badge and glow
 * - Sort dropdown with animations
 * - View mode switcher
 * - Add item button with gradient
 * - Selection mode toggle
 */

import React, { useState } from 'react';
import type { ViewMode, ExtendedSortOption, SortProperty } from '../../types/closet';
import { getSortLabel } from '../../utils/closetUtils';
import { motion, AnimatePresence } from 'framer-motion';
import WardrobeGeneratorButton from './WardrobeGeneratorButton';
import { normalizeColorValue, resolveColorSwatch } from '../../src/utils/colorUtils';

interface ClosetToolbarProps {
  // Search
  searchText: string;
  onSearchChange: (text: string) => void;
  onVisualSearch?: () => void;

  // Filters
  activeFiltersCount: number;
  onOpenFilters: () => void;

  // Sort
  sortOption: ExtendedSortOption;
  onSortChange: (option: ExtendedSortOption) => void;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Actions
  onAddItem?: () => void;
  onRefresh?: () => void;
  onToggleSelection?: () => void;

  // Selection state
  isSelectionMode?: boolean;
  selectedCount?: number;

  // Item counts
  totalItems: number;
  filteredCount: number;

  // Color Filter
  selectedColor?: string | null;
  onColorFilter?: (color: string | null) => void;
  availableColors?: string[];

  // UI
  compact?: boolean;
  isFloating?: boolean;
  selectionTitle?: string;
  selectionSubtitle?: string;
}

const SORT_OPTIONS: { property: SortProperty; label: string }[] = [
  { property: 'date', label: 'Fecha' },
  { property: 'name', label: 'Nombre' },
  { property: 'color', label: 'Color' },
  { property: 'category', label: 'Categoría' },
  { property: 'versatility', label: 'Versatilidad' }
];

export default function ClosetToolbar({
  searchText,
  onSearchChange,
  onVisualSearch,
  activeFiltersCount,
  onOpenFilters,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  onAddItem,
  onRefresh,
  onToggleSelection,
  isSelectionMode = false,
  selectedCount = 0,
  totalItems,
  filteredCount,
  selectedColor,
  onColorFilter,
  availableColors = [],
  compact = false,
  isFloating = false,
  selectionTitle,
  selectionSubtitle,
}: ClosetToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const showWardrobeGenerator = import.meta.env.DEV && import.meta.env.VITE_SHOW_WARDROBE_GENERATOR === 'true';

  const handleSortChange = (property: SortProperty) => {
    // Toggle direction if same property, otherwise use desc
    const direction = sortOption.property === property && sortOption.direction === 'desc'
      ? 'asc'
      : 'desc';

    onSortChange({ property, direction });
    setShowSortMenu(false);
  };

  const toggleSortDirection = () => {
    onSortChange({
      ...sortOption,
      direction: sortOption.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  if (isSelectionMode) {
    // Selection Mode Toolbar
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`sticky z-20 flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md transition-all duration-300 md:py-3 ${
          isFloating
            ? 'top-2 mx-3 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(223,231,236,0.58))] shadow-[0_18px_38px_rgba(20,52,59,0.12)]'
            : 'top-0 border-b border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.74),rgba(255,255,255,0.68))]'
        }`}
      >
        <button
          onClick={onToggleSelection}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/82 shadow-sm transition-colors hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

          <div className="flex-grow">
          <div className="text-lg font-bold text-[#14343b] dark:text-gray-200">
            {selectionTitle || `${selectedCount} seleccionado${selectedCount !== 1 ? 's' : ''}`}
          </div>
          <div className="text-xs text-text-secondary dark:text-gray-400 font-medium">
            {selectionSubtitle || `${filteredCount} disponibles`}
          </div>
        </div>

      </motion.div>
    );
  }

  // Normal Toolbar
  return (
    <div
      className={`sticky z-20 space-y-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl transition-all duration-300 dark:border-white/5 dark:bg-gray-900/80 md:py-3 ${
        isFloating
          ? 'top-2 mx-3 rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(223,231,236,0.56))] shadow-[0_20px_40px_rgba(20,52,59,0.14)]'
          : 'top-0 border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(223,231,236,0.68))]'
      }`}
    >
      {/* Top Row: Search + Actions */}
      <div className="flex items-center gap-3" data-surface-tour="closet-toolbar">
        {/* Search Bar */}
        <div className="flex-grow relative group">
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar prendas..."
            className="w-full rounded-2xl border border-white/70 bg-white/72 py-3 pl-11 pr-4 text-sm font-medium shadow-sm outline-none transition-all group-hover:shadow-md focus:border-[#9fcfd2] focus:bg-white focus:ring-4 focus:ring-[#cae8ea]/50 dark:border-transparent dark:bg-black/20 dark:focus:bg-black/40"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-[#2aa1a7] dark:text-gray-400">
            search
          </span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchText && (
              <button
                onClick={() => onSearchChange('')}
                className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
            {onVisualSearch && !searchText && (
              <button
                onClick={onVisualSearch}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-black/5 hover:text-[#2aa1a7] dark:text-gray-400 dark:hover:bg-white/10"
                title="Búsqueda visual"
              >
                <span className="material-symbols-outlined text-xl">photo_camera</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Item Button (Desktop) */}
        {onAddItem && !compact && (
          <button
            onClick={onAddItem}
            className="hidden items-center gap-2 rounded-2xl bg-[#08111a] px-5 py-3 font-bold text-white transition-all hover:scale-[1.02] hover:bg-[#10202b] active:scale-[0.98] md:flex"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Agregar</span>
          </button>
        )}

        {/* Add Item Button (Mobile FAB position placeholder) */}
        {onAddItem && compact && (
          <button
            onClick={onAddItem}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08111a] text-white shadow-lg transition-all hover:bg-[#10202b] active:scale-95 md:hidden"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        )}
      </div>

      {/* Color Filter Pills (if colors available and onColorFilter provided) */}
      {onColorFilter && availableColors.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          <span className="text-xs font-bold text-text-secondary dark:text-gray-400 flex-shrink-0">
            Colores:
          </span>
          {availableColors.map((color) => {
            const swatch = resolveColorSwatch(color);
            const isSelected = normalizeColorValue(selectedColor) === swatch.key;

            return (
              <motion.button
                key={`${swatch.key}-${color}`}
                onClick={() => onColorFilter(isSelected ? null : color)}
                className={`
                  flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all shadow-sm
                  ${isSelected
                    ? 'border-[#14343b] ring-2 ring-[#cae8ea] scale-110'
                    : 'border-white/60 hover:border-[#9fcfd2] hover:scale-105'
                  }
                `}
                style={{
                  backgroundColor: swatch.cssColor,
                  borderColor: isSelected ? undefined : swatch.borderColor
                }}
                whileHover={{ scale: isSelected ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={swatch.label}
                aria-label={`Filtrar por color ${swatch.label}`}
              >
                {isSelected && (
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ color: swatch.checkColor }}
                  >
                    check
                  </span>
                )}
              </motion.button>
            );
          })}
          {selectedColor && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onColorFilter(null)}
              className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/74 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>Limpiar</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Bottom Row: Filters + Sort + View */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter Button */}
        <button
          data-surface-tour="closet-filters"
          onClick={onOpenFilters}
          className={`
            relative px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border
            ${activeFiltersCount > 0
              ? 'border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.82),rgba(223,231,236,0.74))] text-[#14343b]'
              : 'border-white/60 bg-white/62 text-text-secondary hover:bg-white/82 dark:border-transparent dark:bg-black/20 dark:text-gray-300 dark:hover:bg-black/40'
            }
          `}
        >
          <span className={`material-symbols-outlined text-lg ${activeFiltersCount > 0 ? 'fill-current' : ''}`}>tune</span>
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#14343b] text-xs font-bold text-white shadow-sm animate-bounce-small">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Sort Button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/62 px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:border-white hover:bg-white/82 dark:border-transparent dark:bg-black/20 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-black/40"
          >
            <span
              className="material-symbols-outlined cursor-pointer rounded p-0.5 text-lg transition-colors hover:bg-black/5 hover:text-[#2aa1a7] dark:hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                toggleSortDirection();
              }}
            >
              {sortOption.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
            </span>
            <span className="hidden sm:inline">
              {getSortLabel(sortOption)}
            </span>
            <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${showSortMenu ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Sort Dropdown */}
          <AnimatePresence>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full z-20 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-white/70 bg-white/95 py-2 shadow-2xl backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95"
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.property}
                      onClick={() => handleSortChange(option.property)}
                      className={`
                        w-full px-4 py-3 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-sm
                        ${sortOption.property === option.property ? 'bg-[linear-gradient(180deg,rgba(202,232,234,0.72),rgba(223,231,236,0.62))] text-[#14343b] font-bold' : 'text-text-primary dark:text-gray-200 font-medium'}
                      `}
                    >
                      <span>{option.label}</span>
                      {sortOption.property === option.property && (
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-white/60 bg-white/62 p-1 dark:border-white/10 dark:bg-black/20">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`
              p-2 rounded-lg transition-all duration-300
              ${viewMode === 'grid'
                ? 'bg-[#08111a] text-white shadow-sm dark:bg-gray-700'
                : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
              }
            `}
            aria-label="Vista de cuadrícula"
          >
            <span className="material-symbols-outlined text-xl">grid_view</span>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`
              p-2 rounded-lg transition-all duration-300
              ${viewMode === 'list'
                ? 'bg-[#08111a] text-white shadow-sm dark:bg-gray-700'
                : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
              }
            `}
            aria-label="Vista de lista"
          >
            <span className="material-symbols-outlined text-xl">view_list</span>
          </button>
          <button
            onClick={() => onViewModeChange('carousel')}
            className={`
              p-2 rounded-lg transition-all duration-300
              ${viewMode === 'carousel'
                ? 'bg-[#08111a] text-white shadow-sm dark:bg-gray-700'
                : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
              }
            `}
            aria-label="Vista Carrusel"
            title="Vista Carrusel"
          >
            <span className="material-symbols-outlined text-xl">view_carousel</span>
          </button>
        </div>

        {/* Selection Mode Toggle (Desktop) */}
        {onToggleSelection && (
          <button
            onClick={onToggleSelection}
            className="ml-auto hidden items-center gap-2 rounded-xl border border-white/60 bg-white/62 px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-white/82 hover:text-[#14343b] dark:border-transparent dark:bg-black/20 dark:text-gray-300 dark:hover:bg-black/40 dark:hover:text-primary md:flex"
          >
            <span className="material-symbols-outlined text-lg">checklist</span>
            <span>Seleccionar</span>
          </button>
        )}

        {/* Wardrobe Generator (Dev/Test) */}
        {showWardrobeGenerator && (
          <div className="block">
            <WardrobeGeneratorButton onGenerationComplete={onRefresh} />
          </div>
        )}

        {/* Item Count */}
        <div className="ml-auto px-2 text-xs font-medium text-text-secondary/70 dark:text-gray-500 md:ml-0">
          {filteredCount === totalItems ? (
            <span>{totalItems} prendas</span>
          ) : (
            <span>
              {filteredCount} / {totalItems}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
