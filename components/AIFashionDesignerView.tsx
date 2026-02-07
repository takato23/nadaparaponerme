import React, { useState, useEffect } from 'react';
import { aiImageService } from '../src/services/aiImageService';
import type { AIGeneratedImage } from '../src/types/api';
import Loader from './Loader';
import { Card } from './ui/Card';

type ViewStep = 'describe' | 'generating' | 'result';

interface AIFashionDesignerViewProps {
  onClose: () => void;
  onAddToCloset: (imageDataUrl: string, metadata: any) => void;
  onShowHistory: () => void;
}

const AIFashionDesignerView = ({ onClose, onAddToCloset, onShowHistory }: AIFashionDesignerViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('describe');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Form state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('top');
  const [season, setSeason] = useState<string>('');
  const [occasion, setOccasion] = useState('');

  // Quota state
  const [remainingQuota, setRemainingQuota] = useState<number>(3);
  const [quotaLimit, setQuotaLimit] = useState<number>(3);
  const [planType, setPlanType] = useState<string>('free');

  // Recent generations
  const [recentGenerations, setRecentGenerations] = useState<AIGeneratedImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory'];
  const SEASONS = ['spring', 'summer', 'fall', 'winter'];

  // Load quota and recent generations on mount
  useEffect(() => {
    void loadQuota();
    void loadRecentGenerations();
  }, []);

  const loadQuota = async () => {
    try {
      const quota = await aiImageService.checkDailyQuota();
      setRemainingQuota(quota.remaining);
      setQuotaLimit(quota.limit);
      setPlanType(quota.plan_type);
    } catch (error) {
      console.error('Error loading quota:', error);
    }
  };

  const loadRecentGenerations = async () => {
    setLoadingHistory(true);
    try {
      const history = await aiImageService.getGenerationHistory(6);
      setRecentGenerations(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Por favor describí la prenda que querés diseñar');
      return;
    }

    if (remainingQuota <= 0) {
      setError('Has alcanzado tu límite diario de créditos');
      return;
    }

    setError('');
    setCurrentStep('generating');

    try {
      const result = await aiImageService.generateFashionImage(description.trim(), {
        category,
        season: season || undefined,
        occasion: occasion.trim() || undefined,
      });

      if (result.success && result.image_url) {
        setGeneratedImageUrl(result.image_url);
        setGeneratedPrompt(description.trim());
        setCurrentStep('result');

        // Update quota
        if (result.remaining_quota !== undefined) {
          setRemainingQuota(result.remaining_quota);
        } else {
          await loadQuota();
        }

        // Refresh recent generations
        await loadRecentGenerations();
      } else {
        throw new Error(result.error || 'Error al generar la imagen');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
      setError(errorMessage);
      setCurrentStep('describe');
    }
  };

  const handleAddToCloset = async () => {
    if (!generatedImageUrl) return;

    try {
      await aiImageService.saveToCloset(generatedImageUrl, generatedPrompt, {
        category,
        season: season || undefined,
        occasion: occasion.trim() || undefined,
      });
      onAddToCloset(generatedImageUrl, {
        category,
        subcategory: 'AI Generated',
        color_primary: '#000000',
        vibe_tags: ['ai-generated'],
        seasons: season ? [season] : ['spring', 'summer', 'fall', 'winter'],
      });
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar';
      setError(errorMessage);
    }
  };

  const handleReset = () => {
    setGeneratedImageUrl('');
    setGeneratedPrompt('');
    setDescription('');
    setCategory('top');
    setSeason('');
    setOccasion('');
    setError('');
    setCurrentStep('describe');
  };

  const handleViewHistory = (image: AIGeneratedImage) => {
    setGeneratedImageUrl(image.image_url);
    setGeneratedPrompt(image.prompt);
    setCurrentStep('result');
  };

  // Render Describe Step
  if (currentStep === 'describe') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <Card
          variant="glass"
          padding="none"
          rounded="3xl"
          className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                AI Fashion Designer
              </h2>
              <div className="flex items-center gap-3">
                {/* Quota Display */}
                <div className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  💎 {remainingQuota}/{quotaLimit} hoy
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Hero Card */}
            <Card variant="glass" padding="lg" rounded="2xl" className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">auto_awesome</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Diseñá tu prenda ideal con IA
              </h3>
              <p className="text-text-secondary dark:text-gray-400">
                Describí la prenda que imaginás y nuestra IA la generará con calidad fotográfica
                profesional.
              </p>
            </Card>

            {/* Form */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                  Descripción de la prenda *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ej: Camisa blanca de lino con botones de madera y cuello mao..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              {/* Category & Season */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent capitalize"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                    Temporada (opcional)
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent capitalize"
                  >
                    <option value="">Todas</option>
                    {SEASONS.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Occasion (Optional) */}
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                  Ocasión (opcional)
                </label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="ej: trabajo, fiesta, casual..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || remainingQuota <= 0}
              className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {remainingQuota <= 0 ? 'Límite diario alcanzado' : 'Generar Diseño con IA'}
            </button>

            {/* Recent Generations */}
            {recentGenerations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-text-primary dark:text-gray-200">
                    Generaciones Recientes
                  </h3>
                  <button
                    onClick={onShowHistory}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Ver todas
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {recentGenerations.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => handleViewHistory(img)}
                        className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      >
                        <img
                          src={img.image_url}
                          alt={img.prompt}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Render Generating Step
  if (currentStep === 'generating') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <Card
          variant="glass"
          padding="lg"
          rounded="3xl"
          className="bg-white dark:bg-gray-900 w-full max-w-md text-center"
        >
          <Loader />
          <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mt-6 mb-2">
            Generando tu diseño...
          </h3>
          <div className="space-y-2 text-text-secondary dark:text-gray-400 text-sm">
            <p>🎨 Optimizando prompt con IA...</p>
            <p>🖼️ Generando imagen con Imagen 4...</p>
            <p>🔍 Analizando metadata de la prenda...</p>
          </div>
          <p className="text-xs text-text-secondary dark:text-gray-500 mt-4">
            Esto puede tardar 10-30 segundos
          </p>
        </Card>
      </div>
    );
  }

  // Render Result Step
  if (currentStep === 'result' && generatedImageUrl) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <Card
          variant="glass"
          padding="none"
          rounded="3xl"
          className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                Tu Diseño Generado
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Generated Image */}
            <Card variant="glass" padding="none" rounded="2xl" className="overflow-hidden">
              <img src={generatedImageUrl} alt={generatedPrompt} className="w-full h-auto" />
            </Card>

            {/* Prompt Details */}
            <Card variant="glass" padding="md" rounded="2xl">
              <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3">
                Descripción Original
              </h3>
              <p className="text-text-secondary dark:text-gray-300 text-sm">{generatedPrompt}</p>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCloset}
                className="flex-1 p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">add</span>
                  Guardar en mi Closet
                </span>
              </button>
              <button
                onClick={handleReset}
                className="flex-1 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">refresh</span>
                  Generar Otro
                </span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default AIFashionDesignerView;
