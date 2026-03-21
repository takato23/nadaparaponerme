import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import * as aiService from '../src/services/aiService';
import { addClothingItem, getClothingItems } from '../src/services/closetService';
import { validateImageDataUri } from '../utils/imageValidation';
import PhotoGuidanceModal from './PhotoGuidanceModal';
import { analyzePhotoQuality } from '../utils/photoQualityValidation';
import { removeImageBackground } from '../src/utils/backgroundRemoval';
import useLocalStorage from '../hooks/useLocalStorage';
import { getErrorMessage } from '../utils/errorMessages';
import { TooltipWrapper } from './ui/TooltipWrapper';
import { useSubscription } from '../hooks/useSubscription';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { LimitReachedModal } from './QuotaIndicator';
import { CreditsIndicator } from './CreditsIndicator';
import { SuccessFeedback, useSuccessFeedback } from './ui/SuccessFeedback';
import { ROUTES } from '../src/routes';
import QuickEraserModal from './QuickEraserModal';
import * as analytics from '../src/services/analyticsService';

interface AddItemViewProps {
  onAddLocalItem: (item: ClothingItem) => void;
  onClosetSync: (items: ClothingItem[]) => void;
  onBack: () => void;
  useSupabaseCloset: boolean;
}

type ViewState = 'capture' | 'preview' | 'generate' | 'analyzing' | 'editing';

// Reusable Chip Component
const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
      ${selected
        ? 'bg-primary text-white shadow-glow-accent transform scale-105'
        : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }
    `}
  >
    {label}
  </button>
);

const AddItemView = ({ onAddLocalItem, onClosetSync, onBack, useSupabaseCloset }: AddItemViewProps) => {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>('capture');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [backImageDataUrl, setBackImageDataUrl] = useState<string | null>(null);
  const [itemStatus, setItemStatus] = useState<'owned' | 'wishlist' | 'virtual'>('owned');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [capturingBack, setCapturingBack] = useState(false);
  const [metadata, setMetadata] = useState<ClothingItemMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showQuickEraser, setShowQuickEraser] = useState(false);
  const [wasAnalyzedByAI, setWasAnalyzedByAI] = useState(false);
  const [analysisLabel, setAnalysisLabel] = useState<'auto' | 'manual'>('auto');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Subscription hook for tracking usage
  const subscription = useSubscription();
  const enableOnDemandClosetAI = useFeatureFlag('enableOnDemandClosetAI');

  // Success feedback for save confirmation
  const successFeedback = useSuccessFeedback();

  // Photo guidance system
  const [hasSeenGuidance, setHasSeenGuidance] = useLocalStorage('ojodeloca-photo-guidance-seen', false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [photoQualityWarnings, setPhotoQualityWarnings] = useState<string[]>([]);
  const imageUploadCounter = useRef(0);
  const localItemCounter = useRef(0);

  // Predefined options for chips
  const SEASONS = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Todo el año'];
  const VIBES = ['Casual', 'Formal', 'Deportivo', 'Fiesta', 'Trabajo', 'Streetwear', 'Vintage', 'Minimalista', 'Boho', 'Chic'];

  const createDraftMetadata = (seed?: string): ClothingItemMetadata => ({
    category: 'top',
    subcategory: (seed || 'Prenda sin analizar').slice(0, 50),
    color_primary: 'por definir',
    vibe_tags: [],
    seasons: [],
  });

  // Show guidance modal on first visit
  useEffect(() => {
    if (!hasSeenGuidance) {
      setShowGuidance(true);
    }
  }, [hasSeenGuidance]);

  useEffect(() => {
    if (viewState !== 'editing') {
      setShowQuickEraser(false);
    }
  }, [viewState]);

  const processImageDataUrl = async (url: string, file?: File) => {
    const validationResult = validateImageDataUri(url);
    if (!validationResult.isValid) {
      setError(validationResult.error || 'Imagen inválida');
      setViewState('capture');
      setImageFile(null);
      return;
    }

    // Analyze photo quality
    try {
      const qualityResult = await analyzePhotoQuality(url);
      setPhotoQualityWarnings(qualityResult.warnings);
    } catch (err) {
      console.error('Quality analysis error:', err);
      setPhotoQualityWarnings([]);
    }

    if (capturingBack) {
      setBackImageDataUrl(url);
      setBackImageFile(file || null);
      setViewState('editing');
      setCapturingBack(false);
    } else {
      setImageDataUrl(url);
      setImageFile(file || null);
      setWasAnalyzedByAI(false);
      if (enableOnDemandClosetAI) {
        setMetadata(createDraftMetadata());
        setViewState('editing');
      } else {
        // Skip preview and go straight to analyzing
        setAnalysisLabel('auto');
        setViewState('analyzing');
        handleAnalysisProcess(url);
      }
    }
    setError(null);
  };

  const handleAnalysisProcess = async (initialUrl: string, onErrorView: ViewState = 'capture') => {
    // Check if user can use AI feature before proceeding
    const canUseStatus = subscription.canUseAIFeature('clothing_analysis');
    if (!canUseStatus.canUse) {
      setShowLimitModal(true);
      return;
    }

    try {
      // Run background removal and tagging in parallel for speed
      const [aiMetadata, transparentImageUrl] = await Promise.all([
        aiService.analyzeClothingItem(initialUrl),
        removeImageBackground(initialUrl).catch(err => {
          console.error('Non-fatal BG removal error:', err);
          return initialUrl; // Fallback to original if bg removal fails
        })
      ]);

      setImageDataUrl(transparentImageUrl);
      setMetadata(aiMetadata);
      setWasAnalyzedByAI(true);
      setViewState('editing');

      // Source of truth is backend credits; refresh local counters.
      await subscription.refresh();
    } catch (err) {
      console.error('Analysis error:', err);

      const errorInfo = getErrorMessage(err, undefined, {
        retakePhoto: handleRetakePhoto,
        showPhotoGuide: () => setShowGuidance(true)
      });

      setError(errorInfo.message);
      setViewState(onErrorView);
    }
  };

  const handleRetakePhoto = () => {
    if (capturingBack) {
      setBackImageDataUrl(null);
      setBackImageFile(null);
    } else {
      setImageDataUrl(null);
      setImageFile(null);
    }
    setWasAnalyzedByAI(false);
    setPhotoQualityWarnings([]);
    setViewState('capture');
  };

  const openGalleryPicker = (options?: { back?: boolean }) => {
    setCapturingBack(Boolean(options?.back));
    galleryInputRef.current?.click();
  };

  const openCameraPicker = (options?: { back?: boolean }) => {
    setCapturingBack(Boolean(options?.back));
    cameraInputRef.current?.click();
  };

  const openBulkUpload = () => {
    onBack();
    navigate(ROUTES.BULK_UPLOAD);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        await processImageDataUrl(url, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setViewState('analyzing');
    setError(null);
    try {
      const generatedImageUrl = await aiService.generateClothingImage(prompt);
      const validationResult = validateImageDataUri(generatedImageUrl);
      if (!validationResult.isValid) {
        setError(validationResult.error || 'Imagen generada inválida');
        setViewState('generate');
        return;
      }
      if (enableOnDemandClosetAI) {
        setImageDataUrl(generatedImageUrl);
        setImageFile(null);
        setBackImageDataUrl(null);
        setBackImageFile(null);
        setMetadata(createDraftMetadata(prompt));
        setWasAnalyzedByAI(false);
        setViewState('editing');
      } else {
        setAnalysisLabel('auto');
        handleAnalysisProcess(generatedImageUrl);
      }
    } catch (err) {
      setError('Error al generar imagen. Intenta otro prompt.');
      setViewState('generate');
    }
  };

  const handleSave = async () => {
    if (!imageDataUrl || !metadata) return;
    try {
      setIsSaving(true);
      let newItemId: string | null = null;
      let nextClosetSize = closetSizeBaseline() + 1;

      if (useSupabaseCloset) {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const fileName = imageFile?.name || `item_${++imageUploadCounter.current}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        const savedItem = await addClothingItem(
          file,
          metadata,
          backImageFile || undefined,
          itemStatus,
          wasAnalyzedByAI ? 'ready' : 'pending',
        );
        newItemId = savedItem.id;

        const updatedCloset = await getClothingItems();
        nextClosetSize = updatedCloset.filter(item => (item.status || 'owned') === 'owned').length;
        onClosetSync(updatedCloset);
      } else {
        const newItem: ClothingItem = {
          id: `${++localItemCounter.current}`,
          imageDataUrl,
          metadata,
          status: itemStatus
        };
        newItemId = newItem.id;
        onAddLocalItem(newItem);
      }

      // Show success feedback before closing
      setIsSaving(false);
      const successMessage = itemStatus === 'virtual'
        ? '¡Listo para probar!'
        : itemStatus === 'wishlist'
          ? 'En wishlist'
          : '¡Prenda guardada!';
      successFeedback.show(successMessage, 'checkroom');

      if (itemStatus === 'owned') {
        analytics.trackOwnedItemAdded(nextClosetSize);
        if (nextClosetSize >= 8) {
          analytics.trackFirstEightItemsReached(nextClosetSize);
        }
      }

      // Wait for animation then close or navigate
      setTimeout(() => {
        if (itemStatus === 'virtual' || itemStatus === 'wishlist') {
          // Close the modal first
          onBack();
          // Navigate to Studio for quick try-on with explicit tab state
          const studioState: { tab: 'virtual'; preselectedItemIds?: string[] } = { tab: 'virtual' };
          if (newItemId) {
            studioState.preselectedItemIds = [newItemId];
          }
          navigate(ROUTES.STUDIO, { state: studioState });
        } else {
          onBack();
        }
      }, 1000);

    } catch (saveError) {
      console.error('Error saving item:', saveError);

      // Use comprehensive error message system
      const errorInfo = getErrorMessage(saveError, undefined, {
        retry: () => handleSave()
      });

      setError(errorInfo.message);
      setIsSaving(false);
    }
  };

  const updateMetadataField = <K extends keyof ClothingItemMetadata>(field: K, value: ClothingItemMetadata[K]) => {
    if (metadata) {
      setMetadata({ ...metadata, [field]: value });
    }
  };

  const toggleArrayField = (field: 'vibe_tags' | 'seasons', value: string) => {
    if (!metadata) return;
    const currentArray = metadata[field] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateMetadataField(field, newArray);
  };

  const closetSizeBaseline = () => {
    try {
      const raw = localStorage.getItem('ojodeloca-closet');
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as ClothingItem[];
      if (!Array.isArray(parsed)) return 0;
      return parsed.filter((item) => (item.status || 'owned') === 'owned').length;
    } catch {
      return 0;
    }
  };

  const renderContent = () => {
    switch (viewState) {
      case 'capture':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-[34rem] flex-col items-center justify-center p-6 text-center sm:p-8"
          >
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-pulse-glow">
              <span className="material-symbols-outlined text-4xl text-primary">checkroom</span>
            </div>
            <div className="max-w-md">
              <h2 className="mb-2 text-3xl font-serif font-bold text-text-primary dark:text-gray-100">
                Agregar prenda
              </h2>
              <p className="mx-auto max-w-sm text-text-secondary dark:text-gray-400">
                Elegí una foto desde tu biblioteca o sacá una nueva. En iPad conviene priorizar Fotos para adjuntar imágenes que ya tenés.
              </p>
            </div>

            <button
              onClick={() => setShowGuidance(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <span className="material-symbols-outlined text-lg">help</span>
              Tips para Fotos Perfectas
            </button>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 w-full max-w-lg space-y-3">
              <TooltipWrapper content="Elegí una imagen existente desde Fotos o Archivos" position="bottom">
                <button
                  onClick={() => openGalleryPicker()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-glow-accent transition-all hover:scale-[1.02] hover:bg-primary-dark"
                >
                  <span className="material-symbols-outlined">photo_library</span>
                  Elegir foto
                </button>
              </TooltipWrapper>

              <TooltipWrapper content="Abrí la cámara del dispositivo para sacar una foto nueva" position="bottom">
                <button
                  onClick={() => openCameraPicker()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 font-bold text-text-primary transition-all hover:scale-[1.02] hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  Abrir cámara
                </button>
              </TooltipWrapper>

              <TooltipWrapper content="Subí varias fotos, analizalas juntas y guardalas de una sola vez" position="bottom">
                <button
                  onClick={openBulkUpload}
                  className="flex w-full items-center justify-between rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-5 py-4 text-left transition-colors hover:bg-primary/10"
                >
                  <div>
                    <p className="text-sm font-semibold text-text-primary dark:text-gray-100">Escaneo masivo</p>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      Sacá varias fotos, subilas juntas y después analizá/guardá todo en lote.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                </button>
              </TooltipWrapper>

              <input
                type="file"
                accept="image/*"
                ref={galleryInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100">
                Si la foto es de un look completo o la ropa está puesta, la clasificación de cada prenda puede bajar un poco. Para guardar prendas separadas sigue funcionando mejor una foto por prenda.
              </div>

              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-left text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
                Primero cargá tus prendas reales. El escaneo masivo ya permite subir hasta 30 fotos y procesarlas antes de guardar.
              </div>
            </div>
          </motion.div>
        );

      case 'generate':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 h-full flex flex-col"
          >
            <h2 className="text-2xl font-serif font-bold mb-6 dark:text-gray-100">Describe tu prenda</h2>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

            <div className="flex-grow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: Una chaqueta de cuero negra estilo biker con cremalleras plateadas..."
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-text-primary dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none h-48"
              />
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">Sugerencias:</span>
                {['Vestido rojo de verano', 'Jeans vintage', 'Camisa blanca lino'].map(s => (
                  <button key={s} onClick={() => setPrompt(s)} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={!prompt}
              className="w-full bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent mt-4 transition-all"
            >
              Generar Prenda
            </button>
          </motion.div>
        );

      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              {imageDataUrl && (
                <div className="absolute inset-2 rounded-full overflow-hidden">
                  <img src={imageDataUrl} className="w-full h-full object-cover opacity-50" alt="analyzing" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 mb-2 animate-pulse">
              {analysisLabel === 'manual' ? 'Analizando prenda...' : 'Analizando y eliminando fondo...'}
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm max-w-xs">
              {analysisLabel === 'manual'
                ? 'La IA está completando categoría, color y tags de estilo.'
                : 'Nuestra IA está preparando la prenda, detectando colores, categoría y estilo. ¡Casi listo!'}
            </p>
          </div>
        );

      case 'editing':
        if (!imageDataUrl || !metadata) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full"
          >
            {/* Image Preview Header */}
            <div className="relative h-64 shrink-0 overflow-hidden">
              <div className="flex w-full h-full">
                <div className="relative w-full h-full">
                  <img src={imageDataUrl} alt="front view" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs uppercase font-bold">Frente</div>
                </div>
                {backImageDataUrl && (
                  <div className="relative w-full h-full border-l border-white/20">
                    <img src={backImageDataUrl} alt="back view" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs uppercase font-bold">Espalda</div>
                    <button
                      onClick={() => setBackImageDataUrl(null)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
                <div className="flex-grow">
                  <h2 className="text-white text-2xl font-serif font-bold capitalize">
                    {metadata.subcategory}
                  </h2>
                  <p className="text-white/80 text-sm capitalize">
                    {metadata.color_primary} • {metadata.category}
                  </p>
                  <button
                    onClick={() => setShowQuickEraser(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">brush</span>
                    Retoque rápido
                  </button>
                </div>
                {!backImageDataUrl && (
                  <button
                    onClick={() => openGalleryPicker({ back: true })}
                    className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors flex flex-col items-center gap-1 group"
                  >
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_a_photo</span>
                    <span className="text-xs font-bold">ESPALDA</span>
                  </button>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white dark:bg-gray-900 rounded-t-3xl -mt-6 relative z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-left dark:border-amber-700/50 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-amber-700 dark:text-amber-300">info</span>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      Precisión de clasificación
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Si la prenda está puesta en una foto de look completo, la lectura de categoría y detalles puede perder precisión. Para sumar prendas separadas al armario, sigue rindiendo mejor una foto por prenda.
                    </p>
                    {photoQualityWarnings.length > 0 && (
                      <ul className="space-y-1 pt-1 text-xs text-amber-800 dark:text-amber-200">
                        {photoQualityWarnings.map((warning) => (
                          <li key={warning} className="flex items-start gap-2">
                            <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600 dark:bg-amber-300" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {!backImageDataUrl && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">¿Tenés la espalda de esta prenda?</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Sumar la vista trasera ayuda a la IA a que los looks de espalda sean perfectos y realistas.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => openGalleryPicker({ back: true })}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
                      >
                        Elegir foto
                      </button>
                      <button
                        onClick={() => openCameraPicker({ back: true })}
                        className="rounded-xl border border-primary/20 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                      >
                        Abrir cámara
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {enableOnDemandClosetAI && (
                <div className="bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      IA opcional para autocompletar metadata
                    </p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {wasAnalyzedByAI
                        ? 'Esta prenda ya fue analizada. Podés re-analizar si cambiaste la foto.'
                        : 'Podés guardar rápido ahora y analizar después desde tu armario.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (!imageDataUrl) return;
                      setAnalysisLabel('manual');
                      setViewState('analyzing');
                      void handleAnalysisProcess(imageDataUrl, 'editing');
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    {wasAnalyzedByAI ? 'Re-analizar' : 'Analizar ahora'}
                  </button>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                  Información Básica
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">Categoría</span>
                    <input
                      type="text"
                      value={metadata.subcategory}
                      onChange={e => updateMetadataField('subcategory', e.target.value)}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500">Color</span>
                    <input
                      type="text"
                      value={metadata.color_primary}
                      onChange={e => updateMetadataField('color_primary', e.target.value)}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-text-primary dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Vibes / Style */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                  Estilo & Ocasión
                </label>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map(vibe => (
                    <Chip
                      key={vibe}
                      label={vibe}
                      selected={metadata?.vibe_tags.includes(vibe) || false}
                      onClick={() => toggleArrayField('vibe_tags', vibe)}
                    />
                  ))}
                  {/* Add custom vibe input could go here */}
                </div>
              </div>

              {/* Seasons */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-text-secondary dark:text-gray-400 uppercase tracking-wider">
                  Temporada
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map(season => (
                    <Chip
                      key={season}
                      label={season}
                      selected={metadata?.seasons.includes(season) || false}
                      onClick={() => toggleArrayField('seasons', season)}
                    />
                  ))}
                </div>
              </div>

              {/* Details (Collapsible or Grid) */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <input
                  type="text"
                  value={metadata.neckline || ''}
                  onChange={e => updateMetadataField('neckline', e.target.value)}
                  placeholder="Tipo de cuello"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none text-sm"
                />
                <input
                  type="text"
                  value={metadata.sleeve_type || ''}
                  onChange={e => updateMetadataField('sleeve_type', e.target.value)}
                  placeholder="Tipo de manga"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none text-sm"
                />
              </div>

              {/* Save Buttons */}
              <div className="pt-4 pb-8 space-y-3">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-text-secondary dark:text-gray-300">
                  Se guardará como prenda propia dentro de tu armario. Los modos virtuales y wishlist quedan fuera del primer flujo de carga.
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-primary text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">check</span>
                      Guardar en Armario
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        style={{
          padding: 'max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex w-full max-w-[42rem] flex-col overflow-hidden bg-white/95 shadow-2xl liquid-glass dark:bg-gray-900 md:max-w-2xl"
          style={{
            maxHeight: 'min(92vh, calc(100dvh - 1.5rem))',
            height: viewState === 'editing' || viewState === 'generate' || viewState === 'analyzing'
              ? 'min(92vh, calc(100dvh - 1.5rem))'
              : 'auto',
          }}
        >
          {/* Header (only show back button if not in capture mode or if needed) */}
          {viewState !== 'capture' && viewState !== 'preview' && (
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center pointer-events-none">
              <button
                onClick={() => {
                  if (viewState === 'editing') setViewState('capture');
                  else if (viewState === 'generate') setViewState('capture');
                  else onBack();
                }}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg pointer-events-auto hover:bg-white/30 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            </div>
          )}

          {/* Header with credits indicator and close button */}
          {viewState === 'capture' && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
              <CreditsIndicator variant="compact" />
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          <div className="flex-grow overflow-hidden relative">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Photo Guidance Modal */}
      <AnimatePresence>
        {showGuidance && (
          <PhotoGuidanceModal
            onClose={() => {
              setShowGuidance(false);
              setHasSeenGuidance(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          // Could trigger upgrade flow here
        }}
        tier={subscription.tier}
      />

      {/* Success Feedback Animation */}
      <SuccessFeedback
        isVisible={successFeedback.isVisible}
        message={successFeedback.message}
        icon={successFeedback.icon}
        onComplete={successFeedback.hide}
      />

      <AnimatePresence>
        {showQuickEraser && (
          <QuickEraserModal
            isOpen={showQuickEraser}
            imageDataUrl={imageDataUrl}
            onClose={() => setShowQuickEraser(false)}
            onApply={(editedImageDataUrl) => {
              setImageDataUrl(editedImageDataUrl);
              setShowQuickEraser(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AddItemView;
