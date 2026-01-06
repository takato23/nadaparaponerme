import React, { useState, useMemo } from 'react';
import type { ClothingItem, StyleDNAProfile } from '../types';
import { analyzeStyleDNA } from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';
import { HelpIcon } from './ui/HelpIcon';
import { getCreditStatus } from '../services/usageTrackingService';

interface StyleDNAProfileViewProps {
    closet: ClothingItem[];
    onClose: () => void;
}

type ViewStep = 'intro' | 'analyzing' | 'results';

const StyleDNAProfileView = ({ closet, onClose }: StyleDNAProfileViewProps) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
    const [dnaProfile, setDnaProfile] = useState<StyleDNAProfile | null>(null);
    const [error, setError] = useState<string>('');

    // Credits status
    const credits = useMemo(() => getCreditStatus(), [dnaProfile]);

    const handleStartAnalysis = async () => {
        if (closet.length < 10) {
            setError('Necesitás al menos 10 prendas en tu armario para un análisis confiable de Style DNA.');
            return;
        }

        setError('');
        setCurrentStep('analyzing');

        try {
            const result = await analyzeStyleDNA(closet);
            setDnaProfile(result);
            setCurrentStep('results');
        } catch (err) {
            console.error('Error analyzing style DNA:', err);
            setError(err instanceof Error ? err.message : 'Error al analizar tu Style DNA');
            setCurrentStep('intro');
        }
    };

    // Intro Step
    if (currentStep === 'intro') {
        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20">
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold dark:text-gray-200">Tu Style DNA</h2>
                            <HelpIcon
                                content="Style DNA analiza todas tus prendas para identificar patrones de estilo, arquetipos de personalidad y preferencias únicas"
                                position="bottom"
                            />
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
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-6">
                            {error && (
                                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl p-4">
                                    <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            <Card variant="glass" padding="xl" rounded="3xl" className=" text-center">
                                <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-5xl">fingerprint</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-2 dark:text-gray-200">Descubrí tu ADN de Estilo</h3>
                                <p className="text-text-secondary dark:text-gray-400">
                                    Un análisis profundo de tu personalidad a través de tu ropa. IA examina tu armario completo para revelar arquetipos de estilo, rasgos de personalidad, y mucho más.
                                </p>
                            </Card>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">diversity_3</span>
                                        <h4 className="font-bold dark:text-gray-200">Arquetipos de Estilo</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Descubre si sos casual, formal, minimalist, edgy, bohemian, o una mezcla única.
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">palette</span>
                                        <h4 className="font-bold dark:text-gray-200">Perfil de Color</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Tu paleta de colores dominante, temperatura cromática, y boldness.
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">psychology</span>
                                        <h4 className="font-bold dark:text-gray-200">Rasgos de Personalidad</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Lo que tu ropa revela sobre tu personalidad y valores.
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">star</span>
                                        <h4 className="font-bold dark:text-gray-200">Celebrity Matches</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Celebridades cuyo estilo es similar al tuyo.
                                    </p>
                                </Card>
                            </div>

                            <Card variant="glass" padding="lg" rounded="2xl">
                                <h4 className="font-bold mb-3 dark:text-gray-200">¿Qué es Style DNA?</h4>
                                <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                    Tu "ADN de Estilo" es un perfil psicológico basado en tu armario completo. IA analiza:
                                </p>
                                <ul className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>10 arquetipos de estilo</strong> con distribución porcentual</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Análisis de color:</strong> temperatura, boldness, neutros vs. accents</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Preferencias de silueta:</strong> oversized, fitted, structured, etc.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Rasgos de personalidad</strong> inferidos de tus elecciones de ropa</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Celebrity matches:</strong> influencers con estilo similar</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Insights de evolución:</strong> cómo está cambiando tu estilo</span>
                                    </li>
                                </ul>
                            </Card>

                            <Card variant="glass" padding="lg" rounded="2xl" className="bg-primary/5">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary">info</span>
                                    <div>
                                        <h4 className="font-bold mb-1 dark:text-gray-200">Requisitos</h4>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">
                                            Necesitás al menos 10 prendas para un análisis básico. Con 15+ prendas obtenés confidence medium. Con 30+ prendas el análisis es altamente confiable.
                                        </p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                                            <strong>Tu armario actual:</strong> {closet.length} prendas
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleStartAnalysis}
                            disabled={closet.length < 10}
                            className="w-full bg-primary text-white font-bold py-4 rounded-2xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {closet.length < 10 ? `Agregá ${10 - closet.length} prendas más` : 'Analizar mi Style DNA'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Analyzing Step
    if (currentStep === 'analyzing') {
        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-6">
                    <Card variant="glass" padding="xl" rounded="3xl" className="max-w-md w-full text-center">
                        <Loader />
                        <h3 className="text-2xl font-bold mt-6 mb-2 dark:text-gray-200">Analizando tu Style DNA</h3>
                        <p className="text-text-secondary dark:text-gray-400 mb-6">
                            IA está estudiando tus {closet.length} prendas para descubrir tu perfil de estilo único...
                        </p>
                        <div className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                            <p>✓ Identificando arquetipos de estilo</p>
                            <p>✓ Analizando paleta de colores</p>
                            <p>✓ Evaluando preferencias de silueta</p>
                            <p>✓ Infiriendo rasgos de personalidad</p>
                            <p>✓ Buscando celebrity matches</p>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // Results Step
    if (currentStep === 'results' && dnaProfile) {
        const primaryArchetype = dnaProfile.archetypes.find(a => a.archetype === dnaProfile.primary_archetype);
        const secondaryArchetype = dnaProfile.archetypes.find(a => a.archetype === dnaProfile.secondary_archetype);

        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20">
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setCurrentStep('intro')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h2 className="text-xl font-bold dark:text-gray-200">Tu Style DNA</h2>
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
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6 pb-24">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Summary Card */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <div className="text-center mb-4">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-primary text-4xl">fingerprint</span>
                                        <h3 className="text-3xl font-bold dark:text-gray-200">
                                            {dnaProfile.primary_archetype.charAt(0).toUpperCase() + dnaProfile.primary_archetype.slice(1)}
                                        </h3>
                                    </div>
                                    {dnaProfile.secondary_archetype && (
                                        <p className="text-text-secondary dark:text-gray-400">
                                            con toques de {dnaProfile.secondary_archetype.charAt(0).toUpperCase() + dnaProfile.secondary_archetype.slice(1)}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{dnaProfile.versatility_score}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Versatilidad</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{dnaProfile.uniqueness_score}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Uniqueness</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary capitalize">{dnaProfile.confidence_level}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Confidence</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Narrative Summary */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">auto_stories</span>
                                    Tu Historia de Estilo
                                </h3>
                                <p className="text-text-secondary dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                    {dnaProfile.summary}
                                </p>
                            </Card>

                            {/* Archetypes */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">diversity_3</span>
                                    Arquetipos de Estilo
                                </h3>
                                <div className="space-y-3">
                                    {dnaProfile.archetypes
                                        .sort((a, b) => b.percentage - a.percentage)
                                        .filter(a => a.percentage > 0)
                                        .map(archetype => (
                                            <div key={archetype.archetype}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium capitalize dark:text-gray-200">{archetype.archetype}</span>
                                                    <span className="text-sm text-text-secondary dark:text-gray-400">{Math.round(archetype.percentage)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-primary rounded-full h-2 transition-all"
                                                        style={{ width: `${archetype.percentage}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">{archetype.description}</p>
                                            </div>
                                        ))}
                                </div>
                            </Card>

                            {/* Color Profile */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">palette</span>
                                    Perfil de Color
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2 dark:text-gray-200">Temperature: <span className="capitalize text-primary">{dnaProfile.color_profile.color_temperature}</span></p>
                                        <p className="text-sm font-medium mb-2 dark:text-gray-200">Boldness: <span className="capitalize text-primary">{dnaProfile.color_profile.color_boldness}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-2 dark:text-gray-200">Colores Dominantes:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {dnaProfile.color_profile.dominant_colors.map((color, idx) => (
                                                <div key={idx} className="flex items-center gap-1">
                                                    <div
                                                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    <span className="text-xs capitalize dark:text-gray-200">{color.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2 dark:text-gray-200">Neutrals Favoritos:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {dnaProfile.color_profile.favorite_neutrals.map((color, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded capitalize dark:text-gray-200">{color}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-2 dark:text-gray-200">Accent Colors:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {dnaProfile.color_profile.accent_colors.map((color, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded capitalize">{color}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Silhouette Preferences */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">straighten</span>
                                    Preferencias de Silueta
                                </h3>
                                <div className="space-y-3">
                                    {dnaProfile.silhouette_preferences
                                        .sort((a, b) => b.percentage - a.percentage)
                                        .filter(s => s.percentage > 0)
                                        .map(silhouette => (
                                            <div key={silhouette.type}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium capitalize dark:text-gray-200">{silhouette.type}</span>
                                                    <span className="text-sm text-text-secondary dark:text-gray-400">{Math.round(silhouette.percentage)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-primary rounded-full h-2 transition-all"
                                                        style={{ width: `${silhouette.percentage}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">{silhouette.description}</p>
                                            </div>
                                        ))}
                                </div>
                            </Card>

                            {/* Occasion Breakdown */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">event</span>
                                    Breakdown por Ocasiones
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {dnaProfile.occasion_breakdown
                                        .sort((a, b) => b.percentage - a.percentage)
                                        .map(occasion => (
                                            <div key={occasion.occasion} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium capitalize dark:text-gray-200">{occasion.occasion}</span>
                                                    <span className="text-primary font-bold">{Math.round(occasion.percentage)}%</span>
                                                </div>
                                                <p className="text-sm text-text-secondary dark:text-gray-400">{occasion.item_count} prendas</p>
                                            </div>
                                        ))}
                                </div>
                            </Card>

                            {/* Personality Traits */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                    Rasgos de Personalidad
                                </h3>
                                <div className="space-y-4">
                                    {dnaProfile.personality_traits.map((trait, idx) => (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium dark:text-gray-200">{trait.trait}</span>
                                                <div className="flex gap-1">
                                                    {Array.from({ length: 10 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-3 h-3 rounded-full ${
                                                                i < trait.score
                                                                    ? 'bg-primary'
                                                                    : 'bg-gray-200 dark:bg-gray-700'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-sm text-text-secondary dark:text-gray-400">{trait.reasoning}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Celebrity Matches */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">star</span>
                                    Celebrity Style Matches
                                </h3>
                                <div className="space-y-4">
                                    {dnaProfile.celebrity_matches.map((celeb, idx) => (
                                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-lg dark:text-gray-200">{celeb.name}</h4>
                                                    <p className="text-primary font-medium">{celeb.match_percentage}% match</p>
                                                </div>
                                                <span className="text-3xl">#{idx + 1}</span>
                                            </div>
                                            <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">{celeb.reasoning}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {celeb.shared_characteristics.map((char, charIdx) => (
                                                    <span key={charIdx} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                                        {char}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Evolution Insights */}
                            {dnaProfile.style_evolution_insights.length > 0 && (
                                <Card variant="glass" padding="lg" rounded="3xl">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                        <span className="material-symbols-outlined text-primary">trending_up</span>
                                        Evolución de Estilo
                                    </h3>
                                    <div className="space-y-4">
                                        {dnaProfile.style_evolution_insights.map((insight, idx) => (
                                            <div key={idx} className="border-l-4 border-primary pl-4">
                                                <h4 className="font-bold mb-1 dark:text-gray-200">{insight.trend}</h4>
                                                <p className="text-sm text-text-secondary dark:text-gray-400 mb-2"><strong>Evidencia:</strong> {insight.evidence}</p>
                                                <p className="text-sm text-primary"><strong>Recomendación:</strong> {insight.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 to-transparent dark:from-background-dark/90">
                        <button
                            onClick={() => setCurrentStep('intro')}
                            className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95"
                        >
                            Analizar de Nuevo
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default StyleDNAProfileView;
