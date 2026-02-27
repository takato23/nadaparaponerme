import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppModals } from '../../hooks/useAppModals';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useStudioGeneration } from '../../contexts/AIGenerationContext';
import { ClothingItem, DigitalTwinProfile } from '../../types';
import { ROUTES } from '../../src/routes';
import { getFaceReferences } from '../../src/services/faceReferenceService';
import {
  getCachedTryOnRender,
  recordTryOnCacheHit,
  saveRenderImageToStorage,
  upsertTryOnCacheEntry,
} from '../../src/services/virtualTryOnCacheService';
import { buildTryOnRenderHash } from '../../src/services/virtualTryOnHashService';
import * as analytics from '../../src/services/analyticsService';
import { useToast } from '../../hooks/useToast';

interface VirtualMirrorViewProps {
  closet?: ClothingItem[];
  onOpenDigitalTwinSetup: () => void;
  onOpenHistory?: () => void;
}

type MirrorCategory = 'top' | 'bottom' | 'shoes';
type RenderState =
  | 'idle'
  | 'checking-cache'
  | 'cache-hit'
  | 'cache-miss'
  | 'queued'
  | 'processing'
  | 'completed';

const CATEGORY_UI: Record<MirrorCategory, { label: string; icon: string }> = {
  top: { label: 'Parte superior', icon: 'checkroom' },
  bottom: { label: 'Parte inferior', icon: 'styler' },
  shoes: { label: 'Calzado', icon: 'steps' },
};

const normalizeCategory = (rawCategory?: string, rawSubcategory?: string): MirrorCategory | null => {
  const category = (rawCategory || '').toLowerCase();
  const subcategory = (rawSubcategory || '').toLowerCase();
  const text = `${category} ${subcategory}`;

  if (text.includes('shoe') || text.includes('zapat') || text.includes('sneaker') || text.includes('bota') || text.includes('sandalia')) {
    return 'shoes';
  }

  if (text.includes('pant') || text.includes('jean') || text.includes('falda') || text.includes('skirt') || text.includes('short') || text.includes('bottom')) {
    return 'bottom';
  }

  if (text.includes('shirt') || text.includes('top') || text.includes('sweater') || text.includes('camisa') || text.includes('remera') || text.includes('hoodie') || text.includes('jacket')) {
    return 'top';
  }

  return null;
};

interface CategoryLaneProps {
  category: MirrorCategory;
  items: ClothingItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DIGITAL_TWIN_STORAGE_KEY = 'ojodeloca-digital-twin';
const DIGITAL_TWIN_SOURCE_IMAGE_KEY = 'ojodeloca-digital-twin-source-image';

const parseTwinProfile = (rawProfile: string | null): DigitalTwinProfile | null => {
  if (!rawProfile) return null;

  try {
    const parsed = JSON.parse(rawProfile) as { sourceImages?: unknown; sourceImage?: unknown };
    const sourceImages = Array.isArray(parsed.sourceImages)
      ? parsed.sourceImages.filter((value): value is string => typeof value === 'string')
      : [];

    const fallbackImage = typeof parsed.sourceImage === 'string'
      ? parsed.sourceImage
      : null;

    if (sourceImages.length > 0) {
      return { ...(parsed as DigitalTwinProfile), sourceImages };
    }

    return {
      ...(parsed as DigitalTwinProfile),
      sourceImages: fallbackImage ? [fallbackImage] : [],
    };
  } catch {
    return null;
  }
};

const createFallbackTwinProfile = (userId: string | null, sourceImage: string): DigitalTwinProfile => ({
  id: `legacy-${Date.now()}`,
  userId: userId ?? 'legacy-user',
  sourceImages: [sourceImage],
  modelStatus: 'ready',
  createdAt: new Date().toISOString(),
  modelId: 'legacy',
});

const loadTwinProfile = (fallbackUserId: string | null): DigitalTwinProfile | null => {
  const storedProfile = localStorage.getItem(DIGITAL_TWIN_STORAGE_KEY);
  const fallbackImage = localStorage.getItem(DIGITAL_TWIN_SOURCE_IMAGE_KEY);

  if (storedProfile) {
    const parsed = parseTwinProfile(storedProfile);
    if (!parsed) return null;

    return {
      ...parsed,
      sourceImages: parsed.sourceImages?.length
        ? parsed.sourceImages
        : fallbackImage
          ? [fallbackImage]
          : [],
    };
  }

  if (fallbackImage) {
    return createFallbackTwinProfile(fallbackUserId, fallbackImage);
  }

  return null;
};

const CategoryLane: React.FC<CategoryLaneProps> = ({ category, items, selectedIndex, onSelect }) => {
  const laneConfig = CATEGORY_UI[category];
  const hasItems = items.length > 0;

  const selectPrev = () => {
    if (!hasItems) return;
    onSelect(selectedIndex === 0 ? items.length - 1 : selectedIndex - 1);
  };

  const selectNext = () => {
    if (!hasItems) return;
    onSelect(selectedIndex === items.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/75 p-3 backdrop-blur-lg dark:bg-gray-900/60">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          <span className="material-symbols-outlined text-base">{laneConfig.icon}</span>
          {laneConfig.label}
        </div>
        {hasItems && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {selectedIndex + 1}/{items.length}
          </div>
        )}
      </div>

      {!hasItems ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No hay prendas de esta categoría.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectPrev}
            className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={`Anterior ${laneConfig.label}`}
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {items.map((item, index) => {
              const isActive = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${isActive
                    ? 'border-black ring-2 ring-black/20 dark:border-white dark:ring-white/20'
                    : 'border-gray-200 opacity-70 hover:opacity-100 dark:border-gray-700'
                    }`}
                >
                  <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={selectNext}
            className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={`Siguiente ${laneConfig.label}`}
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
};

const VirtualMirrorView: React.FC<VirtualMirrorViewProps> = ({ closet = [], onOpenDigitalTwinSetup, onOpenHistory }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const modals = useAppModals();
  const toast = useToast();
  const { user } = useAuth();
  const enableHybridTryOn = useFeatureFlag('enableHybridTryOn');
  const { enqueue, results, activeRequest, clearResult } = useStudioGeneration();

  const [twinProfile, setTwinProfile] = useState<DigitalTwinProfile | null>(null);
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [shoesIndex, setShoesIndex] = useState(0);

  const [faceRefsSignature, setFaceRefsSignature] = useState<string | null>(null);
  const [desiredRenderHash, setDesiredRenderHash] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [hdImageUrl, setHdImageUrl] = useState<string | null>(null);

  const processedResultIdsRef = useRef<Set<string>>(new Set());
  const requestedHashesRef = useRef<Set<string>>(new Set());
  const requestStartedAtRef = useRef<Map<string, number>>(new Map());
  const imageByHashRef = useRef<Map<string, string>>(new Map());
  const debounceTimerRef = useRef<number | null>(null);

  const categorizedItems = useMemo(() => {
    const sorted = [...closet].sort((a, b) => b.id.localeCompare(a.id));
    return sorted.reduce<Record<MirrorCategory, ClothingItem[]>>((acc, item) => {
      const category = normalizeCategory(item.metadata.category, item.metadata.subcategory);
      if (category) acc[category].push(item);
      return acc;
    }, { top: [], bottom: [], shoes: [] });
  }, [closet]);

  const selectedTop = categorizedItems.top[topIndex] ?? null;
  const selectedBottom = categorizedItems.bottom[bottomIndex] ?? null;
  const selectedShoes = categorizedItems.shoes[shoesIndex] ?? null;
  const hasItems = categorizedItems.top.length + categorizedItems.bottom.length + categorizedItems.shoes.length > 0;

  const generationQuality: 'flash' | 'pro' = 'pro';
  const generationPreset = 'overlay';
  const generationView: 'front' | 'back' | 'side' = 'front';
  const keepPose = false;
  const useFaceRefs = true;

  const generationData = useMemo(() => {
    const slotItems: Array<{ slot: 'top_base' | 'bottom' | 'shoes'; item: ClothingItem; fit: 'regular' }> = [];
    const slots: Record<string, string> = {};
    const slotItemIds: Record<string, string> = {};
    const slotFits: Record<string, 'regular'> = {};

    if (selectedTop) {
      slotItems.push({ slot: 'top_base', item: selectedTop, fit: 'regular' });
      slots.top_base = selectedTop.imageDataUrl;
      slotItemIds.top_base = selectedTop.id;
      slotFits.top_base = 'regular';
    }
    if (selectedBottom) {
      slotItems.push({ slot: 'bottom', item: selectedBottom, fit: 'regular' });
      slots.bottom = selectedBottom.imageDataUrl;
      slotItemIds.bottom = selectedBottom.id;
      slotFits.bottom = 'regular';
    }
    if (selectedShoes) {
      slotItems.push({ slot: 'shoes', item: selectedShoes, fit: 'regular' });
      slots.shoes = selectedShoes.imageDataUrl;
      slotItemIds.shoes = selectedShoes.id;
      slotFits.shoes = 'regular';
    }

    return {
      slotItems,
      slots,
      slotItemIds,
      slotFits,
      slotCount: slotItems.length,
    };
  }, [selectedTop, selectedBottom, selectedShoes]);

  const persistResultToCache = useCallback(async (
    renderHash: string,
    resultImage: string,
    model: string,
    slotSignature: Record<string, string>,
    quality: 'pro',
  ) => {
    if (!user?.id) return;

    try {
      const stored = await saveRenderImageToStorage(resultImage, user.id, renderHash);
      imageByHashRef.current.set(renderHash, stored.imageUrl);
      await upsertTryOnCacheEntry({
        renderHash,
        storagePath: stored.storagePath,
        sourceSurface: 'mirror',
        quality,
        preset: generationPreset,
        view: generationView,
        keepPose,
        useFaceRefs,
        slotSignature,
        faceRefsSignature,
        model,
      });
    } catch (error) {
      console.error('Failed to persist mirror cache:', error);
    }
  }, [faceRefsSignature, user?.id]);

  useEffect(() => {
    const profile = loadTwinProfile(user?.id || null);
    if (profile) {
      setTwinProfile(profile);
    } else {
      console.error('[VirtualMirrorView] Error parsing profile');
    }
  }, []);

  useEffect(() => {
    if (!modals.showDigitalTwinSetup) {
      const profile = loadTwinProfile(user?.id || null);
      if (profile) {
        setTwinProfile(profile);
      } else {
        console.error('[VirtualMirrorView] Error parsing profile after modal close');
      }
    }
  }, [modals.showDigitalTwinSetup, user?.id]);

  useEffect(() => {
    if (!enableHybridTryOn) return;
    let cancelled = false;
    (async () => {
      try {
        const refs = await getFaceReferences();
        if (cancelled) return;
        const signature = refs.map((ref) => `${ref.id}:${ref.updated_at}`).join('|');
        setFaceRefsSignature(signature || null);
      } catch {
        if (!cancelled) setFaceRefsSignature(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enableHybridTryOn, user?.id]);

  useEffect(() => {
    const state = location.state as { selectedItemId?: string } | null;
    if (!state?.selectedItemId) return;
    const item = closet.find((candidate) => candidate.id === state.selectedItemId);
    if (!item) return;

    const category = normalizeCategory(item.metadata.category, item.metadata.subcategory);
    if (category === 'top') {
      const idx = categorizedItems.top.findIndex((current) => current.id === item.id);
      if (idx >= 0) setTopIndex(idx);
    }
    if (category === 'bottom') {
      const idx = categorizedItems.bottom.findIndex((current) => current.id === item.id);
      if (idx >= 0) setBottomIndex(idx);
    }
    if (category === 'shoes') {
      const idx = categorizedItems.shoes.findIndex((current) => current.id === item.id);
      if (idx >= 0) setShoesIndex(idx);
    }
  }, [location.state, closet, categorizedItems]);

  useEffect(() => {
    if (topIndex >= categorizedItems.top.length && categorizedItems.top.length > 0) setTopIndex(0);
    if (bottomIndex >= categorizedItems.bottom.length && categorizedItems.bottom.length > 0) setBottomIndex(0);
    if (shoesIndex >= categorizedItems.shoes.length && categorizedItems.shoes.length > 0) setShoesIndex(0);
  }, [categorizedItems, topIndex, bottomIndex, shoesIndex]);

  useEffect(() => {
    if (!enableHybridTryOn) {
      setDesiredRenderHash(null);
      setRenderState('idle');
      return;
    }

    const userImage = twinProfile?.sourceImages?.[0];
    if (!user?.id || !userImage || generationData.slotCount === 0) {
      setDesiredRenderHash(null);
      setRenderState('idle');
      setHdImageUrl(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const renderHash = await buildTryOnRenderHash({
          version: 1,
          surface: 'mirror',
          userFingerprint: user.id,
          slotItemIds: generationData.slotItemIds,
          preset: generationPreset,
          customScene: '',
          quality: generationQuality,
          view: generationView,
          keepPose,
          useFaceRefs,
          slotFits: generationData.slotFits,
          faceRefsSignature,
        });

        if (cancelled) return;
        setDesiredRenderHash(renderHash);

        const existing = imageByHashRef.current.get(renderHash);
        if (existing) {
          setHdImageUrl(existing);
          setRenderState('completed');
        } else {
          setHdImageUrl(null);
          setRenderState('checking-cache');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to build mirror render hash:', error);
        setDesiredRenderHash(null);
        setRenderState('idle');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enableHybridTryOn,
    faceRefsSignature,
    generationData.slotCount,
    generationData.slotFits,
    generationData.slotItemIds,
    generationQuality,
    twinProfile?.sourceImages,
    user?.id,
  ]);

  useEffect(() => {
    if (!enableHybridTryOn || !desiredRenderHash || !user?.id || generationData.slotCount === 0) return;
    if (imageByHashRef.current.get(desiredRenderHash)) return;

    let cancelled = false;
    setRenderState('checking-cache');

    (async () => {
      const metricsBase = {
        surface: 'mirror' as const,
        quality: generationQuality,
        preset: generationPreset,
        slot_count: generationData.slotCount,
      };

      try {
        const cached = await getCachedTryOnRender(desiredRenderHash);
        if (cancelled) return;

        if (cached) {
          imageByHashRef.current.set(desiredRenderHash, cached.image_url);
          setHdImageUrl(cached.image_url);
          setRenderState('cache-hit');
          analytics.trackTryOnCacheHit({
            ...metricsBase,
            model: cached.model,
          });
          void recordTryOnCacheHit(desiredRenderHash);
          return;
        }

        setRenderState('cache-miss');
        analytics.trackTryOnCacheMiss(metricsBase);
      } catch (error) {
        if (cancelled) return;
        console.error('Mirror cache lookup failed:', error);
        setRenderState('cache-miss');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [desiredRenderHash, enableHybridTryOn, generationData.slotCount, generationQuality, user?.id]);

  useEffect(() => {
    if (!enableHybridTryOn || !desiredRenderHash || renderState !== 'cache-miss') return;
    if (!twinProfile?.sourceImages?.[0] || generationData.slotCount === 0) return;
    if (requestedHashesRef.current.has(desiredRenderHash)) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (requestedHashesRef.current.has(desiredRenderHash)) return;

      enqueue({
        userImage: twinProfile.sourceImages[0],
        slots: generationData.slots,
        slotItems: generationData.slotItems,
        slotFits: generationData.slotFits,
        preset: generationPreset,
        keepPose,
        useFaceRefs,
        faceRefsCount: 0,
        quality: generationQuality,
        view: generationView,
        renderHash: desiredRenderHash,
        surface: 'mirror',
        cachePolicyVersion: 1,
      });

      requestedHashesRef.current.add(desiredRenderHash);
      requestStartedAtRef.current.set(desiredRenderHash, Date.now());
      setRenderState('queued');
      analytics.trackTryOnHdRequested({
        surface: 'mirror',
        quality: generationQuality,
        preset: generationPreset,
        slot_count: generationData.slotCount,
      });
    }, 900);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    desiredRenderHash,
    enableHybridTryOn,
    enqueue,
    generationData.slotCount,
    generationData.slotFits,
    generationData.slotItems,
    generationData.slots,
    generationQuality,
    renderState,
    twinProfile?.sourceImages,
  ]);

  useEffect(() => {
    if (!enableHybridTryOn || !activeRequest || activeRequest.type !== 'studio') return;
    const payload = activeRequest.payload as any;
    if (payload?.surface !== 'mirror') return;
    if (payload?.renderHash && payload.renderHash === desiredRenderHash) {
      setRenderState('processing');
    }
  }, [activeRequest, desiredRenderHash, enableHybridTryOn]);

  useEffect(() => {
    if (!enableHybridTryOn || results.length === 0) return;

    for (const result of results) {
      if (processedResultIdsRef.current.has(result.id)) continue;
      const resultPayload = result.payload as any;
      if (resultPayload?.surface !== 'mirror') {
        continue;
      }

      if (result.status === 'failed') {
        processedResultIdsRef.current.add(result.id);
        clearResult(result.id);
        toast.error('No pudimos generar el look HD. Probá otra vez o revisá tus créditos.');
        if (resultPayload?.renderHash) {
          requestedHashesRef.current.delete(resultPayload.renderHash);
        }
        setRenderState('cache-miss');
        continue;
      }

      if (result.type !== 'studio' || result.status !== 'completed' || !result.result) continue;
      const payload = resultPayload;
      if (!payload?.renderHash) {
        processedResultIdsRef.current.add(result.id);
        clearResult(result.id);
        continue;
      }
      processedResultIdsRef.current.add(result.id);
      clearResult(result.id);

      const renderHash = payload.renderHash as string;
      const model = result.result.model || 'gemini-3.1-flash-image-preview';
      const slotSignature = (payload.slotItems || []).reduce((acc: Record<string, string>, current: any) => {
        if (current?.slot && current?.item?.id) {
          acc[current.slot] = current.item.id;
        }
        return acc;
      }, {});

      const startedAt = requestStartedAtRef.current.get(renderHash) || result.startedAt || result.createdAt;
      const latency = Math.max(0, (result.completedAt || Date.now()) - startedAt);
      const quality: 'pro' = 'pro';
      const slotCount = Array.isArray(payload?.slotItems) ? payload.slotItems.length : generationData.slotCount;

      if (renderHash !== desiredRenderHash) {
        analytics.trackTryOnStaleResultDiscarded({
          surface: 'mirror',
          quality,
          preset: payload?.preset || generationPreset,
          slot_count: slotCount,
          latency_ms: latency,
          model,
        });
        void persistResultToCache(renderHash, result.result.image, model, slotSignature, quality);
        continue;
      }

      imageByHashRef.current.set(renderHash, result.result.image);
      setHdImageUrl(result.result.image);
      setRenderState('completed');

      analytics.trackTryOnHdCompleted({
        surface: 'mirror',
        quality,
        preset: payload?.preset || generationPreset,
        slot_count: slotCount,
        latency_ms: latency,
        model,
      });

      void persistResultToCache(renderHash, result.result.image, model, slotSignature, quality);
    }
  }, [clearResult, desiredRenderHash, enableHybridTryOn, generationData.slotCount, persistResultToCache, results]);

  const handleCreateTwin = () => {
    onOpenDigitalTwinSetup();
  };

  const handleApplyLook = () => {
    if (!hasItems) {
      toast.error('Seleccioná al menos una prenda para aplicar el look.');
      return;
    }

    const preselectedItemIds = [selectedTop?.id, selectedBottom?.id, selectedShoes?.id].filter(Boolean) as string[];
    navigate(ROUTES.STUDIO, {
      state: {
        tab: 'virtual',
        preselectedItemIds,
        fromMirror: true,
        useVirtualModel: true,
      },
    });
    toast.success('Look enviado al Estudio para ajuste final.');
  };

  const hasValidImages = Boolean(twinProfile?.sourceImages?.length && twinProfile.sourceImages[0]);

  const hdReady = renderState === 'cache-hit' || renderState === 'completed';
  const renderStateMeta = {
    idle: {
      label: 'Vista rápida',
      detail: 'Vista rápida instantánea (sin IA).',
      tone: 'bg-amber-200/75 text-amber-900 border-amber-300/80',
      icon: 'image',
    },
    'checking-cache': {
      label: 'Buscando cache',
      detail: 'Buscando render previo.',
      tone: 'bg-sky-200/70 text-sky-900 border-sky-300/80',
      icon: 'search',
    },
    'cache-hit': {
      label: 'HD listo (cache)',
      detail: 'Render reutilizado desde historial.',
      tone: 'bg-emerald-200/75 text-emerald-900 border-emerald-300/80',
      icon: 'auto_awesome',
    },
    'cache-miss': {
      label: 'Sin cache',
      detail: 'Sin coincidencia, se encolará render.',
      tone: 'bg-rose-200/75 text-rose-900 border-rose-300/80',
      icon: 'history',
    },
    queued: {
      label: 'Render en cola',
      detail: 'Tu look se encoló para render HD.',
      tone: 'bg-violet-200/70 text-violet-900 border-violet-300/80',
      icon: 'schedule',
    },
    processing: {
      label: 'Render en progreso',
      detail: 'Generando imagen HD realista.',
      tone: 'bg-blue-200/70 text-blue-900 border-blue-300/80',
      icon: 'progress_activity',
    },
    completed: {
      label: 'Render HD listo',
      detail: 'Imagen final generada.',
      tone: 'bg-emerald-200/75 text-emerald-900 border-emerald-300/80',
      icon: 'check_circle',
    },
  } as const;

  const stateMeta = renderStateMeta[renderState];

  const renderGarmentLayer = (item: ClothingItem | null, className: string, transitionDelay = 0) => {
    if (!item) return null;

    return (
      <motion.img
        key={item.id}
        src={item.imageDataUrl}
        alt={item.metadata.subcategory}
        initial={{ opacity: 0.25, x: -26, y: 6, scale: 1.02, rotate: -2 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: transitionDelay }}
        className={className}
      />
    );
  };

  if (!twinProfile || !hasValidImages) {
    return (
      <div className="relative flex min-h-screen h-full flex-col items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

        <div className="relative z-10 w-full max-w-lg p-8 text-center md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <span className="material-symbols-outlined text-5xl text-white">accessibility_new</span>
            </div>

            <h2 className="mb-4 text-4xl font-bold tracking-tight text-white">Espejo Virtual</h2>

            <p className="mb-8 leading-relaxed text-gray-300">
              Configura tu <strong className="font-medium text-white">Gemelo Digital</strong> para probarte cualquier prenda de tu armario.
            </p>

            <button
              onClick={handleCreateTwin}
              className="relative w-full overflow-hidden rounded-xl bg-white px-8 py-4 text-lg font-bold text-black shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add_circle</span>
                CREAR MI GEMELO
              </span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al Armario
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_#f8f4ec_0%,_#eef0f6_38%,_#e7eaef_100%)] dark:bg-gray-950">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
        <div className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/70 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate((location.state as { from?: string } | null)?.from || '/')}
                className="rounded-full bg-white/80 p-2 text-gray-700 shadow-sm transition-colors hover:bg-white dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>

              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white md:text-xl">Probador instantáneo</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                  Deslizá prendas por categoría y mezclá el look al instante.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="rounded-full bg-white/80 p-2 text-gray-500 transition-colors hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
                  title="Ver historial"
                >
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </button>
              )}
              <button
                onClick={handleCreateTwin}
                className="rounded-full bg-white/80 p-2 text-gray-500 transition-colors hover:text-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
                title="Configurar gemelo digital"
              >
                <span className="material-symbols-outlined text-[20px]">person_edit</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/70 md:p-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mx-auto aspect-[9/16] w-full max-w-[330px] overflow-hidden rounded-[2.2rem] border-8 border-black/85 bg-[#f3f1eb] shadow-2xl dark:border-white/20"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_49.4%,#343434_49.4%,#343434_50.6%,transparent_50.6%)] opacity-35" />

              {enableHybridTryOn && hdImageUrl ? (
                <img src={hdImageUrl} alt="Render HD" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  {twinProfile?.sourceImages?.[0] ? (
                    <img
                      src={twinProfile.sourceImages[0]}
                      alt="Base"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-gray-800/20 dark:bg-white/20" />
                      <div className="mt-2 h-40 w-28 rounded-[3rem] bg-gray-800/20 dark:bg-white/20" />
                      <div className="mt-2 h-20 w-20 rounded-3xl bg-gray-800/20 dark:bg-white/20" />
                    </div>
                  )}

                  {renderGarmentLayer(
                    selectedTop,
                    'absolute left-1/2 top-[22%] h-[30%] w-[58%] -translate-x-1/2 object-contain rounded-md shadow-[0_12px_24px_rgba(0,0,0,0.25)] border border-white/70 bg-white/15',
                    0
                  )}

                  {renderGarmentLayer(
                    selectedBottom,
                    'absolute left-1/2 top-[48%] h-[33%] w-[52%] -translate-x-1/2 object-contain rounded-md shadow-[0_12px_24px_rgba(0,0,0,0.2)] border border-white/70 bg-white/15',
                    0.08
                  )}

                  {renderGarmentLayer(
                    selectedShoes,
                    'absolute left-1/2 top-[79%] h-[14%] w-[50%] -translate-x-1/2 object-contain rounded-md shadow-[0_12px_24px_rgba(0,0,0,0.2)] border border-white/70 bg-white/15',
                    0.14
                  )}
                </>
              )}

              <div className={`absolute inset-x-3 bottom-3 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${stateMeta.tone}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">{stateMeta.icon}</span>
                  <span>{enableHybridTryOn ? stateMeta.label : 'Mix en tiempo real'}</span>
                </div>
              </div>
            </motion.div>

            {enableHybridTryOn && (
              <div className="mt-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-gray-700 dark:border-white/20 dark:bg-gray-900/80 dark:text-gray-100">
                <p className="font-semibold">{stateMeta.label}</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">{stateMeta.detail}</p>
                {hdReady && <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">Tip: este render puede editarse en Studio con ajuste fino.</p>}
              </div>
            )}

            {!hasItems && (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white/80 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                No detecté tops, bottoms o calzado en tu armario. Agregá prendas para usar el carrusel.
                <button
                  type="button"
                  onClick={() => navigate('/armario')}
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-900 underline decoration-2 underline-offset-2 dark:text-white"
                >
                  <span className="material-symbols-outlined text-sm">wardrobe</span>
                  Ir al armario
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-white/50 bg-white/70 p-4 shadow-xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/70 md:p-5">
            <CategoryLane category="top" items={categorizedItems.top} selectedIndex={topIndex} onSelect={setTopIndex} />
            <CategoryLane category="bottom" items={categorizedItems.bottom} selectedIndex={bottomIndex} onSelect={setBottomIndex} />
            <CategoryLane category="shoes" items={categorizedItems.shoes} selectedIndex={shoesIndex} onSelect={setShoesIndex} />

            <button
              type="button"
              onClick={handleApplyLook}
              disabled={!hasItems}
              className={`mt-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${hasItems
                ? 'bg-black text-white hover:scale-[1.01] dark:bg-white dark:text-black'
                : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
            >
              <span className="mr-2 inline-flex items-center gap-1 text-xs">
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </span>
              {hasItems ? 'Enviar look al Estudio' : 'Seleccioná prendas primero'}
            </button>
            <p className="px-1 text-xs text-gray-500 dark:text-gray-400">
              {hdReady
                ? 'Tenés HD listo para editar o guardar.'
                : 'Desde aquí podés ir al estudio con la selección actual y disparar el render final.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualMirrorView;
