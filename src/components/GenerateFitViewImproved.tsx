/**
 * GenerateFitViewImproved - Generador de Outfits Simplificado
 *
 * UI limpia y minimalista con el ojo 3D de fondo.
 * Signature visual de la app.
 *
 * @version 3.0
 */

import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCreditStatus } from '../../services/usageTrackingService';

// Lazy load Eye3D para mejor performance
const Eye3D = lazy(() => import('../../components/Eye3D'));

interface ClothingItem {
  id: string;
  imageDataUrl: string;
  metadata: {
    category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
    subcategory: string;
    color_primary: string;
    vibe_tags: string[];
    seasons: string[];
  };
}

interface GenerateFitViewImprovedProps {
  onGenerate: (prompt: string, mood?: string, category?: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  error: string | null;
  closet: ClothingItem[];
  recentSearches?: string[];
}

// ============================================================================
// CONFIGURACIÓN SIMPLIFICADA - Solo lo esencial
// ============================================================================

const OCCASIONS = [
  { id: 'casual', icon: 'weekend', label: 'Casual', prompt: 'un outfit casual y cómodo para el día a día' },
  { id: 'trabajo', icon: 'work', label: 'Trabajo', prompt: 'un outfit profesional y elegante para la oficina' },
  { id: 'cita', icon: 'favorite', label: 'Cita', prompt: 'un outfit romántico y atractivo para una cita' },
  { id: 'fiesta', icon: 'nightlife', label: 'Fiesta', prompt: 'un outfit de fiesta llamativo para salir de noche' },
  { id: 'evento', icon: 'celebration', label: 'Evento', prompt: 'un outfit formal para un evento especial' },
  { id: 'viaje', icon: 'flight', label: 'Viaje', prompt: 'un outfit cómodo pero estiloso para viajar' },
];

const REFINEMENTS = [
  { id: 'minimalist', icon: 'square', label: 'Minimal', modifier: 'minimalista y clean' },
  { id: 'bold', icon: 'local_fire_department', label: 'Audaz', modifier: 'audaz y atrevido' },
  { id: 'classic', icon: 'workspace_premium', label: 'Clásico', modifier: 'clásico y atemporal' },
  { id: 'trendy', icon: 'trending_up', label: 'Trendy', modifier: 'siguiendo tendencias' },
];

const QUICK_ACTIONS = [
  { icon: 'bolt', label: 'Rápido', prompt: 'Necesito un outfit rápido y fácil para salir ya' },
  { icon: 'shuffle', label: 'Sorpresa', prompt: 'Sorpréndeme con algo que nunca hubiera pensado' },
  { icon: 'diamond', label: 'Premium', prompt: 'Un outfit que se vea caro y sofisticado' },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const GenerateFitViewImproved: React.FC<GenerateFitViewImprovedProps> = ({
  onGenerate,
  onBack,
  isGenerating,
  error,
  closet,
}) => {
  const creditsStatus = useMemo(() => getCreditStatus(), []);

  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedRefinement, setSelectedRefinement] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const closetStats = useMemo(() => {
    const stats = { tops: 0, bottoms: 0, shoes: 0, total: closet.length };
    closet.forEach((item) => {
      if (item.metadata.category === 'top') stats.tops++;
      else if (item.metadata.category === 'bottom') stats.bottoms++;
      else if (item.metadata.category === 'shoes') stats.shoes++;
    });
    return stats;
  }, [closet]);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingPhase(0);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % 4;
      setLoadingPhase(i);
    }, 1200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const loadingMessages = [
    'Analizando tu armario...',
    'Buscando combinaciones...',
    'Aplicando estilo...',
    'Finalizando...',
  ];

  const handleGenerate = () => {
    if (customPrompt.trim()) {
      onGenerate(customPrompt.trim());
      return;
    }

    if (!selectedOccasion) return;

    const occasion = OCCASIONS.find(o => o.id === selectedOccasion);
    if (!occasion) return;

    let prompt = `Genera ${occasion.prompt}`;

    if (selectedRefinement) {
      const ref = REFINEMENTS.find(r => r.id === selectedRefinement);
      if (ref) prompt += `, con estilo ${ref.modifier}`;
    }

    onGenerate(prompt, selectedRefinement || undefined, selectedOccasion);
  };

  const handleQuickAction = (prompt: string) => {
    onGenerate(prompt);
  };

  const canGenerate = (selectedOccasion || customPrompt.trim()) && closet.length > 0 && !isGenerating;
  const selectedOccasionData = OCCASIONS.find(o => o.id === selectedOccasion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Eye3D Background - Signature de la app */}
      <div className="absolute inset-0 bg-[#05060a]">
        {/* Gradients base */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(62% 48% at 50% 42%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.00) 60%)',
              'radial-gradient(55% 45% at 18% 24%, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.00) 70%)',
              'radial-gradient(55% 45% at 80% 60%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.00) 70%)',
              'linear-gradient(180deg, rgba(3,7,18,0.00) 0%, rgba(3,7,18,0.75) 100%)',
            ].join(','),
          }}
        />

        {/* Eye3D desenfocado - centrado y visible */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="w-[120%] h-[120%] blur-sm opacity-50">
            <Suspense fallback={null}>
              <Eye3D
                variant="landing"
                colorScheme="ocean"
                blinkInterval={5000}
                reducedMotion={false}
                quality="medium"
                interactive={false}
                className="w-full h-full"
              />
            </Suspense>
          </div>
        </div>

        {/* Vignette overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(50% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      </div>

      {/* Click outside to close */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onBack}
        className="absolute inset-0"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md mx-4 bg-white/10 dark:bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <span className="material-symbols-rounded text-white/70">arrow_back</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-rounded text-purple-400">auto_awesome</span>
                  Crear Outfit
                </h1>
                <p className="text-xs text-white/50">
                  {closetStats.total} prendas en tu armario
                </p>
              </div>
            </div>

            {/* Credits */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${
              creditsStatus.remaining <= 2
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-white/10'
            }`}>
              <span className={`material-symbols-rounded text-lg ${
                creditsStatus.remaining <= 2 ? 'text-red-400' : 'text-white/60'
              }`}>toll</span>
              <span className={`text-sm font-semibold ${
                creditsStatus.remaining <= 2 ? 'text-red-400' : 'text-white/80'
              }`}>
                {creditsStatus.limit === -1 ? '∞' : creditsStatus.remaining}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Actions - Compactos */}
          <div className="flex gap-2">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleQuickAction(qa.prompt)}
                disabled={isGenerating || closet.length === 0}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-purple-400 text-lg">{qa.icon}</span>
                <span className="text-xs font-medium text-white/80">{qa.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/40">o elegí ocasión</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Ocasiones - Grid 3x2 */}
          <div className="grid grid-cols-3 gap-2">
            {OCCASIONS.map((occasion) => (
              <button
                key={occasion.id}
                onClick={() => setSelectedOccasion(selectedOccasion === occasion.id ? null : occasion.id)}
                className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                  selectedOccasion === occasion.id
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70'
                }`}
              >
                <span className={`material-symbols-rounded text-2xl ${
                  selectedOccasion === occasion.id ? 'text-purple-400' : 'text-white/50'
                }`}>
                  {occasion.icon}
                </span>
                <span className="text-xs font-medium">
                  {occasion.label}
                </span>
              </button>
            ))}
          </div>

          {/* Refinements - Solo si hay ocasión seleccionada */}
          <AnimatePresence>
            {selectedOccasion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  Estilo (opcional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {REFINEMENTS.map((ref) => (
                    <button
                      key={ref.id}
                      onClick={() => setSelectedRefinement(selectedRefinement === ref.id ? null : ref.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        selectedRefinement === ref.id
                          ? 'bg-white text-gray-900'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <span className="material-symbols-rounded text-sm">{ref.icon}</span>
                      {ref.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Prompt Toggle */}
          <div>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="flex items-center gap-2 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              <span className="material-symbols-rounded text-sm">
                {showCustom ? 'expand_less' : 'edit'}
              </span>
              Escribir pedido personalizado
            </button>

            <AnimatePresence>
              {showCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ej: Un outfit para una boda al aire libre..."
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    rows={2}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center gap-2"
              >
                <span className="material-symbols-rounded text-red-400">error</span>
                <p className="text-xs text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-white/5">
          {/* Preview */}
          {(selectedOccasion || customPrompt) && (
            <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Tu pedido</p>
              <p className="text-sm text-white/80">
                {customPrompt ? (
                  <span className="italic">"{customPrompt.slice(0, 60)}{customPrompt.length > 60 ? '...' : ''}"</span>
                ) : (
                  <>
                    <span className="font-medium text-white">{selectedOccasionData?.label}</span>
                    {selectedRefinement && (
                      <span className="text-white/60"> · {REFINEMENTS.find(r => r.id === selectedRefinement)?.label}</span>
                    )}
                  </>
                )}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              canGenerate
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>{loadingMessages[loadingPhase]}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">auto_awesome</span>
                Crear Outfit
              </>
            )}
          </button>

          {closet.length === 0 && (
            <p className="text-center text-xs text-white/40 mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-rounded text-sm">info</span>
              Primero agregá prendas a tu armario
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GenerateFitViewImproved;
