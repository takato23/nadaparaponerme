import React, { useState } from 'react';
import type { ClothingItem, StyleEvolutionTimeline, TrendDirection } from '../types';
import * as geminiService from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

type ViewStep = 'intro' | 'analyzing' | 'results';

interface StyleEvolutionViewProps {
    closet: ClothingItem[];
    onClose: () => void;
}

const StyleEvolutionView = ({ closet, onClose }: StyleEvolutionViewProps) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
    const [timeline, setTimeline] = useState<StyleEvolutionTimeline | null>(null);
    const [error, setError] = useState<string>('');

    const handleGenerateTimeline = async () => {
        if (closet.length < 10) {
            setError('Necesitás al menos 10 prendas para analizar tu evolución de estilo.');
            return;
        }

        setError('');
        setCurrentStep('analyzing');

        try {
            const result = await geminiService.analyzeStyleEvolution(closet);
            setTimeline(result);
            setCurrentStep('results');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
            setError(errorMessage);
            setCurrentStep('intro');
        }
    };

    const getTrendDirectionIcon = (direction: TrendDirection) => {
        switch (direction) {
            case 'increasing': return 'trending_up';
            case 'decreasing': return 'trending_down';
            case 'stable': return 'trending_flat';
            case 'fluctuating': return 'show_chart';
            default: return 'timeline';
        }
    };

    const getTrendDirectionColor = (direction: TrendDirection) => {
        switch (direction) {
            case 'increasing': return 'text-green-600 dark:text-green-400';
            case 'decreasing': return 'text-red-600 dark:text-red-400';
            case 'stable': return 'text-blue-600 dark:text-blue-400';
            case 'fluctuating': return 'text-yellow-600 dark:text-yellow-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getConfidenceLevelBadge = (level: 'low' | 'medium' | 'high') => {
        const config = {
            low: { label: 'Confianza Baja', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
            medium: { label: 'Confianza Media', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
            high: { label: 'Confianza Alta', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' }
        };
        const { label, color } = config[level];
        return <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{label}</span>;
    };

    // Intro Step
    if (currentStep === 'intro') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="none" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                                Style Evolution Timeline
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
                        {/* Hero Card */}
                        <Card variant="glass" padding="lg" rounded="2xl" className=" text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-5xl">
                                    timeline
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                                Tu Viaje de Estilo a través del Tiempo
                            </h3>
                            <p className="text-text-secondary dark:text-gray-400">
                                Descubrí cómo ha evolucionado tu estilo personal desde tu primera prenda. IA analiza cada período, detecta tendencias, identifica hitos clave y predice hacia dónde va tu estilo.
                            </p>
                        </Card>

                        {/* Feature Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card variant="glass" padding="md" rounded="xl" className="">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
                                    <div>
                                        <h4 className="font-bold text-text-primary dark:text-gray-200 text-sm">Períodos Cronológicos</h4>
                                        <p className="text-text-secondary dark:text-gray-400 text-xs">Divide tu journey en 3-5 etapas significativas</p>
                                    </div>
                                </div>
                            </Card>
                            <Card variant="glass" padding="md" rounded="xl" className="">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">trending_up</span>
                                    <div>
                                        <h4 className="font-bold text-text-primary dark:text-gray-200 text-sm">Tendencias Detectadas</h4>
                                        <p className="text-text-secondary dark:text-gray-400 text-xs">Cambios de color, categorías, aesthetic</p>
                                    </div>
                                </div>
                            </Card>
                            <Card variant="glass" padding="md" rounded="xl" className="">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">stars</span>
                                    <div>
                                        <h4 className="font-bold text-text-primary dark:text-gray-200 text-sm">Hitos Importantes</h4>
                                        <p className="text-text-secondary dark:text-gray-400 text-xs">Momentos clave y transformaciones de estilo</p>
                                    </div>
                                </div>
                            </Card>
                            <Card variant="glass" padding="md" rounded="xl" className="">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">crystal_ball</span>
                                    <div>
                                        <h4 className="font-bold text-text-primary dark:text-gray-200 text-sm">Predicciones Futuras</h4>
                                        <p className="text-text-secondary dark:text-gray-400 text-xs">Hacia dónde se dirige tu estilo</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Requirements */}
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                                <div className="text-sm">
                                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Requisitos:</p>
                                    <ul className="text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                                        <li>Mínimo 10 prendas (tenés {closet.length})</li>
                                        <li>Mejor análisis con 20+ prendas agregadas en distintos momentos</li>
                                        <li>El análisis toma en cuenta fechas de creación de cada prenda</li>
                                    </ul>
                                </div>
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
                            onClick={handleGenerateTimeline}
                            disabled={closet.length < 10}
                            className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Analizar Mi Evolución de Estilo
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // Analyzing Step
    if (currentStep === 'analyzing') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="xl" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-md text-center">
                    <Loader />
                    <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mt-6 mb-2">
                        Analizando tu evolución...
                    </h3>
                    <div className="space-y-2 text-text-secondary dark:text-gray-400 text-sm">
                        <p>📅 Dividiendo en períodos cronológicos...</p>
                        <p>📊 Detectando tendencias y cambios...</p>
                        <p>⭐ Identificando hitos importantes...</p>
                        <p>🔮 Generando predicciones futuras...</p>
                        <p>📖 Creando narrative de tu journey...</p>
                    </div>
                </Card>
            </div>
        );
    }

    // Results Step
    if (currentStep === 'results' && timeline) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="none" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                                    Tu Style Evolution Timeline
                                </h2>
                                <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                                    {timeline.date_range} • {timeline.analyzed_items_count} prendas analizadas
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8">
                        {/* Confidence Badge */}
                        <div className="flex justify-center">
                            {getConfidenceLevelBadge(timeline.confidence_level)}
                        </div>

                        {/* Overall Journey Summary */}
                        <Card variant="glass" padding="lg" rounded="2xl">
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">auto_stories</span>
                                Tu Journey de Estilo
                            </h3>
                            <p className="text-text-secondary dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                {timeline.overall_journey_summary}
                            </p>
                        </Card>

                        {/* Periods */}
                        <section>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">calendar_month</span>
                                Períodos Cronológicos ({timeline.periods.length})
                            </h3>
                            <div className="space-y-4">
                                {timeline.periods.map((period, index) => (
                                    <div key={index} className="rounded-xl p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-bold text-text-primary dark:text-gray-200 text-lg">
                                                    {period.period_name}
                                                </h4>
                                                <p className="text-text-secondary dark:text-gray-400 text-sm">
                                                    {period.date_range} • {period.item_count} prendas
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-text-secondary dark:text-gray-400 text-sm mb-3">
                                            {period.key_characteristics}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-text-secondary dark:text-gray-400 font-medium mb-1">Colores dominantes:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {period.dominant_colors.map((color, idx) => (
                                                        <span key={idx} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300 capitalize text-xs">
                                                            {color}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-text-secondary dark:text-gray-400 font-medium mb-1">Categorías dominantes:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {period.dominant_categories.map((cat, idx) => (
                                                        <span key={idx} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300 capitalize text-xs">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-text-secondary dark:text-gray-400 font-medium mb-1">Estilos dominantes:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {period.dominant_styles.map((style, idx) => (
                                                        <span key={idx} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300 capitalize text-xs">
                                                            {style}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Trends */}
                        <section>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">trending_up</span>
                                Tendencias Detectadas ({timeline.trends.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {timeline.trends.map((trend, index) => (
                                    <div key={index} className="rounded-xl p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`material-symbols-outlined ${getTrendDirectionColor(trend.direction)}`}>
                                                        {getTrendDirectionIcon(trend.direction)}
                                                    </span>
                                                    <h4 className="font-bold text-text-primary dark:text-gray-200">
                                                        {trend.title}
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-text-secondary dark:text-gray-400 capitalize mb-2">
                                                    {trend.trend_type.replace('_', ' ')} • {trend.direction}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-text-secondary dark:text-gray-400 text-sm mb-3">
                                            {trend.description}
                                        </p>
                                        {/* Confidence Bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-text-secondary dark:text-gray-400">Confianza:</span>
                                                <span className="font-medium text-text-primary dark:text-gray-300">{trend.confidence}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${trend.confidence}%` }}
                                                />
                                            </div>
                                        </div>
                                        {/* Evidence */}
                                        <div>
                                            <p className="text-text-secondary dark:text-gray-400 font-medium text-xs mb-2">Evidencia:</p>
                                            <ul className="space-y-1">
                                                {trend.evidence.map((ev, idx) => (
                                                    <li key={idx} className="text-text-secondary dark:text-gray-400 text-xs flex items-start gap-1">
                                                        <span className="material-symbols-outlined text-[10px] mt-0.5">check_circle</span>
                                                        <span>{ev}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Milestones */}
                        <section>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">stars</span>
                                Hitos Importantes ({timeline.milestones.length})
                            </h3>
                            <div className="space-y-4 relative">
                                {/* Timeline line */}
                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700" />
                                {timeline.milestones.map((milestone, index) => (
                                    <div key={milestone.id} className="relative flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="relative z-10 w-12 h-12 rounded-full bg-primary/10 border-4 border-white dark:border-gray-900 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-primary text-xl">
                                                {milestone.icon}
                                            </span>
                                        </div>
                                        {/* Content */}
                                        <Card variant="glass" padding="md" rounded="xl" className="flex-1 mt-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-bold text-text-primary dark:text-gray-200">
                                                    {milestone.title}
                                                </h4>
                                                <span className="text-xs text-text-secondary dark:text-gray-400">
                                                    {new Date(milestone.date).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-text-secondary dark:text-gray-400 text-sm">
                                                {milestone.description}
                                            </p>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Predictions */}
                        <section>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">crystal_ball</span>
                                Predicciones Futuras ({timeline.predictions.length})
                            </h3>
                            <div className="space-y-4">
                                {timeline.predictions.map((prediction, index) => (
                                    <div key={index} className="rounded-xl p-5 border-2 border-primary/20">
                                        <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-bold text-text-primary dark:text-gray-200 flex-1">
                                                {prediction.prediction}
                                            </h4>
                                            <span className="text-xs text-text-secondary dark:text-gray-400 ml-2">
                                                {prediction.timeline}
                                            </span>
                                        </div>
                                        {/* Confidence Bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-text-secondary dark:text-gray-400">Confianza en predicción:</span>
                                                <span className="font-medium text-text-primary dark:text-gray-300">{prediction.confidence}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                                                    style={{ width: `${prediction.confidence}%` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-text-secondary dark:text-gray-400 text-sm mb-3">
                                            {prediction.reasoning}
                                        </p>
                                        {/* Recommendations */}
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                                            <p className="text-text-secondary dark:text-gray-400 font-medium text-sm mb-2">Recomendaciones:</p>
                                            <ul className="space-y-1">
                                                {prediction.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="text-text-secondary dark:text-gray-400 text-sm flex items-start gap-2">
                                                        <span className="material-symbols-outlined text-primary text-base mt-0.5">arrow_forward</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-full p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            Cerrar
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return null;
};

export default StyleEvolutionView;
