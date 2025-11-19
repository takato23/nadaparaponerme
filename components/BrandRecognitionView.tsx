import React, { useState } from 'react';
import type { ClothingItem, BrandRecognitionResult } from '../types';
import * as geminiService from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface BrandRecognitionViewProps {
  item: ClothingItem;
  onClose: () => void;
}

type ViewStep = 'intro' | 'analyzing' | 'results';

const BrandRecognitionView = ({ item, onClose }: BrandRecognitionViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
  const [recognitionResult, setRecognitionResult] = useState<BrandRecognitionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecognize = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep('analyzing');

    try {
      // Call AI service
      const result = await geminiService.recognizeBrandAndPrice(item.imageDataUrl);

      setRecognitionResult(result);
      setCurrentStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reconocer marca y precio');
      setCurrentStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const renderBrandTierBadge = (tier: string) => {
    const tierConfig = {
      luxury: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'Lujo' },
      premium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Premium' },
      'mid-range': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Rango Medio' },
      budget: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300', label: 'Económico' },
      unknown: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300', label: 'Desconocido' },
    };

    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.unknown;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const renderAuthenticityBadge = (status: string, confidence: number) => {
    const statusConfig = {
      original: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: 'verified', label: 'Original' },
      replica: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: 'warning', label: 'Réplica' },
      indeterminate: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: 'help', label: 'Indeterminado' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.indeterminate;

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${config.color}`}>
        <span className="material-symbols-outlined text-lg">{config.icon}</span>
        <div>
          <p className="font-bold">{config.label}</p>
          <p className="text-xs">Confianza: {confidence}%</p>
        </div>
      </div>
    );
  };

  const renderConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Nuevo' },
      like_new: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Como Nuevo' },
      good: { color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', label: 'Bueno' },
      fair: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Aceptable' },
      worn: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Desgastado' },
    };

    const config = conditionConfig[condition as keyof typeof conditionConfig] || conditionConfig.fair;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const renderConfidenceMeter = (confidence: number, label: string) => {
    const percentage = confidence;
    let colorClass = 'text-red-500';
    if (confidence >= 80) colorClass = 'text-green-500';
    else if (confidence >= 60) colorClass = 'text-blue-500';
    else if (confidence >= 40) colorClass = 'text-yellow-500';

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-secondary dark:text-gray-400">{label}</span>
          <span className={`text-sm font-bold ${colorClass}`}>{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClass.replace('text', 'bg')} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="p-6">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl">label</span>
      </div>
      <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2 text-center">
        Reconocimiento de Marca y Precio
      </h2>
      <p className="text-text-secondary dark:text-gray-400 mb-6 text-center">
        Analizá esta prenda para identificar marca, precio estimado y autenticidad.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Item Preview */}
      <Card variant="glass" padding="md" rounded="3xl" className="mb-6">
        <div className="flex items-center gap-4">
          <img
            src={item.imageDataUrl}
            alt={item.metadata.subcategory}
            className="w-24 h-24 object-cover rounded-xl"
          />
          <div className="flex-1">
            <h3 className="font-bold text-text-primary dark:text-gray-200">
              {item.metadata.subcategory}
            </h3>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {item.metadata.category} • {item.metadata.color_primary}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {item.metadata.vibe_tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <button
        onClick={handleRecognize}
        disabled={loading}
        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Detectar Marca y Precio
      </button>

      <p className="mt-4 text-xs text-text-secondary dark:text-gray-400 text-center">
        La IA analizará logos, etiquetas, calidad y patrones de diseño
      </p>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Loader />
      <p className="mt-4 text-text-primary dark:text-gray-200">Analizando prenda...</p>
      <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
        Detectando marca, precio y autenticidad
      </p>
    </div>
  );

  const renderResults = () => {
    if (!recognitionResult) return null;

    const { brand, price_estimate, authenticity, item_condition, resale_value_percentage, market_insights, shopping_alternatives } = recognitionResult;

    return (
      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
            Análisis Completo
          </h2>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            {item.metadata.subcategory}
          </p>
        </div>

        {/* Brand Information */}
        <Card variant="glass" padding="lg" rounded="3xl" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200">
              Marca Detectada
            </h3>
            {renderBrandTierBadge(brand.brand_tier)}
          </div>

          <div className="text-center py-4">
            <p className="text-3xl font-bold text-primary mb-2">{brand.name}</p>
            {brand.country_origin && (
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Origen: {brand.country_origin}
              </p>
            )}
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
              Detectado desde: {brand.detected_from === 'logo' ? 'Logo' : brand.detected_from === 'label' ? 'Etiqueta' : brand.detected_from === 'style_pattern' ? 'Patrón de estilo' : 'Múltiples indicadores'}
            </p>
          </div>

          {renderConfidenceMeter(brand.confidence, 'Confianza en detección')}
        </Card>

        {/* Price Estimate */}
        <Card variant="glass" padding="lg" rounded="3xl" className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            Estimación de Precio
          </h3>

          <div className="text-center py-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl">
            <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Rango estimado</p>
            <p className="text-4xl font-bold text-primary mb-1">
              ${price_estimate.min_price} - ${price_estimate.max_price}
            </p>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {price_estimate.currency} • Promedio: ${price_estimate.average_price}
            </p>
          </div>

          {renderConfidenceMeter(price_estimate.confidence, 'Confianza en estimación')}

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-text-secondary dark:text-gray-400 mb-2">
              Factores considerados:
            </p>
            <div className="space-y-1">
              {price_estimate.factors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <p className="text-xs text-text-secondary dark:text-gray-300">{factor}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Authenticity */}
        <Card variant="glass" padding="lg" rounded="3xl" className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            Evaluación de Autenticidad
          </h3>

          {renderAuthenticityBadge(authenticity.status, authenticity.confidence)}

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-text-secondary dark:text-gray-400 mb-2">
              Indicadores visuales:
            </p>
            <div className="space-y-1">
              {authenticity.indicators.map((indicator, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">visibility</span>
                  <p className="text-xs text-text-secondary dark:text-gray-300">{indicator}</p>
                </div>
              ))}
            </div>
          </div>

          {authenticity.warnings && authenticity.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-red-100/50 dark:bg-red-900/20">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                Advertencias:
              </p>
              <div className="space-y-1">
                {authenticity.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-red-700 dark:text-red-400">• {warning}</p>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Condition & Resale */}
        <Card variant="glass" padding="lg" rounded="3xl" className="space-y-4">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            Condición y Valor de Reventa
          </h3>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-text-secondary dark:text-gray-400">Condición:</span>
            {renderConditionBadge(item_condition)}
          </div>

          <div className="py-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl text-center">
            <p className="text-sm text-text-secondary dark:text-gray-400 mb-1">Valor de reventa estimado</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{resale_value_percentage}%</p>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">del precio original</p>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-text-secondary dark:text-gray-400 mb-2">
              Insights de Mercado:
            </p>
            <p className="text-sm text-text-secondary dark:text-gray-300">
              {market_insights}
            </p>
          </div>
        </Card>

        {/* Shopping Alternatives */}
        {shopping_alternatives && shopping_alternatives.length > 0 && (
          <Card variant="glass" padding="lg" rounded="3xl" className="space-y-4">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
              Alternativas de Compra
            </h3>
            <p className="text-xs text-text-secondary dark:text-gray-400 mb-3">
              Marcas similares a diferentes precios:
            </p>
            <div className="flex flex-wrap gap-2">
              {shopping_alternatives.map((alt, idx) => (
                <span
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-white/70 dark:bg-black/30 text-sm font-semibold text-text-primary dark:text-gray-200"
                >
                  {alt}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95"
        >
          Cerrar
        </button>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20 overflow-hidden">
      {/* Header */}
      <Card variant="glass" padding="md" rounded="none" className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700" component="header">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-text-primary dark:text-gray-200 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-semibold">Volver</span>
        </button>
        <span className="material-symbols-outlined text-primary">label</span>
      </Card>

      {/* Content */}
      <div className="h-[calc(100%-72px)] overflow-y-auto">
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'analyzing' && renderAnalyzing()}
        {currentStep === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default BrandRecognitionView;
