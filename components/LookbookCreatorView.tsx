import React, { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem, Lookbook, LookbookTheme } from '../types';
import { generateLookbook } from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';
import { getCreditStatus } from '../services/usageTrackingService';

interface LookbookCreatorViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

type ViewStep = 'select' | 'generating' | 'result';

const LookbookCreatorView = ({ closet, onClose }: LookbookCreatorViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('select');
  const [selectedTheme, setSelectedTheme] = useState<LookbookTheme | null>(null);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [lookbook, setLookbook] = useState<Lookbook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const lookbookRef = useRef<HTMLDivElement>(null);

  // Credits status
  const credits = useMemo(() => getCreditStatus(), [lookbook]);

  const themes: { id: LookbookTheme; label: string; icon: string; description: string }[] = [
    { id: 'office', label: 'Oficina', icon: 'work', description: 'Looks profesionales para el trabajo' },
    { id: 'weekend', label: 'Fin de Semana', icon: 'weekend', description: 'Outfits casuales y relajados' },
    { id: 'date_night', label: 'Noche de Cita', icon: 'favorite', description: 'Looks románticos y especiales' },
    { id: 'casual', label: 'Casual', icon: 'person', description: 'Versátiles para el día a día' },
    { id: 'formal', label: 'Formal', icon: 'event', description: 'Elegancia para eventos especiales' },
    { id: 'travel', label: 'Viaje', icon: 'flight', description: 'Cómodos y prácticos para viajar' },
    { id: 'custom', label: 'Personalizado', icon: 'edit', description: 'Tu propio tema' },
  ];

  const handleThemeSelect = (theme: LookbookTheme) => {
    setSelectedTheme(theme);
    if (theme !== 'custom') {
      handleGenerate(theme, null);
    }
  };

  const handleCustomThemeGenerate = () => {
    if (!customThemeInput.trim()) return;
    handleGenerate('custom', customThemeInput);
  };

  const handleGenerate = async (theme: LookbookTheme, customTheme: string | null) => {
    setCurrentStep('generating');
    setError(null);

    try {
      const result = await generateLookbook(theme, customTheme, closet);
      setLookbook(result);
      setCurrentStep('result');
    } catch (err) {
      console.error('Error generating lookbook:', err);
      setError(err instanceof Error ? err.message : 'Error al generar lookbook');
      setCurrentStep('select');
    }
  };

  const handleExportImage = async () => {
    if (!lookbookRef.current) return;

    setIsExporting(true);
    try {
      // Lazy load html-to-image only when exporting (saves ~5KB gzipped)
      const { toPng } = await import('html-to-image');

      const dataUrl = await toPng(lookbookRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });

      // Download image
      const link = document.createElement('a');
      link.download = `lookbook-${lookbook?.theme || 'mi-lookbook'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      toast.error('Error al exportar imagen. Intentá de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!lookbookRef.current || !lookbook) return;

    try {
      // Check if Web Share API is supported
      if (!navigator.share) {
        toast.warning('Tu navegador no soporta compartir. Usa "Exportar Imagen" en su lugar.');
        return;
      }

      // Lazy load html-to-image only when sharing
      const { toPng } = await import('html-to-image');

      // Convert to blob
      const dataUrl = await toPng(lookbookRef.current, { quality: 0.95, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `lookbook-${lookbook.theme}.png`, { type: 'image/png' });

      await navigator.share({
        title: `Lookbook: ${lookbook.theme}`,
        text: lookbook.theme_description,
        files: [file],
      });
    } catch (err) {
      console.error('Error sharing:', err);
      // Silently fail if user cancels share
    }
  };

  const handleReset = () => {
    setCurrentStep('select');
    setSelectedTheme(null);
    setCustomThemeInput('');
    setLookbook(null);
    setError(null);
  };

  // Get outfit preview
  const getOutfitItems = (topId: string, bottomId: string, shoesId: string) => {
    const top = closet.find(item => item.id === topId);
    const bottom = closet.find(item => item.id === bottomId);
    const shoes = closet.find(item => item.id === shoesId);
    return { top, bottom, shoes };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
              Lookbook Creator
            </h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {currentStep === 'select' && 'Seleccioná un tema para tu lookbook'}
              {currentStep === 'generating' && 'Creando tu lookbook...'}
              {currentStep === 'result' && lookbook?.theme}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits Indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              credits.remaining <= 3
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <span className="material-symbols-rounded text-gray-500 text-sm">toll</span>
              <span className={`text-xs font-medium ${
                credits.remaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {credits.limit === -1 ? '∞' : credits.remaining}
              </span>
            </div>
            <Card
              variant="glass"
              padding="none"
              rounded="full"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
            </Card>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Theme Selection */}
          {currentStep === 'select' && (
            <div className="space-y-6">
              {/* Check if closet has enough items */}
              {closet.length < 15 && (
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl text-yellow-800 dark:text-yellow-400 text-sm">
                  <p className="font-semibold">Recomendación:</p>
                  <p>Para mejores resultados, agregá al menos 15 prendas a tu armario. Actualmente tenés {closet.length}.</p>
                </div>
              )}

              {/* Theme Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {themes.map(theme => (
                  <Card
                    variant="glass"
                    padding="lg"
                    rounded="2xl"
                    component="button"
                    key={theme.id}
                    onClick={() => handleThemeSelect(theme.id)}
                    disabled={theme.id === 'custom'}
                    className={`text-center transition-all cursor-pointer ${
                      theme.id === 'custom' ? '' : 'hover:scale-105 active:scale-95'
                    } ${selectedTheme === theme.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-3xl">{theme.icon}</span>
                    </div>
                    <h3 className="font-bold text-text-primary dark:text-gray-200 mb-1">{theme.label}</h3>
                    <p className="text-xs text-text-secondary dark:text-gray-400">{theme.description}</p>
                  </Card>
                ))}
              </div>

              {/* Custom Theme Input */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit</span>
                  Tema Personalizado
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customThemeInput}
                    onChange={(e) => setCustomThemeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomThemeGenerate()}
                    placeholder="Ej: Boho Chic, Rockero, Minimalista..."
                    className="flex-1 px-4 py-3 bg-white/50 dark:bg-gray-800/50 rounded-xl text-text-primary dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={handleCustomThemeGenerate}
                    disabled={!customThemeInput.trim()}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generar
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Step 2: Generating */}
          {currentStep === 'generating' && (
            <div className="text-center py-12">
              <Loader />
              <p className="text-text-secondary dark:text-gray-400 mt-4 mb-2">
                Creando tu lookbook...
              </p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Esto puede tomar 10-15 segundos
              </p>
            </div>
          )}

          {/* Step 3: Result */}
          {currentStep === 'result' && lookbook && (
            <div className="space-y-6">
              {/* Lookbook Content (will be exported) */}
              <div ref={lookbookRef} className="bg-white dark:bg-gray-900 p-8 rounded-2xl">
                {/* Lookbook Header */}
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold text-text-primary dark:text-gray-200 mb-3">
                    {lookbook.theme}
                  </h2>
                  <p className="text-lg text-text-secondary dark:text-gray-400 max-w-2xl mx-auto">
                    {lookbook.theme_description}
                  </p>
                  <div className="mt-4 text-sm text-text-secondary dark:text-gray-400">
                    {lookbook.outfits.length} Looks
                  </div>
                </div>

                {/* Outfits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lookbook.outfits.map((outfit, index) => {
                    const items = getOutfitItems(outfit.top_id, outfit.bottom_id, outfit.shoes_id);
                    return (
                      <Card key={index} variant="glass" padding="md" rounded="xl">
                        {/* Outfit Title */}
                        <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">
                          {outfit.title}
                        </h3>

                        {/* Outfit Images */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {items.top && (
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img src={items.top.imageDataUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {items.bottom && (
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img src={items.bottom.imageDataUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {items.shoes && (
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img src={items.shoes.imageDataUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>

                        {/* Outfit Description */}
                        <p className="text-sm text-text-secondary dark:text-gray-400">
                          {outfit.description}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                {/* Branding */}
                <div className="text-center mt-8 text-sm text-text-secondary dark:text-gray-400">
                  Creado con Ojo de Loca
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Card
                  variant="glass"
                  padding="md"
                  rounded="xl"
                  component="button"
                  onClick={handleReset}
                  className="flex-1 font-semibold transition-transform active:scale-95 text-text-primary dark:text-gray-200 cursor-pointer"
                >
                  Generar Otro
                </Card>
                <button
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">download</span>
                  {isExporting ? 'Exportando...' : 'Exportar Imagen'}
                </button>
                {navigator.share && (
                  <button
                    onClick={handleShare}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">share</span>
                    Compartir
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LookbookCreatorView;
