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
}

export default function LiquidDetailModal({ item, isOpen, onClose }: LiquidDetailModalProps) {
    const navigate = useNavigate();
    const [imageSide, setImageSide] = useState<'front' | 'back'>('front');
    const [isUploadingBack, setIsUploadingBack] = useState(false);
    const backFileInputRef = React.useRef<HTMLInputElement>(null);
    const toast = useToast();
    const [localItem, setLocalItem] = useState(item);
    const [activeTab, setActiveTab] = useState<'details' | 'brand' | 'dupes'>('details');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
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

    // Use portal to ensure modal is always on top of other elements (like FloatingDock)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl z-[110] max-h-[90vh] overflow-y-auto"
                        initial={{ scale: 0.9, opacity: 0, borderRadius: "3rem" }}
                        animate={{ scale: 1, opacity: 1, borderRadius: "3rem" }}
                        exit={{ scale: 0.9, opacity: 0, borderRadius: "3rem" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        {/* Image Section */}
                        <div className="relative h-96 w-full bg-gray-100 dark:bg-gray-800">
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
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${imageSide === 'front'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-white hover:bg-white/10'
                                            }`}
                                    >
                                        Frente
                                    </button>
                                    <button
                                        onClick={() => setImageSide('back')}
                                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${imageSide === 'back'
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
                        <div className="flex border-b border-gray-200 dark:border-gray-700 px-8 pt-6">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'details'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Detalles
                            </button>
                            <button
                                onClick={handleAnalyzeBrand}
                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'brand'
                                    ? 'border-purple-500 text-purple-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                🏷️ Marca & Precio
                            </button>
                            <button
                                onClick={handleFindDupes}
                                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'dupes'
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                🛍️ Dónde Comprar
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-8 pb-[calc(8rem+env(safe-area-inset-bottom))]">
                            {/* Details Tab */}
                            {activeTab === 'details' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-2 capitalize">
                                        {item.metadata?.subcategory || 'Prenda'}
                                    </h2>

                                    <div className="flex flex-wrap gap-2 mb-4">
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

                        <div className="sticky bottom-0 left-0 right-0 z-20 px-8 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200/60 dark:border-gray-700/60">
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(ROUTES.STUDIO, { state: { preselectedItemIds: [item.id] } });
                                    }}
                                    className="w-full py-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
                                >
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">auto_fix_high</span>
                                    Probar look
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAnalyzeBrand}
                                        disabled={!hasRealImage}
                                        title={!hasRealImage ? 'Necesitás una foto real de la prenda para analizar la marca' : ''}
                                        className={`flex-1 py-3 rounded-xl text-white font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${hasRealImage
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-[1.02]'
                                            : 'bg-gray-400 cursor-not-allowed opacity-60'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">label</span>
                                        Marca
                                    </button>
                                    <button
                                        onClick={handleFindDupes}
                                        disabled={!hasRealImage}
                                        title={!hasRealImage ? 'Necesitás una foto real de la prenda para buscar alternativas' : ''}
                                        className={`flex-1 py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${hasRealImage
                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-[1.02]'
                                            : 'bg-gray-400 cursor-not-allowed opacity-60'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">shopping_bag</span>
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
