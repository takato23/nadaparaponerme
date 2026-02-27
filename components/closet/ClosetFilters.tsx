/**
 * CLOSET FILTERS COMPONENT (Mobile Bottom Sheet)
 *
 * Advanced filters UI optimized for mobile with "Modern Editorial" aesthetic.
 * Features:
 * - Glassmorphism bottom sheet
 * - Visual category selectors with gradients
 * - Color swatches with selection rings
 * - Premium chips for seasons & tags
 * - Smooth animations
 */

import React, { useState } from 'react';
import type { AdvancedFilters, CategoryFilter } from '../../types/closet';
import { motion, AnimatePresence } from 'framer-motion';

interface ClosetFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApplyFilters: (filters: AdvancedFilters) => void;
  onClearFilters: () => void;
  availableColors: string[];
  availableSeasons: string[];
  availableTags: string[];
  totalItems: number;
  filteredCount: number;
}

export const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string; icon: string }> = [
  { value: 'all', label: 'Todo', icon: 'grid_view' },
  { value: 'top', label: 'Partes de Arriba', icon: 'checkroom' },
  { value: 'bottom', label: 'Partes de Abajo', icon: 'styler' },
  { value: 'shoes', label: 'Calzado', icon: 'steps' },
  { value: 'outerwear', label: 'Abrigos', icon: 'dry_cleaning' },
  { value: 'dress', label: 'Vestidos', icon: 'woman' },
  { value: 'accessory', label: 'Accesorios', icon: 'watch' },
];

export default function ClosetFilters({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
  availableColors,
  availableSeasons,
  availableTags,
  totalItems,
  filteredCount
}: ClosetFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      categories: [],
      searchText: undefined
    });
    onClearFilters();
  };

  const toggleCategory = (category: CategoryFilter) => {
    const categories = localFilters.categories || [];
    const hasCategory = categories.includes(category);

    setLocalFilters(prev => ({
      ...prev,
      categories: hasCategory
        ? categories.filter(c => c !== category)
        : [...categories, category]
    }));
  };

  const toggleColor = (color: string) => {
    const colors = localFilters.colors?.colors || [];
    const hasColor = colors.includes(color);

    setLocalFilters(prev => ({
      ...prev,
      colors: {
        colors: hasColor
          ? colors.filter(c => c !== color)
          : [...colors, color],
        matchMode: prev.colors?.matchMode || 'exact'
      }
    }));
  };

  const toggleSeason = (season: string) => {
    const seasons = localFilters.seasons?.seasons || [];
    const hasSeason = seasons.includes(season);

    setLocalFilters(prev => ({
      ...prev,
      seasons: {
        seasons: hasSeason
          ? seasons.filter(s => s !== season)
          : [...seasons, season]
      }
    }));
  };

  const toggleTag = (tag: string) => {
    const tags = localFilters.tags?.tags || [];
    const hasTag = tags.includes(tag);

    setLocalFilters(prev => ({
      ...prev,
      tags: {
        tags: hasTag
          ? tags.filter(t => t !== tag)
          : [...tags, tag],
        matchMode: prev.tags?.matchMode || 'any'
      }
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-t border-white/20"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-serif font-bold text-text-primary dark:text-gray-100">
                  Filtrar Armario
                </h2>
                <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">
                  Mostrando {filteredCount} de {totalItems} prendas
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
              >
                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">close</span>
              </button>
            </div>

            {/* Filters Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
              {/* Categories */}
              <section>
                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">category</span>
                  Categorías
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORY_FILTERS.map((category) => {
                    const isSelected = localFilters.categories?.includes(category.value);

                    return (
                      <button
                        key={category.value}
                        onClick={() => toggleCategory(category.value)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 overflow-hidden group
                          ${isSelected
                            ? 'shadow-glow-accent scale-[1.02]'
                            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700'
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 animate-shine" />
                        )}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10
                          ${isSelected ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-gray-700 text-text-secondary dark:text-gray-400 group-hover:text-primary'}
                        `}>
                          <span className="material-symbols-outlined text-2xl">
                            {category.icon}
                          </span>
                        </div>
                        <span className={`text-xs font-bold z-10 ${isSelected ? 'text-primary' : 'text-text-primary dark:text-gray-300'}`}>
                          {category.label}
                        </span>
                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Colors */}
              {availableColors.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">palette</span>
                    Colores
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {availableColors.map((color) => {
                      const isSelected = localFilters.colors?.colors.includes(color);

                      return (
                        <button
                          key={color}
                          onClick={() => toggleColor(color)}
                          className={`
                            group relative w-10 h-10 rounded-full shadow-sm transition-transform hover:scale-110
                            ${isSelected ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-gray-900 scale-110' : 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-gray-600'}
                          `}
                          title={color}
                        >
                          <span
                            className="absolute inset-0 rounded-full border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: color }}
                          />
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                              <span className="material-symbols-outlined text-lg font-bold">check</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Seasons */}
              {availableSeasons.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">cloud</span>
                    Temporadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableSeasons.map((season) => {
                      const isSelected = localFilters.seasons?.seasons.includes(season);

                      return (
                        <button
                          key={season}
                          onClick={() => toggleSeason(season)}
                          className={`
                            px-4 py-2 rounded-full text-sm font-medium transition-all capitalize border magnetic-hover
                            ${isSelected
                              ? 'bg-primary text-white border-primary shadow-glow-accent'
                              : 'bg-white dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:scale-105'
                            }
                          `}
                        >
                          {season}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Tags */}
              {availableTags.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">style</span>
                      Estilos
                    </h3>
                    {localFilters.tags && localFilters.tags.tags.length > 0 && (
                      <button
                        onClick={() => setLocalFilters(prev => ({
                          ...prev,
                          tags: {
                            ...prev.tags!,
                            matchMode: prev.tags!.matchMode === 'any' ? 'all' : 'any'
                          }
                        }))}
                        className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors"
                      >
                        {localFilters.tags.matchMode === 'any' ? 'Cualquiera' : 'Todos'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 15).map((tag) => {
                      const isSelected = localFilters.tags?.tags.includes(tag);

                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border magnetic-hover
                            ${isSelected
                              ? 'bg-secondary text-white border-secondary shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-secondary/50 hover:scale-105'
                            }
                          `}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Quick Presets */}
              <section>
                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  Filtros Rápidos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setLocalFilters(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
                    className={`
                      px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border
                      ${localFilters.isFavorite
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className={`material-symbols-outlined ${localFilters.isFavorite ? 'fill-current' : ''}`}>favorite</span>
                    Favoritos
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      const isRecent = localFilters.dateAdded?.preset === 'last_month';

                      if (isRecent) {
                        setLocalFilters(prev => {
                          const { dateAdded, ...rest } = prev;
                          return rest;
                        });
                      } else {
                        setLocalFilters(prev => ({
                          ...prev,
                          dateAdded: {
                            from: oneMonthAgo.toISOString(),
                            to: now.toISOString(),
                            preset: 'last_month'
                          }
                        }));
                      }
                    }}
                    className={`
                      px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border
                      ${localFilters.dateAdded?.preset === 'last_month'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined">schedule</span>
                    Recientes
                  </button>
                  <button
                    onClick={() => {
                      const currentStatus = localFilters.status || [];
                      const isVirtualOnly = currentStatus.includes('virtual') && currentStatus.length === 1;
                      setLocalFilters(prev => ({
                        ...prev,
                        status: isVirtualOnly ? undefined : ['virtual']
                      }));
                    }}
                    className={`
                      px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border col-span-2 md:col-span-1
                      ${(localFilters.status?.includes('virtual') && localFilters.status.length === 1)
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined">magic_button</span>
                    Try-On Virtual
                  </button>
                </div>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 flex gap-3 z-10">
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handleApply}
                className="flex-[2] px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-glow-accent hover:shadow-glow-lg hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">filter_alt</span>
                Aplicar Filtros
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
