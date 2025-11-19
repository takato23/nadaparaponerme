import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import * as aiService from '../src/services/aiService';
import { addClothingItem, getClothingItems } from '../src/services/closetService';
import Loader from './Loader';
import { validateImageDataUri } from '../utils/imageValidation';

interface AddItemViewProps {
  onAddLocalItem: (item: ClothingItem) => void;
  onClosetSync: (items: ClothingItem[]) => void;
  onBack: () => void;
  useSupabaseCloset: boolean;
}

type ViewState = 'capture' | 'generate' | 'analyzing' | 'editing';

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
  const [viewState, setViewState] = useState<ViewState>('capture');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ClothingItemMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined options for chips
  const SEASONS = ['Verano', 'Invierno', 'Otoño', 'Primavera', 'Todo el año'];
  const VIBES = ['Casual', 'Formal', 'Deportivo', 'Fiesta', 'Trabajo', 'Streetwear', 'Vintage', 'Minimalista', 'Boho', 'Chic'];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const validationResult = validateImageDataUri(url);
        if (!validationResult.isValid) {
          setError(validationResult.error || 'Imagen inválida');
          setViewState('capture');
          setImageFile(null);
          return;
        }
        setImageDataUrl(url);
        setViewState('analyzing');
        setError(null);
        try {
          const result = await aiService.analyzeClothingItem(url);
          setMetadata(result);
          setViewState('editing');
        } catch (err) {
          console.error('Analysis error:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit');
          if (isRateLimit) {
            setError('⏱️ Límite de análisis alcanzado. Espera un momento.');
          } else {
            setError('Error al analizar la imagen. Intenta de nuevo.');
          }
          setViewState('capture');
        }
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
      if (useSupabaseCloset) {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const fileName = imageFile?.name || `${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        await addClothingItem(file, metadata);
        const updatedCloset = await getClothingItems();
        onClosetSync(updatedCloset);
      } else {
        const newItem: ClothingItem = {
          id: `item_${Date.now()}`,
          imageDataUrl,
          metadata,
        };
        onAddLocalItem(newItem);
      }
      onBack();
    } catch (saveError) {
      console.error('Error saving item:', saveError);
      alert('Error al guardar la prenda');
    } finally {
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

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="w-full space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add_a_photo</span>
                Subir Foto
              </button>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">o</span>
                </div>
              </div>

              <button
                onClick={() => setViewState('generate')}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                Generar con IA
              </button>
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
            <div className="relative h-64 shrink-0">
              <img src={imageDataUrl} alt="clothing item" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div>
                  <h2 className="text-white text-2xl font-serif font-bold capitalize">
                    {metadata.subcategory}
                  </h2>
                  <p className="text-white/80 text-sm capitalize">
                    {metadata.color_primary} • {metadata.category}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white dark:bg-gray-900 rounded-t-3xl -mt-6 relative z-10">

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

              {/* Save Button */}
              <div className="pt-4 pb-8">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden h-[85vh] md:h-[800px] flex flex-col relative"
      >
        {/* Header (only show back button if not in capture mode or if needed) */}
        {viewState !== 'capture' && (
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

        {/* Close button for main view */}
        {viewState === 'capture' && (
          <button
            onClick={onBack}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-20"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}

        <div className="flex-grow overflow-hidden relative">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AddItemView;
