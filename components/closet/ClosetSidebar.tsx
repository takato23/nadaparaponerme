/**
 * CLOSET SIDEBAR (Desktop)
 *
 * Fixed sidebar for desktop with:
 * - Collections management
 * - Advanced filters (always visible)
 * - Quick stats
 * - Resizable width
 * - Premium glassmorphism design
 */

import React from 'react';
import ClosetCollections from './ClosetCollections';
import ClosetQuickStats from './ClosetQuickStats';
import type { Collection, ClosetStats } from '../../types/closet';

interface ClosetSidebarProps {
  // Collections
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: (name: string, options?: any) => void;
  onUpdateCollection: (id: string, updates: any) => void;
  onDeleteCollection: (id: string) => void;
  collectionCounts: Record<string, number>;

  // Stats
  stats: ClosetStats;

  // Filters (simplified for sidebar)
  activeFiltersCount: number;
  onOpenFilters?: () => void;

  // UI
  width?: number;
  onToggle?: () => void;
  isOpen?: boolean;
}

export default function ClosetSidebar({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  collectionCounts,
  stats,
  activeFiltersCount,
  onOpenFilters,
  width = 300,
  onToggle,
  isOpen = true
}: ClosetSidebarProps) {
  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-6 bg-white/30 dark:bg-black/20 border-r border-white/10 backdrop-blur-xl h-full">
        <button
          onClick={onToggle}
          className="w-12 h-12 rounded-2xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
          aria-label="Abrir sidebar"
        >
          <span className="material-symbols-outlined text-primary text-2xl group-hover:rotate-180 transition-transform duration-500">menu_open</span>
        </button>

        <div className="mt-auto mb-6 flex flex-col gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center" title="Estadísticas">
            <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center" title="Colecciones">
            <span className="material-symbols-outlined text-secondary text-lg">folder_open</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className="hidden md:flex flex-col bg-white/40 dark:bg-black/20 border-r border-white/10 backdrop-blur-xl overflow-hidden shadow-xl h-full transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/20 dark:bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-sm">
            <span className="material-symbols-outlined text-white text-lg">checkroom</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-text-primary dark:text-gray-100 tracking-tight">
            Tu Armario
          </h2>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Cerrar sidebar"
          >
            <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">menu_open</span>
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar hover:bg-white/5 dark:hover:bg-black/5 transition-colors duration-300">
        {/* Quick Stats */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Resumen</h3>
          <ClosetQuickStats stats={stats} compact />
        </section>

        {/* Collections */}
        <section>
          <ClosetCollections
            collections={collections}
            activeCollectionId={activeCollectionId}
            onSelectCollection={onSelectCollection}
            onCreateCollection={onCreateCollection}
            onUpdateCollection={onUpdateCollection}
            onDeleteCollection={onDeleteCollection}
            itemCounts={collectionCounts}
          />
        </section>

        {/* Filters Section */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider">
              Filtros Activos
            </h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-sm">
                {activeFiltersCount}
              </span>
            )}
          </div>

          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-800/40 hover:from-white hover:to-white/60 dark:hover:from-gray-800 dark:hover:to-gray-800/60 border border-white/20 dark:border-gray-700 shadow-sm hover:shadow-md text-text-primary dark:text-gray-200 font-bold transition-all flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">tune</span>
                <span>Filtros Avanzados</span>
              </span>
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-sm">arrow_forward_ios</span>
            </button>
          )}
        </section>
      </div>

      {/* Footer / Branding */}
      <div className="p-4 text-center border-t border-white/10">
        <p className="text-[10px] text-text-secondary/50 dark:text-gray-600 font-medium">
          Ojo de Loca v1.0
        </p>
      </div>
    </aside>
  );
}
