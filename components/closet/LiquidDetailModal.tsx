import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import type { ClothingItem, BrandRecognitionResult, DupeFinderResult } from '../../types';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import { buildSearchTermFromItem, getShoppingLinks } from '../../src/services/monetizationService';
import Loader from '../Loader';
import { isRealImage } from '../../src/utils/imagePlaceholder';
import { useToast } from '../../hooks/useToast';
import { proxyImageViaEdge } from '../../src/services/edgeFunctionClient';
import { resolveColorSwatch } from '../../src/utils/colorUtils';
import { getUserLocaleSafe, resolveCountryCodeFromLocale } from '../../src/utils/localeCountry';
import { useDeviceProfile } from '../../src/hooks/useDeviceProfile';
import {
    trackShoppingDupesCompleted,
    trackShoppingDupesFailed,
    trackShoppingDupesRequested,
    trackShoppingDupesResultCount,
    trackShoppingFallbackLinkClicked,
    trackShoppingLinkClicked
} from '../../src/services/analyticsService';

const BRAND_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DUPES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type AIServiceModule = typeof import('../../src/services/aiService');

let aiServicePromise: Promise<AIServiceModule> | null = null;

const loadAiService = (): Promise<AIServiceModule> => {
    if (!aiServicePromise) {
        aiServicePromise = import('../../src/services/aiService');
    }
    return aiServicePromise;
};

type CachedPayload<T> = {
    savedAt: number;
    data: T;
};

interface LiquidDetailModalProps {
    item: ClothingItem | null;
    isRecommended?: boolean;
    isOpen: boolean;
    onClose: () => void;
    onItemUpdated?: (item: ClothingItem) => void;
}

export default function LiquidDetailModal({ item, isRecommended = false, isOpen, onClose, onItemUpdated }: LiquidDetailModalProps) {
    const navigate = useNavigate();
    const deviceProfile = useDeviceProfile();
    const isLowEndDevice = deviceProfile.profile === 'low';
    const shouldReduceMotion = deviceProfile.shouldReduceMotion;
    const useLiteModalEffects = deviceProfile.profile !== 'high' || shouldReduceMotion;
    const [imageSide, setImageSide] = useState<'front' | 'back'>('front');
    const [isUploadingBack, setIsUploadingBack] = useState(false);
    const backFileInputRef = React.useRef<HTMLInputElement>(null);
    const toast = useToast();
    const [localItem, setLocalItem] = useState(item);
    const [activeTab, setActiveTab] = useState<'details' | 'brand' | 'dupes'>('details');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOnDemandAnalyzing, setIsOnDemandAnalyzing] = useState(false);
    const [isRetryingNormalization, setIsRetryingNormalization] = useState(false);
    const [isPremiumNormalizing, setIsPremiumNormalizing] = useState(false);
    const [brandResult, setBrandResult] = useState<BrandRecognitionResult | null>(null);
    const [dupeResult, setDupeResult] = useState<DupeFinderResult | null>(null);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
    const [selectedCategoryChip, setSelectedCategoryChip] = useState('todo');
    const [error, setError] = useState<string | null>(null);
    const [isPreparingImage, setIsPreparingImage] = useState(false);
    const [pendingAction, setPendingAction] = useState<'brand' | 'dupes' | null>(null);
    const imageDataUrlCacheRef = useRef<Map<string, string>>(new Map());
    const getLegacyImageUrl = useCallback((target: ClothingItem | null) => {
        const itemWithLegacyUrl = target as (ClothingItem & { image_url?: string }) | null;
        return itemWithLegacyUrl?.image_url;
    }, []);

    // Sync localItem with prop
    useEffect(() => {
        setLocalItem(item);
        setImageSide('front'); // Reset to front when item changes
        setActiveTab('details');
        setBrandResult(null);
        setDupeResult(null);
        setError(null);
        setIsAnalyzing(false);
        setIsOnDemandAnalyzing(false);
        setIsPreparingImage(false);
        setPendingAction(null);
        setIsCategoryExpanded(false);
        setSelectedCategoryChip('todo');
    }, [item]);

    const colorSwatch = useMemo(
        () => resolveColorSwatch(localItem?.metadata?.color_primary),
        [localItem?.metadata?.color_primary]
    );
    const userLocale = useMemo(() => getUserLocaleSafe(), []);
    const shoppingCountryCode = useMemo(() => resolveCountryCodeFromLocale(userLocale), [userLocale]);
    const shoppingLinks = useMemo(() => {
        if (!localItem) return [];
        return getShoppingLinks(buildSearchTermFromItem(localItem), shoppingCountryCode);
    }, [localItem, shoppingCountryCode]);
    const detailCategoryOptions = useMemo(() => {
        if (!localItem) return [{ id: 'todo', label: 'Todo', icon: 'apps' }];

        const options = [{ id: 'todo', label: 'Todo', icon: 'apps' }];
        const pushUnique = (id: string, label: string, icon: string) => {
            if (!options.some((option) => option.id === id)) {
                options.push({ id, label, icon });
            }
        };

        if (localItem.metadata?.category) {
            const label = localItem.metadata.category.charAt(0).toUpperCase() + localItem.metadata.category.slice(1);
            pushUnique(`category:${localItem.metadata.category}`, label, 'styler');
        }

        if (localItem.metadata?.vibe_tags?.length) {
            localItem.metadata.vibe_tags.slice(0, 2).forEach((tag) => {
                pushUnique(`vibe:${tag}`, tag, 'sell');
            });
        }

        if (localItem.metadata?.seasons?.length) {
            localItem.metadata.seasons.slice(0, 2).forEach((season) => {
                const label = season.charAt(0).toUpperCase() + season.slice(1);
                pushUnique(`season:${season}`, label, 'wb_sunny');
            });
        }

        return options;
    }, [localItem]);
    const selectedCategoryOption = useMemo(() => {
        return detailCategoryOptions.find((option) => option.id === selectedCategoryChip) ?? detailCategoryOptions[0];
    }, [detailCategoryOptions, selectedCategoryChip]);

    const getMainImageSource = useCallback(() => {
        if (!localItem) return '';
        return localItem.imageDataUrl || getLegacyImageUrl(localItem) || '';
    }, [getLegacyImageUrl, localItem]);

    const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') {
                    reject(new Error('No se pudo leer la imagen.'));
                    return;
                }
                resolve(reader.result);
            };
            reader.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
            reader.readAsDataURL(blob);
        });
    }, []);

    const ensureDataImageUrl = useCallback(async (source: string): Promise<string> => {
        if (!source) throw new Error('La prenda no tiene imagen para analizar.');
        if (source.startsWith('data:image')) return source;

        const cachedDataUrl = imageDataUrlCacheRef.current.get(source);
        if (cachedDataUrl) return cachedDataUrl;

        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`No se pudo descargar la imagen (${response.status}).`);
            }
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) {
                throw new Error('El archivo no es una imagen válida.');
            }
            const dataUrl = await blobToDataUrl(blob);
            imageDataUrlCacheRef.current.set(source, dataUrl);
            return dataUrl;
        } catch {
            try {
                const proxiedDataUrl = await proxyImageViaEdge(source);
                imageDataUrlCacheRef.current.set(source, proxiedDataUrl);
                return proxiedDataUrl;
            } catch {
                throw new Error('No se pudo preparar la foto para análisis. Reintentá con otra imagen.');
            }
        }
    }, [blobToDataUrl]);

    const brandCacheKey = useMemo(() => {
        if (!localItem?.id) return null;
        return `ojodeloca:brand-analysis:${localItem.id}`;
    }, [localItem?.id]);

    const dupesCacheKey = useMemo(() => {
        if (!localItem?.id) return null;
        return `ojodeloca:dupes:${localItem.id}:${shoppingCountryCode}`;
    }, [localItem?.id, shoppingCountryCode]);

    const readCache = useCallback(<T,>(key: string | null, ttlMs: number): T | null => {
        if (!key || typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as CachedPayload<T>;
            if (!parsed || typeof parsed.savedAt !== 'number') return null;
            if (Date.now() - parsed.savedAt > ttlMs) {
                window.localStorage.removeItem(key);
                return null;
            }
            return parsed.data ?? null;
        } catch {
            return null;
        }
    }, []);

    const writeCache = useCallback(<T,>(key: string | null, data: T): void => {
        if (!key || typeof window === 'undefined') return;
        try {
            const payload: CachedPayload<T> = { savedAt: Date.now(), data };
            window.localStorage.setItem(key, JSON.stringify(payload));
        } catch {
            // Ignore cache write failures (quota/private mode).
        }
    }, []);

    if (!localItem) return null;

    const dupeItems = Array.isArray(dupeResult?.dupes) ? dupeResult.dupes : [];

    const hasRealImage = isRealImage(localItem.imageDataUrl || getLegacyImageUrl(localItem));
    const isBrandReady = Boolean(brandResult);
    const isDupesReady = dupeItems.length > 0;
    const hasActionableDupeLinks = dupeItems.some((dupe) => typeof dupe?.shop_url === 'string' && dupe.shop_url.startsWith('http'));
    const normalizeConfidencePercent = (value: number | undefined): number => {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        if (numeric <= 1) return Math.round(numeric * 100);
        return Math.round(numeric);
    };
    const formatCurrencyAmount = (value: number, currency: string): string => {
        const amount = Number(value);
        const normalizedCurrency = (currency || 'USD').toUpperCase();
        if (!Number.isFinite(amount)) return `${normalizedCurrency} -`;
        try {
            return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: normalizedCurrency,
                maximumFractionDigits: 0,
            }).format(amount);
        } catch {
            return `${normalizedCurrency} ${Math.round(amount)}`;
        }
    };
    const brandConfidencePercent = normalizeConfidencePercent(brandResult?.brand?.confidence);
    const brandConfidenceTone = brandConfidencePercent >= 75
        ? 'bg-emerald-500 text-white'
        : brandConfidencePercent >= 45
            ? 'bg-amber-500 text-white'
            : 'bg-slate-500 text-white';

    const getSourceLabel = (source?: string) => {
        if (source === 'ml_api') return 'MercadoLibre API';
        if (source === 'gemini_grounded') return 'Web IA';
        if (source === 'manual_fallback') return 'Fallback manual';
        return 'Fuente no definida';
    };

    const getSourceMix = () => {
        const sources = Array.from(new Set(
            dupeItems
                .map((dupe) => dupe?.source)
                .filter((source): source is NonNullable<typeof source> => typeof source === 'string' && source.length > 0)
        ));
        if (sources.length === 0) return 'none';
        return sources.join('|');
    };

    const glassMdClass = isLowEndDevice ? '' : 'backdrop-blur-md';
    const tryLookButtonShellClass = isLowEndDevice
        ? 'shadow-[0_6px_20px_rgba(236,72,153,0.32)]'
        : 'shadow-[0_8px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_10px_40px_rgba(236,72,153,0.5)]';
    const tryLookButtonFillClass = isLowEndDevice
        ? 'bg-gradient-to-r from-emerald-500 to-[color:var(--studio-rose)]'
        : 'bg-[length:200%_200%] animate-gradient-xy bg-gradient-to-r from-emerald-500 via-pink-500 to-[color:var(--studio-rose)]';

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

    const runAnalyzeBrand = async () => {
        if (!localItem || brandResult) {
            // If already analyzed, just show the results
            setActiveTab('brand');
            return;
        }

        setIsAnalyzing(true);
        setIsPreparingImage(true);
        setActiveTab('brand');
        setError(null);
        try {
            const aiService = await loadAiService();
            const imageDataUrl = await ensureDataImageUrl(getMainImageSource());
            const result = await aiService.recognizeBrandAndPrice(imageDataUrl);
            setBrandResult(result);
            writeCache(brandCacheKey, result);
        } catch (error) {
            console.error('Error analyzing brand:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al analizar la prenda';
            setError(errorMessage);
        } finally {
            setIsPreparingImage(false);
            setIsAnalyzing(false);
        }
    };

    const runFindDupes = async () => {
        if (!localItem) return;

        const startedAt = Date.now();
        setIsAnalyzing(true);
        setIsPreparingImage(true);
        setActiveTab('dupes');
        setError(null);
        trackShoppingDupesRequested({
            country_code: shoppingCountryCode,
            item_category: localItem.metadata?.category || 'unknown'
        });
        try {
            const aiService = await loadAiService();
            const imageDataUrl = await ensureDataImageUrl(getMainImageSource());

            // Get brand result first if not available
            let brandInfo = brandResult;
            if (!brandInfo) {
                brandInfo = await aiService.recognizeBrandAndPrice(imageDataUrl);
                setBrandResult(brandInfo);
            }

            const result = await aiService.findDupeAlternatives({
                ...localItem,
                imageDataUrl
            }, brandInfo);
            setDupeResult(result);
            writeCache(dupesCacheKey, result);

            const resultCount = Array.isArray(result?.dupes) ? result.dupes.length : 0;
            const verifiedCount = Array.isArray(result?.dupes)
                ? result.dupes.filter((dupe) => dupe?.link_verified === true).length
                : 0;
            const sourceMix = Array.from(new Set(
                (result?.dupes || [])
                    .map((dupe) => dupe?.source)
                    .filter((source): source is NonNullable<typeof source> => typeof source === 'string' && source.length > 0)
            )).join('|') || 'none';
            const latencyMs = Math.max(0, Date.now() - startedAt);

            trackShoppingDupesCompleted({
                country_code: shoppingCountryCode,
                item_category: localItem.metadata?.category || 'unknown',
                source_mix: sourceMix,
                result_count: resultCount,
                verified_count: verifiedCount,
                latency_ms: latencyMs
            });
            trackShoppingDupesResultCount({
                country_code: shoppingCountryCode,
                item_category: localItem.metadata?.category || 'unknown',
                source_mix: sourceMix,
                result_count: resultCount,
                verified_count: verifiedCount,
                latency_ms: latencyMs
            });
        } catch (error) {
            console.error('Error finding dupes:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al buscar alternativas';
            setError(errorMessage);
            trackShoppingDupesFailed({
                country_code: shoppingCountryCode,
                item_category: localItem.metadata?.category || 'unknown',
                latency_ms: Math.max(0, Date.now() - startedAt),
                error_code: error instanceof Error ? error.name : 'unknown_error'
            });
        } finally {
            setIsPreparingImage(false);
            setIsAnalyzing(false);
        }
    };

    const requestAnalyzeBrand = () => {
        if (!localItem || isAnalyzing || !hasRealImage) return;
        setActiveTab('brand');
        if (brandResult) return;

        const cachedBrand = readCache<BrandRecognitionResult>(brandCacheKey, BRAND_CACHE_TTL_MS);
        if (cachedBrand) {
            setBrandResult(cachedBrand);
            setError(null);
            toast.success('Usando análisis guardado');
            return;
        }

        setPendingAction('brand');
    };

    const requestFindDupes = (forceRefresh = false) => {
        if (!localItem || isAnalyzing || !hasRealImage) return;
        setActiveTab('dupes');
        if (isDupesReady) return;

        if (!forceRefresh) {
            const cachedDupes = readCache<DupeFinderResult>(dupesCacheKey, DUPES_CACHE_TTL_MS);
            if (cachedDupes) {
                setDupeResult(cachedDupes);
                setError(null);
                toast.success('Mostrando resultados guardados');
                return;
            }
        }

        setPendingAction('dupes');
    };

    const confirmPendingAction = async () => {
        const action = pendingAction;
        setPendingAction(null);
        if (action === 'brand') {
            await runAnalyzeBrand();
            return;
        }
        if (action === 'dupes') {
            await runFindDupes();
        }
    };

    const handleAnalyzeItemAI = async () => {
        if (!localItem || isOnDemandAnalyzing) return;
        if (!hasRealImage) {
            const message = 'Esta prenda no tiene una foto real para analizar. Subí una imagen antes de usar IA.';
            setError(message);
            toast.error(message);
            return;
        }

        setIsOnDemandAnalyzing(true);
        setError(null);
        try {
            const { analyzeClothingItemOnDemand } = await import('../../src/services/closetService');
            const updatedItem = await analyzeClothingItemOnDemand(localItem.id, {
                imageDataUrl: getMainImageSource(),
                currentItem: localItem
            });
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

    const handleRetryNormalization = async () => {
        if (!localItem || isRetryingNormalization) return;
        if (!hasRealImage) {
            const message = 'Esta prenda no tiene una foto real para normalizar. Subí una imagen antes de reintentar.';
            setError(message);
            toast.error(message);
            return;
        }
        setIsRetryingNormalization(true);
        try {
            const { retryClothingItemNormalization } = await import('../../src/services/closetService');
            const updatedItem = await retryClothingItemNormalization(localItem.id);
            setLocalItem(updatedItem);
            onItemUpdated?.(updatedItem);
            toast.success('Normalización reintentada');
        } catch (normalizeError) {
            console.error('Error retrying normalization:', normalizeError);
            toast.error(normalizeError instanceof Error ? normalizeError.message : 'No se pudo reintentar');
        } finally {
            setIsRetryingNormalization(false);
        }
    };

    const handlePremiumNormalization = async () => {
        if (!localItem || isPremiumNormalizing) return;
        if (!hasRealImage) {
            const message = 'Esta prenda no tiene una foto real para mejorar. Subí una imagen antes de continuar.';
            setError(message);
            toast.error(message);
            return;
        }
        setIsPremiumNormalizing(true);
        try {
            const { requestPremiumNormalization } = await import('../../src/services/closetService');
            const updatedItem = await requestPremiumNormalization(localItem.id);
            setLocalItem(updatedItem);
            onItemUpdated?.(updatedItem);
            toast.success('Foto mejorada');
        } catch (normalizeError) {
            console.error('Error refining normalization:', normalizeError);
            toast.error(normalizeError instanceof Error ? normalizeError.message : 'No se pudo mejorar la foto');
        } finally {
            setIsPremiumNormalizing(false);
        }
    };

    const handleGoStudio = (event?: React.MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        navigate(ROUTES.STUDIO, { state: { preselectedItemIds: [localItem.id] } });
        window.requestAnimationFrame(() => {
            onClose();
        });
    };

    const handleDupeLinkClick = (dupe: any) => {
        trackShoppingLinkClicked({
            country_code: shoppingCountryCode,
            item_category: localItem.metadata?.category || 'unknown',
            source_mix: getSourceMix(),
            result_count: dupeItems.length,
            verified_count: dupeItems.filter((item) => item?.link_verified === true).length,
            source: dupe?.source || 'unknown',
            shop_name: dupe?.shop_name || 'unknown',
            link_verified: dupe?.link_verified === true
        });
    };

    const handleFallbackLinkClick = (platform: string) => {
        trackShoppingFallbackLinkClicked({
            country_code: shoppingCountryCode,
            item_category: localItem.metadata?.category || 'unknown',
            source_mix: getSourceMix(),
            result_count: dupeItems.length,
            verified_count: dupeItems.filter((item) => item?.link_verified === true).length,
            platform
        });
    };

    // Use portal to ensure modal is always on top of other elements (like FloatingDock)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <LazyMotion features={domAnimation}>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
                        {/* Backdrop with blur */}
                        <m.div
                            initial={shouldReduceMotion ? false : (useLiteModalEffects ? { opacity: 0 } : { opacity: 0, backdropFilter: 'blur(0px)' })}
                            animate={useLiteModalEffects ? { opacity: 1 } : { opacity: 1, backdropFilter: 'blur(10px)' }}
                            exit={useLiteModalEffects ? { opacity: 0 } : { opacity: 0, backdropFilter: 'blur(0px)' }}
                            onClick={onClose}
                            className={isLowEndDevice ? 'absolute inset-0 bg-black/55' : 'absolute inset-0 bg-black/45'}
                        />

                        {/* Modal Content - Immersive Liquid Glass */}
                        <m.div
                            layoutId={useLiteModalEffects ? undefined : `item-${localItem.id}`}
                            className="relative w-full max-w-2xl bg-black rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-[110] h-[85dvh] sm:h-[90dvh] flex flex-col overscroll-none"
                            initial={shouldReduceMotion
                                ? false
                                : (useLiteModalEffects
                                    ? { opacity: 0, y: 12, scale: 0.98, borderRadius: '2.5rem' }
                                    : { scale: 0.92, opacity: 0, borderRadius: '2.5rem' })
                            }
                            animate={{ scale: 1, opacity: 1, y: 0, borderRadius: '2.5rem' }}
                            exit={useLiteModalEffects
                                ? { opacity: 0, y: 8, scale: 0.98, borderRadius: '2.5rem' }
                                : { scale: 0.92, opacity: 0, borderRadius: '2.5rem' }}
                            transition={useLiteModalEffects
                                ? { duration: 0.15, ease: 'easeOut' }
                                : { type: 'spring', damping: 35, stiffness: 500 }}
                        >
                            {/* Full Background Image (Tappable Area to toggle UI) */}
                            <div
                                className="absolute inset-0 bg-slate-900 cursor-pointer"
                                onClick={() => setIsControlsVisible(!isControlsVisible)}
                            >
                                {imageSide === 'front' ? (
                                    <div className="w-full h-full relative">
                                        {/* Fondo ahumado para rellenar espacios si el object-contain deja huecos */}
                                        <div className="absolute inset-0 bg-slate-900" />
                                        <img
                                            src={localItem.imageDataUrl || getLegacyImageUrl(localItem)}
                                            alt={localItem.metadata?.subcategory}
                                            className="absolute inset-0 w-full h-full object-cover backdrop-blur-sm"
                                            loading="eager"
                                            decoding="async"
                                        />
                                    </div>
                                ) : (
                                    localItem.backImageDataUrl ? (
                                        <img
                                            src={localItem.backImageDataUrl}
                                            alt={`${localItem.metadata?.subcategory} (Dorso)`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-white/50 gap-4 bg-slate-800">
                                            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                                                <span className="material-symbols-outlined text-4xl">no_photography</span>
                                            </div>
                                            <p className="font-medium text-white/80">No hay foto del dorso</p>
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
                                                className="px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30 text-white font-bold shadow-lg hover:bg-white/30 transition-colors flex items-center gap-2"
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
                                {/* Immersive Overlays */}
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none transition-opacity duration-500 ease-in-out ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`} />
                                <div className={`absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none transition-opacity duration-500 ease-in-out ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`} />
                            </div>

                            {/* Floating Top Controls */}
                            <div className={`absolute top-4 left-4 right-4 flex justify-between items-start z-30 pointer-events-auto transition-opacity duration-500 ease-in-out ${isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <div className={`bg-black/30 backdrop-blur-xl rounded-[1.25rem] p-1 flex border border-white/20 shadow-lg`}>
                                    <button
                                        onClick={() => setImageSide('front')}
                                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${imageSide === 'front'
                                            ? 'bg-white/20 text-white shadow-sm'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        Frente
                                    </button>
                                    <button
                                        onClick={() => setImageSide('back')}
                                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${imageSide === 'back'
                                            ? 'bg-white/20 text-white shadow-sm'
                                            : 'text-white/70 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        Dorso
                                    </button>
                                </div>
                                <button
                                    onClick={onClose}
                                    className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/20 shadow-lg`}
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable Content Area */}
                            <div
                                className={`relative z-20 flex-1 overflow-y-auto w-full pt-32 pb-[5rem] px-3 sm:px-5 flex flex-col hide-scrollbar transition-opacity duration-500 ease-in-out ${isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                onClick={() => setIsControlsVisible(!isControlsVisible)}
                            >
                                <div className="mt-auto w-full relative">
                                    {/* Sub-capa touch blocker para evitar cierres de UI accidentales clickeando en la carta */}
                                    <div className="absolute inset-0 z-[-1]" onClick={(e) => e.stopPropagation()} />
                                    {/* Glass Planch */}
                                    <div
                                        className="w-full p-5 sm:p-6 rounded-[2rem] bg-white/5 dark:bg-black/20 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col gap-6 text-white relative overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Subtle Shine */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

                                        {/* Minimalist Tabs */}
                                        <div className="flex gap-4 sm:gap-6 border-b border-white/10 pb-2 relative z-10">
                                            {(['details', 'brand', 'dupes'] as const).map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab)}
                                                    className={`relative pb-3 text-sm font-medium transition-colors ${activeTab === tab
                                                        ? 'text-white'
                                                        : 'text-white/50 hover:text-white/80'
                                                        }`}
                                                >
                                                    {tab === 'details' && 'Detalles'}
                                                    {tab === 'brand' && 'Marca'}
                                                    {tab === 'dupes' && 'Comprar'}
                                                    {activeTab === tab && (
                                                        <m.div
                                                            layoutId="activeTabIndicatorImmersive"
                                                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]"
                                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tab Content */}
                                        <div className="relative z-10 w-full min-h-[50vh]">
                                            {/* Details Tab */}
                                            {activeTab === 'details' && (
                                                <m.div
                                                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                                                    className="flex flex-col gap-5 pb-20"
                                                >
                                                    <div>
                                                        <h2 className="text-4xl sm:text-[3rem] leading-none font-serif font-bold text-white mb-4 capitalize tracking-tight drop-shadow-md">
                                                            {localItem.metadata?.subcategory || 'Prenda'}
                                                        </h2>
                                                        <div className="space-y-3">
                                                            <div className="rounded-[1.35rem] border border-white/18 bg-[rgba(10,14,26,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(0,0,0,0.18)]">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsCategoryExpanded((prev) => !prev)}
                                                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">
                                                                            Categorías
                                                                        </p>
                                                                        <span className="mt-1 inline-flex max-w-full items-center gap-2 rounded-full border border-white/16 bg-white/14 px-3 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                                                            <span className="material-symbols-outlined text-[14px] text-cyan-200">{selectedCategoryOption.icon}</span>
                                                                            <span className="truncate">{selectedCategoryOption.label}</span>
                                                                        </span>
                                                                    </div>
                                                                    <span className={`material-symbols-outlined text-white/70 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`}>
                                                                        expand_more
                                                                    </span>
                                                                </button>

                                                                {isCategoryExpanded && (
                                                                    <div className="border-t border-white/10 bg-black/35 px-4 pb-4 pt-3 backdrop-blur-md">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {detailCategoryOptions.map((option) => {
                                                                                const isSelected = selectedCategoryChip === option.id;
                                                                                return (
                                                                                    <button
                                                                                        key={option.id}
                                                                                        type="button"
                                                                                        onClick={() => setSelectedCategoryChip(option.id)}
                                                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected
                                                                                            ? 'border-cyan-300/40 bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.16)]'
                                                                                            : 'border-white/14 bg-white/10 text-white hover:bg-white/16'
                                                                                            }`}
                                                                                    >
                                                                                        <span className={`material-symbols-outlined text-[14px] ${isSelected ? 'text-slate-700' : 'text-cyan-200'}`}>
                                                                                            {option.icon}
                                                                                        </span>
                                                                                        {option.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                {isRecommended && (
                                                                    <span className="px-3 py-1.5 rounded-full border border-amber-200/35 bg-[rgba(255,214,102,0.14)] text-amber-50 text-xs font-semibold flex items-center gap-1.5 shadow-[0_10px_24px_rgba(251,191,36,0.12)]">
                                                                        <span className="material-symbols-outlined text-[14px] text-amber-100">auto_awesome</span>
                                                                        Prenda recomendada
                                                                    </span>
                                                                )}
                                                                <span className="px-3 py-1.5 rounded-full border border-white/16 bg-[rgba(10,14,26,0.5)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                                                                    <span className="material-symbols-outlined text-[14px] text-indigo-300">auto_awesome</span>
                                                                    {localItem.aiStatus === 'ready' ? 'IA lista' : localItem.aiStatus === 'processing' ? 'Analizando IA' : 'Sin analizar'}
                                                                </span>
                                                                {localItem.metadata?.color_primary && (
                                                                    <span className="px-3 py-1.5 rounded-full border border-white/16 bg-[rgba(10,14,26,0.5)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] capitalize">
                                                                        <div
                                                                            className="w-3.5 h-3.5 rounded-full shadow-inner"
                                                                            style={{
                                                                                backgroundColor: colorSwatch.cssColor,
                                                                                border: `1px solid ${colorSwatch.borderColor}`,
                                                                            }}
                                                                        />
                                                                        {localItem.metadata.color_primary}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveTab('details')}
                                                                    className={`rounded-[1.15rem] border px-4 py-3 text-sm font-semibold shadow-[0_12px_26px_rgba(255,255,255,0.08)] transition-colors ${activeTab === 'details'
                                                                        ? 'border-white/18 bg-[rgba(255,255,255,0.94)] text-slate-950'
                                                                        : 'border-white/16 bg-[rgba(255,255,255,0.72)] text-slate-900 hover:bg-white'
                                                                        }`}
                                                                >
                                                                    Detalles
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveTab('brand')}
                                                                    className={`rounded-[1.15rem] border px-4 py-3 text-sm font-semibold shadow-[0_12px_26px_rgba(255,255,255,0.08)] transition-colors ${activeTab === 'brand'
                                                                        ? 'border-white/18 bg-[rgba(255,255,255,0.94)] text-slate-950'
                                                                        : 'border-white/16 bg-[rgba(255,255,255,0.72)] text-slate-900 hover:bg-white'
                                                                        }`}
                                                                >
                                                                    Marca
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveTab('dupes')}
                                                                    className={`col-span-2 rounded-[1.15rem] border px-4 py-3 text-sm font-semibold shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition-colors ${activeTab === 'dupes'
                                                                        ? 'border-white/20 bg-[rgba(255,255,255,0.2)] text-white'
                                                                        : 'border-white/16 bg-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.16)]'
                                                                        }`}
                                                                >
                                                                    Comprar / buscar similares
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(localItem.metadata?.neckline || localItem.metadata?.sleeve_type) && (
                                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                                            {localItem.metadata.neckline && (
                                                                <div className="p-4 rounded-[1.25rem] bg-black/20 border border-white/10 backdrop-blur-sm shadow-inner">
                                                                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Cuello</p>
                                                                    <p className="font-serif text-[1.15rem] leading-tight text-white capitalize drop-shadow-sm">{localItem.metadata.neckline}</p>
                                                                </div>
                                                            )}
                                                            {localItem.metadata.sleeve_type && (
                                                                <div className="p-4 rounded-[1.25rem] bg-black/20 border border-white/10 backdrop-blur-sm shadow-inner">
                                                                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Manga</p>
                                                                    <p className="font-serif text-[1.15rem] leading-tight text-white capitalize drop-shadow-sm">{localItem.metadata.sleeve_type}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {localItem.metadata?.vibe_tags && localItem.metadata.vibe_tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {localItem.metadata.vibe_tags.map(tag => (
                                                                <span key={tag} className="px-3 py-1 rounded-full bg-black/20 border border-white/10 shadow-inner text-white/80 text-sm font-medium">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Extended Details */}
                                                    <div className="space-y-3 mt-2">
                                                        {localItem.metadata?.styling_tips && (
                                                            <div className="p-4 rounded-2xl bg-indigo-500/20 border border-indigo-300/30 backdrop-blur-sm shadow-inner">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="material-symbols-outlined text-indigo-300 text-sm drop-shadow-md">style</span>
                                                                    <p className="text-xs text-indigo-200 uppercase tracking-widest font-bold drop-shadow-md">Consejos de Estilo</p>
                                                                </div>
                                                                <p className="text-sm text-indigo-50/90 leading-relaxed drop-shadow-sm">
                                                                    {localItem.metadata.styling_tips}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {localItem.metadata?.care_instructions && (
                                                            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-300/30 backdrop-blur-sm shadow-inner">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="material-symbols-outlined text-emerald-300 text-sm drop-shadow-md">wash</span>
                                                                    <p className="text-xs text-emerald-200 uppercase tracking-widest font-bold drop-shadow-md">Cuidados</p>
                                                                </div>
                                                                <p className="text-sm text-emerald-50/90 leading-relaxed drop-shadow-sm">
                                                                    {localItem.metadata.care_instructions}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={handleAnalyzeItemAI}
                                                        disabled={isOnDemandAnalyzing || localItem.aiStatus === 'processing' || !hasRealImage}
                                                        className="mt-4 w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md shadow-[0_4px_16px_0_rgba(255,255,255,0.1)] text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">magic_button</span>
                                                        {isOnDemandAnalyzing ? 'Analizando...' : localItem.aiStatus === 'ready' ? 'Re-analizar con IA' : 'Completar datos con IA'}
                                                    </button>

                                                    <div className="rounded-2xl border border-white/14 bg-black/20 p-4 backdrop-blur-sm">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Normalización</p>
                                                                <p className="mt-1 text-sm font-semibold text-white">
                                                                    {localItem.normalizedImage?.status === 'ready'
                                                                        ? `Lista (${localItem.normalizedImage?.mode || 'none'})`
                                                                        : localItem.normalizedImage?.status === 'failed'
                                                                            ? 'Falló la normalización automática'
                                                                            : 'Pendiente'}
                                                                </p>
                                                                {localItem.normalizedImage?.error && (
                                                                    <p className="mt-1 text-xs text-white/60">{localItem.normalizedImage.error}</p>
                                                                )}
                                                            </div>
                                                            <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/16 bg-white/10">
                                                                <img
                                                                    src={(localItem.normalizedImage?.status === 'ready'
                                                                        ? (localItem.normalizedImage?.thumbnail_url || localItem.normalizedImage?.image_url)
                                                                        : null) || localItem.imageDataUrl || getLegacyImageUrl(localItem)}
                                                                    alt={localItem.metadata?.subcategory}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleRetryNormalization}
                                                                disabled={isRetryingNormalization || !hasRealImage}
                                                                className="rounded-xl border border-white/18 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/16 disabled:opacity-50"
                                                            >
                                                                {isRetryingNormalization ? 'Reintentando...' : 'Reintentar'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handlePremiumNormalization}
                                                                disabled={isPremiumNormalizing || !hasRealImage}
                                                                className="rounded-xl border border-amber-300/30 bg-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-400/28 disabled:opacity-50"
                                                            >
                                                                {isPremiumNormalizing ? 'Mejorando...' : 'Mejorar foto'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </m.div>
                                            )}

                                            {/* Brand Analysis Tab */}
                                            {activeTab === 'brand' && (
                                                <m.div
                                                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                                                    className="pb-20 flex flex-col gap-4"
                                                >
                                                    {isAnalyzing ? (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <Loader size="large" />
                                                            <p className="text-white/70 mt-4 text-sm font-medium">
                                                                {isPreparingImage ? 'Preparando foto para análisis...' : 'Analizando marca y precio...'}
                                                            </p>
                                                        </div>
                                                    ) : error ? (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <span className="material-symbols-outlined text-6xl text-red-400 mb-4 drop-shadow-md">error</span>
                                                            <p className="text-white font-medium mb-2 drop-shadow-md">Error al analizar</p>
                                                            <p className="text-white/70 text-sm text-center max-w-md drop-shadow-sm">{error}</p>
                                                            {localItem.isAIGenerated && (
                                                                <div className="mt-6 p-4 rounded-[1.25rem] bg-yellow-500/20 border border-yellow-300/30 backdrop-blur-sm max-w-md shadow-inner">
                                                                    <p className="text-sm text-yellow-100 drop-shadow-sm">
                                                                        💡 Esta prenda fue generada por IA. El análisis de marca solo funciona con fotos reales de prendas.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : brandResult ? (
                                                        <div className="space-y-4">
                                                            <div className="p-6 rounded-[1.5rem] bg-black/30 border border-white/10 backdrop-blur-md shadow-inner relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full blur-[20px] pointer-events-none" />
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h3 className="text-[1.75rem] font-serif font-bold text-white tracking-tight drop-shadow-md">{brandResult.brand.name}</h3>
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 text-white shadow-sm backdrop-blur-sm`}>
                                                                        {brandResult.brand.confidence >= 80 ? 'Alta confianza' : brandResult.brand.confidence >= 40 ? 'Media confianza' : 'Baja confianza'}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-col">
                                                                    <span className="text-[2.5rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-100 drop-shadow-md leading-tight">
                                                                        {formatCurrencyAmount(
                                                                            Number(brandResult.price_estimate.average_price || 0),
                                                                            brandResult.price_estimate.currency || 'USD'
                                                                        )}
                                                                    </span>
                                                                    <p className="text-sm font-medium text-white/50 drop-shadow-sm mt-1">
                                                                        Rango estimado: {formatCurrencyAmount(Number(brandResult.price_estimate.min_price || 0), brandResult.price_estimate.currency || 'USD')} - {formatCurrencyAmount(Number(brandResult.price_estimate.max_price || 0), brandResult.price_estimate.currency || 'USD')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="p-4 rounded-[1.25rem] bg-blue-500/20 border border-blue-300/30 backdrop-blur-sm shadow-inner">
                                                                <p className="text-sm text-blue-50/90 leading-relaxed drop-shadow-sm">
                                                                    💡 {brandResult.market_insights}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center mb-5 border border-emerald-300/30 shadow-lg">
                                                                <span className="material-symbols-outlined text-3xl text-emerald-300 drop-shadow-md">sell</span>
                                                            </div>
                                                            <h3 className="text-[1.5rem] font-serif font-bold text-white mb-2 tracking-tight drop-shadow-md">
                                                                Descubrir Marca
                                                            </h3>
                                                            <p className="text-white/60 text-sm max-w-sm mb-8 leading-relaxed drop-shadow-sm">
                                                                Identificá la marca de la prenda y estimá su valor de reventa.
                                                            </p>

                                                            {pendingAction === 'brand' ? (
                                                                <div className="w-full max-w-sm rounded-[1.25rem] border border-emerald-300/30 bg-emerald-500/20 backdrop-blur-sm p-4 shadow-inner">
                                                                    <p className="text-sm font-medium text-emerald-50 drop-shadow-md mb-4">
                                                                        ¿Iniciar análisis? Esto consumirá usos IA.
                                                                    </p>
                                                                    <div className="flex justify-center gap-3">
                                                                        <button
                                                                            onClick={() => setPendingAction(null)}
                                                                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            onClick={confirmPendingAction}
                                                                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-[0_4px_12px_rgba(255,255,255,0.3)] transition-colors"
                                                                        >
                                                                            Analizar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={requestAnalyzeBrand}
                                                                    disabled={!hasRealImage}
                                                                    className="group px-6 py-3.5 rounded-[1.25rem] bg-white text-slate-900 font-bold shadow-[0_4px_16px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">search_insights</span>
                                                                    {hasRealImage ? 'Analizar con IA' : 'Requiere foto real'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </m.div>
                                            )}

                                            {/* Dupes Tab */}
                                            {activeTab === 'dupes' && (
                                                <m.div
                                                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                                                    className="pb-20 flex flex-col gap-4"
                                                >
                                                    {isAnalyzing ? (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <Loader size="large" />
                                                            <p className="text-white/70 mt-4 text-sm font-medium">
                                                                {isPreparingImage ? 'Preparando foto...' : 'Buscando alternativas...'}
                                                            </p>
                                                        </div>
                                                    ) : error ? (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <span className="material-symbols-outlined text-6xl text-red-400 mb-4 drop-shadow-md">error</span>
                                                            <p className="text-white font-medium mb-2 drop-shadow-md">Sin resultados</p>
                                                            <p className="text-white/70 text-sm text-center max-w-md mb-6 drop-shadow-sm">{error}</p>
                                                            <button
                                                                onClick={() => requestFindDupes(true)}
                                                                className="px-6 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-medium hover:bg-white/30 transition-colors flex items-center gap-2"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">refresh</span>
                                                                Reintentar búsqueda
                                                            </button>
                                                        </div>
                                                    ) : dupeResult && dupeItems.length > 0 ? (
                                                        <div className="space-y-3">
                                                            <h3 className="font-bold text-lg mb-2 text-white drop-shadow-md">Opciones para comprar:</h3>
                                                            {dupeItems.slice(0, 5).map((dupe, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={dupe.shop_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={() => handleDupeLinkClick(dupe)}
                                                                    className="block p-4 rounded-[1.25rem] bg-black/20 hover:bg-black/30 backdrop-blur-sm border border-white/10 shadow-inner overflow-hidden transition-colors"
                                                                >
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="max-w-[65%]">
                                                                            <p className="font-bold text-white drop-shadow-sm line-clamp-1">{dupe.title}</p>
                                                                            <p className="text-sm font-medium text-white/50">{dupe.brand} · {dupe.shop_name}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-lg font-bold text-emerald-300 drop-shadow-sm">${dupe.price}</p>
                                                                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80">Ahorrás {dupe.savings_percentage}%</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-white/20">
                                                                            <span className="material-symbols-outlined text-[12px]">verified</span>
                                                                            {dupe.similarity_score}% SIMILAR
                                                                        </span>
                                                                        {dupe.link_verified === true && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                                                                Link Ok
                                                                            </span>
                                                                        )}
                                                                        {dupe.source && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                                                                {getSourceLabel(dupe.source)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : dupeResult && dupeItems.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-10">
                                                            <div className="w-16 h-16 rounded-full bg-orange-500/20 backdrop-blur-md flex items-center justify-center mb-4 border border-orange-300/30">
                                                                <span className="material-symbols-outlined text-3xl text-orange-400 drop-shadow-md">search_off</span>
                                                            </div>
                                                            <p className="text-white font-medium mb-2 drop-shadow-md">No encontramos la misma</p>
                                                            <p className="text-white/60 text-sm text-center max-w-xs mb-6 drop-shadow-sm">
                                                                Probá con buscar la prenda en las opciones manuales debajo.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-5 border border-white/20 shadow-lg">
                                                                <span className="material-symbols-outlined text-3xl text-white drop-shadow-md">storefront</span>
                                                            </div>
                                                            <h3 className="text-[1.5rem] font-serif font-bold text-white mb-2 tracking-tight drop-shadow-md">
                                                                ¿Dónde comprar?
                                                            </h3>
                                                            <p className="text-white/60 text-sm max-w-sm mb-8 leading-relaxed drop-shadow-sm">
                                                                Buscá prendas similares en internet para conseguirlas al instante.
                                                            </p>

                                                            {pendingAction === 'dupes' ? (
                                                                <div className="w-full max-w-sm rounded-[1.25rem] border border-blue-300/30 bg-blue-500/20 backdrop-blur-sm p-4 shadow-inner">
                                                                    <p className="text-sm font-medium text-blue-50 drop-shadow-md mb-4">
                                                                        ¿Iniciar búsqueda? Esto consumirá usos IA.
                                                                    </p>
                                                                    <div className="flex justify-center gap-3">
                                                                        <button
                                                                            onClick={() => setPendingAction(null)}
                                                                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                        <button
                                                                            onClick={confirmPendingAction}
                                                                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-blue-900 hover:bg-blue-50 shadow-[0_4px_12px_rgba(255,255,255,0.3)] transition-colors"
                                                                        >
                                                                            Buscar opciones
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => requestFindDupes(false)}
                                                                    disabled={!hasRealImage}
                                                                    className="group px-6 py-3.5 rounded-[1.25rem] bg-white text-slate-900 font-bold shadow-[0_4px_16px_0_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                                                                    {hasRealImage ? 'Buscar alternativas IA' : 'Requiere foto real'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {shoppingLinks.length > 0 && (
                                                        <div className={`mt-2 pt-5 border-t border-white/10`}>
                                                            {!hasActionableDupeLinks && dupeResult && (
                                                                <div className="mb-4 p-4 rounded-2xl bg-orange-500/20 border border-orange-300/30 backdrop-blur-sm shadow-inner">
                                                                    <p className="text-sm font-medium text-orange-100 drop-shadow-sm">
                                                                        Te dejamos opciones de búsqueda manual directa.
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <p className="text-sm font-bold text-white mb-3 tracking-wider uppercase drop-shadow-md">
                                                                Tiendas sugeridas
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                {shoppingLinks.map((link) => (
                                                                    <a
                                                                        key={link.platform}
                                                                        href={link.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={() => handleFallbackLinkClick(link.platform)}
                                                                        className="p-3 rounded-[1.25rem] border border-white/20 bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-3 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                                                                    >
                                                                        <span className="material-symbols-outlined text-white drop-shadow-md">{link.icon}</span>
                                                                        <span className="truncate text-sm font-bold text-white drop-shadow-md">{link.name}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </m.div>
                                            )}
                                        </div>

                                        {/* Floating Bottom Action */}
                                        <div className="absolute bottom-0 left-0 right-0 p-5 pt-10 sm:p-6 sm:pt-12 pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
                                            <button
                                                type="button"
                                                onClick={handleGoStudio}
                                                className={`relative overflow-hidden w-full h-[3.5rem] rounded-[1.25rem] text-white font-bold text-lg shadow-[0_8px_30px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border border-white/30 pointer-events-auto`}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-blue-500/90 pointer-events-none `} />
                                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                <span className={`relative z-10 material-symbols-outlined group-hover:rotate-12 transition-transform drop-shadow-md`}>auto_fix_high</span>
                                                <span className="relative z-10 drop-shadow-md">Probar en Studio</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>
        </LazyMotion>,
        document.body
    );
};
