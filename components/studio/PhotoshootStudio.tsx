import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type {
  ClothingItem,
  ClothingSlot,
  GenerationPreset,
  SlotSelection,
  StructuredOutfitSuggestion,
} from '../../types';
import { GENERATION_PRESETS, MAX_SLOTS_PER_GENERATION } from '../../types';
import { ROUTES } from '../../src/routes';
import Loader from '../Loader';
import ClothingCompatibilityWarning from './ClothingCompatibilityWarning';
import { GenerationLoader } from './GenerationLoader';
import { StudioHeader } from './StudioHeader';
import { StudioToolbar } from './StudioToolbar';
import { StudioTutorial, useStudioTutorial } from './StudioTutorial';
import { useStudioGeneration } from '../../contexts/AIGenerationContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { useConsentPreferences } from '../../hooks/useConsentPreferences';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { getFaceReferences, type FaceReference } from '../../src/services/faceReferenceService';
import * as analytics from '../../src/services/analyticsService';
import { saveGeneratedLook, canUserSaveLook } from '../../src/services/generatedLooksService';
import {
  DEFAULT_VIRTUAL_MODEL_IMAGE,
  DIGITAL_TWIN_SOURCE_IMAGE_KEY,
  DIGITAL_TWIN_STORAGE_KEY,
  FILTERS,
  QUICK_CATEGORIES,
  STUDIO_GENERATION_STATE_KEY,
  getValidSlotsForItem,
  hasMinimumCoverage,
  type GeneratedImageRecord,
  type PhotoshootStudioProps,
  type StudioGenerationPayload,
  type StudioLocationState,
} from './photoshootStudio.types';
import { useSlotManager } from './hooks/useSlotManager';
import { useQuickTryOn } from './hooks/useQuickTryOn';
import { useStudioCache } from './hooks/useStudioCache';
import { usePendingResults } from './hooks/usePendingResults';
import { useStudioUIState } from './hooks/useStudioUIState';
import { SelectedGarmentsTray } from './components/SelectedGarmentsTray';
import { StudioClosetGrid } from './components/StudioClosetGrid';
import { StudioResultViewer } from './components/StudioResultViewer';
import { StylistAssistantPanel } from './components/StylistAssistantPanel';
import { flushPendingStylistEvents, recordStylistEvent } from '../../src/services/stylistMemoryService';

const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_STANDARD } },
};

const parseTwinProfile = (rawProfile: string | null): { sourceImages: string[] } | null => {
  if (!rawProfile) return null;
  try {
    const parsed = JSON.parse(rawProfile) as { sourceImages?: unknown; sourceImage?: unknown };
    const sourceImages = Array.isArray(parsed.sourceImages)
      ? parsed.sourceImages.filter((value): value is string => typeof value === 'string')
      : [];
    const fallbackImage = typeof parsed.sourceImage === 'string' ? parsed.sourceImage : null;

    return {
      sourceImages: sourceImages.length > 0 ? sourceImages : fallbackImage ? [fallbackImage] : [],
    };
  } catch {
    return null;
  }
};

const studioTheme = {
  '--studio-ink': '#1b1a17',
  '--studio-ink-muted': 'rgba(27, 26, 23, 0.6)',
  '--studio-paper': '#f8f3ee',
  '--studio-cream': '#f2ece4',
  '--studio-rose': '#f5a7a3',
  '--studio-mint': '#9ad4c0',
  '--studio-gold': '#f6c681',
  '--studio-shadow': 'rgba(17, 24, 39, 0.18)',
  '--studio-font-display': '"Playfair Display", serif',
  '--studio-font-body': '"Poppins", sans-serif',
} as React.CSSProperties;

export default function PhotoshootStudio({ closet }: PhotoshootStudioProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const studioLocationState = location.state as StudioLocationState;

  const mirroredEntryHandled = useRef(false);
  const sessionGenerationIds = useRef<Set<string>>(new Set());
  const studioRootRef = useRef<HTMLDivElement>(null);

  const {
    filterStatus,
    setFilterStatus,
    isMobile,
    showResultsHint,
    setShowResultsHint,
    customScene,
    setCustomScene,
    keepPose,
    setKeepPose,
    selectedImage,
    setSelectedImage,
    compareMode,
    setCompareMode,
    comparePosition,
    setComparePosition,
    activeSlotPicker,
    setActiveSlotPicker,
    activeFitPicker,
    setActiveFitPicker,
    showCompatibilityWarning,
    setShowCompatibilityWarning,
    shakeButton,
    triggerShake,
    isNewSessionResult,
    setIsNewSessionResult,
  } = useStudioUIState();

  const [presetId, setPresetId] = useState<GenerationPreset>('overlay');
  const [generationProvider] = useState<'google' | 'openai'>('google');
  const generationQuality: 'pro' = 'pro';
  const [generationFit, setGenerationFit] = useState<'tight' | 'regular' | 'oversized'>('regular');
  const [generationView, setGenerationView] = useState<'front' | 'back' | 'side'>('front');
  const [isSaving, setIsSaving] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
  const [userBaseImage, setUserBaseImage] = useState<string | null>(null);
  const [virtualModelImage, setVirtualModelImage] = useState<string | null>(null);
  const [useVirtualModel, setUseVirtualModel] = useState<boolean>(() => {
    if (typeof studioLocationState?.useVirtualModel === 'boolean') {
      return studioLocationState.useVirtualModel;
    }
    return !localStorage.getItem('studio-user-selfie');
  });
  const [autoSave, setAutoSave] = useState(false);
  const [uploadBaseRequestSignal, setUploadBaseRequestSignal] = useState(0);
  const [useFaceRefs, setUseFaceRefs] = useState(true);
  const [faceRefs, setFaceRefs] = useState<FaceReference[]>([]);

  const subscription = useSubscription();
  const { user } = useAuth();
  const consentPreferences = useConsentPreferences();
  const enableHybridTryOn = useFeatureFlag('enableHybridTryOn');
  const enableUnifiedStudioStylist = useFeatureFlag('enableUnifiedStudioStylist');
  const [showStylistAssistant, setShowStylistAssistant] = useState(false);
  const latestStylistContextRef = useRef<{ threadId?: string | null; prompt?: string | null }>({});

  const {
    enqueue: enqueueGeneration,
    results: pendingResults,
    isProcessing: isGenerating,
    activeRequest: activeGeneration,
    clearResult: clearPendingResult,
    lastFailure,
    cancel: cancelGeneration,
    retry: retryGeneration,
  } = useStudioGeneration();
  const hasPendingResults = pendingResults.length > 0;

  const safeCloset = closet || [];

  const {
    slotSelections,
    setSlotSelections,
    isItemSelected,
    addItemToSlot,
    updateSlotFit,
    removeFromSlot,
    handleItemClick,
    relevantSlots,
  } = useSlotManager({
    closet: safeCloset,
    maxSlotsPerGeneration: MAX_SLOTS_PER_GENERATION,
  });

  const {
    quickItems,
    isUploadingQuickItem,
    showQuickItemCategoryPicker,
    setShowQuickItemCategoryPicker,
    quickItemInputRef,
    backItemInputRef,
    setUploadingBackForItemId,
    handleQuickItemUpload,
    handleBackItemUpload,
    confirmQuickItemCategory,
    removeQuickItem,
  } = useQuickTryOn({ setSlotSelections });

  const { executeStudioCachePrecheck, persistStudioCacheEntry, buildStudioCacheInput } = useStudioCache({
    enableHybridTryOn,
    userId: user?.id,
    setGeneratedImages,
  });

  usePendingResults({
    hasPendingResults,
    pendingResults,
    clearPendingResult,
    activeGeneration,
    cancelGeneration,
    sessionGenerationIds,
    faceRefs,
    setGeneratedImages,
    setSelectedImage,
    setShowResultsHint,
    setIsNewSessionResult,
    persistStudioCacheEntry,
  });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isGenerating) {
      timeout = setTimeout(() => {
        toast.error('La generación está tardando más de lo esperado. Por favor recarga la página.');
      }, 60000);
    }
    return () => clearTimeout(timeout);
  }, [isGenerating]);

  useEffect(() => {
    if (lastFailure?.error) {
      toast.error(`No se pudo generar el look. ${lastFailure.error}`);
    }
  }, [lastFailure]);

  useEffect(() => {
    getFaceReferences()
      .then((refs) => setFaceRefs(refs))
      .catch(() => setFaceRefs([]));
  }, []);

  useEffect(() => {
    const savedSelfie = localStorage.getItem('studio-user-selfie');
    if (savedSelfie && !userBaseImage) {
      setUserBaseImage(savedSelfie);
    }
  }, [userBaseImage]);

  useEffect(() => {
    const profile = parseTwinProfile(localStorage.getItem(DIGITAL_TWIN_STORAGE_KEY));
    if (profile?.sourceImages?.[0]) {
      setVirtualModelImage(profile.sourceImages[0]);
      return;
    }

    const fallbackImage = localStorage.getItem(DIGITAL_TWIN_SOURCE_IMAGE_KEY);
    if (fallbackImage) {
      setVirtualModelImage(fallbackImage);
    }
  }, []);

  useEffect(() => {
    if (userBaseImage) {
      localStorage.setItem('studio-user-selfie', userBaseImage);
    }
  }, [userBaseImage]);

  useEffect(() => {
    const isDev = (() => {
      try {
        return !!(import.meta.env as any)?.DEV;
      } catch {
        return false;
      }
    })();

    if (!isDev) return;

    const raf = window.requestAnimationFrame(() => {
      const root = studioRootRef.current;
      if (!root) return;
      if (root.scrollWidth - root.clientWidth <= 1) return;

      const rootRect = root.getBoundingClientRect();
      const maxRight = rootRect.right;
      const minLeft = rootRect.left;
      const offenders: Array<{ node: string; right: number; width: number }> = [];

      const hasHorizontalClippingAncestor = (element: HTMLElement): boolean => {
        let current: HTMLElement | null = element.parentElement;
        while (current && current !== root) {
          const style = window.getComputedStyle(current);
          if (
            style.overflowX === 'hidden' ||
            style.overflowX === 'clip' ||
            style.overflowX === 'auto' ||
            style.overflowX === 'scroll'
          ) {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      };

      root.querySelectorAll<HTMLElement>('*').forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        if (
          element.classList.contains('material-symbols-outlined') ||
          element.classList.contains('material-symbols-rounded')
        ) {
          return;
        }
        if (hasHorizontalClippingAncestor(element)) return;

        if (rect.right - maxRight > 1 && rect.left < maxRight && rect.right > minLeft) {
          offenders.push({
            node: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ').join('.')}` : ''
              }`,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      });

      if (offenders.length > 0) {
        console.warn(`[studio][overflow-detected] ${JSON.stringify(offenders.slice(0, 8))}`);
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [filterStatus, slotSelections, generatedImages.length, isGenerating, showQuickItemCategoryPicker]);

  useEffect(() => {
    const state = location.state as StudioLocationState;
    if (!state) return;

    if (state.tab) {
      setFilterStatus(state.tab === 'virtual' ? 'virtual' : 'owned');
    }
    if (typeof state.useVirtualModel === 'boolean') {
      setUseVirtualModel(state.useVirtualModel);
    }

    if (state.preselectedItemIds && state.preselectedItemIds.length > 0 && safeCloset.length > 0) {
      const newSelections = new Map<ClothingSlot, SlotSelection>();

      for (const itemId of state.preselectedItemIds) {
        const item = safeCloset.find((closetItem) => closetItem.id === itemId);
        if (item) {
          const validSlots = getValidSlotsForItem(item);
          const availableSlot = validSlots.find((slot) => !newSelections.has(slot));
          if (availableSlot) {
            newSelections.set(availableSlot, { slot: availableSlot, itemId, item });
          }
        }
      }

      if (newSelections.size > 0) {
        setSlotSelections(newSelections);
        toast.success(`${newSelections.size} prendas cargadas del outfit`);
        if (state.fromMirror && !mirroredEntryHandled.current) {
          toast.success('Look recibido desde Espejo. Ajustá y genera el resultado final.');
          mirroredEntryHandled.current = true;
        }
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state, safeCloset, setFilterStatus, setSlotSelections]);

  useEffect(() => {
    if (!enableUnifiedStudioStylist) return;
    const query = new URLSearchParams(location.search);
    const shouldOpen = query.get('assistant') === 'stylist';
    if (!shouldOpen) return;
    setShowStylistAssistant(true);

    if (query.get('entry') === 'legacy_route') {
      toast.success('Estilista IA ahora vive dentro de Studio');
    }
  }, [enableUnifiedStudioStylist, location.search]);

  useEffect(() => {
    if (!enableUnifiedStudioStylist) return;
    void flushPendingStylistEvents();
  }, [enableUnifiedStudioStylist]);

  useEffect(() => {
    const savedState = localStorage.getItem(STUDIO_GENERATION_STATE_KEY);
    if (!savedState || safeCloset.length === 0) return;

    try {
      const backup = JSON.parse(savedState);
      if (Date.now() - backup.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem(STUDIO_GENERATION_STATE_KEY);
        return;
      }

      const newSelections = new Map<ClothingSlot, SlotSelection>();
      for (const { slot, itemId } of backup.slotSelections) {
        const item = safeCloset.find((closetItem) => closetItem.id === itemId);
        if (item) {
          newSelections.set(slot as ClothingSlot, { slot: slot as ClothingSlot, itemId, item });
        }
      }

      if (newSelections.size > 0) {
        setSlotSelections(newSelections);
        setPresetId(backup.presetId || 'overlay');
        setAutoSave(backup.autoSave || false);
        toast('Se restauró tu selección anterior', { icon: '🔄', duration: 3000 });
      }

      localStorage.removeItem(STUDIO_GENERATION_STATE_KEY);
    } catch (error) {
      console.error('Error recovering state:', error);
      localStorage.removeItem(STUDIO_GENERATION_STATE_KEY);
    }
  }, [safeCloset, setSlotSelections]);

  useEffect(() => {
    if (isGenerating && activeGeneration) {
      toast('Generación en progreso...', { icon: '⏳', duration: 2000 });
    }
  }, []);

  const allItems = useMemo(() => [...quickItems, ...safeCloset], [quickItems, safeCloset]);

  const filteredCloset = useMemo(() => {
    return allItems.filter((item) => {
      const status = item.status || 'owned';
      if (status === 'quick') return true;
      if (filterStatus === 'owned') return status === 'owned';
      if (filterStatus === 'virtual') return status === 'virtual' || status === 'wishlist';
      return true;
    });
  }, [allItems, filterStatus]);

  const slotCount = slotSelections.size;
  const hasCoverage = hasMinimumCoverage(slotSelections);
  const activeBaseImage = useVirtualModel ? virtualModelImage || DEFAULT_VIRTUAL_MODEL_IMAGE : userBaseImage;
  const hasSelfie = Boolean(activeBaseImage);
  const creditsNeeded = 4;
  const hasCredits =
    subscription.aiGenerationsLimit === -1 ||
    subscription.aiGenerationsUsed + creditsNeeded <= subscription.aiGenerationsLimit;
  const canGenerate = hasCoverage && hasSelfie && slotCount <= MAX_SLOTS_PER_GENERATION && hasCredits;
  const relevantSlotCount = relevantSlots.length;

  const helperText = useMemo(() => {
    if (slotCount === 0) return 'Seleccioná al menos 1 prenda para probar.';
    if (slotCount > MAX_SLOTS_PER_GENERATION) return `Máximo ${MAX_SLOTS_PER_GENERATION} prendas.`;
    if (!hasSelfie) return 'Subí una foto o activá el cuerpo virtual para generar.';
    if (!hasCredits) return `Necesitás ${creditsNeeded} crédito${creditsNeeded > 1 ? 's' : ''} para generar.`;
    return 'Listo para generar tu look.';
  }, [slotCount, hasSelfie, hasCredits, creditsNeeded]);

  const hasBottomOrShoes = slotSelections.has('bottom') || slotSelections.has('shoes');
  const needsCompatibilityCheck = presetId === 'overlay' && hasBottomOrShoes;

  const handleRequestBaseUpload = useCallback(() => {
    if (useVirtualModel) {
      setUseVirtualModel(false);
    }
    setUploadBaseRequestSignal((prev) => prev + 1);
  }, [useVirtualModel]);

  const handleStudioItemClick = useCallback(
    (item: ClothingItem) => {
      setActiveSlotPicker(null);
      handleItemClick(item, setActiveSlotPicker);
    },
    [handleItemClick, setActiveSlotPicker],
  );

  const handleRequestBackUpload = useCallback(
    (item: ClothingItem) => {
      if (item.backImageDataUrl) {
        toast('Vista trasera disponible', { icon: '🔄' });
        return;
      }

      setUploadingBackForItemId(item.id);
      backItemInputRef.current?.click();
    },
    [setUploadingBackForItemId, backItemInputRef],
  );

  const validateGenerationReadiness = useCallback(() => {
    if (!canGenerate) {
      return { isValid: false, message: helperText };
    }
    if (!activeBaseImage) {
      return {
        isValid: false,
        message: 'No hay una imagen base para generar. Cargá una selfie o activá el cuerpo virtual.',
      };
    }
    return { isValid: true, message: '' };
  }, [canGenerate, helperText, activeBaseImage]);

  const buildGenerationPayload = useCallback((): StudioGenerationPayload => {
    const stateBackup = {
      slotSelections: Array.from(slotSelections.entries()).map(([slot, selection]) => ({
        slot,
        itemId: selection.itemId,
      })),
      presetId,
      autoSave,
      timestamp: Date.now(),
    };
    localStorage.setItem(STUDIO_GENERATION_STATE_KEY, JSON.stringify(stateBackup));

    const slots: Record<string, string> = {};
    const slotFits: Record<string, 'tight' | 'regular' | 'oversized'> = {};

    for (const [slot, selection] of slotSelections) {
      const useBackImage =
        (generationView === 'back' || generationView === 'side') && selection.item.backImageDataUrl;
      slots[slot] = useBackImage ? selection.item.backImageDataUrl! : selection.item.imageDataUrl;
      slotFits[slot] = selection.fit || 'regular';
    }

    const slotItems = Array.from(slotSelections.entries()).map(([slot, selection]) => ({
      slot,
      item: selection.item,
      fit: selection.fit || 'regular',
    }));

    const slotItemIds = Array.from(slotSelections.entries()).reduce((acc, [slot, selection]) => {
      acc[slot] = selection.item.id;
      return acc;
    }, {} as Record<string, string>);

    return {
      activeBaseImage: activeBaseImage!,
      slots,
      slotItems,
      slotFits,
      slotItemIds,
    };
  }, [slotSelections, presetId, autoSave, generationView, activeBaseImage]);

  const executeCachePrecheck = useCallback(
    async (payload: StudioGenerationPayload): Promise<{ cacheHit: boolean; renderHash?: string }> => {
      const cacheInput = buildStudioCacheInput(payload, {
        faceRefs,
        presetId,
        customScene,
        generationQuality,
        generationView,
        keepPose,
        useFaceRefs,
      });

      return executeStudioCachePrecheck(cacheInput);
    },
    [
      buildStudioCacheInput,
      faceRefs,
      presetId,
      customScene,
      generationQuality,
      generationView,
      keepPose,
      useFaceRefs,
      executeStudioCachePrecheck,
    ],
  );

  const enqueueStudioGenerationRequest = useCallback(
    (payload: StudioGenerationPayload, renderHash?: string) => {
      const genId = enqueueGeneration({
        userImage: payload.activeBaseImage,
        slots: payload.slots,
        slotItems: payload.slotItems,
        slotFits: payload.slotFits,
        preset: presetId,
        customScene: presetId === 'custom' ? customScene : undefined,
        keepPose,
        useFaceRefs,
        faceRefsCount: faceRefs.length,
        provider: generationProvider,
        quality: generationQuality,
        view: generationView,
        renderHash,
        surface: 'studio',
        cachePolicyVersion: 1,
      });

      if (genId) {
        sessionGenerationIds.current.add(genId);
      }

      if (enableHybridTryOn && renderHash) {
        analytics.trackTryOnHdRequested({
          surface: 'studio',
          quality: generationQuality,
          preset: presetId,
          slot_count: payload.slotItems.length,
        });
      }

      toast('Generando look...', { icon: '✨', duration: 2000 });
      localStorage.removeItem(STUDIO_GENERATION_STATE_KEY);
    },
    [
      enqueueGeneration,
      presetId,
      customScene,
      keepPose,
      useFaceRefs,
      faceRefs.length,
      generationProvider,
      generationQuality,
      generationView,
      enableHybridTryOn,
    ],
  );

  const handleGenerateNow = useCallback(async () => {
    setShowCompatibilityWarning(false);

    const readiness = validateGenerationReadiness();
    if (!readiness.isValid) {
      toast.error(readiness.message);
      return;
    }

    const payload = buildGenerationPayload();
    const cacheResult = await executeCachePrecheck(payload);
    if (cacheResult.cacheHit) {
      return;
    }

    enqueueStudioGenerationRequest(payload, cacheResult.renderHash);

    if (latestStylistContextRef.current.prompt || latestStylistContextRef.current.threadId) {
      void recordStylistEvent({
        action: 'generated',
        surface: 'studio',
        thread_id: latestStylistContextRef.current.threadId || null,
        prompt: latestStylistContextRef.current.prompt || null,
        suggestion_json: payload.slotItemIds as Record<string, any>,
      });
      analytics.trackEvent('stylist_tryon_generated', { surface: 'studio' });
    }
  }, [
    setShowCompatibilityWarning,
    validateGenerationReadiness,
    buildGenerationPayload,
    executeCachePrecheck,
    enqueueStudioGenerationRequest,
  ]);

  const handleApplyStylistSuggestion = useCallback(
    (
      suggestion: StructuredOutfitSuggestion,
      context: { threadId?: string | null; prompt?: string | null } = {},
    ) => {
      const entries: Array<[ClothingSlot, SlotSelection]> = [];
      const selectedIds = [suggestion.top_id, suggestion.bottom_id, suggestion.shoes_id].filter(Boolean);

      selectedIds.forEach((itemId) => {
        const item = safeCloset.find((closetItem) => closetItem.id === itemId);
        if (!item) return;

        const validSlots = getValidSlotsForItem(item);
        const availableSlot = validSlots.find((slot) => !entries.some(([existingSlot]) => existingSlot === slot));
        if (!availableSlot) return;

        entries.push([availableSlot, { slot: availableSlot, itemId, item }]);
      });

      if (entries.length === 0) {
        toast.error('No pude aplicar el look sugerido con las prendas actuales.');
        return;
      }

      setSlotSelections(new Map(entries));
      setShowStylistAssistant(false);
      latestStylistContextRef.current = {
        threadId: context.threadId || null,
        prompt: context.prompt || null,
      };

      toast.success(`Look aplicado (${entries.length} prendas)`);
      analytics.trackEvent('stylist_outfit_applied', { surface: 'studio' });
    },
    [safeCloset, setSlotSelections],
  );

  const handleGenerateWithWarningCheck = useCallback(() => {
    if (!canGenerate) {
      triggerShake();
      toast.error(helperText);
      return;
    }

    if (needsCompatibilityCheck) {
      setShowCompatibilityWarning(true);
      return;
    }

    void handleGenerateNow();
  }, [
    canGenerate,
    triggerShake,
    helperText,
    needsCompatibilityCheck,
    setShowCompatibilityWarning,
    handleGenerateNow,
  ]);

  const handleSaveLook = useCallback(async (image: GeneratedImageRecord) => {
    setIsSaving(true);
    try {
      const canSave = await canUserSaveLook();
      if (!canSave.allowed) {
        toast.error(canSave.reason || 'No podés guardar más looks en tu armario de looks');
        return;
      }

      if (!image.itemIds || Object.keys(image.itemIds).length === 0) {
        toast.error('No hay prendas seleccionadas para guardar');
        return;
      }

      await saveGeneratedLook(image.image, image.itemIds, {
        selfieUsed: Boolean(image.selfieUrl),
        selfieUrl: image.selfieUrl,
        preset: image.preset,
        model: image.model,
        keepPose: image.keepPose,
        faceRefsUsed: image.faceRefsUsed,
      });
      toast.success('Look guardado en tu armario');

      if (latestStylistContextRef.current.prompt || latestStylistContextRef.current.threadId) {
        void recordStylistEvent({
          action: 'saved',
          surface: 'studio',
          thread_id: latestStylistContextRef.current.threadId || null,
          prompt: latestStylistContextRef.current.prompt || null,
          suggestion_json: image.itemIds as Record<string, any>,
        });
        analytics.trackEvent('stylist_suggestion_saved', { surface: 'studio' });
      }
    } catch (error) {
      console.error('Error saving look:', error);
      toast.error('Error al guardar el look');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleOpenLatestResult = useCallback(() => {
    if (!generatedImages[0]) return;
    setSelectedImage(generatedImages[0]);
    setShowResultsHint(false);
  }, [generatedImages, setSelectedImage, setShowResultsHint]);

  const handleCloseSelectedImage = useCallback(() => {
    setSelectedImage(null);
    setCompareMode(false);
    setComparePosition(50);
    setIsNewSessionResult(false);
    if (isMobile && generatedImages.length > 0) {
      setShowResultsHint(true);
    }
  }, [
    setSelectedImage,
    setCompareMode,
    setComparePosition,
    setIsNewSessionResult,
    isMobile,
    generatedImages.length,
    setShowResultsHint,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (canGenerate && !isGenerating) {
          void handleGenerateNow();
        } else if (!canGenerate && !isGenerating) {
          triggerShake();
          toast.error(helperText, { id: 'shortcut-error' });
        }
      }

      if (event.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        } else if (activeSlotPicker) {
          setActiveSlotPicker(null);
        } else if (activeFitPicker) {
          setActiveFitPicker(null);
        } else if (isGenerating && activeGeneration) {
          cancelGeneration(activeGeneration.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isGenerating,
    canGenerate,
    selectedImage,
    activeSlotPicker,
    activeFitPicker,
    activeGeneration,
    helperText,
    triggerShake,
    handleGenerateNow,
    cancelGeneration,
    setSelectedImage,
    setActiveSlotPicker,
    setActiveFitPicker,
  ]);

  const { showTutorial, completeTutorial, skipTutorial, resetTutorial } = useStudioTutorial();
  const shouldShowTutorial = showTutorial && Boolean(consentPreferences);

  return (
    <div
      ref={studioRootRef}
      data-testid="studio-root"
      data-relevant-slots={relevantSlotCount}
      className="relative min-h-screen w-full min-w-0-safe max-w-full-safe overflow-x-hidden contain-overflow-x text-[color:var(--studio-ink)]"
      style={{ ...studioTheme, fontFamily: 'var(--studio-font-body)' }}
    >
      {shouldShowTutorial && <StudioTutorial onComplete={completeTutorial} onSkip={skipTutorial} />}

      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 15% 10%, rgba(245, 167, 163, 0.35), transparent 45%), radial-gradient(circle at 85% 0%, rgba(154, 212, 192, 0.35), transparent 40%), linear-gradient(180deg, #f8f3ee 0%, #f0e7dd 50%, #f6f1ea 100%)',
        }}
      />

      <div className="flex min-h-screen min-w-0">
        <div className="flex-1 min-w-0 flex flex-col lg:pr-96">
          <StudioHeader
            generatedImagesCount={generatedImages.length}
            onOpenLatestResult={handleOpenLatestResult}
            showResultsHint={showResultsHint}
            onShowHelp={resetTutorial}
          />

          <motion.main
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full min-w-0-safe overflow-x-hidden contain-overflow-x px-3 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            {!activeBaseImage && (
              <motion.section variants={itemVariants} className="mb-1">
                <div
                  data-testid="studio-base-preview"
                  className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-sm flex flex-col items-center justify-center text-center"
                >
                  <span className="material-symbols-outlined text-[40px] text-[color:var(--studio-ink-muted)] mb-2">
                    add_a_photo
                  </span>
                  <p className="px-4 text-xs font-medium text-[color:var(--studio-ink-muted)] mb-3">
                    Subí tu selfie para empezar a crear el look.
                  </p>
                  <button
                    onClick={handleRequestBaseUpload}
                    className="rounded-full bg-[color:var(--studio-ink)] px-5 py-2.5 text-xs font-semibold text-white shadow-md active:scale-95 transition-transform"
                  >
                    Cargar selfie
                  </button>
                </div>
              </motion.section>
            )}

            <StudioToolbar
              userBaseImage={userBaseImage}
              setUserBaseImage={setUserBaseImage}
              uploadBaseRequestSignal={uploadBaseRequestSignal}
              virtualModelImage={virtualModelImage || DEFAULT_VIRTUAL_MODEL_IMAGE}
              useVirtualModel={useVirtualModel}
              setUseVirtualModel={setUseVirtualModel}
              presetId={presetId}
              setPresetId={setPresetId}
              customScene={customScene}
              setCustomScene={setCustomScene}
              keepPose={keepPose}
              setKeepPose={setKeepPose}
              useFaceRefs={useFaceRefs}
              setUseFaceRefs={setUseFaceRefs}
              faceRefs={faceRefs}
              slotCount={slotCount}
              hasCoverage={hasCoverage}
              onClearSelections={() => setSlotSelections(new Map())}
              isPremium={subscription.isPremium}
              generationFit={generationFit}
              setGenerationFit={setGenerationFit}
              generationView={generationView}
              setGenerationView={setGenerationView}
            />

            {enableUnifiedStudioStylist && (
              <motion.section variants={itemVariants} className="mb-2 px-1">
                <div className="mb-2 flex items-center justify-between">
                  <button
                    onClick={() => setShowStylistAssistant((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[color:var(--studio-ink)] shadow-sm transition hover:bg-white"
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    Estilista IA
                    <span className="material-symbols-outlined text-sm">
                      {showStylistAssistant ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  <span className="text-[11px] font-medium text-[color:var(--studio-ink-muted)]">
                    Copiloto para armar look
                  </span>
                </div>

                <StylistAssistantPanel
                  isOpen={showStylistAssistant}
                  closet={safeCloset}
                  onClose={() => setShowStylistAssistant(false)}
                  onApplySuggestion={handleApplyStylistSuggestion}
                />
              </motion.section>
            )}

            <motion.section variants={itemVariants} className="mb-2 px-1">
              <div className="flex p-1 bg-white/40 backdrop-blur-md border border-[color:var(--studio-ink)]/5 rounded-full shadow-inner overflow-x-auto no-scrollbar max-w-full">
                {FILTERS.map((filter) => {
                  const isActive = filterStatus === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        setFilterStatus(filter.id);
                      }}
                      className="relative shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors focus:outline-none"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeFilter"
                          className="absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(33,37,41,0.08)] border border-white/80"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors duration-300 ${isActive
                          ? 'text-[color:var(--studio-ink)]'
                          : 'text-[color:var(--studio-ink-muted)] hover:text-[color:var(--studio-ink)]'
                          }`}
                      >
                        {filter.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* Mobile inline diffusion loader — only visible on mobile when generating */}
            <AnimatePresence>
              {isGenerating && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="mb-3 overflow-hidden lg:hidden"
                >
                  <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: '200px' }}>
                    <GenerationLoader userImage={activeBaseImage} />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center z-40">
                      {activeGeneration && (
                        <button
                          onClick={() => cancelGeneration(activeGeneration.id)}
                          className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-700 shadow-lg border border-white/50 hover:bg-white transition-all active:scale-95"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <SelectedGarmentsTray
              slotSelections={slotSelections}
              activeFitPicker={activeFitPicker}
              setActiveFitPicker={setActiveFitPicker}
              onUpdateSlotFit={updateSlotFit}
              onRequestBackUpload={handleRequestBackUpload}
              onRemoveFromSlot={removeFromSlot}
            />

            <StudioClosetGrid
              itemVariants={itemVariants}
              filteredCloset={filteredCloset}
              slotSelections={slotSelections}
              activeSlotPicker={activeSlotPicker}
              setActiveSlotPicker={setActiveSlotPicker}
              isItemSelected={isItemSelected}
              isUploadingQuickItem={isUploadingQuickItem}
              quickItemInputRef={quickItemInputRef}
              onQuickItemUpload={handleQuickItemUpload}
              onItemClick={handleStudioItemClick}
              onAddItemToSlot={addItemToSlot}
              onRemoveQuickItem={removeQuickItem}
            />

            <motion.section
              variants={itemVariants}
              data-testid="studio-generate-bar"
              className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 w-full flex justify-center pointer-events-none px-4"
            >
              <div className="rounded-full bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 pointer-events-auto w-full sm:w-auto min-w-[min(100%,320px)] flex flex-col transition-all">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {isGenerating && activeGeneration && (
                    <button
                      onClick={() => cancelGeneration(activeGeneration.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-[color:var(--studio-ink)] bg-white/80 border border-[color:var(--studio-ink-muted)]/30 shadow-sm hover:bg-gray-50 transition"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={handleGenerateWithWarningCheck}
                    disabled={isGenerating && !canGenerate}
                    className={`flex-1 sm:flex-none px-6 py-3 rounded-full font-bold text-[14px] text-white flex items-center justify-center gap-2 transition-all relative overflow-hidden group border-0 ${isGenerating
                      ? 'shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-[0.98]'
                      : canGenerate
                        ? 'bg-[color:var(--studio-ink)] hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(33,37,41,0.3)]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } ${shakeButton ? 'animate-shake ring-2 ring-red-500 shadow-red-500/50' : ''}`}
                    style={canGenerate && !isGenerating ? {
                      backgroundImage: 'linear-gradient(110deg, var(--studio-ink) 0%, var(--studio-ink) 40%, rgba(245,167,163,0.3) 50%, var(--studio-ink) 60%, var(--studio-ink) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-btn 3s ease-in-out infinite',
                    } : undefined}
                  >
                    {isGenerating && (
                      <div className="absolute inset-0 bg-[length:200%_200%] animate-gradient-xy bg-gradient-to-r from-purple-500 via-pink-500 to-[color:var(--studio-rose)]" />
                    )}

                    {canGenerate && !isGenerating && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none" />
                    )}

                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isGenerating ? (
                        <>
                          <Loader size="small" /> <span className="animate-pulse">La IA está cosiendo...</span>
                        </>
                      ) : (
                        <>
                          <span className={`material-symbols-outlined text-[18px] ${canGenerate ? 'animate-pulse' : ''}`}>
                            magic_button
                          </span>
                          Generar
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {lastFailure && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center justify-between gap-3">
                    <span className="truncate">Error: {lastFailure.error || 'No se pudo generar el look.'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => retryGeneration(lastFailure.id)}
                        className="px-2 py-1 rounded-lg bg-white text-red-700 font-semibold border border-red-200 hover:bg-red-100 transition"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => clearPendingResult(lastFailure.id)}
                        className="px-2 py-1 rounded-lg text-red-500 hover:text-red-700 transition"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.main>
        </div>

        <StudioResultViewer
          isGenerating={isGenerating}
          activeBaseImage={activeBaseImage}
          generatedImages={generatedImages}
          onSelectImage={setSelectedImage}
          onGenerateNow={() => {
            void handleGenerateNow();
          }}
          canGenerate={canGenerate}
          isSaving={isSaving}
          onSaveLook={(image) => {
            void handleSaveLook(image);
          }}
          onOpenSavedLooks={() => navigate(ROUTES.SAVED_LOOKS)}
        />
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleCloseSelectedImage}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[min(95vw,32rem)] max-h-[85vh] flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={handleCloseSelectedImage}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="rounded-2xl overflow-hidden bg-black relative">
                {compareMode && selectedImage.selfieUrl ? (
                  <div
                    className="relative w-full aspect-[3/4] select-none"
                    onMouseMove={(event) => {
                      if (event.buttons === 1) {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = ((event.clientX - rect.left) / rect.width) * 100;
                        setComparePosition(Math.max(0, Math.min(100, x)));
                      }
                    }}
                    onTouchMove={(event) => {
                      const touch = event.touches[0];
                      const rect = event.currentTarget.getBoundingClientRect();
                      const x = ((touch.clientX - rect.left) / rect.width) * 100;
                      setComparePosition(Math.max(0, Math.min(100, x)));
                    }}
                  >
                    <img
                      src={selectedImage.selfieUrl}
                      alt="Antes"
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                    >
                      <img
                        src={selectedImage.image}
                        alt="Después"
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                      style={{ left: `${comparePosition}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-700 text-sm">drag_handle</span>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                      Antes
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                      Después
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={selectedImage.image}
                      alt="Look generado"
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />

                    {isNewSessionResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-2xl border border-white/20 flex items-center gap-2 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                        ¡Tu nuevo look está listo!
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white">
                  Nano 3.1
                </span>
                <span className="px-2 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                  {GENERATION_PRESETS.find((preset) => preset.id === selectedImage.preset)?.label ||
                    selectedImage.preset}
                </span>
                {selectedImage.keepPose && (
                  <span className="px-2 py-1 rounded-full bg-blue-500/80 text-white text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">person_pin</span>
                    Pose fija
                  </span>
                )}
                {selectedImage.faceRefsUsed > 0 && (
                  <span className="px-2 py-1 rounded-full bg-green-500/80 text-white text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">face</span>
                    {selectedImage.faceRefsUsed} ref
                  </span>
                )}
                {selectedImage.customScene && (
                  <span className="px-2 py-1 rounded-full bg-orange-500/80 text-white text-xs font-semibold max-w-[150px] truncate">
                    "{selectedImage.customScene}"
                  </span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    handleCloseSelectedImage();
                    setTimeout(() => {
                      void handleGenerateNow();
                    }, 150);
                  }}
                  disabled={isGenerating || !canGenerate}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                  title="Generar otra versión con la misma configuración"
                >
                  <span className="material-symbols-outlined text-lg">autorenew</span>
                </button>
                {selectedImage.selfieUrl && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${compareMode ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    <span className="material-symbols-outlined text-lg">compare</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    void handleSaveLook(selectedImage);
                    handleCloseSelectedImage();
                  }}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-white text-[color:var(--studio-ink)] font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <a
                  href={selectedImage.image}
                  download={`look-${Date.now()}.png`}
                  className="py-3 px-4 rounded-xl bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ClothingCompatibilityWarning
        hasBottomSelected={slotSelections.has('bottom')}
        hasShoesSelected={slotSelections.has('shoes')}
        isVisible={showCompatibilityWarning}
        onProceed={() => {
          void handleGenerateNow();
        }}
        onCancel={() => setShowCompatibilityWarning(false)}
      />

      <AnimatePresence>
        {showQuickItemCategoryPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowQuickItemCategoryPicker(null);
              if (showQuickItemCategoryPicker) {
                sessionStorage.removeItem(`quick-item-${showQuickItemCategoryPicker}`);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-1">¿Qué tipo de prenda es?</h3>
              <p className="text-sm text-gray-500 mb-4">
                Seleccioná la categoría para poder usarla en tu look
              </p>

              {showQuickItemCategoryPicker && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={sessionStorage.getItem(`quick-item-${showQuickItemCategoryPicker}`) || ''}
                    alt="Preview"
                    className="w-24 h-32 object-cover rounded-xl border-2 border-purple-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {QUICK_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => confirmQuickItemCategory(showQuickItemCategoryPicker!, category.id)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200
                               hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{category.label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (showQuickItemCategoryPicker) {
                    sessionStorage.removeItem(`quick-item-${showQuickItemCategoryPicker}`);
                  }
                  setShowQuickItemCategoryPicker(null);
                }}
                className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={backItemInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleBackItemUpload}
      />
    </div>
  );
}
