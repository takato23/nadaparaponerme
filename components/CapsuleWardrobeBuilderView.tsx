import React, { useState } from 'react';
import type { ClothingItem, CapsuleWardrobe, CapsuleTheme, CapsuleSize } from '../types';
import { generateCapsuleWardrobe } from '../src/services/aiService';
import Loader from './Loader';
import CapsuleCompatibilityMatrix from './CapsuleCompatibilityMatrix';
import { Card } from './ui/Card';

interface CapsuleWardrobeBuilderViewProps {
    closet: ClothingItem[];
    onClose: () => void;
    onSaveCapsule?: (capsule: CapsuleWardrobe) => void;
    onCreateOutfitFromCapsule?: (topId: string, bottomId: string, shoesId: string) => void;
}

type ViewStep = 'intro' | 'config' | 'analyzing' | 'results';

const CapsuleWardrobeBuilderView = ({ closet, onClose, onSaveCapsule, onCreateOutfitFromCapsule }: CapsuleWardrobeBuilderViewProps) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
    const [selectedTheme, setSelectedTheme] = useState<CapsuleTheme>('minimal');
    const [selectedSize, setSelectedSize] = useState<CapsuleSize>(15);
    const [selectedSeason, setSelectedSeason] = useState<string>('');
    const [capsuleResult, setCapsuleResult] = useState<CapsuleWardrobe | null>(null);
    const [error, setError] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const themeOptions: { value: CapsuleTheme; label: string; icon: string; description: string }[] = [
        { value: 'work', label: 'Trabajo', icon: 'work', description: 'Profesional y elegante' },
        { value: 'casual', label: 'Casual', icon: 'weekend', description: 'Relajado y cómodo' },
        { value: 'travel', label: 'Viaje', icon: 'flight', description: 'Práctico y versátil' },
        { value: 'minimal', label: 'Minimalista', icon: 'check_circle', description: 'Atemporal y simple' },
        { value: 'seasonal', label: 'Estacional', icon: 'wb_sunny', description: 'Adaptado al clima' },
        { value: 'custom', label: 'Personalizado', icon: 'tune', description: 'Balance de todo' }
    ];

    const sizeOptions: CapsuleSize[] = [10, 15, 20, 30];

    const seasonOptions = ['', 'Primavera', 'Verano', 'Otoño', 'Invierno'];

    const handleStartGeneration = async () => {
        if (isGenerating) return; // Prevent multiple calls
        
        if (closet.length < selectedSize) {
            setError(`Necesitás al menos ${selectedSize} prendas en tu armario para crear una cápsula de este tamaño.`);
            return;
        }

        setError('');
        setCurrentStep('analyzing');
        setIsGenerating(true);

        try {
            const result = await generateCapsuleWardrobe(
                closet,
                selectedTheme,
                selectedSize,
                selectedSeason || undefined
            );
            setCapsuleResult(result);
            setCurrentStep('results');
        } catch (err) {
            console.error('Error generating capsule:', err);
            setError(err instanceof Error ? err.message : 'Error al generar la cápsula');
            setCurrentStep('config');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCapsule = () => {
        if (capsuleResult && onSaveCapsule) {
            onSaveCapsule(capsuleResult);
        }
    };

    const handleCreateOutfit = (topId?: string, bottomId?: string, shoesId?: string) => {
        if (topId && bottomId && shoesId && onCreateOutfitFromCapsule) {
            onCreateOutfitFromCapsule(topId, bottomId, shoesId);
        }
    };

    const getItemById = (id: string) => closet.find(item => item.id === id);

    // Intro Step
    if (currentStep === 'intro') {
        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20">
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold dark:text-gray-200">Capsule Wardrobe Builder</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <Card variant="glass" padding="xl" rounded="3xl" className=" text-center">
                                <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-5xl">checkroom</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-2 dark:text-gray-200">Creá tu Cápsula de Armario</h3>
                                <p className="text-text-secondary dark:text-gray-400">
                                    Una cápsula es una colección minimalista de prendas versátiles que combinan entre sí, maximizando tus outfits con menos prendas.
                                </p>
                            </Card>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                        <h4 className="font-bold dark:text-gray-200">Selección Inteligente</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        IA analiza tu armario y selecciona prendas que maximizan versatilidad y combinaciones.
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">palette</span>
                                        <h4 className="font-bold dark:text-gray-200">Paleta Cohesiva</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Colores neutros + accent colors que garantizan que todo combine con todo.
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">grid_on</span>
                                        <h4 className="font-bold dark:text-gray-200">Matriz de Compatibilidad</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Ve qué tan bien combina cada prenda con las demás (scoring 0-100).
                                    </p>
                                </Card>

                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="material-symbols-outlined text-primary">checkroom</span>
                                        <h4 className="font-bold dark:text-gray-200">Outfits Sugeridos</h4>
                                    </div>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        5-8 combinaciones ejemplares que muestran la versatilidad de la cápsula.
                                    </p>
                                </Card>
                            </div>

                            <Card variant="glass" padding="lg" rounded="2xl">
                                <h4 className="font-bold mb-3 dark:text-gray-200">¿Qué es una Cápsula de Armario?</h4>
                                <ul className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Minimalismo:</strong> Menos prendas, más combinaciones</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Versatilidad:</strong> Cada prenda combina con múltiples otras</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Coherencia:</strong> Paleta de colores armoniosa</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                        <span><strong>Objetivo:</strong> 30+ outfits con 10-30 prendas</span>
                                    </li>
                                </ul>
                            </Card>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setCurrentStep('config')}
                            className="w-full bg-primary text-white font-bold py-4 rounded-2xl transition-transform active:scale-95"
                        >
                            Comenzar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Config Step
    if (currentStep === 'config') {
        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20">
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setCurrentStep('intro')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h2 className="text-xl font-bold dark:text-gray-200">Configuración</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-6">
                            {error && (
                                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl p-4">
                                    <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 dark:text-gray-200">1. Elegí el Tema</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {themeOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setSelectedTheme(option.value)}
                                            className={`p-4 rounded-2xl border-2 transition-all ${
                                                selectedTheme === option.value
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                            }`}
                                        >
                                            <span className={`material-symbols-outlined text-3xl mb-2 ${
                                                selectedTheme === option.value ? 'text-primary' : 'text-gray-400'
                                            }`}>{option.icon}</span>
                                            <p className={`font-bold text-sm mb-1 ${
                                                selectedTheme === option.value ? 'text-primary' : 'dark:text-gray-200'
                                            }`}>{option.label}</p>
                                            <p className="text-xs text-text-secondary dark:text-gray-400">{option.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-4 dark:text-gray-200">2. Tamaño de la Cápsula</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {sizeOptions.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={`p-4 rounded-2xl border-2 transition-all ${
                                                selectedSize === size
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                            }`}
                                        >
                                            <p className={`text-3xl font-bold mb-1 ${
                                                selectedSize === size ? 'text-primary' : 'dark:text-gray-200'
                                            }`}>{size}</p>
                                            <p className="text-xs text-text-secondary dark:text-gray-400">prendas</p>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm text-text-secondary dark:text-gray-400 mt-3">
                                    Tenés {closet.length} prendas en tu armario
                                </p>
                            </Card>

                            {selectedTheme === 'seasonal' && (
                                <Card variant="glass" padding="lg" rounded="3xl">
                                    <h3 className="font-bold text-lg mb-4 dark:text-gray-200">3. Estación (Opcional)</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {seasonOptions.map(season => (
                                            <button
                                                key={season}
                                                onClick={() => setSelectedSeason(season)}
                                                className={`p-3 rounded-2xl border-2 transition-all ${
                                                    selectedSeason === season
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                }`}
                                            >
                                                <p className={`font-bold text-sm ${
                                                    selectedSeason === season ? 'text-primary' : 'dark:text-gray-200'
                                                }`}>{season || 'Cualquiera'}</p>
                                            </button>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleStartGeneration}
                            disabled={closet.length < selectedSize || isGenerating}
                            className="w-full bg-primary text-white font-bold py-4 rounded-2xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? 'Generando...' : 'Generar Cápsula'}
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
                        <h3 className="text-2xl font-bold mt-6 mb-2 dark:text-gray-200">Analizando tu Armario</h3>
                        <p className="text-text-secondary dark:text-gray-400 mb-6">
                            IA está seleccionando las prendas más versátiles y creando tu cápsula personalizada...
                        </p>
                        <div className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                            <p>✓ Evaluando versatilidad de cada prenda</p>
                            <p>✓ Calculando matriz de compatibilidad</p>
                            <p>✓ Generando combinaciones de outfits</p>
                            <p>✓ Identificando paleta de colores</p>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // Results Step
    if (currentStep === 'results' && capsuleResult) {
        return (
            <div className="fixed inset-0 z-50 animate-fade-in">
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20">
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setCurrentStep('config')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h2 className="text-xl font-bold dark:text-gray-200">{capsuleResult.name}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6 pb-32">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Summary Card */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <div className="grid md:grid-cols-3 gap-4 mb-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{capsuleResult.items.length}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Prendas Seleccionadas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{capsuleResult.total_combinations}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Combinaciones Posibles</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{capsuleResult.suggested_outfits.length}</p>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">Outfits Sugeridos</p>
                                    </div>
                                </div>
                                <p className="text-sm text-text-secondary dark:text-gray-400 text-center">
                                    Tema: {capsuleResult.theme} {capsuleResult.season && `• ${capsuleResult.season}`}
                                </p>
                            </Card>

                            {/* Strategy Explanation */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                    Estrategia de Selección
                                </h3>
                                <p className="text-sm text-text-secondary dark:text-gray-400 whitespace-pre-line">
                                    {capsuleResult.strategy_explanation}
                                </p>
                            </Card>

                            {/* Color Palette */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">palette</span>
                                    Paleta de Colores
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {capsuleResult.color_palette.map((color, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div
                                                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                                                style={{ backgroundColor: color.toLowerCase() }}
                                            />
                                            <span className="text-sm capitalize dark:text-gray-200">{color}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Selected Items Grid */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">checkroom</span>
                                    Prendas Seleccionadas
                                </h3>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                    {capsuleResult.items.map(capsuleItem => {
                                        const item = getItemById(capsuleItem.item_id);
                                        if (!item) return null;
                                        return (
                                            <div key={capsuleItem.item_id} className="relative group">
                                                <Card variant="glass" padding="none" rounded="xl" className="aspect-square overflow-hidden">
                                                    <img
                                                        src={item.imageDataUrl}
                                                        alt={item.metadata.subcategory}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </Card>
                                                <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-lg">
                                                    {Math.round(capsuleItem.versatility_score)}
                                                </div>
                                                <p className="text-xs text-center mt-1 truncate dark:text-gray-200">
                                                    {item.metadata.subcategory}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Compatibility Matrix */}
                            <CapsuleCompatibilityMatrix capsule={capsuleResult} closet={closet} />

                            {/* Suggested Outfits */}
                            <Card variant="glass" padding="lg" rounded="3xl">
                                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                    Outfits Sugeridos
                                </h3>
                                <div className="space-y-4">
                                    {capsuleResult.suggested_outfits.map((outfit, idx) => (
                                        <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                                            <div className="flex items-start gap-4 mb-3">
                                                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                    <span className="text-primary font-bold">{idx + 1}</span>
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-bold mb-1 dark:text-gray-200">{outfit.occasion}</h4>
                                                    <p className="text-sm text-text-secondary dark:text-gray-400">{outfit.explanation}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {outfit.top_id && getItemById(outfit.top_id) && (
                                                    <Card variant="glass" padding="none" rounded="xl" className="flex-1 aspect-square overflow-hidden">
                                                        <img
                                                            src={getItemById(outfit.top_id)!.imageDataUrl}
                                                            alt="Top"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Card>
                                                )}
                                                {outfit.bottom_id && getItemById(outfit.bottom_id) && (
                                                    <Card variant="glass" padding="none" rounded="xl" className="flex-1 aspect-square overflow-hidden">
                                                        <img
                                                            src={getItemById(outfit.bottom_id)!.imageDataUrl}
                                                            alt="Bottom"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Card>
                                                )}
                                                {outfit.shoes_id && getItemById(outfit.shoes_id) && (
                                                    <Card variant="glass" padding="none" rounded="xl" className="flex-1 aspect-square overflow-hidden">
                                                        <img
                                                            src={getItemById(outfit.shoes_id)!.imageDataUrl}
                                                            alt="Shoes"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Card>
                                                )}
                                            </div>
                                            {outfit.top_id && outfit.bottom_id && outfit.shoes_id && (
                                                <button
                                                    onClick={() => handleCreateOutfit(outfit.top_id, outfit.bottom_id, outfit.shoes_id)}
                                                    className="w-full mt-3 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm transition-transform active:scale-95"
                                                >
                                                    Crear este Outfit
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Missing Pieces */}
                            {capsuleResult.missing_pieces && capsuleResult.missing_pieces.length > 0 && (
                                <Card variant="glass" padding="lg" rounded="3xl">
                                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                        <span className="material-symbols-outlined text-primary">add_circle</span>
                                        Prendas Faltantes (Opcional)
                                    </h3>
                                    <ul className="space-y-2">
                                        {capsuleResult.missing_pieces.map((piece, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary dark:text-gray-400">
                                                <span className="material-symbols-outlined text-primary text-sm mt-0.5">add</span>
                                                <span>{piece}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 to-transparent dark:from-background-dark/90">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentStep('config')}
                                className="flex-1 bg-white dark:bg-gray-800 border-2 border-primary text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95"
                            >
                                Crear Otra
                            </button>
                            {onSaveCapsule && (
                                <button
                                    onClick={handleSaveCapsule}
                                    className="flex-1 bg-primary text-white font-bold py-4 rounded-2xl transition-transform active:scale-95"
                                >
                                    Guardar Cápsula
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default CapsuleWardrobeBuilderView;
