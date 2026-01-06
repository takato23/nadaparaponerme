// Face Reference Uploader Component
// Allows users to upload up to 3 face reference photos for better virtual try-on results

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getFaceReferences,
    uploadFaceReference,
    deleteFaceReference,
    setPrimaryFaceReference,
    type FaceReference
} from '../src/services/faceReferenceService';

interface FaceReferenceUploaderProps {
    onClose?: () => void;
    compact?: boolean; // For embedding in profile
}

const MAX_REFERENCES = 3;

const LABEL_OPTIONS = [
    { value: 'Frontal', icon: 'face' },
    { value: 'Perfil', icon: 'face_3' },
    { value: 'Sonrisa', icon: 'mood' }
];

export const FaceReferenceUploader: React.FC<FaceReferenceUploaderProps> = ({
    onClose,
    compact = false
}) => {
    const [references, setReferences] = useState<FaceReference[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadReferences();
    }, []);

    const loadReferences = async () => {
        setLoading(true);
        try {
            const refs = await getFaceReferences();
            setReferences(refs);
        } catch (e) {
            console.error('Error loading references:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (references.length >= MAX_REFERENCES) {
            setError(`Máximo ${MAX_REFERENCES} fotos permitidas`);
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // Auto-assign label based on count
            const label = LABEL_OPTIONS[references.length]?.value || 'Extra';
            const isPrimary = references.length === 0;

            await uploadFaceReference(file, label, isPrimary);
            await loadReferences();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al subir');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteFaceReference(id);
            await loadReferences();
        } catch (e) {
            setError('Error al eliminar');
        }
    };

    const handleSetPrimary = async (id: string) => {
        try {
            await setPrimaryFaceReference(id);
            await loadReferences();
        } catch (e) {
            setError('Error al cambiar principal');
        }
    };

    if (compact) {
        return (
            <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">face</span>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                            Face ID para Try-On
                        </p>
                    </div>
                    <span className="text-xs text-gray-500">
                        {references.length}/{MAX_REFERENCES}
                    </span>
                </div>

                {loading ? (
                    <div className="h-16 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {/* Existing references */}
                        {references.map((ref) => (
                            <div
                                key={ref.id}
                                className="relative group"
                            >
                                <div
                                    className={`w-14 h-14 rounded-full overflow-hidden border-2 ${ref.is_primary
                                            ? 'border-primary shadow-lg'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    <img
                                        src={ref.image_url}
                                        alt={ref.label}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {ref.is_primary && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full">
                                        Principal
                                    </div>
                                )}
                                {/* Delete button on hover */}
                                <button
                                    onClick={() => handleDelete(ref.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                            </div>
                        ))}

                        {/* Add button */}
                        {references.length < MAX_REFERENCES && (
                            <label className="cursor-pointer">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    disabled={uploading}
                                />
                                <div className={`w-14 h-14 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-primary transition-colors ${uploading ? 'opacity-50' : ''}`}>
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                    ) : (
                                        <span className="material-symbols-outlined text-gray-400">add</span>
                                    )}
                                </div>
                            </label>
                        )}
                    </div>
                )}

                {error && (
                    <p className="text-xs text-red-500 mt-2">{error}</p>
                )}

                <p className="text-xs text-gray-400 mt-3">
                    Subí fotos claras de tu cara para mejor precisión en Virtual Try-On
                </p>
            </div>
        );
    }

    // Full modal version
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Face ID para Try-On
                        </h2>
                        <p className="text-sm text-gray-500">
                            Subí fotos de tu cara para mejor precisión
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Info banner */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                        <div className="text-sm">
                            <p className="font-medium text-gray-800 dark:text-white">
                                Nano Banana Pro usa estas fotos para preservar tu identidad
                            </p>
                            <p className="text-gray-500 mt-1">
                                Recomendamos: 1 frontal, 1 perfil, 1 sonriendo
                            </p>
                        </div>
                    </div>
                </div>

                {/* References grid */}
                {loading ? (
                    <div className="h-40 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {LABEL_OPTIONS.map((option, index) => {
                            const ref = references[index];

                            return (
                                <div key={option.value} className="flex flex-col items-center gap-2">
                                    {ref ? (
                                        <div className="relative group">
                                            <div
                                                onClick={() => !ref.is_primary && handleSetPrimary(ref.id)}
                                                className={`w-20 h-20 rounded-2xl overflow-hidden border-3 cursor-pointer transition-all ${ref.is_primary
                                                        ? 'border-primary shadow-lg ring-2 ring-primary/30'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                    }`}
                                            >
                                                <img
                                                    src={ref.image_url}
                                                    alt={ref.label}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleDelete(ref.id)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors flex items-center justify-center"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                            {ref.is_primary && (
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    Principal
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                disabled={uploading}
                                            />
                                            <div className={`w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {uploading && references.length === index ? (
                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-gray-400">{option.icon}</span>
                                                        <span className="text-[10px] text-gray-400">Subir</span>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    )}
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        {option.value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Tips */}
                <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                        Buena iluminación, cara visible
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                        Sin filtros ni ediciones
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-red-500">cancel</span>
                        Evitar fotos grupales o con accesorios grandes
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default FaceReferenceUploader;
