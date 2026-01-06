import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import type { ClothingItem, ClothingSlot, GenerationPreset, SlotSelection } from '../../types';
import { SLOT_CONFIGS, GENERATION_PRESETS, MAX_SLOTS_PER_GENERATION, CATEGORY_TO_SLOT } from '../../types';
import ClosetItemCard from '../closet/ClosetItemCard';
import { generateVirtualTryOnWithSlots } from '../../src/services/aiService';
import { saveGeneratedLook, canUserSaveLook } from '../../src/services/generatedLooksService';
import toast from 'react-hot-toast';
import Loader from '../Loader';
import { validateImageDataUri } from '../../utils/imageValidation';
import { analyzeTryOnPhotoQuality } from '../../utils/photoQualityValidation';
import ClothingCompatibilityWarning from './ClothingCompatibilityWarning';
import { getFaceReferences, FaceReference } from '../../src/services/faceReferenceService';

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
  const hasOnePiece = slots.has('one_piece');
  const hasTop = slots.has('top_base') || slots.has('top_mid');
  const hasBottom = slots.has('bottom');

  return hasOnePiece || (hasTop && hasBottom);
}

export default function PhotoshootStudio({ closet }: PhotoshootStudioProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [slotSelections, setSlotSelections] = useState<Map<ClothingSlot, SlotSelection>>(new Map());
  const [presetId, setPresetId] = useState<GenerationPreset>('overlay');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);
  const [userBaseImage, setUserBaseImage] = useState<string | null>(null);
  const [isUploadingBase, setIsUploadingBase] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSlotPicker, setActiveSlotPicker] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50); // 0-100 slider position
  const [savedSelfies, setSavedSelfies] = useState<string[]>([]);
  const [showSelfieManager, setShowSelfieManager] = useState(false);
  const [showResultsHint, setShowResultsHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [customScene, setCustomScene] = useState('');
  const [keepPose, setKeepPose] = useState(false);
  const [useFaceRefs, setUseFaceRefs] = useState(true);
  const [faceRefs, setFaceRefs] = useState<FaceReference[]>([]);
  const [showFaceRefPreview, setShowFaceRefPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load saved selfies from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studio-saved-selfies');
    if (saved) {
      try {
        setSavedSelfies(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  // Fetch face references
  useEffect(() => {
    getFaceReferences().then(refs => {
      setFaceRefs(refs);
    }).catch(() => setFaceRefs([]));
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save selfie to quick access
  const saveSelfieForQuickAccess = (selfie: string) => {
    const updated = [selfie, ...savedSelfies.filter(s => s !== selfie)].slice(0, 5); // Max 5
    setSavedSelfies(updated);
    localStorage.setItem('studio-saved-selfies', JSON.stringify(updated));
    toast.success('Selfie guardada para acceso rápido');
  };

  // Remove saved selfie
  const removeSavedSelfie = (selfie: string) => {
    const updated = savedSelfies.filter(s => s !== selfie);
    setSavedSelfies(updated);
    localStorage.setItem('studio-saved-selfies', JSON.stringify(updated));
  };

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

  const safeCloset = closet || [];

  const filteredCloset = useMemo(() => {
    return safeCloset.filter(item => {
      const status = item.status || 'owned';
      if (filterStatus === 'owned') return status === 'owned';
      if (filterStatus === 'virtual') return status === 'virtual' || status === 'wishlist';
      return true;
    });
  }, [safeCloset, filterStatus]);

  const activePreset = useMemo(() => {
    return GENERATION_PRESETS.find(preset => preset.id === presetId) || GENERATION_PRESETS[0];
  }, [presetId]);

  const slotCount = slotSelections.size;
  const hasCoverage = hasMinimumCoverage(slotSelections);
  const hasSelfie = Boolean(userBaseImage);
  const canGenerate = hasCoverage && hasSelfie && slotCount <= MAX_SLOTS_PER_GENERATION;

  const helperText = useMemo(() => {
    if (slotCount === 0) return 'Selecciona prendas para tu look.';
    if (!hasCoverage) return 'Necesitas top + bottom, o un vestido/enterito.';
    if (slotCount > MAX_SLOTS_PER_GENERATION) return `Máximo ${MAX_SLOTS_PER_GENERATION} prendas.`;
    if (!userBaseImage) return 'Subí tu selfie para generar.';
    return 'Listo para generar tu look.';
  }, [slotCount, hasCoverage, userBaseImage]);

  const handleBaseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBase(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

      const validation = validateImageDataUri(dataUrl);
      if (!validation.isValid) {
        toast.error(validation.error || 'Imagen inválida');
        return;
      }

      const quality = await analyzeTryOnPhotoQuality(dataUrl);
      if (!quality.isAllowed) {
        const primaryReason = quality.reasons[0] || 'Selfie no válida para probar el look.';
        toast.error(primaryReason);
        return;
      }

      setUserBaseImage(dataUrl);
      toast.success('Selfie lista');
    } catch (error) {
      console.error('Error processing base image:', error);
      toast.error('No pudimos procesar la selfie');
    } finally {
      setIsUploadingBase(false);
      if (e.target) e.target.value = '';
    }
  };

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

  const handleGenerateNow = async () => {
    setShowCompatibilityWarning(false);
    if (!canGenerate) {
      toast.error(helperText);
      return;
    }

    setIsGenerating(true);

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

    try {
      // Build slots object
      const slots: Record<string, string> = {};
      for (const [slot, selection] of slotSelections) {
        slots[slot] = selection.item.imageDataUrl;
      }

      const result = await generateVirtualTryOnWithSlots(
        userBaseImage!,
        slots,
        {
          preset: presetId,
          quality: presetId === 'editorial' ? 'pro' : 'flash',
          customScene: presetId === 'custom' ? customScene : undefined,
          keepPose,
          useFaceReferences: useFaceRefs && faceRefs.length > 0
        }
      );

      const newImage: GeneratedImageRecord = {
        image: result.resultImage,
        slots: result.slotsUsed,
        model: result.model,
        preset: presetId,
        keepPose,
        faceRefsUsed: result.faceReferencesUsed || 0,
        customScene: presetId === 'custom' ? customScene : undefined,
        selfieUsed: userBaseImage!,
        timestamp: Date.now()
      };
      setGeneratedImages(prev => [newImage, ...prev]);
      if (isMobile) {
        setSelectedImage(newImage);
        setCompareMode(false);
        setShowResultsHint(false);
      }

      // Show model and face refs used in toast
      const modelLabel = result.model.includes('3-pro') ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash';
      const faceRefInfo = result.faceReferencesUsed && result.faceReferencesUsed > 0
        ? ` + ${result.faceReferencesUsed} foto${result.faceReferencesUsed > 1 ? 's' : ''} de cara`
        : '';
      toast.success(`Look generado con ${modelLabel}${faceRefInfo}`);

      // Scroll to top to see results
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);

      // Clear backup on success
      localStorage.removeItem('studio-generation-state');

      // Auto-save if enabled
      if (autoSave) {
        await handleSaveLook(newImage);
      }
    } catch (error: any) {
      console.error('Generation error:', error);

      // Parse error message for better UX
      const errorMessage = error?.message || String(error);
      let userMessage = 'Error al generar. Intentá de nuevo.';

      if (errorMessage.includes('cuota') || errorMessage.includes('límite') || errorMessage.includes('Límite')) {
        userMessage = 'Límite mensual alcanzado. Upgradeá tu plan para continuar.';
      } else if (errorMessage.includes('Beta cerrada')) {
        userMessage = 'Tu cuenta no está habilitada para esta beta.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Error de conexión. Verificá tu internet.';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('authorization')) {
        userMessage = 'Sesión expirada. Volvé a iniciar sesión.';
      } else if (errorMessage.includes('imagen') || errorMessage.includes('image')) {
        userMessage = 'Error con las imágenes. Probá con otras prendas.';
      }

      toast.error(userMessage, { duration: 5000 });

      // Don't clear backup on error - user can retry
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLook = async (record: GeneratedImageRecord) => {
    setIsSaving(true);
    try {
      const canSave = await canUserSaveLook();
      if (!canSave.allowed) {
        toast.error(canSave.reason || 'No podés guardar más looks en tu armario de looks');
        return;
      }

      const sourceItems: Record<string, string> = {};
      for (const [slot, selection] of slotSelections) {
        sourceItems[slot] = selection.itemId;
      }

      await saveGeneratedLook(record.image, sourceItems as any, {
        selfieUsed: true,
        selfieUrl: record.selfieUsed, // Save original selfie for comparison
        preset: record.preset,
        model: record.model,
        autoSaved: autoSave,
        keepPose: record.keepPose,
        faceRefsUsed: record.faceRefsUsed,
      });

      toast.success('Guardado en tu armario de looks');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
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
          <header className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 sticky top-0 z-30 bg-[#f8f3ee]/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm hover:shadow-md transition"
                aria-label="Volver"
              >
                <span className="material-symbols-outlined text-[color:var(--studio-ink)]">arrow_back</span>
              </button>
              <div className="text-center flex-1">
                <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--studio-font-display)' }}>
                  Studio
                </h1>
              </div>
              {/* Mobile: Toggle inspector */}
              <button
                onClick={handleOpenLatestResult}
                className="lg:hidden w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm relative"
                aria-label="Ver resultados"
              >
                <span className="material-symbols-outlined text-[color:var(--studio-ink)]">photo_library</span>
                {generatedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[color:var(--studio-rose)] text-white text-xs flex items-center justify-center">
                    {generatedImages.length}
                  </span>
                )}
                <AnimatePresence>
                  {showResultsHint && generatedImages.length > 0 && (
                    <motion.span
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      className="absolute -bottom-9 right-1/2 translate-x-1/2 px-2 py-1 rounded-lg bg-[color:var(--studio-ink)] text-white text-[10px] font-semibold shadow-lg"
                    >
                      Tu look listo
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </header>

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
            <motion.section variants={itemVariants} className="mb-3">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/70 overflow-x-auto no-scrollbar max-w-full">
                {/* Selfie Section - Larger and more prominent */}
                <div className="relative shrink-0 flex flex-col items-center gap-1">
                  {userBaseImage ? (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="relative w-20 h-28 rounded-xl overflow-hidden border-2 border-[color:var(--studio-ink)] shadow-md group cursor-pointer"
                    >
                      <img src={userBaseImage} alt="Tu selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg">edit</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUserBaseImage(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md"
                      >
                        ×
                      </button>
                      {/* Save selfie button */}
                      {!savedSelfies.includes(userBaseImage) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); saveSelfieForQuickAccess(userBaseImage); }}
                          className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[color:var(--studio-mint)] text-white flex items-center justify-center shadow-md"
                          title="Guardar selfie"
                        >
                          <span className="material-symbols-outlined text-xs">bookmark_add</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-28 rounded-xl border-2 border-dashed border-[color:var(--studio-rose)] bg-white/40 flex flex-col items-center justify-center gap-1 hover:bg-white/70 transition"
                    >
                      {isUploadingBase ? (
                        <Loader size="small" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-2xl text-[color:var(--studio-rose)]">add_a_photo</span>
                          <span className="text-[9px] font-medium text-[color:var(--studio-rose)]">Tu foto</span>
                        </>
                      )}
                    </button>
                  )}
                  {/* Saved selfies quick access button - more visible */}
                  {savedSelfies.length > 0 && (
                    <button
                      onClick={() => setShowSelfieManager(!showSelfieManager)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 shadow-sm text-[10px] font-semibold text-[color:var(--studio-ink)] hover:bg-white transition"
                    >
                      <span className="material-symbols-outlined text-xs">photo_library</span>
                      {savedSelfies.length} guardada{savedSelfies.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                {/* Preset Tabs - Compact 2-row grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-5 gap-1">
                    {GENERATION_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setPresetId(preset.id)}
                        title={preset.description}
                        className={`relative flex items-center justify-center gap-0.5 px-1 py-1 rounded-md text-[9px] font-medium transition ${presetId === preset.id
                          ? 'bg-[color:var(--studio-ink)] text-white shadow-sm'
                          : 'bg-white/50 text-[color:var(--studio-ink-muted)] hover:bg-white/80'
                          }`}
                      >
                        <span className="material-symbols-outlined text-xs">{preset.icon}</span>
                        <span className="truncate">{preset.label}</span>
                        {preset.id === 'editorial' && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Custom scene input */}
                  {presetId === 'custom' && (
                    <input
                      type="text"
                      value={customScene}
                      onChange={(e) => setCustomScene(e.target.value)}
                      placeholder="Ej: en la playa, en un parque, en una fiesta..."
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-white/80 border border-[color:var(--studio-ink)]/20 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--studio-ink)]/30"
                    />
                  )}
                  {/* Options row - Keep pose + Use face refs */}
                  <div className="mt-2 flex items-center gap-4 flex-wrap">
                    {/* Keep pose toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer group" title="Mantiene tu pose exacta de la foto. Mejora la consistencia de la cara.">
                      <input
                        type="checkbox"
                        checked={keepPose}
                        onChange={(e) => setKeepPose(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[color:var(--studio-ink)] focus:ring-[color:var(--studio-ink)]"
                      />
                      <span className="text-[10px] font-medium text-[color:var(--studio-ink-muted)] group-hover:text-[color:var(--studio-ink)]">
                        Mantener pose
                      </span>
                    </label>

                    {/* Face references toggle with count and preview */}
                    <div className="flex items-center gap-1.5">
                      <label
                        className={`flex items-center gap-1.5 cursor-pointer group ${faceRefs.length === 0 ? 'opacity-50' : ''}`}
                        title={faceRefs.length > 0
                          ? `Usar ${faceRefs.length} foto${faceRefs.length > 1 ? 's' : ''} de referencia para mejorar la cara`
                          : 'No tenés fotos de cara cargadas. Subí una en tu perfil.'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={useFaceRefs && faceRefs.length > 0}
                          onChange={(e) => setUseFaceRefs(e.target.checked)}
                          disabled={faceRefs.length === 0}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[color:var(--studio-ink)] focus:ring-[color:var(--studio-ink)] disabled:opacity-50"
                        />
                        <span className="text-[10px] font-medium text-[color:var(--studio-ink-muted)] group-hover:text-[color:var(--studio-ink)]">
                          Fotos de cara
                        </span>
                      </label>
                      {faceRefs.length > 0 ? (
                        <button
                          onClick={() => setShowFaceRefPreview(!showFaceRefPreview)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition ${
                            showFaceRefPreview
                              ? 'bg-[color:var(--studio-mint)] text-white'
                              : 'bg-[color:var(--studio-mint)]/20 text-[color:var(--studio-mint)] hover:bg-[color:var(--studio-mint)]/30'
                          }`}
                        >
                          {faceRefs.length}
                          <span className="material-symbols-outlined text-[10px]">
                            {showFaceRefPreview ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(ROUTES.PROFILE)}
                          className="text-[9px] text-[color:var(--studio-rose)] underline"
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Face references preview panel */}
                  <AnimatePresence>
                    {showFaceRefPreview && faceRefs.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-2 rounded-lg bg-[color:var(--studio-mint)]/10 border border-[color:var(--studio-mint)]/30">
                          <div className="flex items-center gap-2">
                            {faceRefs.map((ref) => (
                              <div
                                key={ref.id}
                                className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 ${
                                  ref.is_primary
                                    ? 'border-[color:var(--studio-mint)] ring-2 ring-[color:var(--studio-mint)]/30'
                                    : 'border-white/80'
                                }`}
                                title={ref.label + (ref.is_primary ? ' (Principal)' : '')}
                              >
                                <img
                                  src={ref.image_url}
                                  alt={ref.label}
                                  className="w-full h-full object-cover"
                                />
                                {ref.is_primary && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[color:var(--studio-mint)] rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[8px]">star</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => navigate(ROUTES.PROFILE)}
                              className="w-8 h-8 rounded-full border border-dashed border-[color:var(--studio-mint)] flex items-center justify-center text-[color:var(--studio-mint)] hover:bg-[color:var(--studio-mint)]/10 transition"
                              title="Administrar fotos de cara"
                            >
                              <span className="material-symbols-outlined text-sm">settings</span>
                            </button>
                          </div>
                          <p className="text-[9px] text-[color:var(--studio-ink-muted)] mt-1.5">
                            {useFaceRefs ? '✓ Se usarán para mejorar tu cara en la generación' : '○ Desactivadas'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Slot Counter */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${hasCoverage ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    <span className="material-symbols-outlined text-sm">{hasCoverage ? 'check_circle' : 'pending'}</span>
                    {slotCount}/{MAX_SLOTS_PER_GENERATION}
                  </div>
                  {slotCount > 0 && (
                    <button
                      onClick={() => setSlotSelections(new Map())}
                      className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs"
                      title="Limpiar selección"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Saved selfies gallery (expandable) */}
              <AnimatePresence>
                {showSelfieManager && savedSelfies.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-xl bg-white/70 border border-white/80 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[color:var(--studio-ink)]">
                          📷 Mis selfies guardadas
                        </p>
                        <button
                          onClick={() => setShowSelfieManager(false)}
                          className="text-[color:var(--studio-ink-muted)] hover:text-[color:var(--studio-ink)]"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {savedSelfies.map((selfie, idx) => (
                          <div
                            key={idx}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setUserBaseImage(selfie); setShowSelfieManager(false); toast.success('Selfie cargada'); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setUserBaseImage(selfie);
                                setShowSelfieManager(false);
                                toast.success('Selfie cargada');
                              }
                            }}
                            className={`relative w-16 h-24 rounded-xl overflow-hidden border-2 shrink-0 transition shadow-sm cursor-pointer group ${userBaseImage === selfie
                              ? 'border-[color:var(--studio-ink)] ring-2 ring-[color:var(--studio-ink)]/20'
                              : 'border-white hover:border-[color:var(--studio-mint)] hover:shadow-md'
                              }`}
                          >
                            <img src={selfie} alt={`Selfie ${idx + 1}`} className="w-full h-full object-cover" />
                            {userBaseImage === selfie && (
                              <div className="absolute inset-0 bg-[color:var(--studio-ink)]/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-lg">check_circle</span>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSavedSelfie(selfie); }}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 hover:!opacity-100 shadow"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-[color:var(--studio-ink-muted)] mt-2">
                        Tocá una selfie para usarla • Máximo 5 guardadas
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleBaseImageUpload}
              />
            </motion.section>

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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredCloset.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/60 bg-white/40 p-6 text-center">
                    <p className="text-sm text-[color:var(--studio-ink-muted)]">No hay prendas en esta sección.</p>
                  </div>
                ) : (
                  filteredCloset.map(item => {
                    const isSelected = isItemSelected(item.id);
                    const validSlots = getValidSlotsForItem(item);
                    const showSlotPicker = activeSlotPicker === item.id;

                    return (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => handleItemClick(item)}
                          className={`w-full aspect-[3/4] rounded-xl overflow-hidden border-2 transition ${isSelected
                            ? 'border-[color:var(--studio-ink)] ring-2 ring-[color:var(--studio-ink)]/20'
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
                        </button>

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
          <div className="flex-1 p-4 overflow-y-auto">
            {generatedImages.length > 0 ? (
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
                      {generatedImages[0].model?.includes('3-pro') ? 'Pro' : 'Flash'}
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
                  {hasCoverage ? '✓' : '○'} Outfit
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${hasSelfie ? 'border-green-500 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                  {hasSelfie ? '✓' : '○'} Selfie
                </span>
              </div>
            </div>
            <button
              onClick={handleGenerateWithWarningCheck}
              disabled={isGenerating || !canGenerate}
              className={`px-5 py-3 rounded-xl font-semibold text-sm text-white flex items-center gap-2 transition shrink-0 ${isGenerating || !canGenerate
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
                  {selectedImage.model?.includes('3-pro') ? 'Gemini 3 Pro' : 'Flash'}
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
                    className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                      compareMode
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
    </div>
  );
}
