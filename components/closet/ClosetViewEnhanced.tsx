/**
 * CLOSET VIEW ENHANCED
 *
 * Armario como superficie principal para construir looks.
 * La selección se reutiliza como composer y la biblioteca vive en /guardados.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import ClosetToolbar from './ClosetToolbar';
import ClosetSidebar from './ClosetSidebar';
import ClosetFilters from './ClosetFilters';
import ClosetGridVirtualized from './ClosetGridVirtualized';
import ClosetGridMasonry from './ClosetGridMasonry';
import ClosetItemCard from './ClosetItemCard';
import ClosetPresentationMode from './ClosetPresentationMode';
import VisualSearchModal from './VisualSearchModal';
import LiquidDetailModal from './LiquidDetailModal';
import BottomSheet from '../ui/BottomSheet';
import { SurfaceTour, type SurfaceTourStep } from '../help/SurfaceTour';
import { useSurfaceTour } from '../help/useSurfaceTour';
import ClosetPeekDeck from './ClosetPeekDeck';
import LoadDemoDataButton from './LoadDemoDataButton';
import { useCloset } from '../../contexts/ClosetContext';
import { getUniqueTags, getUniqueSeasons } from '../../utils/closetUtils';
import { createLookFolder, getLookFolders, saveOutfit } from '../../src/services/outfitService';
import { findSimilarByImage, generateOutfit } from '../../src/services/aiService';
import type { ClothingItem, LookFolder, SavedOutfit } from '../../types';
import { useNavigateTransition } from '../../hooks/useNavigateTransition';
import { ROUTES } from '../../src/routes';
import { getImageUrl } from '../../src/utils/imagePlaceholder';

const MAX_LOOK_SELECTION = 6;
const MAX_EXTRA_ITEMS = 3;
const CLOSET_LOOK_BUILDER_SEEN_KEY = 'ojodeloca-closet-look-builder-seen';
const CLOSET_TOUR_STEPS: SurfaceTourStep[] = [
  {
    id: 'toolbar',
    target: 'closet-toolbar',
    title: 'Buscá o agregá prendas',
    description: 'Desde acá encontrás ropa rápido y también sumás nuevas prendas a tu armario.',
    position: 'bottom',
  },
  {
    id: 'filters',
    target: 'closet-filters',
    title: 'Filtrá sin perderte',
    description: 'Usá filtros para achicar el armario por categoría, color o criterio y decidir más rápido.',
    position: 'bottom',
  },
  {
    id: 'builder',
    target: 'closet-look-builder',
    title: 'Armá un look desde acá',
    description: 'Podés empezar manualmente o pedir una combinación con IA usando tu ropa real.',
    position: 'bottom',
  },
  {
    id: 'saved-looks',
    target: 'closet-saved-looks',
    title: 'Tus looks viven acá',
    description: 'Cuando guardás una combinación, la recuperás desde Looks para reusar, editar o probar en Studio.',
    position: 'left',
  },
];

interface ClosetViewEnhancedProps {
  onItemClick: (id: string) => void;
  onAddItem?: () => void;
  onRefresh?: () => void;
  onLoadDemoData?: (items: ClothingItem[]) => void;
  onOutfitSaved?: (outfit: SavedOutfit) => void;
}

type LookComposerMode = 'manual' | 'ai_recommendation';

interface LookDraft {
  topId: string;
  bottomId: string;
  shoesId: string;
  explanation: string;
  mode: LookComposerMode;
  extraItemIds?: string[];
}

export default function ClosetViewEnhanced({
  onItemClick,
  onAddItem,
  onRefresh,
  onLoadDemoData,
  onOutfitSaved,
}: ClosetViewEnhancedProps) {
  const { showTour, completeTour, skipTour } = useSurfaceTour('closet-surface-tour-completed');
  const dashboardShellStyle = {
    background: 'linear-gradient(180deg, rgba(239,244,246,0.96) 0%, rgba(231,236,239,0.92) 100%)',
  } as React.CSSProperties;

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
    deselectAll,
    toggleItemSelection,
    totalItems,
    filteredCount,
    onDeleteItem,
    onToggleFavorite,
  } = useCloset();

  const navigate = useNavigateTransition();
  const location = useLocation();

  const [presentationMode, setPresentationMode] = useState({ isOpen: false, initialIndex: 0 });
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<string[] | null>(null);
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: ClothingItem | null }>({
    isOpen: false,
    item: null,
  });
  const [isToolbarFloating, setIsToolbarFloating] = useState(false);
  const [lookFolders, setLookFolders] = useState<LookFolder[]>([]);
  const [isGeneratingLook, setIsGeneratingLook] = useState(false);
  const [previewLook, setPreviewLook] = useState<LookDraft | null>(null);
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [isSavingLook, setIsSavingLook] = useState(false);
  const [hasSeenLookBuilder, setHasSeenLookBuilder] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CLOSET_LOOK_BUILDER_SEEN_KEY) === '1';
  });
  const [saveDraft, setSaveDraft] = useState({
    name: '',
    folderId: '',
    newFolderName: '',
  });

  const markLookBuilderSeen = useCallback(() => {
    setHasSeenLookBuilder(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CLOSET_LOOK_BUILDER_SEEN_KEY, '1');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      try {
        const folders = await getLookFolders();
        if (!cancelled) {
          setLookFolders(folders);
        }
      } catch (error) {
        console.error('Error loading folders:', error);
      }
    };

    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selection.isSelectionMode) {
      setIsMobileComposerOpen(false);
    }
  }, [selection.isSelectionMode]);

  const availableTags = useMemo(() => getUniqueTags(items), [items]);
  const availableSeasons = useMemo(() => getUniqueSeasons(items), [items]);

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    collections.collectionsWithItems.forEach((collection) => {
      counts[collection.id] = collection.items.length;
    });
    return counts;
  }, [collections.collectionsWithItems]);

  const selectedItems = useMemo(
    () => items.filter((item) => selection.selectedIds.has(item.id)),
    [items, selection.selectedIds],
  );

  const selectedByCategory = useMemo(() => {
    const firstByCategory = (category: string) =>
      selectedItems.find((item) => item.metadata.category === category) || null;

    const categories = selectedItems
      .map((item) => item.metadata.category)
      .filter((category) => ['top', 'bottom', 'shoes'].includes(category));
    const hasDuplicateCategory = new Set(categories).size !== categories.length;
    const extras = selectedItems
      .filter((item) => ['accessory', 'outerwear'].includes(item.metadata.category))
      .slice(0, MAX_EXTRA_ITEMS);

    return {
      top: firstByCategory('top'),
      bottom: firstByCategory('bottom'),
      shoes: firstByCategory('shoes'),
      extras,
      hasDuplicateCategory,
    };
  }, [selectedItems]);

  const missingCategories = useMemo(() => {
    const missing: string[] = [];
    if (!selectedByCategory.top) missing.push('top');
    if (!selectedByCategory.bottom) missing.push('bottom');
    if (!selectedByCategory.shoes) missing.push('calzado');
    return missing;
  }, [selectedByCategory]);

  const composerHelperText = useMemo(() => {
    if (!selection.isSelectionMode) return null;
    if (selectedItems.length === 0) return 'Elegí las prendas que quieras combinar.';
    if (selectedByCategory.hasDuplicateCategory) return 'Dejá una sola prenda por cada parte del look. Los accesorios van aparte.';
    if (selectedItems.length > MAX_LOOK_SELECTION) return `Elegí hasta ${MAX_LOOK_SELECTION} prendas por look.`;
    if (missingCategories.length === 0) return 'Ya tenés lo esencial. Si querés, sumá extras o cerralo así.';
    if (selectedItems.length >= 2) return `Todavía falta ${missingCategories.join(' y ')}.`;
    return 'Empezá por la parte de arriba, la de abajo y el calzado.';
  }, [missingCategories, selectedByCategory.hasDuplicateCategory, selectedItems.length, selection.isSelectionMode]);

  const composerCompactText = useMemo(() => {
    if (!selection.isSelectionMode) return null;
    if (selectedItems.length === 0) return 'Tocá prendas para empezar.';
    if (selectedByCategory.hasDuplicateCategory) return 'Elegí una sola por cada parte del look.';
    if (missingCategories.length === 0) return 'Tu look ya está listo para revisar.';
    return `Falta ${missingCategories.join(' y ')}.`;
  }, [missingCategories, selectedByCategory.hasDuplicateCategory, selectedItems.length, selection.isSelectionMode]);

  const handleScrollCapture = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.scrollTop !== 'number') return;

    const nextIsFloating = target.scrollTop > 24;
    setIsToolbarFloating((prev) => (prev === nextIsFloating ? prev : nextIsFloating));
  }, []);

  useEffect(() => {
    const stylistNavigation = (location.state as {
      stylistNavigation?: {
        type?: 'open_closet_filtered' | 'open_recommended_item';
        filters?: {
          category?: 'top' | 'bottom' | 'shoes';
          color?: string;
        };
        itemId?: string;
      };
    } | null)?.stylistNavigation;

    if (!stylistNavigation?.type) return;

    if (stylistNavigation.type === 'open_closet_filtered') {
      filters.clearFilters();
      setSelectedColor(null);

      const requestedCategory = stylistNavigation.filters?.category;
      if (requestedCategory) {
        filters.setCategories([requestedCategory]);
      }

      const requestedColor = stylistNavigation.filters?.color;
      if (requestedColor) {
        setSelectedColor(requestedColor);
      }
    }

    if (stylistNavigation.type === 'open_recommended_item' && stylistNavigation.itemId) {
      const item = items.find((candidate) => candidate.id === stylistNavigation.itemId);
      if (item) {
        setDetailModal({ isOpen: true, item });
      }
    }

    navigate(ROUTES.CLOSET, { replace: true, state: {} });
  }, [
    filters,
    items,
    location.state,
    navigate,
    setSelectedColor,
  ]);

  const handleItemClick = useCallback((id: string) => {
    if (selection.isSelectionMode) {
      const isAlreadySelected = selection.selectedIds.has(id);
      if (!isAlreadySelected && selection.selectedIds.size >= MAX_LOOK_SELECTION) {
        toast.error(`Podés elegir hasta ${MAX_LOOK_SELECTION} prendas por look.`);
        return;
      }
      toggleItemSelection(id);
      return;
    }

    const item = items.find((entry) => entry.id === id);
    if (item) {
      setDetailModal({ isOpen: true, item });
    } else {
      onItemClick(id);
    }
  }, [items, onItemClick, selection.isSelectionMode, selection.selectedIds, toggleItemSelection]);

  const buildPreviewLook = useCallback((draft: LookDraft) => {
    setIsMobileComposerOpen(false);
    setPreviewLook(draft);
    setSaveDraft({
      name: draft.mode === 'manual' ? 'Look manual' : 'Look recomendado',
      folderId: '',
      newFolderName: '',
    });
  }, []);

  const handleOpenManualComposer = useCallback(() => {
    markLookBuilderSeen();
    enterSelectionMode();
    setIsMobileComposerOpen(false);
    toast(viewPreferences.isMobile
      ? 'Elegí prendas y abrí tu selección cuando quieras.'
      : 'Elegí prendas y armá el look desde la barra lateral.', { icon: '🪄' });
  }, [enterSelectionMode, markLookBuilderSeen, viewPreferences.isMobile]);

  const handleCreateManualLook = useCallback(() => {
    if (selectedItems.length < 2) {
      toast.error('Seleccioná al menos 2 prendas para armar un look.');
      return;
    }
    if (selectedByCategory.hasDuplicateCategory) {
      toast.error('Elegí una sola prenda por categoría principal.');
      return;
    }
    if (!selectedByCategory.top || !selectedByCategory.bottom || !selectedByCategory.shoes) {
      toast.error('Para armar el look necesitás top, bottom y calzado.');
      return;
    }

    buildPreviewLook({
      topId: selectedByCategory.top.id,
      bottomId: selectedByCategory.bottom.id,
      shoesId: selectedByCategory.shoes.id,
      explanation: 'Look armado manualmente desde tu armario.',
      mode: 'manual',
      extraItemIds: selectedByCategory.extras.map((item) => item.id),
    });
  }, [buildPreviewLook, selectedByCategory, selectedItems.length]);

  const handleGenerateRecommendedLook = useCallback(async (baseItems?: ClothingItem[]) => {
    if (items.length < 3) {
      toast.error('Necesitás al menos 3 prendas en tu armario para recomendar un look.');
      return;
    }

    markLookBuilderSeen();

    const selectedLabels = (baseItems || [])
      .map((item) => `${item.metadata.subcategory} ${item.metadata.color_primary}`.trim())
      .join(', ');
    const prompt = selectedLabels
      ? `Armá un look usando estas prendas como base: ${selectedLabels}. Si falta algo, completalo con el resto de mi armario y conservá los extras si funcionan.`
      : 'Armá un look equilibrado usando mi armario completo.';

    setIsGeneratingLook(true);
    try {
      const result = await generateOutfit(prompt, items);
      if (!result.top_id || !result.bottom_id || !result.shoes_id) {
        toast.error('No pude cerrar un look completo con tu armario.');
        return;
      }

      buildPreviewLook({
        topId: result.top_id,
        bottomId: result.bottom_id,
        shoesId: result.shoes_id,
        explanation: result.explanation,
        mode: 'ai_recommendation',
        extraItemIds: selectedByCategory.extras.map((item) => item.id),
      });
    } catch (error) {
      console.error('Error recommending look:', error);
      toast.error(error instanceof Error ? error.message : 'No pude recomendar un look ahora.');
    } finally {
      setIsGeneratingLook(false);
    }
  }, [buildPreviewLook, items, markLookBuilderSeen, selectedByCategory.extras]);

  const handleSaveLook = useCallback(async () => {
    if (!previewLook) return;

    setIsSavingLook(true);
    try {
      let folderId = saveDraft.folderId || null;
      const newFolderName = saveDraft.newFolderName.trim();

      if (newFolderName) {
        const newFolder = await createLookFolder({
          name: newFolderName,
          color: '#D97706',
          icon: 'folder',
          sortOrder: lookFolders.length,
        });
        setLookFolders((prev) => [...prev, newFolder]);
        folderId = newFolder.id;
      }

      const saved = await saveOutfit({
        top_id: previewLook.topId,
        bottom_id: previewLook.bottomId,
        shoes_id: previewLook.shoesId,
        explanation: previewLook.explanation,
        name: saveDraft.name.trim() || (previewLook.mode === 'manual' ? 'Look manual' : 'Look recomendado'),
        source: previewLook.mode,
        aiGenerated: previewLook.mode !== 'manual',
        folderId,
        contextJson: {
          creation_surface: 'closet_builder',
          extra_item_ids: previewLook.extraItemIds || [],
        },
      });

      onOutfitSaved?.(saved);
      toast.success('Look guardado en Looks');
      setPreviewLook(null);
      setSaveDraft({ name: '', folderId: '', newFolderName: '' });
      exitSelectionMode();
    } catch (error) {
      console.error('Error saving look:', error);
      toast.error(error instanceof Error ? error.message : 'No pude guardar el look.');
    } finally {
      setIsSavingLook(false);
    }
  }, [exitSelectionMode, lookFolders.length, onOutfitSaved, previewLook, saveDraft]);

  const handleQuickAction = useCallback((action: string, item: ClothingItem) => {
    switch (action) {
      case 'view':
      case 'edit':
        setDetailModal({ isOpen: true, item });
        break;
      case 'favorite':
        onToggleFavorite?.(item.id);
        break;
      case 'delete':
        onDeleteItem?.(item.id);
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: item.metadata?.subcategory || 'Mi prenda',
            text: `Mirá esta prenda: ${item.metadata?.subcategory || 'prenda'}`,
          }).catch(() => undefined);
        }
        break;
      default:
        break;
    }
  }, [onDeleteItem, onToggleFavorite]);

  const renderSelectedItem = useCallback((id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return null;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item.id)}
        className="group relative overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,244,246,0.88))] text-left shadow-[0_18px_40px_rgba(20,52,59,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(20,52,59,0.16)]"
      >
        <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14343b] shadow-sm">
          Lista
        </div>
        <img
          src={getImageUrl(item, false)}
          alt={item.metadata.subcategory}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.82))] p-3">
          <p className="text-sm font-semibold text-[#14343b]">{item.metadata.subcategory}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-black/50">{item.metadata.color_primary}</p>
        </div>
      </button>
    );
  }, [handleItemClick, items]);

  const renderBuilderPanel = useCallback((showCloseAction: boolean) => (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,242,244,0.94))] p-3 shadow-[0_22px_50px_rgba(20,52,59,0.14)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(202,232,234,0.4),transparent_72%)]" />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-[18px] bg-[#14343b] px-3 py-2 text-center text-white shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">Total</p>
              <p className="text-lg font-semibold">{selection.selectedIds.size}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">Armando look</p>
              <h2 className="mt-1 text-[1.06rem] font-semibold leading-tight text-[#14343b]">Tu selección</h2>
              <p className="mt-1 text-sm leading-6 text-black/60">{composerHelperText}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[34rem] xl:justify-end">
            <button
              type="button"
              onClick={handleCreateManualLook}
              disabled={missingCategories.length > 0 || selectedByCategory.hasDuplicateCategory}
              className="rounded-2xl bg-[#08111a] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(8,17,26,0.18)] transition hover:bg-[#10202b] disabled:opacity-50"
            >
              Armar look
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateRecommendedLook(selectedItems)}
              disabled={isGeneratingLook}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] transition hover:bg-[#f4f7f8] disabled:opacity-60"
            >
              {isGeneratingLook ? 'Recomendando...' : 'Completar con IA'}
            </button>
            <button
              type="button"
              onClick={() => {
                const preselectedItemIds = Array.from(selection.selectedIds).slice(0, MAX_LOOK_SELECTION);
                navigate(ROUTES.STUDIO, { state: { preselectedItemIds } });
              }}
              disabled={selection.selectedIds.size === 0}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] transition hover:bg-[#f4f7f8] disabled:opacity-50"
            >
              Probar en Studio
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] transition hover:bg-[#f4f7f8]"
            >
              Limpiar
            </button>
            {showCloseAction && (
              <button
                type="button"
                onClick={exitSelectionMode}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] transition hover:bg-[#f4f7f8]"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-[20px] border p-3 ${selectedByCategory.top ? 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,242,244,0.9))] shadow-[0_12px_28px_rgba(20,52,59,0.08)]' : 'border-dashed border-black/10 bg-white/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Top</p>
              {selectedByCategory.top ? <span className="rounded-full bg-[#e7eff2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14343b]">Elegida</span> : null}
            </div>
            {selectedByCategory.top ? (
              <button type="button" onClick={() => handleItemClick(selectedByCategory.top!.id)} className="mt-3 flex w-full items-center gap-3 text-left">
                <img src={getImageUrl(selectedByCategory.top, false)} alt={selectedByCategory.top.metadata.subcategory} className="h-12 w-12 rounded-[14px] object-cover shadow-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#14343b]">{selectedByCategory.top.metadata.subcategory}</p>
                  <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-black/50">{selectedByCategory.top.metadata.color_primary}</p>
                </div>
              </button>
            ) : (
              <div className="mt-3 rounded-[16px] border border-dashed border-black/8 bg-white/70 px-3 py-3">
                <p className="text-sm text-black/45">Elegí una parte superior</p>
              </div>
            )}
          </div>

          <div className={`rounded-[20px] border p-3 ${selectedByCategory.bottom ? 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,242,244,0.9))] shadow-[0_12px_28px_rgba(20,52,59,0.08)]' : 'border-dashed border-black/10 bg-white/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Bottom</p>
              {selectedByCategory.bottom ? <span className="rounded-full bg-[#e7eff2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14343b]">Elegida</span> : null}
            </div>
            {selectedByCategory.bottom ? (
              <button type="button" onClick={() => handleItemClick(selectedByCategory.bottom!.id)} className="mt-3 flex w-full items-center gap-3 text-left">
                <img src={getImageUrl(selectedByCategory.bottom, false)} alt={selectedByCategory.bottom.metadata.subcategory} className="h-12 w-12 rounded-[14px] object-cover shadow-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#14343b]">{selectedByCategory.bottom.metadata.subcategory}</p>
                  <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-black/50">{selectedByCategory.bottom.metadata.color_primary}</p>
                </div>
              </button>
            ) : (
              <div className="mt-3 rounded-[16px] border border-dashed border-black/8 bg-white/70 px-3 py-3">
                <p className="text-sm text-black/45">Elegí una parte inferior</p>
              </div>
            )}
          </div>

          <div className={`rounded-[20px] border p-3 ${selectedByCategory.shoes ? 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,242,244,0.9))] shadow-[0_12px_28px_rgba(20,52,59,0.08)]' : 'border-dashed border-black/10 bg-white/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Calzado</p>
              {selectedByCategory.shoes ? <span className="rounded-full bg-[#e7eff2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14343b]">Elegida</span> : null}
            </div>
            {selectedByCategory.shoes ? (
              <button type="button" onClick={() => handleItemClick(selectedByCategory.shoes!.id)} className="mt-3 flex w-full items-center gap-3 text-left">
                <img src={getImageUrl(selectedByCategory.shoes, false)} alt={selectedByCategory.shoes.metadata.subcategory} className="h-12 w-12 rounded-[14px] object-cover shadow-sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#14343b]">{selectedByCategory.shoes.metadata.subcategory}</p>
                  <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-black/50">{selectedByCategory.shoes.metadata.color_primary}</p>
                </div>
              </button>
            ) : (
              <div className="mt-3 rounded-[16px] border border-dashed border-black/8 bg-white/70 px-3 py-3">
                <p className="text-sm text-black/45">Elegí el calzado</p>
              </div>
            )}
          </div>

          <div className={`rounded-[20px] border p-3 ${selectedByCategory.extras.length > 0 ? 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,242,244,0.9))] shadow-[0_12px_28px_rgba(20,52,59,0.08)]' : 'border-dashed border-black/10 bg-white/70'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Extras</p>
              {selectedByCategory.extras.length > 0 ? <span className="rounded-full bg-[#e7eff2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#14343b]">{selectedByCategory.extras.length}</span> : null}
            </div>
            {selectedByCategory.extras.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedByCategory.extras.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className="rounded-full border border-black/10 bg-[#f7f0e8] px-3 py-1.5 text-xs font-semibold text-[#14343b] transition hover:-translate-y-0.5 hover:bg-[#efe4d7]"
                  >
                    {item.metadata.subcategory}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-[16px] border border-dashed border-black/8 bg-white/70 px-3 py-3">
                <p className="text-sm text-black/45">Accesorios opcionales</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  ), [
    composerHelperText,
    deselectAll,
    exitSelectionMode,
    handleCreateManualLook,
    handleGenerateRecommendedLook,
    handleItemClick,
    isGeneratingLook,
    missingCategories.length,
    navigate,
    selection.selectedIds,
    selectedByCategory,
    selectedItems,
  ]);

  const renderListView = () => (
    <div
      key={selection.isSelectionMode ? 'list-selection' : 'list-browse'}
      className="h-full overflow-y-auto px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        {displayItems.map((item, index) => (
          <ClosetItemCard
            key={item.id}
            item={item}
            onClick={handleItemClick}
            isSelected={selection.selectedIds.has(item.id)}
            onToggleSelection={toggleItemSelection}
            showVersatilityScore={viewPreferences.preferences.shared.visualTheme.showVersatilityScore}
            versatilityScore={stats.getItemVersatilityScore?.(item.id) || 0}
            viewMode="list"
            size="normal"
            showQuickActions
            onQuickAction={(action) => handleQuickAction(action, item)}
            index={index}
            isSelectionMode={selection.isSelectionMode}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-transparent" style={dashboardShellStyle}>
      {showTour && !selection.isSelectionMode && !previewLook && (
        <SurfaceTour
          steps={CLOSET_TOUR_STEPS}
          introTitle="Tour rápido del armario"
          introDescription="Te muestro dónde arrancar para cargar ropa, filtrar y guardar looks sin perderte."
          introIcon="👗"
          ctaLabel="Sí, mostrame"
          dismissLabel="No, ya sé usarlo"
          dockTooltipOnDesktop
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}

      {!selection.isSelectionMode && (
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
      )}

      <div className="relative flex h-full w-full flex-col">
        <div className="flex-1 overflow-hidden rounded-t-[2rem] md:rounded-none" onScrollCapture={handleScrollCapture}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.58),transparent_54%),linear-gradient(180deg,rgba(202,232,234,0.22),transparent_90%)]" />

          <ClosetToolbar
            searchText={filters.filters.searchText || ''}
            onSearchChange={filters.setSearchText}
            activeFiltersCount={filters.activeFiltersCount}
            onOpenFilters={filters.toggleFilterPanel}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewMode={viewPreferences.currentViewMode}
            onViewModeChange={viewPreferences.setViewMode}
            onVisualSearch={() => setIsVisualSearchOpen(true)}
            onAddItem={onAddItem}
            onRefresh={onRefresh}
            onToggleSelection={selection.isSelectionMode ? exitSelectionMode : enterSelectionMode}
            isSelectionMode={selection.isSelectionMode}
            selectedCount={selection.selectedIds.size}
            totalItems={totalItems}
            filteredCount={filteredCount}
            selectedColor={selectedColor}
            onColorFilter={setSelectedColor}
            availableColors={availableColors}
            isFloating={isToolbarFloating}
            selectionTitle={selection.isSelectionMode ? `${selection.selectedIds.size} prendas en tu look` : undefined}
            selectionSubtitle={selection.isSelectionMode ? 'Base + extras opcionales' : undefined}
          />

          {selection.isSelectionMode && viewPreferences.isDesktop && !previewLook && (
            <div className="sticky top-[4.8rem] z-20 px-4 pb-3 pt-2">
              {renderBuilderPanel(true)}
            </div>
          )}

          {!selection.isSelectionMode && (
            <div className="px-4 pb-3 pt-2">
              {hasSeenLookBuilder ? (
                <div
                  data-surface-tour="closet-look-builder"
                  className="grid gap-3 rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(223,231,236,0.68))] p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">Looks desde armario</p>
                    <p className="mt-1 text-sm font-medium text-[#14343b]">Armá uno manual o pedile a la IA que te complete una base.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenManualComposer}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#14343b] hover:bg-[#f6f7f8]"
                  >
                    Empezar look
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGenerateRecommendedLook()}
                    disabled={isGeneratingLook}
                    className="rounded-2xl bg-[#08111a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10202b] disabled:opacity-60"
                  >
                    {isGeneratingLook ? 'Recomendando...' : 'Look con IA'}
                  </button>
                </div>
              ) : (
                <div
                  data-surface-tour="closet-look-builder"
                  className="grid gap-3 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(223,231,236,0.68))] p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">Looks desde armario</p>
                    <h2 className="mt-1 text-xl font-semibold text-[#14343b]">Seleccioná prendas para armar un look</h2>
                    <p className="mt-1 text-sm text-black/60">
                      Elegí prendas, revisá la combinación y después decidí si querés probarla, guardarla o sumar ayuda de la IA.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenManualComposer}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] hover:bg-[#f6f7f8]"
                  >
                    Empezar look
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGenerateRecommendedLook()}
                    disabled={isGeneratingLook}
                    className="rounded-2xl bg-[#08111a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#10202b] disabled:opacity-60"
                  >
                    {isGeneratingLook ? 'Recomendando...' : 'Look con IA'}
                  </button>
                </div>
              )}
            </div>
          )}

          {viewPreferences.isMobile && (
            <div className="px-4 pb-2 md:hidden">
              <button
                data-surface-tour="closet-saved-looks"
                onClick={() => navigate(ROUTES.SAVED)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(223,231,236,0.76))] px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/40"
                aria-label="Ir a looks guardados"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#cae8ea,#dfe7ec)] text-[#14343b] shadow-sm">
                    <span className="material-symbols-outlined text-sm">photo_library</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary dark:text-gray-100">Looks guardados</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Tu biblioteca reutilizable</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-sm text-text-secondary dark:text-gray-400">arrow_forward_ios</span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {items.length === 0 && !filters.hasFilters && onLoadDemoData && (
              <div className="p-6">
                <LoadDemoDataButton closet={items} onLoadDemo={onLoadDemoData} variant="prominent" />
              </div>
            )}

            {items.length > 0 && items.some((item) => item.id.startsWith('demo-')) && onLoadDemoData && (
              <div className="px-4 pb-2">
                <LoadDemoDataButton closet={items} onLoadDemo={onLoadDemoData} variant="subtle" />
              </div>
            )}

            {viewPreferences.currentViewMode === 'list' ? (
              renderListView()
            ) : viewPreferences.currentViewMode === 'masonry' && viewPreferences.isDesktop ? (
              <ClosetGridMasonry
                key={selection.isSelectionMode ? 'masonry-selection' : 'masonry-browse'}
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
                enableAnimations
                emptyTitle={filters.hasFilters ? 'Sin resultados' : 'Armario vacío'}
                emptyMessage={filters.hasFilters ? 'Probá ajustando filtros o búsqueda.' : 'Tocá el "+" para empezar a digitalizar tu ropa.'}
                onEmptyAction={filters.hasFilters ? filters.clearFilters : onAddItem}
                emptyActionLabel={filters.hasFilters ? 'Limpiar filtros' : 'Agregar prenda'}
              />
            ) : viewPreferences.currentViewMode === 'carousel' ? (
              <ClosetPeekDeck
                key={selection.isSelectionMode ? 'carousel-selection' : 'carousel-browse'}
                items={displayItems}
                onItemClick={handleItemClick}
              />
            ) : (
              <ClosetGridVirtualized
                key={selection.isSelectionMode ? 'grid-selection' : 'grid-browse'}
                items={displayItems}
                onItemClick={handleItemClick}
                showVersatilityScore={viewPreferences.preferences.shared.visualTheme.showVersatilityScore}
                getItemVersatilityScore={(itemId) => stats.getItemVersatilityScore?.(itemId) || 0}
                isSelectionMode={selection.isSelectionMode}
                selectedIds={selection.selectedIds}
                onToggleSelection={toggleItemSelection}
                onQuickAction={handleQuickAction}
                columnWidth={180}
                rowHeight={320}
                gapSize={16}
                overscanRowCount={2}
                overscanColumnCount={1}
                emptyTitle={filters.hasFilters ? 'Sin resultados' : 'Armario vacío'}
                emptyMessage={filters.hasFilters ? 'Probá ajustando filtros o búsqueda.' : 'Tocá el "+" para empezar a digitalizar tu ropa.'}
                onEmptyAction={filters.hasFilters ? filters.clearFilters : onAddItem}
                emptyActionLabel={filters.hasFilters ? 'Limpiar filtros' : 'Agregar prenda'}
              />
            )}
          </div>

          {onAddItem && viewPreferences.isMobile && viewPreferences.preferences.mobile.fabEnabled && !selection.isSelectionMode && (
            <button
              onClick={onAddItem}
              className="fixed bottom-safe-20 right-safe-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#08111a] text-white shadow-lg transition-all hover:scale-110 hover:bg-[#10202b] active:scale-95"
              aria-label="Agregar prenda"
            >
              <span className="material-symbols-outlined text-2xl">add</span>
            </button>
          )}
        </div>

        {selection.isSelectionMode && viewPreferences.isMobile && !previewLook && (
          <div className="pointer-events-none fixed inset-x-0 bottom-safe-20 z-30 px-4 md:hidden">
            <div className="pointer-events-auto mx-auto max-w-xl rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,242,244,0.92))] p-3 shadow-[0_24px_54px_rgba(20,52,59,0.18)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileComposerOpen(true)}
                  className="flex flex-1 items-center justify-between rounded-[22px] bg-white/88 px-4 py-3 text-left shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Tu look</p>
                    <p className="truncate text-sm font-semibold text-[#14343b]">
                      {selection.selectedIds.size} de {MAX_LOOK_SELECTION} prendas elegidas
                    </p>
                    <p className="truncate text-xs text-black/55">{composerCompactText}</p>
                  </div>
                  <span className="material-symbols-outlined text-xl text-[#14343b]">expand_less</span>
                </button>

                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[#14343b] shadow-sm"
                  aria-label="Salir del armado de look"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomSheet
          isOpen={selection.isSelectionMode && viewPreferences.isMobile && isMobileComposerOpen}
          onClose={() => setIsMobileComposerOpen(false)}
          title="Armá tu look"
          snapPoints={[58, 88]}
          defaultSnapPoint={1}
        >
          {renderBuilderPanel(false)}
        </BottomSheet>

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

        {presentationMode.isOpen && (
          <ClosetPresentationMode
            items={displayItems}
            initialIndex={presentationMode.initialIndex}
            onClose={() => setPresentationMode((prev) => ({ ...prev, isOpen: false }))}
            onItemClick={handleItemClick}
            onToggleFavorite={(id) => {
              const item = displayItems.find((entry) => entry.id === id);
              if (item) {
                handleQuickAction('favorite', item);
              }
            }}
          />
        )}

        <VisualSearchModal
          isOpen={isVisualSearchOpen}
          onClose={() => {
            setIsVisualSearchOpen(false);
            if (visualSearchResults) {
              setVisualSearchResults(null);
            }
          }}
          onSearch={async (imageData) => {
            try {
              const similarIds = await findSimilarByImage(imageData, items);
              setVisualSearchResults(similarIds);

              if (similarIds.length > 0) {
                enterSelectionMode();
                similarIds.slice(0, 3).forEach((id) => {
                  if (!selection.selectedIds.has(id) && items.some((item) => item.id === id)) {
                    toggleItemSelection(id);
                  }
                });
              }
              setIsVisualSearchOpen(false);
            } catch (error) {
              console.error('Visual search error:', error);
            }
          }}
        />

        <LiquidDetailModal
          item={detailModal.item}
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
          onItemUpdated={(updatedItem) => {
            setDetailModal((prev) => ({ ...prev, item: updatedItem }));
            onRefresh?.();
          }}
        />

        {previewLook && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,248,0.92))] shadow-[0_30px_90px_rgba(8,17,26,0.28)]">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">
                    {previewLook.mode === 'manual' ? 'Look manual' : 'Look recomendado'}
                  </p>
                  <h3 className="text-2xl font-semibold text-[#14343b]">Revisá y guardá este look</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewLook(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#14343b]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[previewLook.topId, previewLook.bottomId, previewLook.shoesId].map(renderSelectedItem)}
                  </div>

                  {!!previewLook.extraItemIds?.length && (
                    <div className="rounded-[24px] border border-black/5 bg-white/80 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">Extras</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                        {previewLook.extraItemIds.map(renderSelectedItem)}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[24px] border border-black/5 bg-white/80 p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#dfe7ec] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#14343b]">
                        {previewLook.mode === 'manual' ? 'Manual' : 'IA'}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-black/70">{previewLook.explanation}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-black/5 bg-white/85 p-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      Nombre del look
                    </label>
                    <input
                      value={saveDraft.name}
                      onChange={(event) => setSaveDraft((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Ej. Oficina suave"
                      className="w-full rounded-2xl border border-black/10 bg-[#faf6f1] px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      Carpeta
                    </label>
                    <select
                      value={saveDraft.folderId}
                      onChange={(event) => setSaveDraft((prev) => ({ ...prev, folderId: event.target.value }))}
                      className="w-full rounded-2xl border border-black/10 bg-[#faf6f1] px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Sin carpeta</option>
                      {lookFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                      Crear carpeta nueva
                    </label>
                    <input
                      value={saveDraft.newFolderName}
                      onChange={(event) => setSaveDraft((prev) => ({ ...prev, newFolderName: event.target.value }))}
                      placeholder="Ej. Oficina, Noche, Viaje"
                      className="w-full rounded-2xl border border-black/10 bg-[#faf6f1] px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveLook()}
                      disabled={isSavingLook}
                      className="rounded-2xl bg-[#08111a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#10202b] disabled:opacity-60"
                    >
                      {isSavingLook ? 'Guardando...' : 'Guardar en Looks'}
                    </button>
                    {previewLook.mode !== 'manual' && (
                      <button
                        type="button"
                        onClick={() => void handleGenerateRecommendedLook(selectedItems.length > 0 ? selectedItems : undefined)}
                        disabled={isGeneratingLook}
                        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#14343b] hover:bg-[#f6f7f8] disabled:opacity-60"
                      >
                        {isGeneratingLook ? 'Recomendando...' : 'Pedir otra recomendación'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
