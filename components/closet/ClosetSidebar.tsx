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
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import ClosetCollections from './ClosetCollections';
import ClosetQuickStats from './ClosetQuickStats';
import type { Collection, ClosetStats } from '../../types/closet';

interface ClosetSidebarProps {
  // Collections
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: (name: string, options?: {
    description?: string;
    color?: string;
    icon?: string;
    itemIds?: string[];
  }) => void;
  onUpdateCollection: (id: string, updates: Partial<Collection>) => void;
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
  const navigate = useNavigate();

  if (!isOpen) {
    return (
      <div className="hidden h-full flex-col items-center border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(223,231,236,0.58))] py-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 md:flex">
        <button
          onClick={onToggle}
          className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-white/74 transition-all hover:scale-110 hover:bg-white active:scale-95"
          aria-label="Abrir sidebar"
        >
          <span className="material-symbols-outlined text-2xl text-[#14343b] transition-transform duration-500 group-hover:rotate-180">menu_open</span>
        </button>

        <div className="mt-auto mb-6 flex flex-col gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(202,232,234,0.85),rgba(223,231,236,0.82))]" title="Estadísticas">
            <span className="material-symbols-outlined text-lg text-[#14343b]">bar_chart</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(235,229,231,0.82),rgba(255,255,255,0.78))]" title="Colecciones">
            <span className="material-symbols-outlined text-lg text-[#14343b]">folder_open</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className="hidden h-full flex-col overflow-hidden border-r border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(223,231,236,0.68))] shadow-xl backdrop-blur-xl transition-all duration-300 dark:border-white/5 dark:bg-gray-900/80 md:flex"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/70 bg-white/20 px-6 py-5 dark:border-white/10 dark:bg-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#cae8ea,#dfe7ec)] shadow-sm">
            <span className="material-symbols-outlined text-lg text-[#14343b]">checkroom</span>
          </div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-[#14343b] dark:text-gray-100">
            Tu Armario
          </h2>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cerrar sidebar"
          >
            <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">menu_open</span>
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-5 transition-colors duration-300 hover:bg-white/5 dark:hover:bg-black/5">
        {/* Quick Stats */}
        <section>
          <h3 className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Resumen</h3>
          <ClosetQuickStats stats={stats} compact />
        </section>

        {/* Studio Link */}
        <section className="mb-2">
          <button
            onClick={() => navigate(ROUTES.STUDIO)}
            className="group flex w-full items-center justify-between rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.76),rgba(255,255,255,0.74))] px-4 py-3 transition-all hover:border-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#ebe5e7,#dfe7ec)] text-[#14343b] shadow-sm">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Abrir Studio</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Probá prendas en foto o espejo</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-400 group-hover:translate-x-1 transition-transform text-sm">arrow_forward_ios</span>
          </button>
        </section>

        {/* Looks Wardrobe Link */}
        <section className="mb-2">
          <button
            data-surface-tour="closet-saved-looks"
            onClick={() => navigate(ROUTES.SAVED)}
            className="group flex w-full items-center justify-between rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.78),rgba(255,255,255,0.72))] px-4 py-3 transition-all hover:border-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#cae8ea,#dfe7ec)] text-[#14343b] shadow-sm">
                <span className="material-symbols-outlined text-sm">photo_library</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Looks guardados</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tus looks guardados</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-400 group-hover:translate-x-1 transition-transform text-sm">arrow_forward_ios</span>
          </button>
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
                <span className="rounded-full bg-[#14343b] px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                  {activeFiltersCount}
                </span>
              )}
          </div>

          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
            className="group flex w-full items-center justify-between rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(223,231,236,0.66))] px-4 py-3.5 font-bold text-text-primary shadow-sm transition-all hover:border-white hover:shadow-md dark:border-gray-700 dark:from-gray-800/80 dark:to-gray-800/40 dark:text-gray-200"
          >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2aa1a7] transition-transform group-hover:scale-110">tune</span>
                <span>Filtros Avanzados</span>
              </span>
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-sm">arrow_forward_ios</span>
            </button>
          )}
        </section>
      </div>

      {/* Footer / Branding */}
      <div className="p-4 text-center border-t border-white/10">
        <p className="text-xs text-text-secondary/50 dark:text-gray-600 font-medium">
          Ojo de Loca v1.0
        </p>
      </div>
    </aside>
  );
}
