import React, { useState } from 'react';
import type { AIDesignRequest, AIDesignedItem, DesignCategory, DesignStyle } from '../types';
import * as geminiService from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

type ViewStep = 'describe' | 'generating' | 'result';

interface AIFashionDesignerViewProps {
    onClose: () => void;
    onAddToCloset: (imageDataUrl: string, metadata: any) => void;
}

const AIFashionDesignerView = ({ onClose, onAddToCloset }: AIFashionDesignerViewProps) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('describe');
    const [designedItem, setDesignedItem] = useState<AIDesignedItem | null>(null);
    const [error, setError] = useState<string>('');

    // Form state
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<DesignCategory>('top');
    const [style, setStyle] = useState<DesignStyle | ''>('');
    const [occasion, setOccasion] = useState('');

    const CATEGORIES: DesignCategory[] = ['top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory'];
    const STYLES: DesignStyle[] = ['casual', 'formal', 'elegant', 'sporty', 'bohemian', 'minimalist', 'edgy', 'vintage', 'romantic', 'streetwear'];

    const handleGenerate = async () => {
        if (!description.trim()) {
            setError('Por favor describí la prenda que querés diseñar');
            return;
        }

        setError('');
        setCurrentStep('generating');

        const request: AIDesignRequest = {
            description: description.trim(),
            category,
            style: style || undefined,
            occasion: occasion.trim() || undefined,
        };

        try {
            const result = await geminiService.generateFashionDesign(request);
            setDesignedItem(result);
            setCurrentStep('result');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
            setError(errorMessage);
            setCurrentStep('describe');
        }
    };

    const handleAddToCloset = () => {
        if (!designedItem) return;
        onAddToCloset(designedItem.image_url, designedItem.metadata);
        onClose();
    };

    const handleReset = () => {
        setDesignedItem(null);
        setDescription('');
        setCategory('top');
        setStyle('');
        setOccasion('');
        setError('');
        setCurrentStep('describe');
    };

    // Render Describe Step
    if (currentStep === 'describe') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="none" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                                AI Fashion Designer
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
                        <Card variant="glass" padding="lg" rounded="2xl" className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-5xl">
                                    auto_awesome
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                                Diseñá tu prenda ideal con IA
                            </h3>
                            <p className="text-text-secondary dark:text-gray-400">
                                Describí la prenda que imaginás y nuestra IA la generará con calidad fotográfica profesional.
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
                                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                                    Categoría *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            className={`p-3 rounded-xl text-sm font-medium transition-colors capitalize ${
                                                category === cat
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Style (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary dark:text-gray-200 mb-2">
                                    Estilo (opcional)
                                </label>
                                <select
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value as DesignStyle | '')}
                                    className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">Sin preferencia</option>
                                    {STYLES.map(s => (
                                        <option key={s} value={s} className="capitalize">
                                            {s}
                                        </option>
                                    ))}
                                </select>
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
                            disabled={!description.trim()}
                            className="w-full p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Generar Diseño con IA
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // Render Generating Step
    if (currentStep === 'generating') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="lg" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-md text-center">
                    <Loader />
                    <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mt-6 mb-2">
                        Generando tu diseño...
                    </h3>
                    <div className="space-y-2 text-text-secondary dark:text-gray-400 text-sm">
                        <p>🎨 Optimizando prompt con IA...</p>
                        <p>🖼️ Generando imagen con Imagen 4...</p>
                        <p>🔍 Analizando metadata de la prenda...</p>
                    </div>
                </Card>
            </div>
        );
    }

    // Render Result Step
    if (currentStep === 'result' && designedItem) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <Card variant="glass" padding="none" rounded="3xl" className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                            <img
                                src={designedItem.image_url}
                                alt={designedItem.request.description}
                                className="w-full h-auto"
                            />
                        </Card>

                        {/* Request Details */}
                        <Card variant="glass" padding="md" rounded="2xl">
                            <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3">
                                Detalles del Diseño
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-text-secondary dark:text-gray-400">Descripción original:</span>
                                    <p className="text-text-primary dark:text-gray-200 font-medium">
                                        {designedItem.request.description}
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <span className="text-text-secondary dark:text-gray-400">Categoría:</span>
                                        <p className="text-text-primary dark:text-gray-200 font-medium capitalize">
                                            {designedItem.request.category}
                                        </p>
                                    </div>
                                    {designedItem.request.style && (
                                        <div>
                                            <span className="text-text-secondary dark:text-gray-400">Estilo:</span>
                                            <p className="text-text-primary dark:text-gray-200 font-medium capitalize">
                                                {designedItem.request.style}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Metadata */}
                        <Card variant="glass" padding="md" rounded="2xl">
                            <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3">
                                Análisis de IA
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-text-secondary dark:text-gray-400">Tipo detectado:</span>
                                    <p className="text-text-primary dark:text-gray-200 font-medium">
                                        {designedItem.metadata.subcategory}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-text-secondary dark:text-gray-400">Color principal:</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div
                                            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                                            style={{ backgroundColor: designedItem.metadata.color_primary }}
                                        />
                                        <span className="text-text-primary dark:text-gray-200 font-medium capitalize">
                                            {designedItem.metadata.color_primary}
                                        </span>
                                    </div>
                                </div>
                                {designedItem.metadata.vibe_tags.length > 0 && (
                                    <div>
                                        <span className="text-text-secondary dark:text-gray-400">Vibe:</span>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {designedItem.metadata.vibe_tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs capitalize"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleAddToCloset}
                                className="flex-1 p-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all active:scale-95"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined">add</span>
                                    Agregar al Armario
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
                    </div>
                </Card>
            </div>
        );
    }

    return null;
};

export default AIFashionDesignerView;
