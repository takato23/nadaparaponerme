import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { GENERATION_PRESETS, MAX_SLOTS_PER_GENERATION, GenerationPreset } from '../../types';
import Loader from '../Loader';
import { validateImageDataUri } from '../../utils/imageValidation';
import { analyzeTryOnPhotoQuality } from '../../utils/photoQualityValidation';
import { FaceReference } from '../../src/services/faceReferenceService';
import { ROUTES } from '../../src/routes';

interface StudioToolbarProps {
    userBaseImage: string | null;
    setUserBaseImage: (img: string | null) => void;
    uploadBaseRequestSignal?: number;
    virtualModelImage?: string;
    useVirtualModel?: boolean;
    setUseVirtualModel?: (value: boolean) => void;
    presetId: GenerationPreset;
    setPresetId: (id: GenerationPreset) => void;
    customScene: string;
    setCustomScene: (val: string) => void;
    keepPose: boolean;
    setKeepPose: (val: boolean) => void;
    useFaceRefs: boolean;
    setUseFaceRefs: (val: boolean) => void;
    faceRefs: FaceReference[];
    slotCount: number;
    hasCoverage: boolean;
    onClearSelections: () => void;
    isPremium?: boolean;
    generationFit?: 'tight' | 'regular' | 'oversized';
    setGenerationFit?: (f: 'tight' | 'regular' | 'oversized') => void;
    generationView?: 'front' | 'back' | 'side';
    setGenerationView?: (v: 'front' | 'back' | 'side') => void;
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
};

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
    userBaseImage,
    setUserBaseImage,
    uploadBaseRequestSignal = 0,
    virtualModelImage,
    useVirtualModel = false,
    setUseVirtualModel,
    presetId,
    setPresetId,
    customScene,
    setCustomScene,
    keepPose,
    setKeepPose,
    useFaceRefs,
    setUseFaceRefs,
    faceRefs,
    slotCount,
    hasCoverage,
    onClearSelections,
    isPremium = false,
    generationFit = 'regular',
    setGenerationFit,
    generationView = 'front',
    setGenerationView,
}) => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const baseSourcePickerRef = useRef<HTMLDivElement>(null);

    // Local state
    const [isUploadingBase, setIsUploadingBase] = useState(false);
    const [showSelfieManager, setShowSelfieManager] = useState(false);
    const [showSelfiePreviewModal, setShowSelfiePreviewModal] = useState(false);
    const [savedSelfies, setSavedSelfies] = useState<string[]>([]);
    const [showFaceRefPreview, setShowFaceRefPreview] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showPresetPicker, setShowPresetPicker] = useState(false);
    const [showBaseSourcePicker, setShowBaseSourcePicker] = useState(false);
    const presetPickerRef = useRef<HTMLDivElement>(null);

    // Load saved selfies
    useEffect(() => {
        const saved = localStorage.getItem('studio-saved-selfies');
        if (saved) {
            try {
                setSavedSelfies(JSON.parse(saved));
            } catch { /* ignore */ }
        }
    }, []);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!showPresetPicker) return;
            if (!presetPickerRef.current?.contains(event.target as Node)) {
                setShowPresetPicker(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [showPresetPicker]);

    useEffect(() => {
        if (!uploadBaseRequestSignal) return;
        fileInputRef.current?.click();
    }, [uploadBaseRequestSignal]);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!showBaseSourcePicker) return;
            if (!baseSourcePickerRef.current?.contains(event.target as Node)) {
                setShowBaseSourcePicker(false);
            }
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [showBaseSourcePicker]);

    const saveSelfieForQuickAccess = (selfie: string) => {
        const updated = [selfie, ...savedSelfies.filter(s => s !== selfie)].slice(0, 5);
        setSavedSelfies(updated);
        localStorage.setItem('studio-saved-selfies', JSON.stringify(updated));
        toast.success('Selfie guardada para acceso rápido');
    };

    const removeSavedSelfie = (selfie: string) => {
        const updated = savedSelfies.filter(s => s !== selfie);
        setSavedSelfies(updated);
        localStorage.setItem('studio-saved-selfies', JSON.stringify(updated));
    };

    const handleBaseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBase(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
                reader.onload = () => resolve(String(reader.result));
                reader.readAsDataURL(file);
            });

            const validation = validateImageDataUri(dataUrl);
            if (!validation.isValid) {
                const msg = validation.error || 'Imagen inválida';
                console.error('Validation error:', msg);
                toast.error(msg);
                return;
            }

            const quality = await analyzeTryOnPhotoQuality(dataUrl);
            if (!quality.isAllowed) {
                const primaryReason = quality.reasons[0] || 'Selfie no válida para probar el look.';
                toast.error(primaryReason);
                return;
            }

            setUserBaseImage(dataUrl);
            if (setUseVirtualModel) {
                setUseVirtualModel(false);
            }
            toast.success('Selfie lista');
        } catch (error: any) {
            console.error('Error processing base image:', error);
            toast.error('No pudimos procesar la selfie');
        } finally {
            setIsUploadingBase(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSelectView = (view: 'front' | 'back' | 'side') => {
        if (!setGenerationView) return;
        if (navigator.vibrate) navigator.vibrate(5);
        setGenerationView(view);
    };

    const baseImageSource = useVirtualModel ? (virtualModelImage || '/images/demo/before.svg') : userBaseImage;
    const hasVirtualModel = Boolean(virtualModelImage || !userBaseImage);

    // Summary line for collapsed advanced panel
    const advancedSummary = [
        'Nano 3.1',
        generationView === 'front' ? 'Frente' : generationView === 'back' ? 'Espalda' : 'Perfil',
        keepPose ? 'Pose' : null,
        useFaceRefs && faceRefs.length > 0 ? 'Cara' : null,
    ].filter(Boolean).join(' · ');
    const selectedPreset = GENERATION_PRESETS.find(preset => preset.id === presetId);
    const selectedPresetLabel = selectedPreset?.label ?? 'Fondo';
    const hasSelfieSource = Boolean(userBaseImage);
    const hasVirtualSource = Boolean(virtualModelImage);
    const canUseVirtualSource = hasVirtualSource || !hasSelfieSource;
    const baseSourceLabel = useVirtualModel ? 'Espejo' : 'Original';

    return (
        <motion.section variants={itemVariants} className="mb-1 flex flex-col gap-1">

            {/* ROW 1: Selfie thumbnail + controls */}
            <div className="flex items-start gap-2 sm:items-center">
                {/* Selfie thumbnail */}
                {baseImageSource ? (
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowSelfiePreviewModal(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                setShowSelfiePreviewModal(true);
                            }
                        }}
                        className="relative h-16 w-16 shrink-0 rounded-full border-2 border-[color:var(--studio-ink)] p-[2px] shadow-md cursor-pointer group sm:h-14 sm:w-14"
                    >
                        <div className="w-full h-full relative rounded-full overflow-hidden">
                            <img src={baseImageSource} alt="Selfie" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-sm">zoom_in</span>
                            </div>
                        </div>
                        {!useVirtualModel && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setUserBaseImage(null); }}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow-md z-20 hover:bg-red-600 transition"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-16 w-16 shrink-0 rounded-full border border-white/60 bg-gradient-to-br from-white/80 to-[color:var(--studio-rose)]/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm sm:h-14 sm:w-14"
                    >
                        {isUploadingBase ? (
                            <Loader size="small" />
                        ) : (
                            <span className="material-symbols-outlined text-[24px] text-[color:var(--studio-ink)]">add_a_photo</span>
                        )}
                    </button>
                )}

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {/* Slot counter badge */}
                    <div className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${hasCoverage ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        {slotCount}/{MAX_SLOTS_PER_GENERATION}
                        {slotCount > 0 && (
                            <button
                                onClick={() => { if (navigator.vibrate) navigator.vibrate(5); onClearSelections(); }}
                                className="ml-1 text-gray-400 hover:text-red-500"
                                title="Limpiar"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {setUseVirtualModel && (
                        <div ref={baseSourcePickerRef} className="relative">
                            <button
                                onClick={() => setShowBaseSourcePicker((prev) => !prev)}
                                className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-white/70 border border-white/80 px-2.5 py-1.5 text-[10px] font-medium text-[color:var(--studio-ink-muted)]"
                            >
                                <span>{baseSourceLabel}</span>
                                <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
                            </button>

                            {showBaseSourcePicker && (
                                <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-white bg-white shadow-lg overflow-hidden">
                                    <button
                                        onClick={() => {
                                            setShowBaseSourcePicker(false);
                                            if (hasSelfieSource) {
                                                setUseVirtualModel(false);
                                            } else {
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs font-semibold ${!useVirtualModel
                                            ? 'bg-[color:var(--studio-ink)] text-white'
                                            : 'text-[color:var(--studio-ink)] hover:bg-gray-100'
                                            }`}
                                    >
                                        Original
                                    </button>
                                    {canUseVirtualSource ? (
                                        <button
                                            onClick={() => {
                                                setShowBaseSourcePicker(false);
                                                setUseVirtualModel(true);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-xs font-semibold ${useVirtualModel
                                                ? 'bg-[color:var(--studio-ink)] text-white'
                                                : 'text-[color:var(--studio-ink)] hover:bg-gray-100'
                                                }`}
                                        >
                                            Espejo
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setShowBaseSourcePicker(false);
                                                fileInputRef.current?.click();
                                            }}
                                            className="w-full px-3 py-2 text-left text-[color:var(--studio-ink)] text-xs font-semibold hover:bg-gray-100"
                                        >
                                            Cargar selfie
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Saved selfies button (always visible) */}
                    <button
                        onClick={() => setShowSelfieManager(!showSelfieManager)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${showSelfieManager
                            ? 'bg-[color:var(--studio-ink)] text-white border-[color:var(--studio-ink)]'
                            : 'bg-white/70 border-white/80 text-[color:var(--studio-ink-muted)] hover:bg-white'} `}
                    >
                        <span className="material-symbols-outlined text-[14px]">photo_library</span>
                        {savedSelfies.length > 0 ? savedSelfies.length : ''}
                    </button>
                </div>
            </div>

            {/* ROW 2: Preset & Advanced (Side-by-side) */}
            <div className="flex items-center gap-1.5 w-full">
                {/* Preset Dropdown */}
                <div ref={presetPickerRef} className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => setShowPresetPicker(!showPresetPicker)}
                        className="flex w-full items-center justify-between rounded-xl bg-white/60 border border-white/80 px-3 py-1.5 text-xs shadow-sm focus:outline-none transition hover:bg-white/80"
                    >
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[14px] text-[color:var(--studio-ink-muted)]">landscape</span>
                            <span className="font-semibold text-[color:var(--studio-ink)] truncate">{selectedPresetLabel}</span>
                        </span>
                        <span className="text-[14px] text-[color:var(--studio-ink-muted)] material-symbols-outlined">
                            unfold_more
                        </span>
                    </button>

                    {showPresetPicker && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden ring-1 ring-black/5">
                            {GENERATION_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(5);
                                        setPresetId(preset.id);
                                        setShowPresetPicker(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${presetId === preset.id
                                        ? 'bg-[color:var(--studio-ink)] text-white'
                                        : 'text-[color:var(--studio-ink)] hover:bg-white/60'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {presetId === 'custom' && (
                        <input
                            type="text"
                            value={customScene}
                            onChange={(e) => setCustomScene(e.target.value)}
                            placeholder="Describí la escena..."
                            className="absolute top-full left-0 z-40 mt-1 w-full px-3 py-1.5 rounded-xl bg-white border border-white shadow-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--studio-ink)]/20"
                        />
                    )}
                </div>

                {/* Advanced Settings Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="shrink-0 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-white/60 border border-white/80 text-xs shadow-sm transition hover:bg-white/80"
                >
                    <span className="material-symbols-outlined text-[14px] text-[color:var(--studio-ink-muted)]">tune</span>
                    <span className="font-medium text-[color:var(--studio-ink)]">Ajustes</span>
                </button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-3 rounded-2xl bg-white/50 border border-white/70 p-3 mt-1.5">
                            {/* View angle */}
                            {setGenerationView && (
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--studio-ink-muted)] mb-2 block">Ángulo de vista</span>
                                    <div className="flex bg-black/5 p-1 rounded-xl gap-1">
                                        {(['front', 'back', 'side'] as const).map((v) => {
                                            const viewIcon = v === 'front' ? 'person' : v === 'back' ? 'person_off' : 'transfer_within_a_station';
                                            return (
                                                <button
                                                    key={v}
                                                    onClick={() => handleSelectView(v)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${generationView === v
                                                        ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{viewIcon}</span>
                                                    {v === 'front' ? 'Frente' : v === 'back' ? 'Espalda' : 'Perfil'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="h-px bg-gray-200/50" />

                            {/* Keep Pose — Toggle pill */}
                            <button
                                onClick={() => setKeepPose(!keepPose)}
                                className="flex items-center justify-between gap-3 w-full text-left group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${keepPose ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-400'
                                        }`}>
                                        <span className="material-symbols-outlined text-[16px]">person_pin</span>
                                    </span>
                                    <div className="min-w-0">
                                        <span className="text-[13px] font-semibold text-[color:var(--studio-ink)] block leading-tight">Mantener mi pose</span>
                                        <span className="text-[10px] text-[color:var(--studio-ink-muted)] leading-tight">Misma posición del cuerpo</span>
                                    </div>
                                </div>
                                {/* Toggle switch */}
                                <div className={`relative w-10 h-[22px] rounded-full shrink-0 transition-colors duration-200 ${keepPose ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}>
                                    <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${keepPose ? 'translate-x-[20px]' : 'translate-x-[2px]'
                                        }`} />
                                </div>
                            </button>

                            {/* Face Refs — Toggle pill */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${faceRefs.length > 0 && useFaceRefs ? 'bg-emerald-500 text-white' : faceRefs.length > 0 ? 'bg-emerald-50 text-emerald-400' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        <span className="material-symbols-outlined text-[16px]">face</span>
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[13px] font-semibold leading-tight ${faceRefs.length > 0 ? 'text-[color:var(--studio-ink)]' : 'text-gray-400'
                                                }`}>
                                                Mantener mi cara
                                            </span>
                                            {faceRefs.length > 0 && (
                                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                                    {faceRefs.length} ref{faceRefs.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-[color:var(--studio-ink-muted)] leading-tight">
                                            {faceRefs.length === 0 ? (
                                                <button onClick={() => navigate(ROUTES.PROFILE)} className="text-[color:var(--studio-mint)] font-bold underline">
                                                    Agregá fotos de referencia
                                                </button>
                                            ) : (
                                                'Rostro fiel a tus referencias'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                {/* Toggle switch */}
                                <button
                                    onClick={() => faceRefs.length > 0 && setUseFaceRefs(!useFaceRefs)}
                                    disabled={faceRefs.length === 0}
                                    className="shrink-0"
                                >
                                    <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${faceRefs.length === 0
                                        ? 'bg-gray-200 opacity-40'
                                        : useFaceRefs ? 'bg-emerald-500' : 'bg-gray-300'
                                        }`}>
                                        <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${useFaceRefs && faceRefs.length > 0 ? 'translate-x-[20px]' : 'translate-x-[2px]'
                                            }`} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Saved selfies gallery (expandable) */}
            <AnimatePresence>
                {
                    showSelfieManager && savedSelfies.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 rounded-xl bg-white/70 border border-white/80 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-[color:var(--studio-ink)]">
                                        📷 Mis selfies guardadas
                                    </p>
                                    <button
                                        onClick={() => setShowSelfieManager(false)}
                                        className="text-[color:var(--studio-ink-muted)] hover:text-[color:var(--studio-ink)]"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                                <div className="flex max-w-full gap-3 overflow-x-auto pb-1">
                                    {savedSelfies.length === 0 ? (
                                        <div className="w-full text-center py-6 px-4 bg-white/40 rounded-xl border border-dashed border-[color:var(--studio-ink-muted)]/30">
                                            <span className="material-symbols-outlined text-3xl text-[color:var(--studio-ink-muted)] opacity-50 mb-2">image_search</span>
                                            <p className="text-xs text-[color:var(--studio-ink-muted)]">No tenés selfies guardadas.</p>
                                            <p className="text-[10px] text-[color:var(--studio-ink-muted)] opacity-70 mt-1">Cargá una foto y toca el ícono de guardar para tenerla siempre a mano.</p>
                                        </div>
                                    ) : (
                                        savedSelfies.map((selfie, idx) => (
                                            <div
                                                key={idx}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                    setUserBaseImage(selfie);
                                                    if (setUseVirtualModel) {
                                                        setUseVirtualModel(false);
                                                    }
                                                    setShowSelfieManager(false);
                                                    toast.success('Selfie cargada');
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        setUserBaseImage(selfie);
                                                        if (setUseVirtualModel) {
                                                            setUseVirtualModel(false);
                                                        }
                                                        setShowSelfieManager(false);
                                                        toast.success('Selfie cargada');
                                                    }
                                                }}
                                                className={`relative w-16 h-24 rounded-xl overflow-hidden border-2 shrink-0 transition shadow-sm cursor-pointer group ${userBaseImage === selfie
                                                    ? 'border-[color:var(--studio-ink)] ring-2 ring-[color:var(--studio-ink)]/20'
                                                    : 'border-white hover:border-[color:var(--studio-mint)] hover:shadow-md'
                                                    }`}
                                            >
                                                <img src={selfie} alt={`Selfie ${idx + 1}`} className="w-full h-full object-cover" />
                                                {userBaseImage === selfie && (
                                                    <div className="absolute inset-0 bg-[color:var(--studio-ink)]/20 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white text-lg">check_circle</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (navigator.vibrate) navigator.vibrate(5); removeSavedSelfie(selfie); }}
                                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md z-10"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                            </div>
                                        )))}
                                </div>
                                <p className="text-xs text-[color:var(--studio-ink-muted)] mt-2">
                                    Tocá una selfie para usarla • Máximo 5 guardadas
                                </p>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Selfie Preview Modal */}
            <AnimatePresence>
                {
                    showSelfiePreviewModal && baseImageSource && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                            onClick={() => setShowSelfiePreviewModal(false)}
                        >
                            {/* Close area */}
                            <div className="absolute top-4 right-4 z-50">
                                <button
                                    onClick={() => setShowSelfiePreviewModal(false)}
                                    className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
                                >
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            {/* Image Container */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative flex flex-col items-center max-w-md w-full max-h-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={baseImageSource}
                                    alt="Selfie Preview"
                                    className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl mb-6"
                                />

                                {/* Actions Bar */}
                                <div className="flex flex-wrap items-center justify-center gap-3 w-full px-4">
                                    {/* Change Photo */}
                                    <button
                                        onClick={() => {
                                            setShowSelfiePreviewModal(false);
                                            if (setUseVirtualModel && useVirtualModel) setUseVirtualModel(false);
                                            fileInputRef.current?.click();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[color:var(--studio-ink)] font-semibold text-sm shadow-md hover:bg-gray-100 transition"
                                    >
                                        <span className="material-symbols-outlined text-lg">cameraswitch</span>
                                        Cambiar
                                    </button>

                                    {/* Save/Unsave */}
                                    {!useVirtualModel && userBaseImage && (
                                        savedSelfies.includes(userBaseImage) ? (
                                            <button
                                                onClick={() => removeSavedSelfie(userBaseImage)}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--studio-ink)] text-white font-semibold text-sm shadow-md hover:bg-[color:var(--studio-ink-muted)] transition"
                                            >
                                                <span className="material-symbols-outlined text-lg">bookmark_remove</span>
                                                Quitar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => saveSelfieForQuickAccess(userBaseImage)}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--studio-mint)] text-white font-semibold text-sm shadow-md hover:brightness-105 transition"
                                            >
                                                <span className="material-symbols-outlined text-lg">bookmark_add</span>
                                                Guardar
                                            </button>
                                        )
                                    )}

                                    {/* Delete */}
                                    {!useVirtualModel && (
                                        <button
                                            onClick={() => {
                                                setUserBaseImage(null);
                                                setShowSelfiePreviewModal(false);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-500 font-semibold text-sm hover:bg-red-500/30 transition border border-red-500/30"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleBaseImageUpload}
            />
        </motion.section >
    );
};
