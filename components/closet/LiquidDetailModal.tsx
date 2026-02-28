import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, BrandRecognitionResult, DupeFinderResult, GroundingChunk } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import * as aiService from '../../src/services/aiService';
import { buildSearchTermFromItem, getShoppingLinks } from '../../src/services/monetizationService';
import Loader from '../Loader';
import { isRealImage } from '../../src/utils/imagePlaceholder';
import { useToast } from '../../hooks/useToast';

interface LiquidDetailModalProps {
    item: ClothingItem | null;
    isOpen: boolean;
    onClose: () => void;
    onItemUpdated?: (item: ClothingItem) => void;
}

export default function LiquidDetailModal({ item, isOpen, onClose, onItemUpdated }: LiquidDetailModalProps) {
    const navigate = useNavigate();
    const [imageSide, setImageSide] = useState<'front' | 'back'>('front');
    const [isUploadingBack, setIsUploadingBack] = useState(false);
    const backFileInputRef = React.useRef<HTMLInputElement>(null);
    const toast = useToast();
    const [localItem, setLocalItem] = useState(item);
    const [activeTab, setActiveTab] = useState<'details' | 'brand' | 'dupes'>('details');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOnDemandAnalyzing, setIsOnDemandAnalyzing] = useState(false);
    const [brandResult, setBrandResult] = useState<BrandRecognitionResult | null>(null);
    const [dupeResult, setDupeResult] = useState<DupeFinderResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sync localItem with prop
    useEffect(() => {
        setLocalItem(item);
        setImageSide('front'); // Reset to front when item changes
    }, [item]);

    if (!localItem) return null;

    const dupeItems = Array.isArray(dupeResult?.dupes) ? dupeResult.dupes : [];

    const hasRealImage = isRealImage(localItem.imageDataUrl || (localItem as any).image_url);

    const handleBackFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !localItem) return;

        setIsUploadingBack(true);
        try {
            // Import dynamically to avoid circular dependencies if any, or just standard import
            const { updateClothingItem } = await import('../../src/services/closetService');
            const updatedItem = await updateClothingItem(localItem.id, localItem.metadata, file);

            // Update local state to show new image immediately
            setLocalItem(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    backImageDataUrl: updatedItem.backImageDataUrl
                };
            });
            toast.success('Foto del dorso agregada!');
        } catch (error) {
            console.error('Error uploading back image:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setIsUploadingBack(false);
        }
    };

    const handleAnalyzeBrand = async () => {
        if (!localItem || brandResult) {
            // If already analyzed, just show the results
            setActiveTab('brand');
            return;
        }

        setIsAnalyzing(true);
        setActiveTab('brand');
        setError(null);
        try {
            const result = await aiService.recognizeBrandAndPrice(localItem.imageDataUrl);
            setBrandResult(result);
        } catch (error) {
            console.error('Error analyzing brand:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al analizar la prenda';
            setError(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFindDupes = async () => {
        if (!localItem) return;

        setIsAnalyzing(true);
        setActiveTab('dupes');
        setError(null);
        try {
            // Get brand result first if not available
            let brandInfo = brandResult;
            if (!brandInfo) {
                brandInfo = await aiService.recognizeBrandAndPrice(localItem.imageDataUrl);
                setBrandResult(brandInfo);
            }

            const result = await aiService.findDupeAlternatives(localItem, brandInfo);
            setDupeResult(result);
        } catch (error) {
            console.error('Error finding dupes:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al buscar alternativas';
            setError(errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyzeItemAI = async () => {
        if (!localItem || isOnDemandAnalyzing) return;

        setIsOnDemandAnalyzing(true);
        setError(null);
        try {
            const { analyzeClothingItemOnDemand } = await import('../../src/services/closetService');
            const updatedItem = await analyzeClothingItemOnDemand(localItem.id);
            setLocalItem(updatedItem);
            onItemUpdated?.(updatedItem);
            toast.success('Metadata IA actualizada');
        } catch (analyzeError) {
            console.error('Error analyzing item on-demand:', analyzeError);
            const message = analyzeError instanceof Error ? analyzeError.message : 'No se pudo analizar la prenda';
            setError(message);
            toast.error('No se pudo completar el análisis');
        } finally {
            setIsOnDemandAnalyzing(false);
        }
    };

    // Use portal to ensure modal is always on top of other elements (like FloatingDock)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40"
                    />

                    {/* Modal Content - Peep-hole effect */}
                    <motion.div
                        layoutId={`item-${localItem.id}`}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-[110] max-h-[calc(100dvh-max(0.75rem,env(safe-area-inset-top))-max(0.75rem,env(safe-area-inset-bottom)))] overflow-y-auto"
                        initial={{ scale: 0.9, opacity: 0, borderRadius: "2.5rem" }}
                        animate={{ scale: 1, opacity: 1, borderRadius: "2.5rem" }}
                        exit={{ scale: 0.9, opacity: 0, borderRadius: "2.5rem" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        {/* Image Section */}
                        <div className="relative h-[min(42dvh,28rem)] sm:h-[28rem] w-full bg-gray-100 dark:bg-gray-800">
                            {imageSide === 'front' ? (
                                <img
                                    src={localItem.imageDataUrl}
                                    alt={localItem.metadata?.subcategory}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                localItem.backImageDataUrl ? (
                                    <img
                                        src={localItem.backImageDataUrl}
                                        alt={`${localItem.metadata?.subcategory} (Dorso)`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-4xl">no_photography</span>
                                        </div>
                                        <p>No hay foto del dorso</p>
                                        <input
                                            type="file"
                                            ref={backFileInputRef}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleBackFileUpload}
                                        />
                                        <button
                                            onClick={() => backFileInputRef.current?.click()}
                                            disabled={isUploadingBack}
                                            className="px-6 py-3 rounded-xl bg-white dark:bg-gray-700 text-black dark:text-white font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                        >
                                            {isUploadingBack ? (
                                                <Loader size="small" />
                                            ) : (
                                                <span className="material-symbols-outlined">add_a_photo</span>
                                            )}
                                            {isUploadingBack ? 'Subiendo...' : 'Agregar Foto'}
                                        </button>
                                    </div>
                                )
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                            {/* View Toggle */}
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20 pointer-events-auto">
                                <div className="bg-white/20 backdrop-blur-md rounded-full p-1 flex border border-white/20">
                                    <button
                                        onClick={() => setImageSide('front')}
                                        className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold transition-all ${imageSide === 'front'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-white hover:bg-white/10'
                                            }`}
                                    >
                                        Frente
                                    </button>
                                    <button
                                        onClick={() => setImageSide('back')}
                                        className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold transition-all ${imageSide === 'back'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-white hover:bg-white/10'
                                            }`}
                                    >
                                        Dorso
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors z-20"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700 px-4 pt-3 sm:px-8 sm:pt-6">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-3 sm:px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'details'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Detalles
                            </button>
                            <button
                                onClick={handleAnalyzeBrand}
                                className={`px-3 sm:px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'brand'
                                    ? 'border-purple-500 text-purple-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                🏷️ Marca & Precio
                            </button>
                            <button
                                onClick={handleFindDupes}
                                className={`px-3 sm:px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === 'dupes'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                🛍️ Dónde Comprar
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-5 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:p-8 sm:pb-[calc(8rem+env(safe-area-inset-bottom))]">
                            {/* Details Tab */}
                            {activeTab === 'details' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <h2 className="text-2xl sm:text-[2rem] leading-tight font-serif font-bold text-slate-900 dark:text-white mb-2 capitalize">
                                        {item.metadata?.subcategory || 'Prenda'}
                                    </h2>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${localItem.aiStatus === 'ready'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            : localItem.aiStatus === 'processing'
                                                ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                                                : localItem.aiStatus === 'failed'
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                    : 'bg-slate-100/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/70'
                                            }`}>
                                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                            {localItem.aiStatus === 'ready'
                                                ? 'IA lista'
                                                : localItem.aiStatus === 'processing'
                                                    ? 'Analizando IA'
                                                    : localItem.aiStatus === 'failed'
                                                        ? 'Error IA'
                                                        : 'Sin analizar'}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium capitalize flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">palette</span>
                                            {item.metadata?.color_primary}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-sm font-medium capitalize flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">styler</span>
                                            {item.metadata?.category}
                                        </span>
                                        {item.metadata?.seasons?.map(season => (
                                            <span key={season} className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 text-sm font-medium capitalize flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">wb_sunny</span>
                                                {season}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 px-4 py-3 dark:border-indigo-800/50 dark:bg-indigo-900/20">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                Análisis IA on-demand
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                                Guardás rápido y analizás sólo cuando lo necesitás.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleAnalyzeItemAI}
                                            disabled={isOnDemandAnalyzing || localItem.aiStatus === 'processing'}
                                            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isOnDemandAnalyzing ? 'Analizando...' : localItem.aiStatus === 'ready' ? 'Re-analizar' : 'Analizar ahora'}
                                        </button>
                                    </div>

                                    {/* Vibe Tags */}
                                    {item.metadata?.vibe_tags && item.metadata.vibe_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {item.metadata.vibe_tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium border border-gray-200 dark:border-gray-700">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Categoría</p>
                                            <p className="font-medium text-slate-900 dark:text-white capitalize">{item.metadata?.category || '-'}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subcategoría</p>
                                            <p className="font-medium text-slate-900 dark:text-white capitalize">{item.metadata?.subcategory || '-'}</p>
                                        </div>
                                        {item.metadata?.neckline && (
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cuello</p>
                                                <p className="font-medium text-slate-900 dark:text-white capitalize">{item.metadata.neckline}</p>
                                            </div>
                                        )}
                                        {item.metadata?.sleeve_type && (
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Manga</p>
                                                <p className="font-medium text-slate-900 dark:text-white capitalize">{item.metadata.sleeve_type}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Extended Details */}
                                    <div className="space-y-4">
                                        {item.metadata?.styling_tips && (
                                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-indigo-500 text-sm">style</span>
                                                    <p className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wider font-bold">Consejos de Estilo</p>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {item.metadata.styling_tips}
                                                </p>
                                            </div>
                                        )}

                                        {item.metadata?.care_instructions && (
                                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-emerald-500 text-sm">wash</span>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-300 uppercase tracking-wider font-bold">Cuidados</p>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                    {item.metadata.care_instructions}
                                                </p>
                                            </div>
                                        )}

                                        {item.metadata?.fabric_composition && (
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Composición</p>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {item.metadata.fabric_composition}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Brand Analysis Tab */}
                            {activeTab === 'brand' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="min-h-[200px]"
                                >
                                    {isAnalyzing ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader size="large" />
                                            <p className="text-gray-500 mt-4">Analizando marca y precio...</p>
                                        </div>
                                    ) : error ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <span className="material-symbols-outlined text-6xl text-red-300 mb-4">error</span>
                                            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error al analizar</p>
                                            <p className="text-gray-500 text-sm text-center max-w-md">{error}</p>
                                            {item.isAIGenerated && (
                                                <div className="mt-4 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 max-w-md">
                                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                        💡 Esta prenda fue generada por IA. El análisis de marca solo funciona con fotos reales de prendas.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : brandResult ? (
                                        <div className="space-y-4">
                                            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{brandResult.brand.name}</h3>
                                                    <span className="px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-bold">
                                                        {brandResult.brand.confidence}% seguro
                                                    </span>
                                                </div>

                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                                        ${brandResult.price_estimate.average_price}
                                                    </span>
                                                    <span className="text-gray-600 dark:text-gray-400">{brandResult.price_estimate.currency}</span>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Rango: ${brandResult.price_estimate.min_price} - ${brandResult.price_estimate.max_price}
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    💡 {brandResult.market_insights}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">label</span>
                                            <p className="text-gray-500">Toca "Marca & Precio" para analizar</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Dupes Tab */}
                            {activeTab === 'dupes' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="min-h-[200px]"
                                >
                                    {isAnalyzing ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader size="large" />
                                            <p className="text-gray-500 mt-4">Buscando alternativas...</p>
                                        </div>
                                    ) : dupeResult && dupeItems.length > 0 ? (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-lg mb-4">Alternativas más baratas:</h3>
                                            {dupeItems.slice(0, 5).map((dupe, idx) => (
                                                <a
                                                    key={idx}
                                                    href={dupe.shop_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-gray-900 dark:text-white">{dupe.title}</p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{dupe.brand} · {dupe.shop_name}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${dupe.price}</p>
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">Ahorrás {dupe.savings_percentage}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="material-symbols-outlined text-sm">verified</span>
                                                        {dupe.similarity_score}% similar
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : dupeResult && dupeItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                                                <span className="material-symbols-outlined text-4xl text-orange-500">search_off</span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">No encontramos alternativas</p>
                                            <p className="text-gray-500 text-sm text-center max-w-xs mb-4">
                                                Probá con otra prenda más común o intentá de nuevo más tarde.
                                            </p>
                                            <button
                                                onClick={handleFindDupes}
                                                className="px-6 py-2 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">refresh</span>
                                                Reintentar búsqueda
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_bag</span>
                                            <p className="text-gray-500">Toca "Dónde Comprar" para buscar</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        <div className="sticky bottom-0 left-0 right-0 z-20 px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-4 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200/60 dark:border-gray-700/60">
                            <div className="flex flex-col gap-3">
                                {/* PRIMARY HERO ACTION: Probar Look */}
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(ROUTES.STUDIO, { state: { preselectedItemIds: [item.id] } });
                                    }}
                                    className="relative overflow-hidden w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-white font-semibold text-base shadow-[0_8px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_40px_rgba(236,72,153,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 group border border-white/20"
                                >
                                    <div className="absolute inset-0 bg-[length:200%_200%] animate-gradient-xy bg-gradient-to-r from-purple-500 via-pink-500 to-[color:var(--studio-rose)]" />
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative z-10 material-symbols-outlined group-hover:rotate-12 transition-transform drop-shadow-sm">auto_fix_high</span>
                                    <span className="relative z-10 drop-shadow-sm">Probar look</span>
                                </button>

                                {/* SECONDARY ACTIONS: Muted Glassmorphism */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAnalyzeBrand}
                                        disabled={!hasRealImage}
                                        title={!hasRealImage ? 'Necesitás una foto real de la prenda para analizar la marca' : ''}
                                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border ${hasRealImage
                                            ? 'bg-white/50 dark:bg-black/30 backdrop-blur-md text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-black/50 hover:border-purple-300 dark:hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-400 focus:ring-2 focus:ring-purple-500/20 active:scale-95'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">label</span>
                                        Marca
                                    </button>
                                    <button
                                        onClick={handleFindDupes}
                                        disabled={!hasRealImage}
                                        title={!hasRealImage ? 'Necesitás una foto real de la prenda para buscar alternativas' : ''}
                                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border ${hasRealImage
                                            ? 'bg-white/50 dark:bg-black/30 backdrop-blur-md text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-black/50 hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 focus:ring-2 focus:ring-blue-500/20 active:scale-95'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                                        Alternativas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
