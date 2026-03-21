import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ClothingItem, GeneratedLook, InferredLookContext, LookFolder, SavedLookContext, SavedOutfit } from '../types';
import { ROUTES } from '../src/routes';
import {
  buildOutfitShareUrl,
  createLookFolder,
  deleteOutfit,
  enableOutfitSharing,
  getLookFolders,
  getSavedOutfits,
  saveOutfit,
  updateOutfit,
  type OutfitLibraryItem,
} from '../src/services/outfitService';
import { getGeneratedLooks } from '../src/services/generatedLooksService';
import { publishOutfitToTimeline } from '../src/services/activityFeedService';
import { getPreferredClothingImage } from '../src/utils/closetImages';
import { SurfaceTour, type SurfaceTourStep } from './help/SurfaceTour';
import { useSurfaceTour } from './help/useSurfaceTour';
import LooksFirstUploader from './looks/LooksFirstUploader';
import LookGarmentSeparator from './looks/LookGarmentSeparator';

interface SavedLooksViewProps {
  closet: ClothingItem[];
  onClosetSync: (items: ClothingItem[]) => void;
  useSupabaseCloset: boolean;
  onUseLookInChat?: (look: SavedOutfit) => void;
  onUseInferredLookInChat?: (options: {
    prompt: string;
    selectedLook: SavedLookContext;
    selectedInferredLook: InferredLookContext;
    lookUploadSessionId: string;
  }) => void;
}

type ManualSlotKey = 'topId' | 'bottomId' | 'shoesId';
type ManualPickerTarget = ManualSlotKey | 'extras';
type ClothingCategory = 'top' | 'bottom' | 'shoes';
type MobileLooksViewMode = 'grid' | 'list' | 'carousel';

const DEFAULT_FOLDER_COLOR = '#D97706';

const MANUAL_SLOT_CONFIG: Array<{
  key: ManualSlotKey;
  category: ClothingCategory;
  label: string;
  emptyLabel: string;
  helper: string;
  icon: string;
}> = [
  {
    key: 'topId',
    category: 'top',
    label: 'Top',
    emptyLabel: 'Elegir top',
    helper: 'Remeras, camisas, sweaters.',
    icon: 'checkroom',
  },
  {
    key: 'bottomId',
    category: 'bottom',
    label: 'Bottom',
    emptyLabel: 'Elegir bottom',
    helper: 'Pantalones, faldas, shorts.',
    icon: 'view_in_ar',
  },
  {
    key: 'shoesId',
    category: 'shoes',
    label: 'Calzado',
    emptyLabel: 'Elegir calzado',
    helper: 'Zapatillas, botas, zapatos.',
    icon: 'footprint',
  },
];

function buildLookPreview(outfit: SavedOutfit, closet: ClothingItem[]) {
  const items = [
    closet.find((item) => item.id === outfit.top_id),
    closet.find((item) => item.id === outfit.bottom_id),
    closet.find((item) => item.id === outfit.shoes_id),
  ].filter(Boolean) as ClothingItem[];
  return items;
}

function buildStudioSelection(outfit: SavedOutfit) {
  const extraItemIds = Array.isArray(outfit.context_json?.extra_item_ids)
    ? outfit.context_json.extra_item_ids.filter((itemId): itemId is string => typeof itemId === 'string')
    : [];

  return Array.from(new Set([
    outfit.top_id,
    outfit.bottom_id,
    outfit.shoes_id,
    outfit.hero_item_id,
    ...extraItemIds,
  ].filter(Boolean) as string[]));
}

function getItemCaption(item: ClothingItem) {
  return item.metadata.subcategory || 'Prenda';
}

function getItemMeta(item: ClothingItem) {
  return [item.metadata.color_primary, item.metadata.category]
    .filter(Boolean)
    .join(' • ');
}

const SOURCE_LABELS: Record<string, string> = {
  ai_recommendation: 'Recomendado por Kumbi',
  manual: 'Manual',
  reference_recreation: 'Inspiración',
  planner: 'Planificado',
  community_import: 'Comunidad',
};

function getSourceLabel(source: string | null | undefined): string {
  if (!source) return 'Manual';
  return SOURCE_LABELS[source] || source;
}

const LOOKS_TOUR_STEPS: SurfaceTourStep[] = [
  {
    id: 'search',
    target: 'looks-search',
    title: 'Encontrá un look rápido',
    description: 'Buscá por nombre o refrescá la biblioteca cuando quieras volver a cargar tus combinaciones.',
    position: 'bottom',
  },
  {
    id: 'folders',
    target: 'looks-folders',
    title: 'Ordená por carpetas',
    description: 'Filtrá por carpeta o creá una nueva para separar oficina, salida, viaje o lo que uses más.',
    position: 'right',
  },
  {
    id: 'manual',
    target: 'looks-manual-builder',
    title: 'Guardá un look manual',
    description: 'Elegís top, bottom y calzado, le ponés nombre y lo dejás listo para reutilizar después.',
    position: 'right',
  },
  {
    id: 'library',
    target: 'looks-library-card',
    title: 'Reutilizá y adaptá',
    description: 'Cada look guardado se puede editar, compartir, mandar a Kumbi o abrir en Studio.',
    position: 'top',
  },
];

function matchClosetItem(item: ClothingItem, query: string) {
  if (!query.trim()) return true;
  const haystack = [
    item.metadata.subcategory,
    item.metadata.color_primary,
    item.metadata.category,
    item.metadata.description,
    ...(item.metadata.vibe_tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function getExtraItemIds(contextJson: SavedOutfit['context_json']) {
  if (!contextJson || typeof contextJson !== 'object') return [];
  const extraItemIds = contextJson.extra_item_ids;
  if (!Array.isArray(extraItemIds)) return [];
  return extraItemIds.filter((itemId): itemId is string => typeof itemId === 'string');
}

export default function SavedLooksView({
  closet,
  onClosetSync,
  useSupabaseCloset,
  onUseLookInChat,
  onUseInferredLookInChat,
}: SavedLooksViewProps) {
  const { showTour, completeTour, skipTour } = useSurfaceTour('looks-surface-tour-completed');
  const navigate = useNavigate();
  const location = useLocation();
  const [library, setLibrary] = useState<OutfitLibraryItem[]>([]);
  const [folders, setFolders] = useState<LookFolder[]>([]);
  const [generatedLooks, setGeneratedLooks] = useState<GeneratedLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingLookId, setEditingLookId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ name: string; tags: string; referenceSummary: string }>({
    name: '',
    tags: '',
    referenceSummary: '',
  });
  const [manualDraft, setManualDraft] = useState({
    name: '',
    folderId: '',
    tags: '',
    topId: '',
    bottomId: '',
    shoesId: '',
    extraItemIds: [] as string[],
    explanation: '',
  });
  const [activeManualPicker, setActiveManualPicker] = useState<ManualPickerTarget | null>(null);
  const [manualPickerSearch, setManualPickerSearch] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [cardMenuOpenId, setCardMenuOpenId] = useState<string | null>(null);
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<MobileLooksViewMode>('list');
  const shouldAutoOpenLooksFirst = useMemo(
    () => new URLSearchParams(location.search).get('intent') === 'upload-looks',
    [location.search],
  );

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const [outfits, foldersData, renders] = await Promise.all([
        getSavedOutfits(),
        getLookFolders(),
        getGeneratedLooks({ limit: 100 }),
      ]);
      setLibrary(outfits);
      setFolders(foldersData);
      setGeneratedLooks(renders);
    } catch (error) {
      console.error('Error loading look library:', error);
      toast.error('No pude cargar tu biblioteca de looks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!activeManualPicker) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeManualPicker]);

  const renderMap = useMemo(() => {
    const map = new Map<string, GeneratedLook[]>();
    generatedLooks.forEach((look) => {
      if (!look.outfit_id) return;
      const current = map.get(look.outfit_id) || [];
      current.push(look);
      map.set(look.outfit_id, current);
    });
    return map;
  }, [generatedLooks]);

  const filteredLibrary = useMemo(() => {
    return library.filter((look) => {
      if (activeFolderId !== 'all' && (look.folder_id || '') !== activeFolderId) return false;
      if (!search.trim()) return true;
      const haystack = [
        look.name,
        look.description,
        look.reference_summary,
        ...(look.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [activeFolderId, library, search]);

  const closetByCategory = useMemo(
    () => ({
      top: closet.filter((item) => item.metadata.category === 'top'),
      bottom: closet.filter((item) => item.metadata.category === 'bottom'),
      shoes: closet.filter((item) => item.metadata.category === 'shoes'),
    }),
    [closet],
  );

  const selectedManualItems = useMemo(
    () => ({
      topId: closet.find((item) => item.id === manualDraft.topId) || null,
      bottomId: closet.find((item) => item.id === manualDraft.bottomId) || null,
      shoesId: closet.find((item) => item.id === manualDraft.shoesId) || null,
    }),
    [closet, manualDraft.bottomId, manualDraft.shoesId, manualDraft.topId],
  );

  const selectedManualExtras = useMemo(
    () => manualDraft.extraItemIds
      .map((itemId) => closet.find((item) => item.id === itemId) || null)
      .filter(Boolean) as ClothingItem[],
    [closet, manualDraft.extraItemIds],
  );

  const activePickerConfig = useMemo(
    () => MANUAL_SLOT_CONFIG.find((slot) => slot.key === activeManualPicker) || null,
    [activeManualPicker],
  );

  const pickerItems = useMemo(() => {
    if (activeManualPicker === 'extras') {
      const blockedIds = new Set([manualDraft.topId, manualDraft.bottomId, manualDraft.shoesId].filter(Boolean));
      return closet
        .filter((item) => !blockedIds.has(item.id))
        .filter((item) => matchClosetItem(item, manualPickerSearch));
    }
    if (!activePickerConfig) return [];
    return closetByCategory[activePickerConfig.category].filter((item) => matchClosetItem(item, manualPickerSearch));
  }, [activeManualPicker, activePickerConfig, closet, closetByCategory, manualDraft.bottomId, manualDraft.shoesId, manualDraft.topId, manualPickerSearch]);

  const manualSelectedCount = useMemo(() => {
    return MANUAL_SLOT_CONFIG.reduce((count, slot) => (
      manualDraft[slot.key] ? count + 1 : count
    ), 0);
  }, [manualDraft]);

  const createFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const folder = await createLookFolder({
        name,
        color: DEFAULT_FOLDER_COLOR,
        icon: 'folder',
        sortOrder: folders.length,
      });
      setFolders((prev) => [...prev, folder]);
      setNewFolderName('');
      toast.success('Carpeta creada');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('No pude crear la carpeta.');
    } finally {
      setCreatingFolder(false);
    }
  }, [folders.length, newFolderName]);

  const createManualLook = useCallback(async () => {
    if (!manualDraft.topId || !manualDraft.bottomId || !manualDraft.shoesId) {
      toast.error('Elegí top, bottom y calzado.');
      return;
    }

    try {
      const saved = await saveOutfit({
        top_id: manualDraft.topId,
        bottom_id: manualDraft.bottomId,
        shoes_id: manualDraft.shoesId,
        explanation: manualDraft.explanation || 'Look armado manualmente en la biblioteca.',
        name: manualDraft.name || 'Look manual',
        source: 'manual',
        aiGenerated: false,
        folderId: manualDraft.folderId || null,
        tags: manualDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        contextJson: {
          creation_surface: 'look_library_manual',
          extra_item_ids: manualDraft.extraItemIds,
        },
      });

      setLibrary((prev) => [saved, ...prev]);
      setManualDraft({
        name: '',
        folderId: '',
        tags: '',
        topId: '',
        bottomId: '',
        shoesId: '',
        extraItemIds: [],
        explanation: '',
      });
      toast.success('Look manual guardado');
    } catch (error) {
      console.error('Error saving manual look:', error);
      toast.error('No pude guardar el look manual.');
    }
  }, [manualDraft]);

  const moveToFolder = useCallback(async (look: OutfitLibraryItem, folderId: string) => {
    try {
      const updated = await updateOutfit(look.id, { folder_id: folderId || null });
      setLibrary((prev) => prev.map((entry) => (entry.id === look.id ? { ...entry, ...updated } : entry)));
      toast.success(folderId ? 'Look movido de carpeta' : 'Look sin carpeta');
    } catch (error) {
      console.error('Error moving look:', error);
      toast.error('No pude mover el look.');
    }
  }, []);

  const removeLook = useCallback(async (lookId: string) => {
    if (!window.confirm('¿Eliminar este look de la biblioteca?')) return;
    try {
      await deleteOutfit(lookId);
      setLibrary((prev) => prev.filter((look) => look.id !== lookId));
      toast.success('Look eliminado');
    } catch (error) {
      console.error('Error deleting look:', error);
      toast.error('No pude eliminar el look.');
    }
  }, []);

  const startEditing = useCallback((look: OutfitLibraryItem) => {
    setEditingLookId(look.id);
    setEditingDraft({
      name: look.name || '',
      tags: (look.tags || []).join(', '),
      referenceSummary: look.reference_summary || '',
    });
  }, []);

  const saveEdit = useCallback(async (look: OutfitLibraryItem) => {
    try {
      const updated = await updateOutfit(look.id, {
        name: editingDraft.name.trim() || look.name,
        tags: editingDraft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        reference_summary: editingDraft.referenceSummary.trim() || null,
      });
      setLibrary((prev) => prev.map((entry) => (entry.id === look.id ? { ...entry, ...updated } : entry)));
      setEditingLookId(null);
      toast.success('Look actualizado');
    } catch (error) {
      console.error('Error updating look:', error);
      toast.error('No pude actualizar el look.');
    }
  }, [editingDraft]);

  const toggleShare = useCallback(async (look: OutfitLibraryItem) => {
    try {
      const shareToken = look.share_token && look.is_public
        ? look.share_token
        : await enableOutfitSharing(look.id);
      const shareUrl = buildOutfitShareUrl(shareToken);
      const bundle = {
        top: closet.find((item) => item.id === look.top_id),
        bottom: closet.find((item) => item.id === look.bottom_id),
        shoes: closet.find((item) => item.id === look.shoes_id),
      };
      const alreadyPublished = Boolean(
        look.context_json && typeof look.context_json === 'object' && look.context_json.community_published_at,
      );

      let nextLook: OutfitLibraryItem = {
        ...look,
        is_public: true,
        share_token: shareToken,
      };

      if (!alreadyPublished) {
        await publishOutfitToTimeline(
          {
            ...look,
            is_public: true,
            share_token: shareToken,
          },
          bundle,
          {
            caption: look.description || look.explanation || look.name || 'Look compartido desde tu biblioteca',
            tags: look.tags || [],
            visibility: 'community',
          },
        );

        const updated = await updateOutfit(look.id, {
          context_json: {
            ...(look.context_json || {}),
            community_published_at: new Date().toISOString(),
          },
          is_public: true,
        });
        nextLook = {
          ...updated,
          share_token: shareToken,
        };
      }

      await navigator.clipboard.writeText(shareUrl);
      setLibrary((prev) => prev.map((entry) => (entry.id === look.id ? nextLook : entry)));
      toast.success(alreadyPublished ? 'Link copiado' : 'Look compartido en Comunidad');
    } catch (error) {
      console.error('Error sharing look:', error);
      toast.error('No pude compartir este look.');
    }
  }, [closet]);

  const openManualPicker = useCallback((slot: ManualSlotKey) => {
    setActiveManualPicker(slot);
    setManualPickerSearch('');
  }, []);

  const openManualExtrasPicker = useCallback(() => {
    setActiveManualPicker('extras');
    setManualPickerSearch('');
  }, []);

  const selectManualItem = useCallback((slot: ManualSlotKey, itemId: string) => {
    setManualDraft((prev) => ({ ...prev, [slot]: itemId }));
    setActiveManualPicker(null);
    setManualPickerSearch('');
  }, []);

  const toggleManualExtraItem = useCallback((itemId: string) => {
    setManualDraft((prev) => ({
      ...prev,
      extraItemIds: prev.extraItemIds.includes(itemId)
        ? prev.extraItemIds.filter((entry) => entry !== itemId)
        : [...prev.extraItemIds, itemId],
    }));
  }, []);

  const openLookInStudio = useCallback((look: SavedOutfit) => {
    const preselectedItemIds = buildStudioSelection(look);
    if (preselectedItemIds.length === 0) {
      toast.error('Este look no tiene prendas listas para Studio.');
      return;
    }

    navigate(ROUTES.STUDIO, {
      state: {
        preselectedItemIds,
      },
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_28%),linear-gradient(180deg,#f5eee6_0%,#f7f1ea_32%,#efe5da_100%)] text-[#211d1a]">
      {showTour && (
        <SurfaceTour
          steps={LOOKS_TOUR_STEPS}
          introTitle="Tour rápido de looks"
          introDescription="Te ubico en los puntos clave para guardar, ordenar y volver a usar tus combinaciones."
          introIcon="✨"
          ctaLabel="Sí, mostrame"
          dismissLabel="No, ya sé usarlo"
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        {/* ── Compact header ─────────────────────────────────────────── */}
        <header className="overflow-hidden rounded-[28px] border border-white/60 bg-white/72 px-4 py-3 shadow-[0_18px_48px_-34px_rgba(74,51,27,0.38)] backdrop-blur-xl md:px-5 md:py-4">
          <div className="flex flex-col gap-2.5">
            {/* Row 1: title + stats + search */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-xl font-semibold tracking-[-0.04em] text-[#171411] md:text-2xl">
                  Looks
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f5eee6] px-2.5 py-1 text-[11px] font-medium text-[#5f554d]">
                    {library.length}
                  </span>
                  <span className="rounded-full bg-[#f5eee6] px-2.5 py-1 text-[11px] font-medium text-[#5f554d]">
                    {folders.length} carpetas
                  </span>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 lg:w-auto" data-surface-tour="looks-search">
                <div className="relative flex-1 lg:min-w-[220px] lg:flex-initial">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#9a8f84]">search</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar look…"
                    className="w-full rounded-full border border-[#e4d8ca] bg-[#fbf8f4] py-2 pl-9 pr-4 text-sm text-[#211d1a] outline-none transition placeholder:text-[#9a8f84] focus:border-[#d2b89d]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadLibrary()}
                  aria-label="Recargar biblioteca de looks"
                  className="inline-flex items-center justify-center rounded-full border border-[#dccfc0] bg-white p-2 text-[#2a241f] transition hover:bg-[#faf4ec]"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
              </div>
            </div>

            {/* Row 2: Folder chips (inline) */}
            <div className="flex items-center gap-2" data-surface-tour="looks-folders">
              <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFolderId('all')}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeFolderId === 'all'
                      ? 'bg-[#171411] text-white'
                      : 'bg-[#f5eee6] text-[#544a42] hover:bg-[#eadfce]'
                  }`}
                >
                  Todos
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      activeFolderId === folder.id
                        ? 'bg-[#171411] text-white'
                        : 'bg-[#f5eee6] text-[#544a42] hover:bg-[#eadfce]'
                    }`}
                  >
                    {folder.name}
                  </button>
                ))}
                {/* Inline new folder */}
                {creatingFolder ? (
                  <span className="shrink-0 rounded-full bg-[#f5eee6] px-3 py-1.5 text-xs text-[#9a8f84]">Creando…</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void createFolder();
                      }}
                      placeholder="+ Nueva"
                      className="w-[88px] rounded-full border border-dashed border-[#dccfc0] bg-transparent px-3 py-1.5 text-xs outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d] focus:bg-[#fbf8f4]"
                    />
                    {newFolderName.trim() && (
                      <button
                        type="button"
                        onClick={() => void createFolder()}
                        className="rounded-full bg-[#171411] px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-[#2a241f]"
                      >
                        OK
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-[11px] font-medium text-[#9a8f84]">
                {filteredLibrary.length} visibles
              </span>
            </div>
          </div>
        </header>

        {/* ── Library grid ──────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center rounded-[24px] border border-white/60 bg-white/80 p-6">
            <span className="material-symbols-outlined mr-2 animate-spin text-lg text-[#9a8f84]">progress_activity</span>
            <span className="text-sm text-[#5f554d]">Cargando biblioteca…</span>
          </div>
        ) : filteredLibrary.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#dccfc0] bg-white/80 px-6 py-10 text-center">
            <span className="material-symbols-outlined mb-3 text-4xl text-[#dccfc0]">style</span>
            <h2 className="text-lg font-semibold tracking-[-0.03em]">Todavía no hay looks en esta vista</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5f554d]">
              Guardá looks desde Kumbi, armá variantes manuales o cambiá de carpeta para encontrar más rápido lo que ya funciona.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Biblioteca</p>
                <p className="text-sm text-[#5f554d]">Elegí cómo querés recorrer tus looks en mobile.</p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/85 p-1 shadow-sm md:hidden">
                {([
                  ['grid', 'grid_view'],
                  ['list', 'view_agenda'],
                  ['carousel', 'view_carousel'],
                ] as const).map(([mode, icon]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-label={mode === 'grid' ? 'Ver looks en grilla' : mode === 'list' ? 'Ver looks en lista' : 'Ver looks en carrusel'}
                    onClick={() => setMobileViewMode(mode)}
                    className={`rounded-full px-2.5 py-2 transition ${
                      mobileViewMode === mode ? 'bg-[#171411] text-white' : 'text-[#7a7068]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                mobileViewMode === 'carousel'
                  ? 'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:overflow-visible'
                  : mobileViewMode === 'list'
                    ? 'flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3'
                    : 'grid grid-cols-2 gap-3 xl:grid-cols-3'
              }
            >
            {filteredLibrary.map((look) => {
              const previewItems = buildLookPreview(look, closet);
              const linkedRenders = renderMap.get(look.id) || [];
              const coverRender = linkedRenders[0];
              const folderName = folders.find((folder) => folder.id === look.folder_id)?.name;
              const isMenuOpen = cardMenuOpenId === look.id;
              const isCarousel = mobileViewMode === 'carousel';
              const isList = mobileViewMode === 'list';

              return (
                <article
                  key={look.id}
                  data-surface-tour={look === filteredLibrary[0] ? 'looks-library-card' : undefined}
                  className={`group relative overflow-hidden rounded-[24px] border border-white/60 bg-white/90 shadow-[0_12px_36px_-24px_rgba(74,51,27,0.3)] transition hover:shadow-[0_18px_48px_-28px_rgba(74,51,27,0.4)] ${
                    isCarousel ? 'w-[82vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none' : ''
                  } ${isList ? 'flex min-h-[144px] flex-row md:block' : ''}`}
                >
                  {/* Cover image / preview grid */}
                  <div
                    className={`relative cursor-pointer ${isList ? 'w-[148px] shrink-0 sm:w-[170px]' : ''}`}
                    onClick={() => setSelectedLookId(look.id)}
                  >
                    {coverRender?.image_url ? (
                      <img
                        src={coverRender.image_url}
                        alt={look.name || 'Render del look'}
                        className={`w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
                          isList ? 'h-full min-h-[176px]' : 'aspect-[4/5]'
                        }`}
                      />
                    ) : previewItems.length > 0 ? (
                      <div className={`grid grid-cols-3 ${isList ? 'h-full min-h-[176px]' : ''}`}>
                        {previewItems.map((item) => (
                          <img
                            key={item.id}
                            src={getPreferredClothingImage(item, 'thumbnail')}
                            alt={item.metadata.subcategory}
                            className={`w-full object-cover ${isList ? 'h-full min-h-[176px]' : 'aspect-[4/5]'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className={`flex items-center justify-center bg-[#f5ede5] ${isList ? 'h-full min-h-[176px] w-full' : 'aspect-[4/5]'}`}>
                        <span className="material-symbols-outlined text-4xl text-[#c9bead]">checkroom</span>
                      </div>
                    )}

                    {/* Overlay badges */}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 via-black/20 to-transparent px-3 pb-3 pt-10">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1d1d1d] backdrop-blur-sm">
                        {getSourceLabel(look.source)}
                      </span>
                      {folderName && (
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[#5e35b1] backdrop-blur-sm">
                          {folderName}
                        </span>
                      )}
                    </div>

                    {/* Overflow menu button */}
                    <button
                      type="button"
                      onClick={() => setCardMenuOpenId(isMenuOpen ? null : look.id)}
                      className="absolute right-2 top-2 rounded-full bg-black/30 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>

                    {/* Dropdown menu */}
                    {isMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Cerrar menú"
                          className="fixed inset-0 z-30"
                          onClick={() => setCardMenuOpenId(null)}
                        />
                        <div className="absolute right-2 top-10 z-40 min-w-[160px] overflow-hidden rounded-[16px] border border-white/70 bg-white/95 shadow-xl backdrop-blur-xl">
                          <button
                            type="button"
                            onClick={() => { startEditing(look); setCardMenuOpenId(null); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#2a241f] transition hover:bg-[#f5eee6]"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => { void toggleShare(look); setCardMenuOpenId(null); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#2a241f] transition hover:bg-[#f5eee6]"
                          >
                            <span className="material-symbols-outlined text-[16px]">share</span>
                            {look.context_json?.community_published_at ? 'Compartido' : 'Compartir'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { void moveToFolder(look, ''); setCardMenuOpenId(null); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#2a241f] transition hover:bg-[#f5eee6]"
                          >
                            <span className="material-symbols-outlined text-[16px]">folder</span>
                            Mover carpeta
                          </button>
                          <button
                            type="button"
                            onClick={() => onUseLookInChat?.({
                              ...look,
                              name: `${look.name || 'Look'} · Variante`,
                              reference_summary: look.reference_summary || 'Pedí una variante basada en este look.',
                            })}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[#2a241f] transition hover:bg-[#f5eee6]"
                          >
                            <span className="material-symbols-outlined text-[16px]">auto_fix</span>
                            Pedir variante
                          </button>
                          <button
                            type="button"
                            onClick={() => { void removeLook(look.id); setCardMenuOpenId(null); }}
                            className="flex w-full items-center gap-2.5 border-t border-[#f2ece4] px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card body */}
                  <div className={`space-y-2.5 px-3.5 pb-3.5 pt-3 ${isList ? 'flex min-w-0 flex-1 flex-col justify-between' : ''}`}>
                    <div className="cursor-pointer" onClick={() => setSelectedLookId(look.id)}>
                      <h2 className="line-clamp-1 text-[15px] font-semibold text-[#171411]">
                        {look.name || 'Look sin nombre'}
                      </h2>
                      {isList && (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8c8178]">
                          Vista rápida del look
                        </p>
                      )}
                      {(look.description || look.explanation) && (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-[1.4] text-[#6f6258]">
                          {look.description || look.explanation}
                        </p>
                      )}
                    </div>

                    {!!look.tags?.length && (
                      <div className="flex flex-wrap gap-1">
                        {look.tags.slice(0, 3).map((tag) => (
                          <span
                            key={`${look.id}-${tag}`}
                            className="rounded-full bg-[#f5eee6] px-2 py-0.5 text-[10px] font-medium text-[#6d6157]"
                          >
                            {tag}
                          </span>
                        ))}
                        {(look.tags?.length ?? 0) > 3 && (
                          <span className="rounded-full bg-[#f5eee6] px-2 py-0.5 text-[10px] font-medium text-[#9a8f84]">
                            +{(look.tags?.length ?? 0) - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Editing inline */}
                    {editingLookId === look.id && (
                      <div className="space-y-2 rounded-[16px] border border-[#e4d8ca] bg-[#fbf8f4] p-2.5">
                        <input
                          value={editingDraft.name}
                          onChange={(event) => setEditingDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder="Nombre"
                          className="w-full rounded-[12px] border border-[#e4d8ca] bg-white px-3 py-1.5 text-sm outline-none"
                        />
                        <input
                          value={editingDraft.tags}
                          onChange={(event) => setEditingDraft((prev) => ({ ...prev, tags: event.target.value }))}
                          placeholder="tags, separados, por coma"
                          className="w-full rounded-[12px] border border-[#e4d8ca] bg-white px-3 py-1.5 text-sm outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(look)}
                            className="rounded-[12px] bg-[#171411] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLookId(null)}
                            className="rounded-[12px] border border-[#dccfc0] bg-white px-3 py-1.5 text-xs font-semibold text-[#544a42]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick actions: Studio + Kumbi */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openLookInStudio(look)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[#d7c3ac] bg-[#fff9f3] py-2 text-xs font-semibold text-[#2d241d] transition hover:bg-[#fff2e3]"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => onUseLookInChat?.(look)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#c76332] py-2 text-xs font-semibold text-white transition hover:bg-[#b25628]"
                      >
                        Kumbi
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          </>
        )}

        <section className="space-y-3">
          <div className="rounded-[22px] border border-white/60 bg-white/78 px-4 py-3 shadow-[0_10px_28px_-20px_rgba(74,51,27,0.28)] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Cargar o crear</p>
            <p className="mt-1 text-sm text-[#5f554d]">Cuando quieras sumar looks nuevos, arrancá por uno de estos caminos.</p>
          </div>

          {/* ── Compact Looks-First uploader ──────────────────────────── */}
          <LooksFirstUploader
            autoOpen={shouldAutoOpenLooksFirst}
            onOpenWithKumbi={onUseInferredLookInChat || (() => undefined)}
          />

          <div data-surface-tour="looks-manual-builder">
            {!isBuilderOpen ? (
              <button
                type="button"
                onClick={() => setIsBuilderOpen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-white/60 bg-white/85 px-5 py-3.5 shadow-[0_10px_28px_-20px_rgba(74,51,27,0.28)] backdrop-blur-xl transition hover:bg-white/95"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c76332] text-white">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </span>
                  <span className="text-sm font-semibold text-[#171411]">Crear look manual</span>
                </div>
                <span className="text-xs text-[#9a8f84]">Elegí top, bottom y calzado →</span>
              </button>
            ) : (
              <div className="overflow-hidden rounded-[26px] border border-white/60 bg-white/85 shadow-[0_24px_58px_-36px_rgba(74,51,27,0.42)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-[#eee3d7] bg-[linear-gradient(135deg,rgba(253,247,241,0.98),rgba(255,255,255,0.94))] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-[#171411]">Crear look manual</p>
                    <span className="rounded-full bg-[#ede4ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#6a46c8]">
                      {manualSelectedCount}/3
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBuilderOpen(false)}
                    className="rounded-full border border-[#dccfc0] bg-white p-1.5 text-[#5b5047] transition hover:bg-[#faf4ec]"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <input
                    value={manualDraft.name}
                    onChange={(event) => setManualDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nombre del look"
                    className="w-full rounded-[20px] border border-[#e4d8ca] bg-[#fbf8f4] px-4 py-2.5 text-sm outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d]"
                  />

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Carpeta</p>
                    <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
                      <button
                        type="button"
                        onClick={() => setManualDraft((prev) => ({ ...prev, folderId: '' }))}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          !manualDraft.folderId
                            ? 'bg-[#171411] text-white'
                            : 'bg-[#f5eee6] text-[#544a42] hover:bg-[#eadfce]'
                        }`}
                      >
                        Sin carpeta
                      </button>
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setManualDraft((prev) => ({ ...prev, folderId: folder.id }))}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            manualDraft.folderId === folder.id
                              ? 'bg-[#171411] text-white'
                              : 'bg-[#f5eee6] text-[#544a42] hover:bg-[#eadfce]'
                          }`}
                        >
                          {folder.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {MANUAL_SLOT_CONFIG.map((slot) => {
                      const selectedItem = selectedManualItems[slot.key];
                      return (
                        <button
                          key={slot.key}
                          type="button"
                          onClick={() => openManualPicker(slot.key)}
                          className="flex items-center gap-3 rounded-[18px] border border-[#eadfce] bg-[#fbf7f2] p-2.5 text-left transition hover:border-[#d6c0a7] hover:bg-[#fffdfa]"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white">
                            {selectedItem ? (
                              <img
                                src={getPreferredClothingImage(selectedItem, 'thumbnail')}
                                alt={getItemCaption(selectedItem)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#b09f90]">
                                <span className="material-symbols-outlined text-xl">{slot.icon}</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#1f1a16]">
                              {selectedItem ? getItemCaption(selectedItem) : slot.emptyLabel}
                            </p>
                            <p className="line-clamp-1 text-[11px] leading-4 text-[#75695f]">
                              {selectedItem ? getItemMeta(selectedItem) : slot.helper}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={openManualExtrasPicker}
                      className="rounded-full border border-dashed border-[#dccfc0] bg-transparent px-3 py-1.5 text-xs text-[#544a42] transition hover:bg-[#faf4ec]"
                    >
                      {selectedManualExtras.length > 0 ? `${selectedManualExtras.length} extras` : '+ Extras'}
                    </button>
                    <input
                      value={manualDraft.explanation}
                      onChange={(event) => setManualDraft((prev) => ({ ...prev, explanation: event.target.value }))}
                      placeholder="Nota breve (opcional)"
                      className="flex-1 rounded-full border border-[#e4d8ca] bg-[#fbf8f4] px-3 py-1.5 text-xs outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void createManualLook()}
                    className="w-full rounded-[18px] bg-[#c76332] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b25628] disabled:opacity-60"
                    disabled={manualSelectedCount < 3}
                  >
                    Guardar look manual
                  </button>
                </div>
              </div>
            )}
          </div>

          <LookGarmentSeparator
            closet={closet}
            onClosetSync={onClosetSync}
            useSupabaseCloset={useSupabaseCloset}
            collapsed
          />
        </section>
      </div>

      {/* ── Look detail modal ──────────────────────────────────── */}
      {selectedLookId && (() => {
        const look = library.find((l) => l.id === selectedLookId);
        if (!look) return null;
        const previewItems = buildLookPreview(look, closet);
        const linkedRenders = renderMap.get(look.id) || [];
        const coverRender = linkedRenders[0];
        const folderName = folders.find((f) => f.id === look.folder_id)?.name;
        const extraItems = getExtraItemIds(look.context_json)
          .map((itemId) => closet.find((item) => item.id === itemId) || null)
          .filter(Boolean) as ClothingItem[];

        return (
          <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center p-0 sm:items-center sm:p-6">
            <button
              type="button"
              aria-label="Cerrar detalle"
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setSelectedLookId(null)}
            />
            <div
              className="relative flex h-[82dvh] w-full flex-col overflow-hidden overscroll-contain rounded-t-[28px] border border-white/60 bg-[#faf6f1] shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-[28px]"
              style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eee3d7] bg-[#faf6f1]/95 px-5 py-3.5 backdrop-blur-xl">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-[#171411]">
                    {look.name || 'Look sin nombre'}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-[#f5eee6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f554d]">
                      {getSourceLabel(look.source)}
                    </span>
                    {folderName && (
                      <span className="rounded-full bg-[#ede5ff] px-2 py-0.5 text-[10px] font-semibold text-[#5e35b1]">
                        {folderName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLookId(null)}
                  className="ml-3 rounded-full border border-[#dccfc0] bg-white p-2 text-[#5b5047] transition hover:bg-[#faf4ec]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Cover — only show AI render if available */}
              {coverRender?.image_url && (
                <div className="px-4 pt-4 sm:px-5">
                  <img
                    src={coverRender.image_url}
                    alt={look.name || 'Render'}
                    className="max-h-[34vh] w-full rounded-[22px] object-cover sm:max-h-[46vh]"
                  />
                </div>
              )}

              {/* Body */}
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-5 sm:pb-6">
                {/* Description, Explanation & Occasion */}
                {(look.description || look.explanation || look.occasion) && (
                  <div className="space-y-3">
                    {look.description && (
                      <p className="text-sm leading-6 text-[#5f554d]">
                        {look.description}
                      </p>
                    )}
                    {look.explanation && (
                      <div className="flex gap-2.5 rounded-[16px] bg-[#f2f8f8] p-3 text-sm leading-6 text-[#24515a] shadow-sm">
                        <span className="material-symbols-outlined shrink-0 text-[18px] text-[#2aa1a7]">auto_awesome</span>
                        <p>{look.explanation}</p>
                      </div>
                    )}
                    {look.occasion && (
                      <div className="flex items-center gap-1.5 text-xs text-[#7a7068]">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        {look.occasion}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags + Reference summary condensed row */}
                {(!!look.tags?.length || look.reference_summary) && (
                  <div className="space-y-2">
                    {!!look.tags?.length && (
                      <div className="flex flex-wrap gap-1.5">
                        {look.tags.map((tag) => (
                          <span
                            key={`detail-${look.id}-${tag}`}
                            className="rounded-full border border-[#dccfc0] bg-white px-2.5 py-1 text-xs text-[#5f554d]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {look.reference_summary && (
                      <p className="rounded-[14px] bg-[#f7f3ff] px-3.5 py-2.5 text-xs leading-5 text-[#5a3ca8]">
                        {look.reference_summary}
                      </p>
                    )}
                  </div>
                )}

                {/* Prendas grid — hero section */}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Prendas del look</p>
                  <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                    {previewItems.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-[16px] border border-white/70 bg-white shadow-sm">
                        <img
                          src={getPreferredClothingImage(item)}
                          alt={item.metadata.subcategory}
                          className="aspect-[4/5] w-full object-cover"
                        />
                        <div className="px-2 py-1.5">
                          <p className="line-clamp-1 text-center text-[11px] font-semibold text-[#3e342c]">
                            {item.metadata.subcategory}
                          </p>
                          {item.metadata.color_primary && (
                            <p className="mt-0.5 line-clamp-1 text-center text-[10px] text-[#8c8178]">
                              {item.metadata.color_primary}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extras */}
                {extraItems.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c8178]">Extras</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {extraItems.map((item) => (
                        <span
                          key={`detail-extra-${item.id}`}
                          className="rounded-full border border-[#dccfc0] bg-[#f8f2eb] px-3 py-1 text-xs font-semibold text-[#544a42]"
                        >
                          {item.metadata.subcategory}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* primary buttons */}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => { openLookInStudio(look); setSelectedLookId(null); }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-[#d7c3ac] bg-[#fff9f3] py-3 text-[13px] font-semibold text-[#2d241d] transition hover:bg-[#fff2e3]"
                  >
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Studio
                    <span className="rounded-full bg-[#171411] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white">Pro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onUseLookInChat?.(look); setSelectedLookId(null); }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#c76332] py-3 text-[13px] font-semibold text-white transition hover:bg-[#b25628]"
                  >
                    Usar con Kumbi
                  </button>
                </div>

                {/* secondary tools grid */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      onUseLookInChat?.({
                        ...look,
                        name: `${look.name || 'Look'} · Variante`,
                        reference_summary: look.reference_summary || 'Pedí una variante basada en este look.',
                      });
                      setSelectedLookId(null);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] border border-[#dccfc0] bg-white py-2.5 text-[11px] font-semibold text-[#5f554d] transition hover:bg-[#faf4ec]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#8c8178]">style</span>
                    Pedir variante
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUseLookInChat?.({
                        ...look,
                        name: `${look.name || 'Look'} · Análisis`,
                        reference_summary: 'Hacé un análisis de estilo sobre este look: decime para qué ocasiones es ideal, qué transmite visualmente, y si hay alguna manera de elevarlo con accesorios o cambiando alguna prenda.',
                      });
                      setSelectedLookId(null);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] border border-[#dccfc0] bg-white py-2.5 text-[11px] font-semibold text-[#5f554d] transition hover:bg-[#faf4ec]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#8c8178]">analytics</span>
                    Analizar look
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleShare(look);
                      setSelectedLookId(null);
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] border border-[#dccfc0] bg-white py-2.5 text-[11px] font-semibold text-[#5f554d] transition hover:bg-[#faf4ec]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#8c8178]">ios_share</span>
                    Prestar look
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activePickerConfig && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <button
            type="button"
            aria-label="Cerrar selector"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setActiveManualPicker(null)}
          />

          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,250,246,0.98),rgba(246,239,230,0.98))] shadow-2xl md:left-1/2 md:top-1/2 md:w-full md:max-w-4xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[32px] md:border-white/50"
            style={{
              maxHeight: 'min(88vh, calc(100dvh - 1.5rem))',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#eadfce] px-5 pb-4 pt-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8c8178]">
                  {activeManualPicker === 'extras' ? 'Extras opcionales' : activePickerConfig?.label}
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#171411]">
                  {activeManualPicker === 'extras'
                    ? 'Sumá detalles libres al look'
                    : `Elegí visualmente tu ${activePickerConfig?.label.toLowerCase()}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveManualPicker(null)}
                className="rounded-full border border-[#dccfc0] bg-white p-2 text-[#5b5047] transition hover:bg-[#faf4ec]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex h-full max-h-[calc(88vh-72px)] flex-col overflow-hidden px-5 pb-5 pt-4 md:max-h-[calc(100dvh-9rem)]">
              <div className="flex flex-col gap-3 border-b border-[#eadfce] pb-4 sm:flex-row">
                <input
                  value={manualPickerSearch}
                  onChange={(event) => setManualPickerSearch(event.target.value)}
                  placeholder={activeManualPicker === 'extras'
                    ? 'Buscar extra por nombre o color'
                    : `Buscar ${activePickerConfig?.label.toLowerCase()} por nombre o color`}
                  className="w-full rounded-[20px] border border-[#e4d8ca] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#9a8f84] focus:border-[#d2b89d]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (activeManualPicker === 'extras') {
                      setManualDraft((prev) => ({ ...prev, extraItemIds: [] }));
                    } else if (activePickerConfig) {
                      setManualDraft((prev) => ({ ...prev, [activePickerConfig.key]: '' }));
                    }
                    setActiveManualPicker(null);
                    setManualPickerSearch('');
                  }}
                  className="rounded-[20px] border border-[#dccfc0] bg-white px-4 py-3 text-sm font-medium text-[#5b5047] transition hover:bg-[#faf4ec]"
                >
                  {activeManualPicker === 'extras' ? 'Limpiar extras' : 'Limpiar'}
                </button>
              </div>

              <div className="mt-4 overflow-y-auto">
                {pickerItems.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#dccfc0] bg-white/60 p-8 text-center text-sm text-[#6b5f55]">
                    No encontré prendas con esa búsqueda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {pickerItems.map((item) => {
                      const isSelected = activeManualPicker === 'extras'
                        ? manualDraft.extraItemIds.includes(item.id)
                        : Boolean(activePickerConfig && manualDraft[activePickerConfig.key] === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (activeManualPicker === 'extras') {
                              toggleManualExtraItem(item.id);
                              return;
                            }
                            if (activePickerConfig) {
                              selectManualItem(activePickerConfig.key, item.id);
                            }
                          }}
                          className={`overflow-hidden rounded-[24px] border p-2 text-left transition ${
                            isSelected
                              ? 'border-[#c76332] bg-[#fff4ee] shadow-[0_16px_34px_-28px_rgba(199,99,50,0.65)]'
                              : 'border-[#eadfce] bg-white hover:-translate-y-0.5 hover:border-[#d6c0a7] hover:shadow-md'
                          }`}
                        >
                          <img
                            src={getPreferredClothingImage(item, 'thumbnail')}
                            alt={getItemCaption(item)}
                            className="aspect-[4/5] w-full rounded-[18px] object-cover"
                          />
                          <div className="px-1 pb-1 pt-3">
                            <p className="line-clamp-1 text-sm font-semibold text-[#1f1a16]">
                              {getItemCaption(item)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#75695f]">
                              {getItemMeta(item)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeManualPicker === 'extras' && (
                <div className="mt-4 flex justify-end border-t border-[#eadfce] pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveManualPicker(null)}
                    className="rounded-[20px] bg-[#171411] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2a241f]"
                  >
                    Listo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
