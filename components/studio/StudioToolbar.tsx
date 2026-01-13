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
    generationQuality?: 'flash' | 'pro';
    setGenerationQuality?: (q: 'flash' | 'pro') => void;
    isPremium?: boolean;
    generationFit?: 'tight' | 'regular' | 'oversized';
    setGenerationFit?: (f: 'tight' | 'regular' | 'oversized') => void;
    generationView?: 'front' | 'back' | 'side';
    setGenerationView?: (v: 'front' | 'back' | 'side') => void;
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
    userBaseImage,
    setUserBaseImage,
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
    generationQuality = 'flash',
    setGenerationQuality,
    isPremium = false,
    generationFit = 'regular',
    setGenerationFit,
    generationView = 'front',
    setGenerationView,
}) => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local state
    const [isUploadingBase, setIsUploadingBase] = useState(false);
    const [showSelfieManager, setShowSelfieManager] = useState(false);
    const [savedSelfies, setSavedSelfies] = useState<string[]>([]);
    const [showFaceRefPreview, setShowFaceRefPreview] = useState(false);

    // Load saved selfies
    useEffect(() => {
        const saved = localStorage.getItem('studio-saved-selfies');
        if (saved) {
            try {
                setSavedSelfies(JSON.parse(saved));
            } catch { /* ignore */ }
        }
    }, []);

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
            toast.success('Selfie lista');
        } catch (error: any) {
            console.error('Error processing base image:', error);
            toast.error('No pudimos procesar la selfie');
        } finally {
            setIsUploadingBase(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <motion.section variants={itemVariants} className="mb-3">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/60 backdrop-blur-sm border border-white/70 overflow-x-auto no-scrollbar max-w-full">
                {/* Selfie Section */}
                <div className="relative shrink-0 flex flex-col items-center gap-1">
                    {userBaseImage ? (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    fileInputRef.current?.click();
                                }
                            }}
                            className="relative w-20 h-28 rounded-xl overflow-hidden border-2 border-[color:var(--studio-ink)] shadow-md group cursor-pointer"
                        >
                            <img src={userBaseImage} alt="Tu selfie" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-lg">edit</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setUserBaseImage(null); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md"
                            >
                                ×
                            </button>
                            {!savedSelfies.includes(userBaseImage) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); saveSelfieForQuickAccess(userBaseImage); }}
                                    className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[color:var(--studio-mint)] text-white flex items-center justify-center shadow-md"
                                    title="Guardar selfie"
                                >
                                    <span className="material-symbols-outlined text-xs">bookmark_add</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-28 rounded-xl border-2 border-dashed border-[color:var(--studio-rose)] bg-white/40 flex flex-col items-center justify-center gap-1 hover:bg-white/70 transition group"
                        >
                            {isUploadingBase ? (
                                <Loader size="small" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-2xl text-[color:var(--studio-rose)] group-hover:scale-110 transition-transform">add_a_photo</span>
                                    <span className="text-[9px] font-medium text-[color:var(--studio-rose)]">Tu foto</span>
                                </>
                            )}
                        </button>
                    )}
                    {savedSelfies.length > 0 && (
                        <button
                            onClick={() => setShowSelfieManager(!showSelfieManager)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 shadow-sm text-[10px] font-semibold text-[color:var(--studio-ink)] hover:bg-white transition"
                        >
                            <span className="material-symbols-outlined text-xs">photo_library</span>
                            {savedSelfies.length} guardada{savedSelfies.length > 1 ? 's' : ''}
                        </button>
                    )}
                </div>

                {/* Preset Tabs & Options */}
                <div className="flex-1">
                    <div className="grid grid-cols-5 gap-1">
                        {GENERATION_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setPresetId(preset.id)}
                                title={preset.description}
                                className={`relative flex items-center justify-center gap-0.5 px-1 py-1 rounded-md text-[9px] font-medium transition ${presetId === preset.id
                                    ? 'bg-[color:var(--studio-ink)] text-white shadow-sm'
                                    : 'bg-white/50 text-[color:var(--studio-ink-muted)] hover:bg-white/80'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xs">{preset.icon}</span>
                                <span className="truncate">{preset.label}</span>
                                {preset.id === 'editorial' && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {presetId === 'custom' && (
                        <input
                            type="text"
                            value={customScene}
                            onChange={(e) => setCustomScene(e.target.value)}
                            placeholder="Ej: en la playa, en un parque, en una fiesta..."
                            className="mt-2 w-full px-3 py-2 rounded-lg bg-white/80 border border-[color:var(--studio-ink)]/20 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--studio-ink)]/30"
                        />
                    )}

                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                        {/* Keep pose toggle */}
                        <div className="relative group">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={keepPose}
                                    onChange={(e) => setKeepPose(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-[color:var(--studio-ink)] focus:ring-[color:var(--studio-ink)]"
                                />
                                <span className="text-[10px] font-medium text-[color:var(--studio-ink-muted)] group-hover:text-[color:var(--studio-ink)]">
                                    Mantener pose
                                </span>
                                <span className="material-symbols-rounded text-[12px] text-purple-400 group-hover:text-purple-600">
                                    info
                                </span>
                            </label>
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg pointer-events-none">
                                <p className="font-semibold mb-1">Mejora la cara</p>
                                <p className="text-gray-300">
                                    Al activar esta opción, la IA mantiene tu pose y expresión original,
                                    lo que hace que <span className="text-purple-300 font-medium">tu cara se vea más parecida</span>.
                                </p>
                                <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                            </div>
                        </div>

                        {/* Face references toggle */}
                        <div className="flex items-center gap-1.5">
                            <label
                                className={`flex items-center gap-1.5 cursor-pointer group ${faceRefs.length === 0 ? 'opacity-50' : ''}`}
                                title={faceRefs.length > 0
                                    ? `Usar ${faceRefs.length} foto${faceRefs.length > 1 ? 's' : ''} de referencia`
                                    : 'No tenés fotos de cara cargadas'
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={useFaceRefs && faceRefs.length > 0}
                                    onChange={(e) => setUseFaceRefs(e.target.checked)}
                                    disabled={faceRefs.length === 0}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-[color:var(--studio-ink)] focus:ring-[color:var(--studio-ink)] disabled:opacity-50"
                                />
                                <span className="text-[10px] font-medium text-[color:var(--studio-ink-muted)] group-hover:text-[color:var(--studio-ink)]">
                                    Fotos de cara
                                </span>
                            </label>
                            {faceRefs.length > 0 ? (
                                <button
                                    onClick={() => setShowFaceRefPreview(!showFaceRefPreview)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition ${showFaceRefPreview
                                        ? 'bg-[color:var(--studio-mint)] text-white'
                                        : 'bg-[color:var(--studio-mint)]/20 text-[color:var(--studio-mint)] hover:bg-[color:var(--studio-mint)]/30'
                                        }`}
                                >
                                    {faceRefs.length}
                                    <span className="material-symbols-outlined text-[10px]">
                                        {showFaceRefPreview ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(ROUTES.PROFILE)}
                                    className="text-[9px] text-[color:var(--studio-rose)] underline"
                                >
                                    Agregar
                                </button>
                            )}
                        </div>

                        {/* Quality Toggle */}
                        {setGenerationQuality && (
                            <div className="flex items-center gap-1.5 ml-2 border-l pl-2 border-gray-300">
                                <span className="text-[9px] text-[color:var(--studio-ink-muted)] font-medium">Calidad:</span>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setGenerationQuality('flash')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationQuality === 'flash'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                        title="Rápido: calidad estándar y veloz. 1 crédito."
                                    >
                                        Rápido
                                    </button>
                                    <button
                                        onClick={() => setGenerationQuality('pro')}
                                        disabled={!isPremium}
                                        title={isPremium ? 'Ultra: máxima calidad y detalle. 4 créditos.' : 'Solo Premium'}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationQuality === 'pro'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            } ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Ultra
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* View Selection */}
                        {setGenerationView && (
                            <div className="flex items-center gap-1.5 border-l pl-2 border-gray-300">
                                <span className="text-[9px] text-[color:var(--studio-ink-muted)] font-medium">Vista:</span>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setGenerationView('front')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationView === 'front'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Frente
                                    </button>
                                    <button
                                        onClick={() => setGenerationView('back')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationView === 'back'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Espalda
                                    </button>
                                    <button
                                        onClick={() => setGenerationView('side')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationView === 'side'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Lado
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Fit Selection */}
                        {setGenerationFit && (
                            <div className="flex items-center gap-1.5 border-l pl-2 border-gray-300">
                                <span className="text-[9px] text-[color:var(--studio-ink-muted)] font-medium">Ajuste:</span>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setGenerationFit('tight')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationFit === 'tight'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Ajustado
                                    </button>
                                    <button
                                        onClick={() => setGenerationFit('regular')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationFit === 'regular'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Regular
                                    </button>
                                    <button
                                        onClick={() => setGenerationFit('oversized')}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${generationFit === 'oversized'
                                            ? 'bg-white shadow-sm text-[color:var(--studio-ink)]'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Holgado
                                    </button>
                                </div>
                            </div>
                        )}


                    </div>

                    {/* Face Reference Preview */}
                    <AnimatePresence>
                        {showFaceRefPreview && faceRefs.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 p-2 rounded-lg bg-[color:var(--studio-mint)]/10 border border-[color:var(--studio-mint)]/30">
                                    <div className="flex items-center gap-2">
                                        {faceRefs.map((ref) => (
                                            <div
                                                key={ref.id}
                                                className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 ${ref.is_primary
                                                    ? 'border-[color:var(--studio-mint)] ring-2 ring-[color:var(--studio-mint)]/30'
                                                    : 'border-white/80'
                                                    }`}
                                                title={ref.label + (ref.is_primary ? ' (Principal)' : '')}
                                            >
                                                <img
                                                    src={ref.image_url}
                                                    alt={ref.label}
                                                    className="w-full h-full object-cover"
                                                />
                                                {ref.is_primary && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[color:var(--studio-mint)] rounded-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white text-[8px]">star</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => navigate(ROUTES.PROFILE)}
                                            className="w-8 h-8 rounded-full border border-dashed border-[color:var(--studio-mint)] flex items-center justify-center text-[color:var(--studio-mint)] hover:bg-[color:var(--studio-mint)]/10 transition"
                                            title="Administrar fotos de cara"
                                        >
                                            <span className="material-symbols-outlined text-sm">settings</span>
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-[color:var(--studio-ink-muted)] mt-1.5">
                                        {useFaceRefs ? '✓ Se usarán para mejorar tu cara en la generación' : '○ Desactivadas'}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Slot Counter */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${hasCoverage ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        <span className="material-symbols-outlined text-sm">{hasCoverage ? 'check_circle' : 'pending'}</span>
                        {slotCount}/{MAX_SLOTS_PER_GENERATION}
                    </div>
                    {slotCount > 0 && (
                        <button
                            onClick={onClearSelections}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs"
                            title="Limpiar selección"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Saved selfies gallery (expandable) */}
            <AnimatePresence>
                {showSelfieManager && savedSelfies.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 p-3 rounded-xl bg-white/70 border border-white/80 shadow-sm">
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
                            <div className="flex gap-3 overflow-x-auto pb-1">
                                {savedSelfies.map((selfie, idx) => (
                                    <div
                                        key={idx}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => { setUserBaseImage(selfie); setShowSelfieManager(false); toast.success('Selfie cargada'); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setUserBaseImage(selfie);
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
                                            onClick={(e) => { e.stopPropagation(); removeSavedSelfie(selfie); }}
                                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 hover:!opacity-100 shadow"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-[color:var(--studio-ink-muted)] mt-2">
                                Tocá una selfie para usarla • Máximo 5 guardadas
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleBaseImageUpload}
            />
        </motion.section>
    );
};
