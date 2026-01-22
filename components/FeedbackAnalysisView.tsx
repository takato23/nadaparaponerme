import React, { useState, useEffect } from 'react';
import type { ClothingItem, SavedOutfit, OutfitRating, FeedbackAnalysisResult, FeedbackInsights, PreferencePattern } from '../types';
import { useFeedbackAnalysis } from '../hooks/useFeedbackAnalysis';
import Loader from './Loader';
import { Card } from './ui/Card';

interface FeedbackAnalysisViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
}

const FeedbackAnalysisView = ({ closet, savedOutfits, onClose }: FeedbackAnalysisViewProps) => {
  const {
    currentStep,
    analysisResult,
    loading,
    error,
    generateAnalysis,
    resetAnalysis
  } = useFeedbackAnalysis(closet, savedOutfits);

  const renderSatisfactionScore = (score: number) => {
    const percentage = score;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let scoreColor = 'text-red-500';
    let scoreLabel = 'Bajo';
    if (score >= 80) {
      scoreColor = 'text-green-500';
      scoreLabel = 'Excelente';
    } else if (score >= 60) {
      scoreColor = 'text-blue-500';
      scoreLabel = 'Bueno';
    } else if (score >= 40) {
      scoreColor = 'text-yellow-500';
      scoreLabel = 'Regular';
    }

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={scoreColor}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-sm text-text-secondary dark:text-gray-400">de 100</span>
          </div>
        </div>
        <div className={`mt-2 text-lg font-semibold ${scoreColor}`}>{scoreLabel}</div>
      </div>
    );
  };

  const renderPreferencePattern = (pattern: PreferencePattern, isPositive: boolean) => {
    const bgColor = isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';
    const textColor = isPositive ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';

    return (
      <div key={`${pattern.attribute}-${pattern.value}`} className={`p-3 rounded-lg ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary dark:text-gray-400 uppercase tracking-wide">
              {pattern.attribute}
            </span>
            <p className={`font-semibold ${textColor}`}>{pattern.value}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${textColor}`}>
              {pattern.average_rating.toFixed(1)}
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              {pattern.frequency}x
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="p-6 text-center">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-5xl">psychology</span>
      </div>
      <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
        Análisis de Preferencias
      </h2>
      <p className="text-text-secondary dark:text-gray-400 mb-6">
        Analizá tus calificaciones históricas de outfits para descubrir patrones en tus preferencias y recibir recomendaciones personalizadas.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <Card variant="glass" padding="md" rounded="xl" className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-primary">{savedOutfits.length}</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">Outfits</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{closet.length}</p>
            <p className="text-sm text-text-secondary dark:text-gray-400">Prendas</p>
          </div>
        </div>
      </Card>

      <button
        onClick={generateAnalysis}
        disabled={!!error || loading}
        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generar Análisis
      </button>

      <p className="mt-4 text-xs text-text-secondary dark:text-gray-400">
        Requiere mínimo 3 calificaciones de outfits
      </p>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Loader />
      <p className="mt-4 text-text-primary dark:text-gray-200">Analizando tus preferencias...</p>
      <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
        Procesando {analysisResult?.analyzed_ratings_count || 0} calificaciones
      </p>
    </div>
  );

  const renderResults = () => {
    if (!analysisResult) return null;

    const { insights, analyzed_ratings_count, confidence_level } = analysisResult;

    const confidenceBadge = {
      high: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Alta Confianza' },
      medium: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Confianza Media' },
      low: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Baja Confianza' },
    }[confidence_level];

    return (
      <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: confidenceBadge.color.split(' ')[0].replace('bg-', ''), color: confidenceBadge.color.split(' ')[1].replace('text-', '') }}>
            {confidenceBadge.label}
          </div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
            Tus Preferencias de Estilo
          </h2>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Basado en {analyzed_ratings_count} calificaciones
          </p>
        </div>

        {/* Satisfaction Score */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 text-center">
            Satisfacción General
          </h3>
          {renderSatisfactionScore(insights.satisfaction_score)}
        </Card>

        {/* Top Preferences */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">favorite</span> Lo que Más Te Gusta
          </h3>
          <div className="space-y-3">
            {insights.top_preferences.map(pattern => renderPreferencePattern(pattern, true))}
          </div>
        </Card>

        {/* Least Favorites */}
        {insights.least_favorites.length > 0 && (
          <Card variant="glass" padding="lg" rounded="3xl">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">thumb_down</span> Lo que Menos Te Gusta
            </h3>
            <div className="space-y-3">
              {insights.least_favorites.map(pattern => renderPreferencePattern(pattern, false))}
            </div>
          </Card>
        )}

        {/* Style Evolution */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">trending_up</span> Evolución de tu Estilo
          </h3>
          <p className="text-text-secondary dark:text-gray-300 leading-relaxed">
            {insights.style_evolution}
          </p>
        </Card>

        {/* Improvement Suggestions */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-500">lightbulb</span> Sugerencias de Mejora
          </h3>
          <ul className="space-y-2">
            {insights.improvement_suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                <span className="text-text-secondary dark:text-gray-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Shopping Recommendations */}
        <Card variant="glass" padding="lg" rounded="3xl">
          <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-pink-500">shopping_bag</span> Recomendaciones de Compra
          </h3>
          <ul className="space-y-2">
            {insights.shopping_recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-sm mt-0.5">shopping_bag</span>
                <span className="text-text-secondary dark:text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Unused Potential */}
        {insights.unused_potential.length > 0 && (
          <Card variant="glass" padding="lg" rounded="3xl">
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">auto_awesome</span> Potencial Sin Explotar
            </h3>
            <ul className="space-y-2">
              {insights.unused_potential.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">stars</span>
                  <span className="text-text-secondary dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={resetAnalysis}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-gray-200 font-bold py-3 px-4 rounded-xl transition-transform active:scale-95"
          >
            Generar Nuevo
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20 flex flex-col md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-2xl bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col">
        <header className="p-4 flex items-center shrink-0">
          <button onClick={onClose} className="p-2 dark:text-gray-200">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="ml-2 font-semibold text-text-primary dark:text-gray-200">
            Análisis de Feedback
          </span>
        </header>

        <div className="flex-grow overflow-y-auto">
          {currentStep === 'intro' && renderIntro()}
          {currentStep === 'analyzing' && renderAnalyzing()}
          {currentStep === 'results' && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalysisView;
