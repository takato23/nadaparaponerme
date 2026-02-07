import React, { useState, useMemo } from 'react';
import type { ClothingItem, DupeFinderResult, BrandRecognitionResult } from '../types';
import * as geminiService from '../src/services/aiService';
import Loader from './Loader';
import { getCreditStatus } from '../src/services/usageTrackingService';

interface DupeFinderViewProps {
  item: ClothingItem;
  brandInfo?: BrandRecognitionResult;
  onClose: () => void;
}

type ViewStep = 'intro' | 'analyzing' | 'results';

const DupeFinderView = ({ item, brandInfo, onClose }: DupeFinderViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
  const [dupeResult, setDupeResult] = useState<DupeFinderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credits status
  const credits = useMemo(() => getCreditStatus(), [dupeResult]);

  const handleFindDupes = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep('analyzing');

    try {
      // Call AI service
      const result = await geminiService.findDupeAlternatives(item, brandInfo);

      setDupeResult(result);
      setCurrentStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar dupes');
      setCurrentStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const renderConfidenceBadge = (level: string) => {
    const config = {
      high: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Alta', icon: 'check_circle' },
      medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Media', icon: 'info' },
      low: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Baja', icon: 'warning' },
    };

    const c = config[level as keyof typeof config] || config.medium;

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${c.color}`}>
        <span className="material-symbols-outlined text-lg">{c.icon}</span>
        <div>
          <p className="font-bold">Confianza {c.label}</p>
        </div>
      </div>
    );
  };

  const renderQualityBadge = (quality: string) => {
    const config = {
      high: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Alta' },
      medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Media' },
      low: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Baja' },
      unknown: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300', label: 'Desconocida' },
    };

    const c = config[quality as keyof typeof config] || config.unknown;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const renderSimilarityScore = (score: number) => {
    let colorClass = 'text-red-500';
    if (score >= 80) colorClass = 'text-green-500';
    else if (score >= 70) colorClass = 'text-blue-500';
    else if (score >= 60) colorClass = 'text-yellow-500';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass.replace('text', 'bg')} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-sm font-bold ${colorClass} min-w-[3rem]`}>{score}%</span>
      </div>
    );
  };

  const formatPrice = (price: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      ARS: '$',
      EUR: '€',
      GBP: '£',
    };

    return `${symbols[currency] || currency} ${price.toFixed(2)}`;
  };

  const renderIntro = () => (
    <div className="p-6">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl">shopping_bag</span>
      </div>

      <h2 className="text-2xl font-bold text-center mb-2">
        Buscador de Alternativas
      </h2>

      <p className="text-text-secondary dark:text-gray-400 text-center mb-6">
        Encontrá alternativas más baratas de esta prenda con similitud visual alta
      </p>

      {/* Item Preview */}
      <div className="liquid-glass rounded-2xl p-4 mb-6">
        <div className="flex gap-4">
          <img
            src={item.imageDataUrl}
            alt={item.metadata.subcategory}
            className="w-24 h-24 object-cover rounded-xl"
          />
          <div className="flex-1">
            <h3 className="font-bold text-lg">{item.metadata.subcategory}</h3>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {item.metadata.color_primary}
            </p>
            {brandInfo && (
              <>
                <p className="text-sm font-semibold mt-1">
                  {brandInfo.brand.name}
                </p>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  ~{formatPrice(brandInfo.price_estimate.average_price, brandInfo.price_estimate.currency)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">search</span>
          <div>
            <p className="font-semibold">Búsqueda Inteligente</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Google Shopping + análisis visual con IA
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">compare</span>
          <div>
            <p className="font-semibold">Comparación Lado a Lado</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Similitudes, diferencias y score de match
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary">savings</span>
          <div>
            <p className="font-semibold">Cálculo de Ahorro</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Ahorro potencial vs precio original
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleFindDupes}
        disabled={loading}
        className="w-full py-4 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">search</span>
        Buscar Alternativas
      </button>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
      <Loader />
      <h3 className="text-xl font-bold mt-6 mb-2">Buscando alternativas...</h3>
      <p className="text-text-secondary dark:text-gray-400 text-center max-w-md">
        Analizando características visuales y buscando alternativas más baratas en tiendas online
      </p>
    </div>
  );

  const renderResults = () => {
    if (!dupeResult) return null;

    const { original_item, dupes, visual_comparison, savings, search_strategy, confidence_level } = dupeResult;

    return (
      <div className="p-6 pb-24 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Alternativas Encontradas
          </h2>
          <p className="text-text-secondary dark:text-gray-400">
            {(dupes?.length || 0)} alternativa{(dupes?.length || 0) !== 1 ? 's' : ''} más barata{(dupes?.length || 0) !== 1 ? 's' : ''}
          </p>
          <div className="mt-3 flex justify-center">
            {renderConfidenceBadge(confidence_level || 'low')}
          </div>
        </div>

        {/* Savings Summary */}
        <div className="liquid-glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">savings</span>
            <h3 className="font-bold text-lg">Potencial de Ahorro</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Precio Original</p>
              <p className="text-xl font-bold">{formatPrice(savings.original_price, savings.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Dupe Más Barato</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatPrice(savings.cheapest_dupe_price, savings.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Ahorro Máximo</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(savings.max_savings, savings.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Ahorro Promedio</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(savings.average_savings, savings.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Search Strategy */}
        <div className="liquid-glass rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">info</span>
            <div className="flex-1">
              <p className="font-semibold mb-1">Estrategia de Búsqueda</p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                {search_strategy}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Comparison */}
        <div className="liquid-glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">compare</span>
            <h3 className="font-bold text-lg">Comparación Visual</h3>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold mb-2 text-green-700 dark:text-green-400">
              ✓ Similitudes
            </p>
            <ul className="space-y-1">
              {(visual_comparison?.similarities || []).map((sim, idx) => (
                <li key={idx} className="text-sm text-text-secondary dark:text-gray-400 flex items-start gap-2">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check</span>
                  {sim}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold mb-2 text-orange-700 dark:text-orange-400">
              ⚠ Diferencias
            </p>
            <ul className="space-y-1">
              {(visual_comparison?.differences || []).map((diff, idx) => (
                <li key={idx} className="text-sm text-text-secondary dark:text-gray-400 flex items-start gap-2">
                  <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">warning</span>
                  {diff}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Match Global</p>
            {renderSimilarityScore(visual_comparison?.overall_match || 0)}
          </div>
        </div>

        {/* Dupes List */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg mb-3">Alternativas Encontradas</h3>

          {(dupes || []).map((dupe, idx) => (
            <div key={idx} className="liquid-glass rounded-2xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">{dupe.title}</h4>
                  <p className="text-sm text-text-secondary dark:text-gray-400">{dupe.brand}</p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                    {dupe.shop_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(dupe.price, dupe.currency)}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    Ahorrás {formatPrice(dupe.savings_amount, dupe.currency)} ({Math.round(dupe.savings_percentage)}%)
                  </p>
                </div>
              </div>

              {/* Similarity Score */}
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Similitud Visual</p>
                {renderSimilarityScore(dupe.similarity_score)}
              </div>

              {/* Quality */}
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Calidad Estimada</p>
                {renderQualityBadge(dupe.estimated_quality)}
              </div>

              {/* Key Differences */}
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Diferencias Clave</p>
                <ul className="space-y-1">
                  {(dupe.key_differences || []).map((diff, i) => (
                    <li key={i} className="text-sm text-text-secondary dark:text-gray-400 flex items-start gap-2">
                      <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm mt-0.5">
                        arrow_forward
                      </span>
                      {diff}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <a
                href={dupe.shop_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-primary text-white rounded-xl font-semibold text-center hover:bg-primary/90 transition-all duration-200"
              >
                Ver en {dupe.shop_name}
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors duration-200"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="ml-4 text-lg font-bold">Buscador de Alternativas</h1>
        </div>
        {/* Credits Indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${credits.remaining <= 3
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-gray-100 dark:bg-gray-800'
          }`}>
          <span className="material-symbols-rounded text-gray-500 text-sm">toll</span>
          <span className={`text-xs font-medium ${credits.remaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
            }`}>
            {credits.limit === -1 ? '∞' : credits.remaining}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="relative">
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'analyzing' && renderAnalyzing()}
        {currentStep === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default DupeFinderView;
