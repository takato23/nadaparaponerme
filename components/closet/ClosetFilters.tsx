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

import React, { useEffect, useRef, useState } from 'react';
import type { AdvancedFilters, CategoryFilter } from '../../types/closet';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeColorValue, resolveColorSwatch } from '../../src/utils/colorUtils';

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

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string; icon: string }> = [
  { value: 'all', label: 'Todo', icon: 'grid_view' },
  { value: 'top', label: 'Partes de Arriba', icon: 'checkroom' },
  { value: 'bottom', label: 'Partes de Abajo', icon: 'styler' },
  { value: 'shoes', label: 'Calzado', icon: 'steps' },
  { value: 'outerwear', label: 'Abrigos', icon: 'dry_cleaning' },
  { value: 'one-piece', label: 'Vestidos', icon: 'woman' },
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
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalFilters(filters);
  }, [filters, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      categories: [],
      colors: undefined,
      seasons: undefined,
      tags: undefined,
      versatility: undefined,
      dateAdded: undefined,
      usage: undefined,
      brands: undefined,
      price: undefined,
      isFavorite: undefined,
      isInCollection: undefined,
      status: undefined,
      searchText: undefined
    });
    onClearFilters();
  };

  const toggleCategory = (category: CategoryFilter) => {
    if (category === 'all') {
      setLocalFilters(prev => ({
        ...prev,
        categories: []
      }));
      return;
    }

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
    const normalizedColor = normalizeColorValue(color);
    const hasColor = colors.some(existingColor => normalizeColorValue(existingColor) === normalizedColor);

    setLocalFilters(prev => ({
      ...prev,
      colors: {
        colors: hasColor
          ? colors.filter(c => normalizeColorValue(c) !== normalizedColor)
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
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-[71] flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(223,231,236,0.92))] shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-gray-900/95 md:rounded-3xl"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros avanzados del armario"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/70 bg-white/72 px-6 py-5 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/80">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#14343b] dark:text-gray-100">
                  Filtrar Armario
                </h2>
                <p className="text-sm text-text-secondary dark:text-gray-400 font-medium">
                  Mostrando {filteredCount} de {totalItems} prendas
                </p>
              </div>
              <button
                onClick={onClose}
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/76 transition-colors hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700"
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
                    const isSelected = category.value === 'all'
                      ? (localFilters.categories?.length ?? 0) === 0
                      : localFilters.categories?.includes(category.value);

                    return (
                      <button
                        key={category.value}
                        onClick={() => toggleCategory(category.value)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 overflow-hidden group
                          ${isSelected
                            ? 'scale-[1.02] shadow-sm'
                            : 'border border-white/70 bg-white/64 hover:bg-white/86 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 animate-shine bg-[linear-gradient(135deg,rgba(202,232,234,0.5),rgba(235,229,231,0.38))]" />
                        )}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10
                          ${isSelected ? 'bg-[#14343b] text-white shadow-md' : 'bg-white dark:bg-gray-700 text-text-secondary dark:text-gray-400 group-hover:text-[#2aa1a7]'}
                        `}>
                          <span className="material-symbols-outlined text-2xl">
                            {category.icon}
                          </span>
                        </div>
                        <span className={`text-xs font-bold z-10 ${isSelected ? 'text-[#14343b]' : 'text-text-primary dark:text-gray-300'}`}>
                          {category.label}
                        </span>
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl border-2 border-[#9fcfd2]" />
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
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {availableColors.map((color) => {
                      const swatch = resolveColorSwatch(color);
                      const isSelected = (localFilters.colors?.colors || []).some(
                        (selected) => normalizeColorValue(selected) === swatch.key
                      );

                      return (
                        <button
                          key={`${swatch.key}-${color}`}
                          onClick={() => toggleColor(color)}
                          className="group flex flex-col items-center gap-1.5"
                          title={swatch.label}
                        >
                          <span className="relative w-10 h-10">
                            <span
                              className={`
                                absolute inset-0 rounded-full shadow-sm transition-transform hover:scale-110 border
                                ${isSelected
                                  ? 'ring-2 ring-offset-2 ring-[#9fcfd2] dark:ring-offset-gray-900 scale-110'
                                  : 'hover:ring-2 hover:ring-offset-1 hover:ring-[#cae8ea] dark:hover:ring-gray-600'
                                }
                              `}
                              style={{
                                backgroundColor: swatch.cssColor,
                                borderColor: swatch.borderColor
                              }}
                            />
                            {isSelected && (
                              <span
                                className="absolute inset-0 flex items-center justify-center drop-shadow-md"
                                style={{ color: swatch.checkColor }}
                              >
                                <span className="material-symbols-outlined text-lg font-bold">check</span>
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] leading-tight text-center text-text-secondary dark:text-gray-400 line-clamp-1 w-full">
                            {swatch.label}
                          </span>
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
                              ? 'bg-[#14343b] text-white border-[#14343b] shadow-sm'
                              : 'bg-white/78 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-white/70 dark:border-gray-700 hover:border-[#9fcfd2] hover:scale-105'
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
                        className="rounded-md bg-[linear-gradient(180deg,rgba(202,232,234,0.78),rgba(223,231,236,0.72))] px-2 py-1 text-xs font-bold text-[#14343b] transition-colors hover:bg-[linear-gradient(180deg,rgba(202,232,234,0.94),rgba(223,231,236,0.9))]"
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
                              ? 'bg-[#14343b] text-white border-[#14343b] shadow-sm'
                              : 'bg-white/76 dark:bg-gray-800 text-text-secondary dark:text-gray-400 border-white/70 dark:border-gray-700 hover:border-[#9fcfd2] hover:scale-105'
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
                        ? 'bg-[linear-gradient(180deg,rgba(235,229,231,0.84),rgba(255,255,255,0.82))] text-[#14343b] border-white/80'
                        : 'bg-white/78 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-white/70 dark:border-gray-700 hover:bg-white'
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
                          const nextFilters = { ...prev };
                          delete nextFilters.dateAdded;
                          return nextFilters;
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
                        ? 'bg-[linear-gradient(180deg,rgba(202,232,234,0.84),rgba(255,255,255,0.8))] text-[#14343b] border-white/80'
                        : 'bg-white/78 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-white/70 dark:border-gray-700 hover:bg-white'
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
                        ? 'bg-[linear-gradient(180deg,rgba(202,232,234,0.84),rgba(223,231,236,0.8))] text-[#14343b] border-white/80'
                        : 'bg-white/78 dark:bg-gray-800 text-text-secondary dark:text-gray-300 border-white/70 dark:border-gray-700 hover:bg-white'
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
            <div className="sticky bottom-0 z-10 flex gap-3 border-t border-white/70 bg-white/90 px-6 py-4 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-900/90">
              <button
                onClick={handleClear}
                className="flex-1 rounded-xl bg-white/76 px-4 py-3.5 font-bold text-text-primary transition-colors hover:bg-white dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Limpiar
              </button>
              <button
                onClick={handleApply}
                className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#08111a] px-4 py-3.5 font-bold text-white transition-all hover:scale-[1.02] hover:bg-[#10202b] active:scale-[0.98]"
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
