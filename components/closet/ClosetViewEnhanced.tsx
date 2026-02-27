/**
 * CLOSET VIEW ENHANCED
 *
 * Complete implementation of the enhanced closet view with all new components.
 * This demonstrates the complete integration of:
 * - ClosetContext
 * - Collections
 * - Advanced filters
 * - Stats
 * - Responsive layout (mobile/desktop)
 * - Virtualized grid (performance)
 * - Masonry layout (desktop)
 * - Bulk actions
 * - Context menu
 * - Item cards with animations
 */

import React, { useMemo, useState, useCallback } from 'react';
import ClosetToolbar from './ClosetToolbar';
import ClosetSidebar from './ClosetSidebar';
import ClosetFilters from './ClosetFilters';
import ClosetGridVirtualized from './ClosetGridVirtualized';
import ClosetGridMasonry from './ClosetGridMasonry';
import ClosetBulkActions from './ClosetBulkActions';
import ClosetPresentationMode from './ClosetPresentationMode';
import VisualSearchModal from './VisualSearchModal';
import LiquidDetailModal from './LiquidDetailModal';
import { CoverFlowCarousel } from './CoverFlowCarousel';
import LoadDemoDataButton from './LoadDemoDataButton';
import { useCloset } from '../../contexts/ClosetContext';
import { getUniqueColors, getUniqueTags, getUniqueSeasons } from '../../utils/closetUtils';
import { findSimilarByImage } from '../../src/services/geminiService';
import type { ClothingItem } from '../../types';
import { useNavigateTransition } from '../../hooks/useNavigateTransition';
import { ROUTES } from '../../src/routes';

interface ClosetViewEnhancedProps {
  onItemClick: (id: string) => void;
  onAddItem?: () => void;
  onRefresh?: () => void;
  onLoadDemoData?: (items: ClothingItem[]) => void;
}

export default function ClosetViewEnhanced({
  onItemClick,
  onAddItem,
  onRefresh,
  onLoadDemoData
}: ClosetViewEnhancedProps) {
  const {
    items,
    displayItems,
    filters,
    collections,
    stats,
    viewPreferences,
    sortOption,
    setSortOption,
    selectedColor,
    setSelectedColor,
    availableColors,
    selection,
    enterSelectionMode,
    exitSelectionMode,
    selectAll,
    deselectAll,
    toggleSelectAll,
    toggleItemSelection,
    totalItems,
    filteredCount,
    // Actions from parent
    onDeleteItem,
    onDeleteItems,
    onToggleFavorite,
    onExportItems,
    onShareItems
  } = useCloset();
  const navigate = useNavigateTransition();

  // Presentation mode state
  const [presentationMode, setPresentationMode] = useState<{ isOpen: boolean; initialIndex: number }>({
    isOpen: false,
    initialIndex: 0
  });

  // Visual search state
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Liquid Detail Modal state
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: ClothingItem | null }>({
    isOpen: false,
    item: null
  });

  // Extract unique values for filter options (colors now come from context)
  const availableTags = useMemo(() => getUniqueTags(items), [items]);
  const availableSeasons = useMemo(() => getUniqueSeasons(items), [items]);

  // Calculate item counts per collection
  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    collections.collectionsWithItems.forEach(collection => {
      counts[collection.id] = collection.items.length;
    });

    return counts;
  }, [collections.collectionsWithItems]);

  // Handle Item Click - Opens Liquid Detail Modal
  const handleItemClick = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setDetailModal({ isOpen: true, item });
    } else {
      onItemClick(id); // Fallback to original handler if item not found (shouldn't happen)
    }
  }, [items, onItemClick]);

  // Bulk actions handlers
  const handleBulkAction = useCallback((actionId: string) => {
    console.log('Bulk action:', actionId, 'Selected IDs:', Array.from(selection.selectedIds));

    if (actionId === 'try-look') {
      const selectedIds = Array.from(selection.selectedIds).slice(0, 3);
      navigate(ROUTES.STUDIO, { state: { preselectedItemIds: selectedIds } });
      return;
    }

    // Handle collection-specific actions
    if (actionId.startsWith('add-to-collection-') || actionId.startsWith('move-to-collection-')) {
      const collectionId = actionId.split('-').pop();
      const isMove = actionId.startsWith('move-to-collection-');

      if (collectionId) {
        if (isMove) {
          collections.removeItemsFromCollection(
            Array.from(selection.selectedIds),
            collections.activeCollectionId || 'all'
          );
        }
        collections.addItemsToCollection(Array.from(selection.selectedIds), collectionId);
        exitSelectionMode();
      }
      return;
    }

    // Handle other bulk actions
    switch (actionId) {
      case 'delete':
        if (onDeleteItems) {
          onDeleteItems(Array.from(selection.selectedIds));
        }
        exitSelectionMode();
        break;

      case 'export':
        if (onExportItems) {
          onExportItems(Array.from(selection.selectedIds));
        } else {
          // Fallback: Download as JSON
          const selectedItems = items.filter(i => selection.selectedIds.has(i.id));
          const dataStr = JSON.stringify(selectedItems, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `armario-${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          URL.revokeObjectURL(url);
        }
        exitSelectionMode();
        break;

      case 'share':
        if (onShareItems) {
          onShareItems(Array.from(selection.selectedIds));
        } else {
          // Fallback: Use Web Share API if available
          const shareItems = items.filter(i => selection.selectedIds.has(i.id));
          if (navigator.share) {
            navigator.share({
              title: 'Mi Armario',
              text: `Mira estas ${shareItems.length} prendas de mi armario`,
            }).catch(() => { });
          }
        }
        exitSelectionMode();
        break;

      default:
        console.log('Unknown action:', actionId);
    }
  }, [selection.selectedIds, collections, exitSelectionMode, onDeleteItems, onExportItems, onShareItems, items, navigate]);

  // Quick action handlers (from context menu and card hover)
  const handleQuickAction = useCallback((action: string, item: ClothingItem) => {
    switch (action) {
      case 'view':
        // Open Item Detail View
        handleItemClick(item.id);
        break;

      case 'edit':
        // Open detail modal in edit mode
        setDetailModal({ isOpen: true, item });
        break;

      case 'favorite':
        if (onToggleFavorite) {
          onToggleFavorite(item.id);
        }
        break;

      case 'delete':
        if (onDeleteItem) {
          onDeleteItem(item.id);
        }
        break;

      case 'share':
        // Use Web Share API if available
        if (navigator.share) {
          navigator.share({
            title: item.metadata?.subcategory || 'Mi prenda',
            text: `Mira esta prenda: ${item.metadata?.subcategory || 'prenda'}`,
          }).catch(() => { });
        }
        break;

      case 'add-to-collection':
      case 'move':
        // These require collection picker, handled by context menu
        break;

      default:
        console.log('Unknown quick action:', action);
    }
  }, [handleItemClick, onDeleteItem, onToggleFavorite]);

  const selectionCount = selection.selectedIds.size;
  const helperText = useMemo(() => {
    if (selectionCount === 0) return null;
    if (selectionCount < 2) {
      return `Te falta ${2 - selectionCount} prenda${2 - selectionCount === 1 ? '' : 's'} para probar.`;
    }
    if (selectionCount > 3) {
      return 'Elegi hasta 3 prendas para probar.';
    }
    return null;
  }, [selectionCount]);

  const extraActions = useMemo(() => {
    if (selectionCount >= 2 && selectionCount <= 3) {
      return [
        {
          id: 'try-look',
          label: 'Probar look',
          icon: 'auto_awesome',
          variant: 'primary' as const
        }
      ];
    }
    return [];
  }, [selectionCount]);

  return (
    <div className="flex h-full bg-transparent">
      {/* Desktop Sidebar */}
      <ClosetSidebar
        collections={collections.collections}
        activeCollectionId={collections.activeCollectionId}
        onSelectCollection={collections.setActiveCollectionId}
        onCreateCollection={collections.createCollection}
        onUpdateCollection={collections.updateCollection}
        onDeleteCollection={collections.deleteCollection}
        collectionCounts={collectionCounts}
        stats={stats.stats}
        activeFiltersCount={filters.activeFiltersCount}
        onOpenFilters={filters.toggleFilterPanel}
        width={viewPreferences.preferences.desktop.sidebarWidth}
        isOpen={viewPreferences.preferences.desktop.showSidebar && viewPreferences.isDesktop}
      />

      {/* Main Content */}
      <div className="flex flex-col h-full relative w-full">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <ClosetToolbar
            searchText={filters.filters.searchText || ''}
            onSearchChange={filters.setSearchText}
            activeFiltersCount={filters.activeFiltersCount}
            onOpenFilters={filters.toggleFilterPanel}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewMode={viewPreferences.currentViewMode}
            onViewModeChange={viewPreferences.setViewMode}
            onPresentationMode={() => viewPreferences.setViewMode('carousel')}
            onVisualSearch={() => setIsVisualSearchOpen(true)}
            onAddItem={onAddItem}
            onRefresh={onRefresh}
            onToggleSelection={selection.isSelectionMode ? exitSelectionMode : enterSelectionMode}
            isSelectionMode={selection.isSelectionMode}
            selectedCount={selectionCount}
            totalItems={totalItems}
            filteredCount={filteredCount}
            selectedColor={selectedColor}
            onColorFilter={setSelectedColor}
            availableColors={availableColors}
          />

          {viewPreferences.isMobile && (
            <div className="px-4 pb-2 md:hidden">
              <button
                onClick={() => navigate(ROUTES.SAVED_LOOKS)}
                className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-black/40 border border-white/40 dark:border-white/10 flex items-center justify-between shadow-sm"
                aria-label="Ir al armario de looks"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm">
                    <span className="material-symbols-outlined text-sm">photo_library</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary dark:text-gray-100">Armario de looks</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Tus looks guardados</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-secondary dark:text-gray-400 text-sm">arrow_forward_ios</span>
              </button>
            </div>
          )}

          {/* Grid/List Content */}
          <div className="flex-1 overflow-hidden">
            {/* Demo Data Button - Show when closet is empty and no filters */}
            {items.length === 0 && !filters.hasFilters && onLoadDemoData && (
              <div className="p-6">
                <LoadDemoDataButton
                  closet={items}
                  onLoadDemo={onLoadDemoData}
                  variant="prominent"
                />
              </div>
            )}

            {/* Demo Data Indicator - Show when demo data is loaded */}
            {items.length > 0 && items.some(item => item.id.startsWith('demo-')) && onLoadDemoData && (
              <div className="px-4 pb-2">
                <LoadDemoDataButton
                  closet={items}
                  onLoadDemo={onLoadDemoData}
                  variant="subtle"
                />
              </div>
            )}
            {/* Render masonry layout for desktop, virtualized grid for mobile/list */}
            {viewPreferences.currentViewMode === 'masonry' && viewPreferences.isDesktop ? (
              <ClosetGridMasonry
                items={displayItems}
                onItemClick={handleItemClick}
                showVersatilityScore={viewPreferences.preferences.shared.visualTheme.showVersatilityScore}
                getItemVersatilityScore={(itemId) => stats.getItemVersatilityScore?.(itemId) || 0}
                isSelectionMode={selection.isSelectionMode}
                selectedIds={selection.selectedIds}
                onToggleSelection={toggleItemSelection}
                onQuickAction={handleQuickAction}
                columns="auto"
                minColumnWidth={280}
                gapSize={16}
                staggerDelay={0.03}
                enableAnimations={true}
                emptyTitle={filters.hasFilters ? 'Sin Resultados' : 'Armario Vacío'}
                emptyMessage={
                  filters.hasFilters
                    ? 'Prueba ajustando los filtros o búsqueda.'
                    : 'Toca el "+" para empezar a digitalizar tu ropa.'
                }
                onEmptyAction={filters.hasFilters ? filters.clearFilters : onAddItem}
                emptyActionLabel={filters.hasFilters ? 'Limpiar Filtros' : 'Agregar Prenda'}
              />
            ) : viewPreferences.currentViewMode === 'carousel' ? (
              <CoverFlowCarousel
                items={displayItems}
                onItemClick={handleItemClick}
              />
            ) : (
              <ClosetGridVirtualized
                items={displayItems}
                onItemClick={handleItemClick}
                showVersatilityScore={viewPreferences.preferences.shared.visualTheme.showVersatilityScore}
                getItemVersatilityScore={(itemId) => stats.getItemVersatilityScore?.(itemId) || 0}
                isSelectionMode={selection.isSelectionMode}
                selectedIds={selection.selectedIds}
                onToggleSelection={toggleItemSelection}
                onQuickAction={handleQuickAction}
                columnWidth={180}
                rowHeight={260}
                gapSize={16}
                overscanRowCount={2}
                overscanColumnCount={1}
                emptyTitle={filters.hasFilters ? 'Sin Resultados' : 'Armario Vacío'}
                emptyMessage={
                  filters.hasFilters
                    ? 'Prueba ajustando los filtros o búsqueda.'
                    : 'Toca el "+" para empezar a digitalizar tu ropa.'
                }
                onEmptyAction={filters.hasFilters ? filters.clearFilters : onAddItem}
                emptyActionLabel={filters.hasFilters ? 'Limpiar Filtros' : 'Agregar Prenda'}
              />
            )}
          </div>

          {/* Mobile FAB */}
          {onAddItem && viewPreferences.isMobile && viewPreferences.preferences.mobile.fabEnabled && (
            <button
              onClick={onAddItem}
              className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-dark transition-all hover:scale-110 active:scale-95 z-30"
              aria-label="Agregar prenda"
            >
              <span className="material-symbols-outlined text-2xl">add</span>
            </button>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        <ClosetBulkActions
          selectedCount={selectionCount}
          totalCount={filteredCount}
          allSelected={selection.selectAll}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCancel={exitSelectionMode}
          onAction={handleBulkAction}
          collections={collections.collections}
          position="bottom"
          extraActions={extraActions}
          helperText={helperText || undefined}
        />

        {/* Filters Modal (Mobile) */}
        <ClosetFilters
          isOpen={filters.isFilterPanelOpen}
          onClose={filters.toggleFilterPanel}
          filters={filters.filters}
          onApplyFilters={filters.setFilters}
          onClearFilters={filters.clearFilters}
          availableColors={availableColors}
          availableSeasons={availableSeasons}
          availableTags={availableTags}
          totalItems={totalItems}
          filteredCount={filteredCount}
        />

        {/* Presentation Mode Overlay */}
        {presentationMode.isOpen && (
          <ClosetPresentationMode
            items={displayItems}
            initialIndex={presentationMode.initialIndex}
            onClose={() => setPresentationMode({ ...presentationMode, isOpen: false })}
            onItemClick={handleItemClick}
            onToggleFavorite={(id) => handleQuickAction('favorite', displayItems.find(i => i.id === id)!)}
          />
        )}

        {/* Visual Search Modal */}
        <VisualSearchModal
          isOpen={isVisualSearchOpen}
          onClose={() => {
            setIsVisualSearchOpen(false);
            // Clear results when closing
            if (visualSearchResults) {
              setVisualSearchResults(null);
            }
          }}
          onSearch={async (imageData) => {
            setIsSearching(true);
            try {
              // Use AI to find similar items in the closet
              const similarIds = await findSimilarByImage(imageData, items);
              setVisualSearchResults(similarIds);

              if (similarIds.length > 0) {
                // Enter selection mode and select found items
                enterSelectionMode();
                similarIds.forEach(id => {
                  if (items.some(item => item.id === id)) {
                    toggleItemSelection(id);
                  }
                });
              }
              setIsVisualSearchOpen(false);
            } catch (error) {
              console.error('Visual search error:', error);
            } finally {
              setIsSearching(false);
            }
          }}
        />

        {/* Liquid Detail Modal */}
        <LiquidDetailModal
          item={detailModal.item}
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
          onItemUpdated={(updatedItem) => {
            setDetailModal((prev) => ({ ...prev, item: updatedItem }));
            onRefresh?.();
          }}
        />
      </div>
    </div>

  );
}
