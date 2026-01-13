import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import type { ClothingItem, ClothingSlot, GenerationPreset, SlotSelection } from '../../types';
import { SLOT_CONFIGS, GENERATION_PRESETS, MAX_SLOTS_PER_GENERATION, CATEGORY_TO_SLOT } from '../../types';
import ClosetItemCard from '../closet/ClosetItemCard';
import { saveGeneratedLook, canUserSaveLook } from '../../src/services/generatedLooksService';
import toast from 'react-hot-toast';
import Loader from '../Loader';
import { validateImageDataUri } from '../../utils/imageValidation';
import { analyzeTryOnPhotoQuality } from '../../utils/photoQualityValidation';
import ClothingCompatibilityWarning from './ClothingCompatibilityWarning';
import { getFaceReferences, FaceReference } from '../../src/services/faceReferenceService';
import { useStudioGeneration } from '../../contexts/AIGenerationContext';
import { useSubscription } from '../../hooks/useSubscription';
import { StudioHeader } from './StudioHeader';
import { StudioToolbar } from './StudioToolbar';
import { GenerationLoader } from './GenerationLoader';

// Extended type for generation history with full metadata
interface GeneratedImageRecord {
  image: string;
  slots: string[];
  model: string;
  preset: GenerationPreset;
  keepPose: boolean;
  faceRefsUsed: number;
  customScene?: string;
  selfieUsed: string; // The selfie that was used
  timestamp: number;
}

interface PhotoshootStudioProps {
  closet: ClothingItem[];
}

type FilterStatus = 'all' | 'owned' | 'virtual';

type StudioLocationState = {
  tab?: 'owned' | 'virtual';
  selectedItemId?: string;
  preselectedItemIds?: string[];
} | null;

const FILTERS: Array<{ id: FilterStatus; label: string }> = [
  { id: 'all', label: 'Todo' },
  { id: 'owned', label: 'Mi armario' },
  { id: 'virtual', label: 'Prestadas' }
];

// Quick categories for items from screenshots
const QUICK_CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
  { id: 'top', label: 'Remera/Top', icon: '👕' },
  { id: 'bottom', label: 'Pantalón/Falda', icon: '👖' },
  { id: 'one_piece', label: 'Vestido/Enterito', icon: '👗' },
  { id: 'outerwear', label: 'Campera/Abrigo', icon: '🧥' },
  { id: 'shoes', label: 'Zapatos', icon: '👟' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
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
  '--studio-font-body': '"Poppins", sans-serif'
} as React.CSSProperties;

// Get the valid slot for an item based on its category
function getValidSlotsForItem(item: ClothingItem): ClothingSlot[] {
  const category = item.metadata?.category || 'top';
  return CATEGORY_TO_SLOT[category] || ['top_base'];
}

// Check if the current slot selection has minimum required coverage
function hasMinimumCoverage(slots: Map<ClothingSlot, SlotSelection>): boolean {
  // Relaxed: At least one item is enough
  return slots.size > 0;
}

export default function PhotoshootStudio({ closet }: PhotoshootStudioProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [slotSelections, setSlotSelections] = useState<Map<ClothingSlot, SlotSelection>>(new Map());
  const [presetId, setPresetId] = useState<GenerationPreset>('overlay');
  const [generationProvider] = useState<'google' | 'openai'>('google');
  const [generationQuality, setGenerationQuality] = useState<'flash' | 'pro'>('flash');
  const [generationFit, setGenerationFit] = useState<'tight' | 'regular' | 'oversized'>('regular');
  const [generationView, setGenerationView] = useState<'front' | 'back' | 'side'>('front');
  const [isSaving, setIsSaving] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);

  const subscription = useSubscription();

  // Use global generation context for persistence across navigation
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

  // Failsafe: Reset generation state if it gets stuck for too long (> 60s)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isGenerating) {
      timeout = setTimeout(() => {
        // We can't force reset isGenerating from here since it lives in context
        // But we can notify the user
        toast.error('La generación está tardando más de lo esperado. Por favor recarga la página.');
      }, 60000);
    }
    return () => clearTimeout(timeout);
  }, [isGenerating]);

  // Handle generation failures
  useEffect(() => {
    if (lastFailure) {
      toast.error(`Error: ${lastFailure.error || 'Falló la generación'}`);
      // Optional: Clear the failure from context if we had a method, 
      // but for now we just show the toast. 
      // Ideally we should auto-clear it so it doesn't show again on nav.
    }
  }, [lastFailure]);

  const [userBaseImage, setUserBaseImage] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showResultsHint, setShowResultsHint] = useState(false);
  const [customScene, setCustomScene] = useState('');
  const [keepPose, setKeepPose] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [activeSlotPicker, setActiveSlotPicker] = useState<string | null>(null);

  // Quick Try-On
  const [quickItems, setQuickItems] = useState<ClothingItem[]>([]);
  const [isUploadingQuickItem, setIsUploadingQuickItem] = useState(false);
  const [showQuickItemCategoryPicker, setShowQuickItemCategoryPicker] = useState<string | null>(null);
  const quickItemInputRef = useRef<HTMLInputElement>(null);

  const [useFaceRefs, setUseFaceRefs] = useState(true);
  const [faceRefs, setFaceRefs] = useState<FaceReference[]>([]);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load saved selfies logic moved to StudioToolbar
  // Base image upload logic moved to StudioToolbar

  // Fetch face references
  useEffect(() => {
    getFaceReferences().then(refs => {
      setFaceRefs(refs);
    }).catch(() => setFaceRefs([]));
  }, []);

  useEffect(() => {
    if (!subscription.isPremium && generationQuality === 'pro') {
      setGenerationQuality('flash');
    }
  }, [subscription.isPremium, generationQuality]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle location state for preselection
  useEffect(() => {
    const state = location.state as StudioLocationState;
    if (!state) return;

    if (state.tab) {
      setFilterStatus(state.tab === 'virtual' ? 'virtual' : 'owned');
    }

    // Pre-load items from preselectedItemIds (e.g., from outfit generation)
    if (state.preselectedItemIds && state.preselectedItemIds.length > 0 && closet.length > 0) {
      const newSelections = new Map<ClothingSlot, SlotSelection>();

      for (const itemId of state.preselectedItemIds) {
        const item = closet.find(i => i.id === itemId);
        if (item) {
          const validSlots = getValidSlotsForItem(item);
          // Find first slot that's not already taken
          const availableSlot = validSlots.find(s => !newSelections.has(s));
          if (availableSlot) {
            newSelections.set(availableSlot, { slot: availableSlot, itemId, item });
          }
        }
      }

      if (newSelections.size > 0) {
        setSlotSelections(newSelections);
        toast.success(`${newSelections.size} prendas cargadas del outfit`);
      }

      // Clear the state to prevent re-loading on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state, closet]);

  // Recover state from failed generation
  useEffect(() => {
    const savedState = localStorage.getItem('studio-generation-state');
    if (!savedState || closet.length === 0) return;

    try {
      const backup = JSON.parse(savedState);
      // Only recover if less than 10 minutes old
      if (Date.now() - backup.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem('studio-generation-state');
        return;
      }

      // Restore slot selections
      const newSelections = new Map<ClothingSlot, SlotSelection>();
      for (const { slot, itemId } of backup.slotSelections) {
        const item = closet.find(i => i.id === itemId);
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

      localStorage.removeItem('studio-generation-state');
    } catch (err) {
      console.error('Error recovering state:', err);
      localStorage.removeItem('studio-generation-state');
    }
  }, [closet]);

  // Load pending results from context when returning to studio
  useEffect(() => {
    if (!hasPendingResults || pendingResults.length === 0) return;

    // Convert pending results to local format and add to images
    const newImages: GeneratedImageRecord[] = pendingResults
      .filter(result => result.result) // Only completed results with data
      .map(result => ({
        image: result.result!.image,
        slots: result.result!.slotsUsed,
        model: result.result!.model,
        preset: result.payload.preset,
        keepPose: result.payload.keepPose,
        faceRefsUsed: result.result!.faceRefsUsed,
        customScene: result.payload.customScene,
        selfieUsed: result.payload.userImage,
        timestamp: result.completedAt || Date.now(),
      }));

    setGeneratedImages(prev => {
      // Avoid duplicates by checking timestamps
      const existingTimestamps = new Set(prev.map(p => p.timestamp));
      const uniqueNew = newImages.filter(n => !existingTimestamps.has(n.timestamp));
      return [...uniqueNew, ...prev];
    });

    // Clear the pending results since we've loaded them
    pendingResults.forEach(r => clearPendingResult(r.id));

    // Failsafe: if the active request already has a completed result, clear it
    if (activeGeneration && pendingResults.some(r => r.id === activeGeneration.id)) {
      cancelGeneration(activeGeneration.id);
    }

    // Notify user if there were pending results
    if (newImages.length > 0) {
      toast.success(
        `${newImages.length} look${newImages.length > 1 ? 's' : ''} generado${newImages.length > 1 ? 's' : ''} mientras navegabas`,
        { icon: '✨', duration: 4000 }
      );
    }
  }, [hasPendingResults, pendingResults, clearPendingResult, activeGeneration, cancelGeneration]);

  // Show indicator when generation is in progress (even if user navigated away and returned)
  useEffect(() => {
    if (isGenerating && activeGeneration) {
      // User returned while generation is in progress
      toast('Generación en progreso...', { icon: '⏳', duration: 2000 });
    }
  }, []); // Only on mount

  useEffect(() => {
    if (lastFailure?.error) {
      toast.error(`No se pudo generar el look. ${lastFailure.error}`);
    }
  }, [lastFailure]);

  const safeCloset = closet || [];

  // Merge closet with quick items for display
  const allItems = useMemo(() => {
    return [...quickItems, ...safeCloset];
  }, [quickItems, safeCloset]);

  const filteredCloset = useMemo(() => {
    return allItems.filter(item => {
      const status = item.status || 'owned';
      // Quick items always show
      if (status === 'quick') return true;
      if (filterStatus === 'owned') return status === 'owned';
      if (filterStatus === 'virtual') return status === 'virtual' || status === 'wishlist';
      return true;
    });
  }, [allItems, filterStatus]);

  const activePreset = useMemo(() => {
    return GENERATION_PRESETS.find(preset => preset.id === presetId) || GENERATION_PRESETS[0];
  }, [presetId]);

  const slotCount = slotSelections.size;
  const hasCoverage = hasMinimumCoverage(slotSelections);
  const hasSelfie = Boolean(userBaseImage);
  const creditsNeeded = generationQuality === 'pro' ? 4 : 1;
  const hasCredits = subscription.aiGenerationsLimit === -1
    || (subscription.aiGenerationsUsed + creditsNeeded) <= subscription.aiGenerationsLimit;
  const canGenerate = hasCoverage && hasSelfie && slotCount <= MAX_SLOTS_PER_GENERATION && hasCredits;

  const helperText = useMemo(() => {
    if (slotCount === 0) return 'Seleccioná al menos 1 prenda para probar.';
    if (slotCount > MAX_SLOTS_PER_GENERATION) return `Máximo ${MAX_SLOTS_PER_GENERATION} prendas.`;
    if (!userBaseImage) return 'Subí tu selfie para generar.';
    if (!hasCredits) return `Necesitás ${creditsNeeded} crédito${creditsNeeded > 1 ? 's' : ''} para generar.`;
    return 'Listo para generar tu look.';
  }, [slotCount, userBaseImage, hasCredits, creditsNeeded]);

  // Add item to a specific slot
  const addItemToSlot = (item: ClothingItem, slot: ClothingSlot) => {
    if (slotSelections.size >= MAX_SLOTS_PER_GENERATION && !slotSelections.has(slot)) {
      toast.error(`Máximo ${MAX_SLOTS_PER_GENERATION} prendas`);
      return;
    }

    setSlotSelections(prev => {
      const newMap = new Map(prev);
      newMap.set(slot, { slot, itemId: item.id, item });
      return newMap;
    });
    setActiveSlotPicker(null);
  };

  // Remove item from slot
  const removeFromSlot = (slot: ClothingSlot) => {
    setSlotSelections(prev => {
      const newMap = new Map(prev);
      newMap.delete(slot);
      return newMap;
    });
  };

  // Quick Try-On: Upload an item from screenshot
  const handleQuickItemUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQuickItem(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

      // Create temporary ID for this quick item
      const tempId = `quick_${Date.now()}`;
      setShowQuickItemCategoryPicker(tempId);

      // Store the image temporarily until category is selected
      sessionStorage.setItem(`quick-item-${tempId}`, dataUrl);
    } catch (err) {
      toast.error('Error al cargar la imagen');
    } finally {
      setIsUploadingQuickItem(false);
      if (quickItemInputRef.current) {
        quickItemInputRef.current.value = '';
      }
    }
  };

  // Confirm quick item with category
  const confirmQuickItemCategory = (tempId: string, category: string) => {
    const dataUrl = sessionStorage.getItem(`quick-item-${tempId}`);
    if (!dataUrl) return;

    const newQuickItem: ClothingItem = {
      id: tempId,
      imageDataUrl: dataUrl,
      status: 'quick' as any, // Mark as quick item
      metadata: {
        category: category as any,
        subcategory: 'Prenda de internet',
        color_primary: 'desconocido',
        vibe_tags: ['quick-try-on'],
        seasons: ['all'],
      },
    };

    setQuickItems(prev => [newQuickItem, ...prev]);
    setShowQuickItemCategoryPicker(null);
    sessionStorage.removeItem(`quick-item-${tempId}`);
    toast.success('Prenda agregada para probar', { icon: '✨' });
  };

  // Remove quick item
  const removeQuickItem = (itemId: string) => {
    setQuickItems(prev => prev.filter(i => i.id !== itemId));
    // Also remove from slot selections if selected
    setSlotSelections(prev => {
      const newMap = new Map(prev);
      for (const [slot, selection] of newMap) {
        if (selection.itemId === itemId) {
          newMap.delete(slot);
        }
      }
      return newMap;
    });
  };

  // Handle item click - show slot picker or auto-assign
  const handleItemClick = (item: ClothingItem) => {
    const validSlots = getValidSlotsForItem(item);

    // Check if item is already in a slot
    for (const [slot, selection] of slotSelections) {
      if (selection.itemId === item.id) {
        removeFromSlot(slot);
        return;
      }
    }

    // If only one valid slot, auto-assign
    if (validSlots.length === 1) {
      addItemToSlot(item, validSlots[0]);
    } else {
      // Show slot picker
      setActiveSlotPicker(item.id);
    }
  };

  // Check if item is selected
  const isItemSelected = (itemId: string): boolean => {
    for (const selection of slotSelections.values()) {
      if (selection.itemId === itemId) return true;
    }
    return false;
  };

  // Check if user might be selecting clothes that don't match their selfie framing
  const hasBottomOrShoes = slotSelections.has('bottom') || slotSelections.has('shoes');
  const needsCompatibilityCheck = presetId === 'overlay' && hasBottomOrShoes;

  const handleGenerateWithWarningCheck = () => {
    if (!canGenerate) {
      toast.error(helperText);
      return;
    }

    // In overlay mode, warn about potential framing mismatch
    if (needsCompatibilityCheck) {
      setShowCompatibilityWarning(true);
      return;
    }

    handleGenerateNow();
  };

  const handleGenerateNow = () => {
    setShowCompatibilityWarning(false);
    if (!canGenerate) {
      toast.error(helperText);
      return;
    }

    // Save state to localStorage for recovery
    const stateBackup = {
      slotSelections: Array.from(slotSelections.entries()).map(([slot, sel]) => ({
        slot,
        itemId: sel.itemId,
      })),
      presetId,
      autoSave,
      timestamp: Date.now(),
    };
    localStorage.setItem('studio-generation-state', JSON.stringify(stateBackup));

    // Build slots object for images
    const slots: Record<string, string> = {};
    for (const [slot, selection] of slotSelections) {
      slots[slot] = selection.item.imageDataUrl;
    }

    // Build slot items array for context tracking
    const slotItems = Array.from(slotSelections.entries()).map(([slot, sel]) => ({
      slot,
      item: sel.item,
    }));

    // Enqueue generation (runs in background, persists across navigation)
    // The result will come through pendingResults when completed
    enqueueGeneration({
      userImage: userBaseImage!,
      slots,
      slotItems,
      preset: presetId,
      customScene: presetId === 'custom' ? customScene : undefined,
      keepPose,
      useFaceRefs,
      faceRefsCount: faceRefs.length,
      provider: generationProvider,
      quality: generationQuality,
      fit: generationFit,
      view: generationView,
    });

    toast('Generando look...', { icon: '✨', duration: 2000 });

    // Clear backup since generation is queued
    localStorage.removeItem('studio-generation-state');
  };

  const handleSaveLook = async (image: GeneratedImageRecord) => {
    setIsSaving(true);
    try {
      const canSave = await canUserSaveLook();
      if (!canSave.allowed) {
        toast.error(canSave.reason || 'No podés guardar más looks en tu armario de looks');
        return;
      }

      if (!image.clothingItems || image.clothingItems.length === 0) {
        toast.error('No hay prendas seleccionadas para guardar');
        return;
      }

      await lookService.saveLook({
        image_url: image.imageUrl,
        user_id: user?.id,
        items: image.clothingItems,
        name: `Look ${new Date().toLocaleDateString()}`,
        is_generated: true,
        generation_metadata: {
          prompt: image.prompt,
          preset: image.presetId,
          model: image.model
        }
      });
      toast.success('Look guardado en tu armario');
    } catch (error) {
      console.error('Error saving look:', error);
      toast.error('Error al guardar el look');
    } finally {
      setIsSaving(false);
    }
  };

  // Get slot configs that are relevant (have items or are required)
  const relevantSlots = SLOT_CONFIGS.filter(config => {
    // Always show slots that have items
    if (slotSelections.has(config.id)) return true;
    // Show required slots
    if (config.required) return true;
    // Show slots that have matching items in closet
    return safeCloset.some(item => {
      const validSlots = getValidSlotsForItem(item);
      return validSlots.includes(config.id);
    });
  });

  const handleOpenLatestResult = () => {
    if (!generatedImages[0]) return;
    setSelectedImage(generatedImages[0]);
    setShowResultsHint(false);
  };

  const handleCloseSelectedImage = () => {
    setSelectedImage(null);
    setCompareMode(false);
    setComparePosition(50);
    if (isMobile && generatedImages.length > 0) {
      setShowResultsHint(true);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden text-[color:var(--studio-ink)]"
      style={{ ...studioTheme, fontFamily: 'var(--studio-font-body)' }}
    >
      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 15% 10%, rgba(245, 167, 163, 0.35), transparent 45%), radial-gradient(circle at 85% 0%, rgba(154, 212, 192, 0.35), transparent 40%), linear-gradient(180deg, #f8f3ee 0%, #f0e7dd 50%, #f6f1ea 100%)'
        }}
      />

      {/* SPLIT LAYOUT: Main content + Inspector sidebar */}
      <div className="flex min-h-screen">
        {/* LEFT COLUMN: Options + Closet (scrollable) */}
        <div className="flex-1 flex flex-col lg:pr-80">
          {/* Header */}
          <StudioHeader
            generatedImagesCount={generatedImages.length}
            onOpenLatestResult={handleOpenLatestResult}
            showResultsHint={showResultsHint}
          />

          <motion.main
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="px-4 pb-[calc(18rem+env(safe-area-inset-bottom))] lg:pb-[calc(12rem+env(safe-area-inset-bottom))]"
          >
            {/* ═══════════════════════════════════════════════════════════════════
            COMPACT TOOLBAR - All options in 2 rows for maximum grid visibility
            ═══════════════════════════════════════════════════════════════════ */}

            {/* ROW 1: Selfie + Presets + Slot Counter */}
            {/* ═══════════════════════════════════════════════════════════════════
            COMPACT TOOLBAR - Using Extracted Component
            ═══════════════════════════════════════════════════════════════════ */}
            <StudioToolbar
              userBaseImage={userBaseImage}
              setUserBaseImage={setUserBaseImage}
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
              generationQuality={generationQuality}
              setGenerationQuality={setGenerationQuality}
              isPremium={subscription.isPremium}
              generationFit={generationFit}
              setGenerationFit={setGenerationFit}
              generationView={generationView}
              setGenerationView={setGenerationView}
            />

            {/* ROW 2: Filters + Selected Slot Chips */}
            <motion.section variants={itemVariants} className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter tabs */}
                {FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterStatus(filter.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${filterStatus === filter.id
                      ? 'bg-[color:var(--studio-ink)] text-white shadow-sm'
                      : 'bg-white/60 text-[color:var(--studio-ink-muted)] border border-white/70'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}

                {/* Divider */}
                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Selected slot mini-chips */}
                {Array.from(slotSelections.entries()).map(([slot, selection]) => {
                  const config = SLOT_CONFIGS.find(c => c.id === slot);
                  return (
                    <div
                      key={slot}
                      className="flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-white/80 border border-[color:var(--studio-ink)]/30 shadow-sm"
                    >
                      <img
                        src={selection.item.imageDataUrl}
                        alt={config?.labelShort}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="text-[10px] font-medium text-[color:var(--studio-ink)]">
                        {config?.labelShort}
                      </span>
                      <button
                        onClick={() => removeFromSlot(slot)}
                        className="w-3 h-3 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-[8px]"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {/* Empty slot hints (only show required if nothing selected) */}
                {slotCount === 0 && (
                  <span className="text-[10px] text-[color:var(--studio-ink-muted)] italic">
                    Tocá una prenda para agregarla
                  </span>
                )}

                {/* Auto-save toggle (compact) */}
                <label className="ml-auto flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  <span className="text-[10px] text-[color:var(--studio-ink-muted)]">Auto-guardar</span>
                </label>
              </div>
            </motion.section>

            {/* Closet grid */}
            <motion.section variants={itemVariants} className="mb-6">
              {/* Hidden input for quick item upload */}
              <input
                type="file"
                ref={quickItemInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleQuickItemUpload}
              />

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {/* Quick Try-On upload button - always first */}
                <button
                  onClick={() => quickItemInputRef.current?.click()}
                  disabled={isUploadingQuickItem}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-400
                             bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100
                             flex flex-col items-center justify-center gap-2 transition-all group"
                >
                  {isUploadingQuickItem ? (
                    <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition">
                        <span className="material-symbols-rounded text-purple-600 text-xl">add_photo_alternate</span>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-[10px] font-semibold text-purple-700">Quick Try-On</p>
                        <p className="text-[8px] text-purple-500">Subí captura de Instagram</p>
                      </div>
                    </>
                  )}
                </button>

                {filteredCloset.length === 0 ? (
                  <div className="col-span-2 sm:col-span-3 rounded-2xl border border-white/60 bg-white/40 p-6 text-center">
                    <p className="text-sm text-[color:var(--studio-ink-muted)]">No hay prendas en esta sección.</p>
                  </div>
                ) : (
                  filteredCloset.map(item => {
                    const isSelected = isItemSelected(item.id);
                    const validSlots = getValidSlotsForItem(item);
                    const showSlotPicker = activeSlotPicker === item.id;
                    const isQuickItem = item.status === 'quick';

                    return (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => handleItemClick(item)}
                          className={`w-full aspect-[3/4] rounded-xl overflow-hidden border-2 transition ${isSelected
                            ? 'border-[color:var(--studio-ink)] ring-2 ring-[color:var(--studio-ink)]/20'
                            : isQuickItem
                              ? 'border-purple-300 hover:border-purple-400'
                              : 'border-transparent hover:border-white/80'
                            }`}
                        >
                          {item.imageDataUrl ? (
                            <img
                              src={item.imageDataUrl}
                              alt={item.metadata?.subcategory || 'Prenda'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-2xl">image_not_supported</span>
                              <span className="text-[10px] mt-1">{item.metadata?.subcategory || 'Sin imagen'}</span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[color:var(--studio-ink)] text-white flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                          {/* Quick item badge */}
                          {isQuickItem && !isSelected && (
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[8px] font-bold">
                              QUICK
                            </div>
                          )}
                        </button>

                        {/* Remove quick item button */}
                        {isQuickItem && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeQuickItem(item.id); }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white
                                       flex items-center justify-center text-xs shadow-md hover:bg-red-600 z-10"
                          >
                            ×
                          </button>
                        )}

                        {/* Slot picker dropdown */}
                        {showSlotPicker && validSlots.length > 1 && (
                          <div className="absolute bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1 left-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2">
                            <p className="text-[10px] uppercase text-gray-500 mb-1 px-1">Elegir slot:</p>
                            {validSlots.map(slot => {
                              const config = SLOT_CONFIGS.find(c => c.id === slot);
                              const isOccupied = slotSelections.has(slot);
                              return (
                                <button
                                  key={slot}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItemToSlot(item, slot);
                                  }}
                                  disabled={isOccupied}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 ${isOccupied
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'hover:bg-gray-100'
                                    }`}
                                >
                                  <span className="material-symbols-outlined text-sm">{config?.icon}</span>
                                  {config?.label}
                                  {isOccupied && ' (ocupado)'}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setActiveSlotPicker(null)}
                              className="w-full text-center text-xs text-gray-500 mt-1 py-1"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.section>

          </motion.main>
        </div>

        {/* RIGHT SIDEBAR: Inspector/Preview (hidden on mobile, fixed on desktop) */}
        <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-80 bg-white/80 backdrop-blur-xl border-l border-white/60 z-20">
          {/* Preview Header */}
          <div className="p-4 border-b border-white/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--studio-ink-muted)]">
              Preview
            </h2>
          </div>

          {/* Generated Image Preview */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {isGenerating ? (
              <div className="h-full flex items-center justify-center min-h-[400px]">
                <div className="w-full max-w-[280px]">
                  <GenerationLoader userImage={userBaseImage} />
                </div>
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="space-y-4">
                {/* Latest result */}
                <div className="relative rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={generatedImages[0].image}
                    alt="Último look"
                    className="w-full aspect-[3/4] object-cover cursor-pointer"
                    onClick={() => setSelectedImage(generatedImages[0])}
                  />
                  {/* Badges overlay */}
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${generatedImages[0].model?.includes('3-pro')
                      ? 'bg-purple-500/90 text-white'
                      : 'bg-white/90 text-gray-700'
                      }`}>
                      {generatedImages[0].model?.includes('3-pro') ? 'Ultra' : 'Rápido'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-gray-700 text-[10px] font-semibold">
                      {GENERATION_PRESETS.find(p => p.id === generatedImages[0].preset)?.label || generatedImages[0].preset}
                    </span>
                  </div>
                  {/* Bottom badges */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {generatedImages[0].keepPose && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500/90 text-white text-[9px] font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">person_pin</span>
                        Pose
                      </span>
                    )}
                    {generatedImages[0].faceRefsUsed > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-green-500/90 text-white text-[9px] font-semibold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">face</span>
                        {generatedImages[0].faceRefsUsed}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateNow}
                    disabled={isGenerating || !canGenerate}
                    className="py-2 px-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Generar otra versión"
                  >
                    <span className="material-symbols-outlined text-sm">autorenew</span>
                  </button>
                  <button
                    onClick={() => setSelectedImage(generatedImages[0])}
                    className="py-2 px-3 rounded-lg bg-white border border-gray-200 text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">compare</span>
                  </button>
                  <button
                    onClick={() => handleSaveLook(generatedImages[0])}
                    disabled={isSaving}
                    className="flex-1 py-2 rounded-lg bg-[color:var(--studio-ink)] text-white text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isSaving ? '...' : 'Guardar'}
                  </button>
                </div>

                {/* Previous results with metadata */}
                {generatedImages.length > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[color:var(--studio-ink-muted)] mb-2">
                      Anteriores ({generatedImages.length - 1})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {generatedImages.slice(1, 7).map((gen, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(gen)}
                          className="aspect-[3/4] rounded-lg overflow-hidden border border-white/50 relative group"
                        >
                          <img src={gen.image} alt={`Look ${idx + 2}`} className="w-full h-full object-cover" />
                          {/* Mini metadata overlay on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 p-1">
                            <span className="text-[8px] text-white font-semibold">
                              {GENERATION_PRESETS.find(p => p.id === gen.preset)?.label || gen.preset}
                            </span>
                            <div className="flex gap-1">
                              {gen.keepPose && (
                                <span className="material-symbols-outlined text-blue-300 text-[10px]">person_pin</span>
                              )}
                              {gen.faceRefsUsed > 0 && (
                                <span className="material-symbols-outlined text-green-300 text-[10px]">face</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-[color:var(--studio-ink-muted)]">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">image</span>
                <p className="text-sm">Tu look generado<br />aparecerá aquí</p>
              </div>
            )}
          </div>

          {/* Saved looks link */}
          <div className="p-4 border-t border-white/60">
            <button
              onClick={() => navigate(ROUTES.SAVED_LOOKS)}
              className="w-full py-2.5 rounded-lg border border-[color:var(--studio-ink-muted)]/30 text-sm font-medium text-[color:var(--studio-ink-muted)] hover:bg-white/50 transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">photo_library</span>
              Ver armario de looks
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom action bar - adjusted for sidebar */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 lg:right-80 right-0 z-40 px-4">
        <div className="mx-auto max-w-xl rounded-2xl bg-white/95 backdrop-blur-xl border border-white/70 shadow-lg p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">{helperText}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasCoverage ? 'border-green-500 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {hasCoverage ? '✓' : '○'} Prenda
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasSelfie ? 'border-green-500 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {hasSelfie ? '✓' : '○'} Selfie
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isGenerating && activeGeneration && (
                <button
                  onClick={() => cancelGeneration(activeGeneration.id)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--studio-ink)] bg-white/80 border border-[color:var(--studio-ink)]/20 hover:bg-white transition"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleGenerateWithWarningCheck}
                disabled={isGenerating || !canGenerate}
                className={`px-5 py-3 rounded-xl font-semibold text-sm text-white flex items-center gap-2 transition ${isGenerating || !canGenerate
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[color:var(--studio-ink)] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <Loader size="small" /> Generando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Generar
                  </>
                )}
              </button>
            </div>
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
      </div>

      {/* Full-screen image modal with comparison */}
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
              className="relative max-w-lg w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseSelectedImage}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {/* Image with comparison slider */}
              <div className="rounded-2xl overflow-hidden bg-black relative">
                {compareMode && selectedImage.selfieUsed ? (
                  // Comparison mode - before/after slider
                  <div
                    className="relative w-full aspect-[3/4] select-none"
                    onMouseMove={(e) => {
                      if (e.buttons === 1) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        setComparePosition(Math.max(0, Math.min(100, x)));
                      }
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((touch.clientX - rect.left) / rect.width) * 100;
                      setComparePosition(Math.max(0, Math.min(100, x)));
                    }}
                  >
                    {/* Before (selfie) - full width background */}
                    <img
                      src={selectedImage.selfieUsed}
                      alt="Antes"
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                    {/* After (generated) - clipped */}
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
                    {/* Slider line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                      style={{ left: `${comparePosition}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-700 text-sm">drag_handle</span>
                      </div>
                    </div>
                    {/* Labels */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                      Antes
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                      Después
                    </div>
                  </div>
                ) : (
                  // Normal mode - just the result
                  <img
                    src={selectedImage.image}
                    alt="Look generado"
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                )}
              </div>

              {/* Generation metadata */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {/* Model */}
                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${selectedImage.model?.includes('3-pro')
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/20 text-white'
                  }`}>
                  {selectedImage.model?.includes('3-pro') ? 'Ultra' : 'Rápido'}
                </span>
                {/* Preset */}
                <span className="px-2 py-1 rounded-full bg-white/20 text-white text-[10px] font-semibold">
                  {GENERATION_PRESETS.find(p => p.id === selectedImage.preset)?.label || selectedImage.preset}
                </span>
                {/* Keep pose */}
                {selectedImage.keepPose && (
                  <span className="px-2 py-1 rounded-full bg-blue-500/80 text-white text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">person_pin</span>
                    Pose fija
                  </span>
                )}
                {/* Face refs */}
                {selectedImage.faceRefsUsed > 0 && (
                  <span className="px-2 py-1 rounded-full bg-green-500/80 text-white text-[10px] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">face</span>
                    {selectedImage.faceRefsUsed} ref
                  </span>
                )}
                {/* Custom scene */}
                {selectedImage.customScene && (
                  <span className="px-2 py-1 rounded-full bg-orange-500/80 text-white text-[10px] font-semibold max-w-[150px] truncate">
                    "{selectedImage.customScene}"
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                {/* Regenerate with same config */}
                <button
                  onClick={() => {
                    handleCloseSelectedImage();
                    // Small delay to let modal close before regenerating
                    setTimeout(() => {
                      handleGenerateNow();
                    }, 150);
                  }}
                  disabled={isGenerating || !canGenerate}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                  title="Generar otra versión con la misma configuración"
                >
                  <span className="material-symbols-outlined text-lg">autorenew</span>
                </button>
                {/* Compare toggle */}
                {selectedImage.selfieUsed && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${compareMode
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    <span className="material-symbols-outlined text-lg">compare</span>
                  </button>
                )}
                {/* Save */}
                <button
                  onClick={() => {
                    handleSaveLook(selectedImage);
                    handleCloseSelectedImage();
                  }}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-white text-[color:var(--studio-ink)] font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                {/* Download */}
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

      {/* Clothing Compatibility Warning Modal */}
      <ClothingCompatibilityWarning
        hasBottomSelected={slotSelections.has('bottom')}
        hasShoesSelected={slotSelections.has('shoes')}
        isVisible={showCompatibilityWarning}
        onProceed={handleGenerateNow}
        onCancel={() => setShowCompatibilityWarning(false)}
      />

      {/* Quick Item Category Picker Modal */}
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
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                ¿Qué tipo de prenda es?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Seleccioná la categoría para poder usarla en tu look
              </p>

              {/* Preview of the uploaded image */}
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
                {QUICK_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => confirmQuickItemCategory(showQuickItemCategoryPicker!, cat.id)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200
                               hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
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
    </div>
  );
}
