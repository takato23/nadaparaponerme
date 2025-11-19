import React, { useState } from 'react';
import type { ClothingItem, ClosetGapAnalysisResult, GapAnalysisItem, VersatilityScore } from '../types';
import * as geminiService from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface ClosetGapAnalysisViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

type ViewStep = 'intro' | 'analyzing' | 'results';

const ClosetGapAnalysisView = ({ closet, onClose }: ClosetGapAnalysisViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
  const [analysisResult, setAnalysisResult] = useState<ClosetGapAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    setError(null);
    setCurrentStep('analyzing');

    try {
      if (closet.length < 5) {
        throw new Error('Necesitás al menos 5 prendas en tu armario para generar un análisis.');
      }

      // Call AI service
      const result = await geminiService.analyzeClosetGaps(closet);

      setAnalysisResult(result);
      setCurrentStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar análisis');
      setCurrentStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const renderVersatilityScore = (analysis: VersatilityScore) => {
    const currentPercentage = analysis.current_score;
    const potentialPercentage = analysis.potential_score;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    const currentStrokeDashoffset = circumference - (currentPercentage / 100) * circumference;
    const potentialStrokeDashoffset = circumference - (potentialPercentage / 100) * circumference;

    let scoreColor = 'text-red-500';
    let scoreLabel = 'Limitado';
    if (currentPercentage >= 75) {
      scoreColor = 'text-green-500';
      scoreLabel = 'Excelente';
    } else if (currentPercentage >= 50) {
      scoreColor = 'text-blue-500';
      scoreLabel = 'Bueno';
    } else if (currentPercentage >= 30) {
      scoreColor = 'text-yellow-500';
      scoreLabel = 'Regular';
    }

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Current score circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={currentStrokeDashoffset}
              className={scoreColor}
              strokeLinecap="round"
            />
            {/* Potential score (dashed) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`5,5`}
              strokeDashoffset={potentialStrokeDashoffset}
              className="text-primary opacity-50"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${scoreColor}`}>{currentPercentage}</span>
            <span className="text-sm text-text-secondary dark:text-gray-400">de 100</span>
          </div>
        </div>
        <div className={`mt-2 text-lg font-semibold ${scoreColor}`}>{scoreLabel}</div>
        <div className="mt-1 text-xs text-text-secondary dark:text-gray-400">
          Potencial: {potentialPercentage}/100
        </div>
      </div>
    );
  };

  const renderGapItem = (item: GapAnalysisItem, showPriority: boolean = true) => {
    const priorityColors = {
      essential: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
      recommended: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      optional: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600',
    };

    const priorityLabels = {
      essential: 'Esencial',
      recommended: 'Recomendado',
      optional: 'Opcional',
    };

    const compatibilityColor = item.style_compatibility >= 8
      ? 'text-green-600 dark:text-green-400'
      : item.style_compatibility >= 6
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-yellow-600 dark:text-yellow-400';

    return (
      <div
        key={`${item.category}-${item.subcategory}`}
        className={`p-4 rounded-xl border-2 ${priorityColors[item.priority]}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-text-primary dark:text-gray-200">
                {item.subcategory}
              </h4>
              {showPriority && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-text-secondary dark:text-gray-400">
                  {priorityLabels[item.priority]}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary dark:text-gray-400 mb-1">
              {item.category.toUpperCase()} • {item.color_suggestion}
            </p>
          </div>
          <div className={`text-right ${compatibilityColor}`}>
            <p className="text-2xl font-bold">{item.style_compatibility}</p>
            <p className="text-xs">de 10</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary dark:text-gray-300 mb-3">
          {item.reason}
        </p>

        {item.occasions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.occasions.map((occasion, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-full bg-white/70 dark:bg-black/30 text-text-secondary dark:text-gray-400"
              >
                {occasion}
              </span>
            ))}
          </div>
        )}

        {item.alternatives && item.alternatives.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold text-text-secondary dark:text-gray-400 mb-1">
              Alternativas:
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-300">
              {item.alternatives.join(' • ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderIntro = () => (
    <div className="p-6 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl">checklist</span>
      </div>
      <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
        Análisis de Gaps del Armario
      </h2>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Descubrí qué prendas te faltan para tener un guardarropa versátil y funcional.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <Card variant="glass" padding="md" rounded="xl" className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-primary">{closet.length}</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">Prendas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">
              {new Set(closet.map(i => i.metadata.category)).size}
            </p>
            <p className="text-sm text-text-secondary dark:text-gray-400">Categorías</p>
          </div>
        </div>
      </Card>

      <button
        onClick={handleGenerateAnalysis}
        disabled={closet.length < 5 || loading}
        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Analizar Mi Armario
      </button>

      <p className="mt-4 text-xs text-text-secondary dark:text-gray-400">
        Requiere mínimo 5 prendas en el armario
      </p>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Loader />
      <p className="mt-4 text-text-primary dark:text-gray-200">Analizando tu armario...</p>
      <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
        Identificando gaps y oportunidades de mejora
      </p>
    </div>
  );

  const renderResults = () => {
    if (!analysisResult) return null;

    const { missing_essentials, nice_to_have, versatility_analysis, strengths, weaknesses, style_summary, shopping_budget_estimate, confidence_level } = analysisResult;

    const confidenceBadge = {
      high: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Alta Confianza' },
      medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Confianza Media' },
      low: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Baja Confianza' },
    }[confidence_level];

    return (
      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${confidenceBadge.color}`}>
            {confidenceBadge.label}
          </div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
            Análisis de Tu Armario
          </h2>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Basado en {analysisResult.analyzed_items_count} prendas
          </p>
        </div>

        {/* Versatility Score */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 text-center">
            Score de Versatilidad
          </h3>
          {renderVersatilityScore(versatility_analysis)}
          {versatility_analysis.bottleneck_categories.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-yellow-100/50 dark:bg-yellow-900/20">
              <p className="text-sm font-semibold text-text-primary dark:text-gray-200 mb-2">
                Categorías limitantes:
              </p>
              <div className="flex flex-wrap gap-2">
                {versatility_analysis.bottleneck_categories.map((cat, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-full bg-yellow-200 dark:bg-yellow-800 text-text-primary dark:text-gray-200">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Style Summary */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            📋 Resumen de tu Estilo
          </h3>
          <p className="text-text-secondary dark:text-gray-300 leading-relaxed">
            {style_summary}
          </p>
        </Card>

        {/* Strengths */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            ✅ Fortalezas
          </h3>
          <ul className="space-y-2">
            {strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-sm mt-0.5">check_circle</span>
                <span className="text-text-secondary dark:text-gray-300">{strength}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Weaknesses */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
            ⚠️ Limitaciones
          </h3>
          <ul className="space-y-2">
            {weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-sm mt-0.5">warning</span>
                <span className="text-text-secondary dark:text-gray-300">{weakness}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Missing Essentials */}
        {missing_essentials.length > 0 && (
          <Card variant="glass" padding="lg" rounded="3xl">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
              🎯 Prendas Esenciales Faltantes
            </h3>
            <div className="space-y-3">
              {missing_essentials.map(item => renderGapItem(item))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-primary/10">
              <p className="text-sm font-semibold text-text-primary dark:text-gray-200 mb-1">
                Presupuesto estimado:
              </p>
              <p className="text-lg font-bold text-primary">{shopping_budget_estimate}</p>
            </div>
          </Card>
        )}

        {/* Nice to Have */}
        {nice_to_have.length > 0 && (
          <Card variant="glass" padding="lg" rounded="3xl">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
              ✨ Recomendaciones Adicionales
            </h3>
            <div className="space-y-3">
              {nice_to_have.map(item => renderGapItem(item, false))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentStep('intro');
              setAnalysisResult(null);
            }}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-gray-200 font-bold py-3 px-4 rounded-xl transition-transform active:scale-95"
          >
            Generar Nuevo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20 overflow-hidden">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold">Análisis de Gaps</h1>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </header>

      {/* Content */}
      <div className="h-[calc(100vh-80px)]">
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'analyzing' && renderAnalyzing()}
        {currentStep === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default ClosetGapAnalysisView;
