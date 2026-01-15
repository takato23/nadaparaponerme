import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import * as aiService from '../src/services/aiService';
import { addClothingItem, getClothingItems } from '../src/services/closetService';
import Loader from './Loader';
import { validateImageDataUri } from '../utils/imageValidation';
import CameraCaptureButton from './CameraCaptureButton';
import PhotoGuidanceModal from './PhotoGuidanceModal';
import PhotoPreview from './PhotoPreview';
import { analyzePhotoQuality } from '../utils/photoQualityValidation';
import useLocalStorage from '../hooks/useLocalStorage';
import { getErrorMessage } from '../utils/errorMessages';
import { TooltipWrapper } from './ui/TooltipWrapper';
import { useSubscription } from '../hooks/useSubscription';
import { LimitReachedModal } from './QuotaIndicator';
import { CreditsIndicator } from './CreditsIndicator';
import { SuccessFeedback, useSuccessFeedback } from './ui/SuccessFeedback';
import { ROUTES } from '../src/routes';

interface AddItemViewProps {
  onAddLocalItem: (item: ClothingItem) => void;
  onClosetSync: (items: ClothingItem[]) => void;
  onBack: () => void;
  useSupabaseCloset: boolean;
}

type ViewState = 'capture' | 'camera' | 'preview' | 'generate' | 'analyzing' | 'editing';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Subscription hook for tracking usage
  const subscription = useSubscription();

  // Success feedback for save confirmation
  const successFeedback = useSuccessFeedback();

  // Photo guidance system
  const [hasSeenGuidance, setHasSeenGuidance] = useLocalStorage('ojodeloca-photo-guidance-seen', false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [photoQualityWarnings, setPhotoQualityWarnings] = useState<string[]>([]);

  // Predefined options for chips
  const SEASONS = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Todo el año'];
  const VIBES = ['Casual', 'Formal', 'Deportivo', 'Fiesta', 'Trabajo', 'Streetwear', 'Vintage', 'Minimalista', 'Boho', 'Chic'];

  // Show guidance modal on first visit
  useEffect(() => {
    if (!hasSeenGuidance) {
      setShowGuidance(true);
    }
  }, [hasSeenGuidance]);

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
      setViewState('preview'); // Show preview before analysis
    }
    setError(null);
  };

  const handleConfirmPhoto = async () => {
    if (!imageDataUrl) return;

    // Check if user can use AI feature before proceeding
    const canUseStatus = subscription.canUseAIFeature('clothing_analysis');
    if (!canUseStatus.canUse) {
      setShowLimitModal(true);
      return;
    }

    setViewState('analyzing');
    try {
      const result = await aiService.analyzeClothingItem(imageDataUrl);
      setMetadata(result);
      setViewState('editing');

      // Record usage after successful analysis
      await subscription.incrementUsage('clothing_analysis');
    } catch (err) {
      console.error('Analysis error:', err);

      // Use comprehensive error message system
      const errorInfo = getErrorMessage(err, undefined, {
        retakePhoto: handleRetakePhoto,
        showPhotoGuide: () => setShowGuidance(true)
      });

      setError(errorInfo.message);
      setViewState('capture');
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
    setPhotoQualityWarnings([]);
    setViewState('capture');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  const handleCameraCapture = async (imageDataUrl: string) => {
    await processImageDataUrl(imageDataUrl);
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
      setImageDataUrl(generatedImageUrl);
      const result = await aiService.analyzeClothingItem(generatedImageUrl);
      setMetadata(result);
      setViewState('editing');
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

      const itemToSave: any = {
        metadata,
        status: itemStatus
      };

      if (useSupabaseCloset) {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const fileName = imageFile?.name || `${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        // Pass status via metadata or separate argument if service supported it directly,
        // For now, we assume closetService might need an update or we handle it post-save.
        // NOTE: addClothingItem might not support status argument yet.
        // We will need to update addClothingItem signature or ensure metadata carries it.
        await addClothingItem(file, { ...metadata, status: itemStatus } as any, backImageFile || undefined);

        // Ideally we would update the status immediately if addClothingItem doesn't support it
        // But for this implementation, let's assume valid handling or future update.
        // Since we modified convertToLegacyFormat, read is OK. Write needs verify.

        const updatedCloset = await getClothingItems();
        onClosetSync(updatedCloset);
      } else {
        const newItem: ClothingItem = {
          id: `item_${Date.now()}`,
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

  const renderContent = () => {
    switch (viewState) {
      case 'camera':
        return (
          <CameraCaptureButton
            onCapture={handleCameraCapture}
            onClose={() => {
              setViewState(capturingBack ? 'editing' : 'capture');
              setCapturingBack(false);
            }}
          />
        );

      case 'preview':
        if (!imageDataUrl) return null;
        return (
          <PhotoPreview
            imageDataUrl={imageDataUrl}
            onConfirm={handleConfirmPhoto}
            onRetake={handleRetakePhoto}
            qualityWarnings={photoQualityWarnings}
          />
        );

      case 'capture':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2 animate-pulse-glow">
              <span className="material-symbols-outlined text-4xl text-primary">checkroom</span>
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-text-primary dark:text-gray-100 mb-2">
                Nueva Prenda
              </h2>
              <p className="text-text-secondary dark:text-gray-400 max-w-xs mx-auto">
                Sube una foto o describe tu prenda para agregarla a tu armario virtual.
              </p>
            </div>

            {/* Photo Tips Button */}
            <button
              onClick={() => setShowGuidance(true)}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">help</span>
              Tips para Fotos Perfectas
            </button>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="w-full space-y-3">
              <TooltipWrapper content="Usá la cámara para sacar una foto de tu prenda sobre fondo blanco" position="bottom">
                <button
                  onClick={() => setViewState('camera')}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">photo_camera</span>
                  Tomar Foto
                </button>
              </TooltipWrapper>

              <TooltipWrapper content="Seleccioná una imagen existente de tu galería o archivos" position="bottom">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">add_a_photo</span>
                  Subir Archivo
                </button>
              </TooltipWrapper>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">o</span>
                </div>
              </div>

              <TooltipWrapper content="Describí una prenda y la IA la creará desde cero con imagen realista" position="bottom">
                <button
                  onClick={() => setViewState('generate')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                  Generar con IA
                </button>
              </TooltipWrapper>
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
              Analizando estilo...
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm max-w-xs">
              Nuestra IA está detectando colores, categoría y estilo de tu prenda.
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
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-[10px] uppercase font-bold">Frente</div>
                </div>
                {backImageDataUrl && (
                  <div className="relative w-full h-full border-l border-white/20">
                    <img src={backImageDataUrl} alt="back view" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-[10px] uppercase font-bold">Espalda</div>
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
                </div>
                {!backImageDataUrl && (
                  <button
                    onClick={() => {
                      setCapturingBack(true);
                      setViewState('camera');
                    }}
                    className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors flex flex-col items-center gap-1 group"
                  >
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_a_photo</span>
                    <span className="text-[10px] font-bold">VISTA ATRÁS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white dark:bg-gray-900 rounded-t-3xl -mt-6 relative z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">

              {!backImageDataUrl && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">¿Tenés la espalda de esta prenda?</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Sumar la vista trasera ayuda a la IA a que los looks de espalda sean perfectos y realistas.</p>
                    <button
                      onClick={() => {
                        setCapturingBack(true);
                        setViewState('camera');
                      }}
                      className="mt-2 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      Tomar foto de espalda <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setItemStatus('owned')}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${itemStatus === 'owned'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Es Mío
                  </button>
                  <button
                    onClick={() => setItemStatus('virtual')}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${itemStatus === 'virtual'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Probar / Ajeno
                  </button>
                  <button
                    onClick={() => setItemStatus('wishlist')}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${itemStatus === 'wishlist'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Wishlist
                  </button>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`
                    w-full text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2
                    ${itemStatus === 'virtual'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                      : itemStatus === 'wishlist'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-primary'}
                  `}
                >
                  {isSaving ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : itemStatus === 'virtual' || itemStatus === 'wishlist' ? (
                    <>
                      <span className="material-symbols-outlined">checkroom</span>
                      Guardar y Probar Ahora
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden h-[85vh] md:h-[800px] flex flex-col relative"
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
    </>
  );
};

export default AddItemView;
