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
  onPresentationMode?: () => void;

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
  onPresentationMode,
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
  compact = false
}: ClosetToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);

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
        className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-primary/20 backdrop-blur-md sticky top-0 z-20"
      >
        <button
          onClick={onToggleSelection}
          className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex-grow">
          <div className="font-bold text-text-primary dark:text-gray-200 text-lg">
            {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-text-secondary dark:text-gray-400 font-medium">
            {filteredCount} disponibles
          </div>
        </div>

        {/* Bulk Actions */}
        <button
          disabled={selectedCount === 0}
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-accent"
        >
          Acciones
        </button>
      </motion.div>
    );
  }

  // Normal Toolbar
  return (
    <div
      className="space-y-3 px-4 py-3 sticky top-0 z-20 border-b border-white/10 dark:border-white/5 transition-all duration-300 bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl"
    >
      {/* Top Row: Search + Actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="flex-grow relative group">
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar prendas..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-black/20 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-black/40 focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-medium shadow-sm group-hover:shadow-md"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400 group-focus-within:text-primary transition-colors">
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
                className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-text-secondary dark:text-gray-400 hover:text-primary transition-colors"
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
            className="hidden md:flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-glow-accent hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Agregar</span>
          </button>
        )}

        {/* Add Item Button (Mobile FAB position placeholder) */}
        {onAddItem && compact && (
          <button
            onClick={onAddItem}
            className="md:hidden w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-lg hover:shadow-glow-accent active:scale-95 transition-all"
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
          {availableColors.map((color) => (
            <motion.button
              key={color}
              onClick={() => onColorFilter(selectedColor === color ? null : color)}
              className={`
                w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 shadow-sm
                ${selectedColor === color
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-white/60 hover:border-primary/40 hover:scale-105'
                }
              `}
              style={{ backgroundColor: color }}
              whileHover={{ scale: selectedColor === color ? 1.1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={color}
              aria-label={`Filter by color ${color}`}
            />
          ))}
          {selectedColor && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onColorFilter(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
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
          onClick={onOpenFilters}
          className={`
            relative px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 font-medium text-sm border
            ${activeFiltersCount > 0
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-white/50 dark:bg-black/20 border-transparent hover:bg-white/80 dark:hover:bg-black/40 text-text-secondary dark:text-gray-300'
            }
          `}
        >
          <span className={`material-symbols-outlined text-lg ${activeFiltersCount > 0 ? 'fill-current' : ''}`}>tune</span>
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-bounce-small">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Sort Button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-all flex items-center gap-2 text-sm font-medium text-text-secondary dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <span
              className="material-symbols-outlined text-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 rounded p-0.5 transition-colors"
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
                  className="absolute top-full mt-2 right-0 z-20 glass-card rounded-2xl py-2 min-w-[200px] overflow-hidden"
                >
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.property}
                      onClick={() => handleSortChange(option.property)}
                      className={`
                        w-full px-4 py-3 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-sm
                        ${sortOption.property === option.property ? 'text-primary font-bold bg-primary/5' : 'text-text-primary dark:text-gray-200 font-medium'}
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
        <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 rounded-xl p-1 border border-white/10">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`
              p-2 rounded-lg transition-all duration-300
              ${viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
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
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
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
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
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
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-all ml-auto text-sm font-medium text-text-secondary dark:text-gray-300 hover:text-primary"
          >
            <span className="material-symbols-outlined text-lg">checklist</span>
            <span>Seleccionar</span>
          </button>
        )}

        {/* Wardrobe Generator (Dev/Test) */}
        <div className="hidden md:block">
          <WardrobeGeneratorButton onGenerationComplete={onRefresh} />
        </div>

        {/* Item Count */}
        <div className="text-xs font-medium text-text-secondary/70 dark:text-gray-500 ml-auto md:ml-0 px-2">
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
