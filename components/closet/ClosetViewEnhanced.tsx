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
import { useCloset } from '../../contexts/ClosetContext';
import { getUniqueColors, getUniqueTags, getUniqueSeasons } from '../../utils/closetUtils';
import { findSimilarByImage } from '../../services/geminiService';
import type { ClothingItem } from '../../types';

interface ClosetViewEnhancedProps {
  onItemClick: (id: string) => void;
  onAddItem?: () => void;
}

export default function ClosetViewEnhanced({
  onItemClick,
  onAddItem
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
            }).catch(() => {});
          }
        }
        exitSelectionMode();
        break;

      default:
        console.log('Unknown action:', actionId);
    }
  }, [selection.selectedIds, collections, exitSelectionMode, onDeleteItems, onExportItems, onShareItems, items]);

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
          }).catch(() => {});
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
            onToggleSelection={selection.isSelectionMode ? exitSelectionMode : enterSelectionMode}
            isSelectionMode={selection.isSelectionMode}
            selectedCount={selection.selectedIds.size}
            totalItems={totalItems}
            filteredCount={filteredCount}
            selectedColor={selectedColor}
            onColorFilter={setSelectedColor}
            availableColors={availableColors}
          />

          {/* Grid/List Content */}
          <div className="flex-1 overflow-hidden">
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
          selectedCount={selection.selectedIds.size}
          totalCount={filteredCount}
          allSelected={selection.selectAll}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCancel={exitSelectionMode}
          onAction={handleBulkAction}
          collections={collections.collections}
          position="bottom"
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
        />
      </div>
    </div>

  );
}
