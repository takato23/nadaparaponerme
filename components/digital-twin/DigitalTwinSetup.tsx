import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DigitalTwinProfile } from '../../types';
import { compressDataUrl } from '../../src/utils/imageCompression';

// Mock service for now
const createDigitalTwin = async (images: string[]): Promise<DigitalTwinProfile> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: `twin_${Date.now()}`,
                userId: 'current_user',
                sourceImages: images,
                modelStatus: 'ready',
                createdAt: new Date().toISOString(),
                modelId: `nano_banana_${Date.now()}`
            });
    }, 3000);
    });
};

const STORAGE_KEY = 'ojodeloca-digital-twin';
const STORAGE_KEY_SOURCE_IMAGE = 'ojodeloca-digital-twin-source-image';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const isSupportedImageType = (type: string) => SUPPORTED_IMAGE_TYPES.has(type);

const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result !== 'string') {
                reject(new Error('No se pudo leer la imagen seleccionada.'));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
        reader.readAsDataURL(file);
    });

interface DigitalTwinSetupProps {
    onClose: () => void;
    onComplete: (profile: DigitalTwinProfile) => void;
}

const getCompactDigitalTwinProfile = (profile: DigitalTwinProfile & { bodyType?: string }) => {
    const { id, userId, createdAt, modelId, modelStatus, bodyType, sourceImages } = profile;
    return {
        id,
        userId,
        createdAt,
        modelId,
        modelStatus,
        bodyType,
        sourceImages: sourceImages.slice(0, 1),
        sourceImageCount: sourceImages.length,
        hasSourceImages: sourceImages.length > 0
    };
};

const persistDigitalTwinProfile = (profile: DigitalTwinProfile & { bodyType?: string }) => {
    const compact = getCompactDigitalTwinProfile(profile);
    const sourceImage = compact.sourceImages?.[0];

    const saveProfile = (payload: string) => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY_SOURCE_IMAGE);
        localStorage.setItem(STORAGE_KEY, payload);
        if (sourceImage) {
            localStorage.setItem(STORAGE_KEY_SOURCE_IMAGE, sourceImage);
        }
    };

    try {
        saveProfile(JSON.stringify(compact));
        return true;
    } catch (error) {
        console.warn('Persist compact twin profile failed:', error);
        try {
            const fallbackPayload = JSON.stringify({
                sourceImages: sourceImage ? [sourceImage] : [],
                sourceImageCount: sourceImage ? 1 : 0,
                hasSourceImages: Boolean(sourceImage),
            });
            saveProfile(fallbackPayload);
            return true;
        } catch (retryError) {
            console.error('Failed to persist twin profile:', retryError);
        }
    }

    return false;
};

const DigitalTwinSetup: React.FC<DigitalTwinSetupProps> = ({ onClose, onComplete }) => {
    const [step, setStep] = useState(0);
    const [images, setImages] = useState<string[]>([]);
    const [semanticData, setSemanticData] = useState<string>('');
    const [processing, setProcessing] = useState(false);

    // 3D Hover State
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };



    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!isSupportedImageType(file.type)) {
                alert('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.');
                e.target.value = '';
                return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                alert('La imagen es demasiado pesada. Sube una foto de menor tamaño.');
                e.target.value = '';
                return;
            }

            setProcessing(true); // Reuse processing state or add a local loading state for image
            (async () => {
                try {
                    const rawBase64 = await readFileAsDataURL(file);
                    const compressionOptions = [
                        { maxWidth: 1024, maxHeight: 1024, quality: 0.8, format: 'jpeg' as const },
                        { maxWidth: 900, maxHeight: 900, quality: 0.65, format: 'jpeg' as const },
                        { maxWidth: 768, maxHeight: 768, quality: 0.55, format: 'jpeg' as const },
                        { maxWidth: 640, maxHeight: 640, quality: 0.45, format: 'jpeg' as const },
                        { maxWidth: 480, maxHeight: 480, quality: 0.4, format: 'webp' as const }
                    ];

                    let compressed: Awaited<ReturnType<typeof compressDataUrl>> | null = null;
                    let lastError: unknown;
                    for (const options of compressionOptions) {
                        try {
                            compressed = await compressDataUrl(rawBase64, options);
                            break;
                        } catch (error) {
                            lastError = error;
                        }
                    }

                    if (!compressed) {
                        throw lastError ?? new Error('No se pudo comprimir la imagen.');
                    }

                    const newImages = [...images];
                    newImages[step - 1] = compressed.compressedDataUrl;
                    setImages(newImages);
                    setStep(step + 1);
                } catch (error) {
                    console.error("Compression ended with error:", error);
                    alert('No se pudo procesar la imagen. Intenta con otra foto (JPG/PNG, menos de 12MB).');
                } finally {
                    setProcessing(false);
                    e.target.value = '';
                }
            })();
        }
    };

    const handleSemanticData = (data: string) => {
        setSemanticData(data);
        handleFinish(images, data);
    };

    const handleFinish = async (finalImages: string[], bodyType: string) => {
        setStep(5);
        setProcessing(true);
        try {
            const profile = await createDigitalTwin(finalImages);
            const fullProfile = { ...profile, bodyType };

            if (!persistDigitalTwinProfile(fullProfile)) {
                alert("Tu navegador no tiene suficiente espacio para guardar el modelo 3D localmente. Intenta borrar datos o usar un modo privado.");
            }

            onComplete(fullProfile);
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const instructions = [
        { title: 'Tu Gemelo Digital', desc: 'Captura tu esencia en 3D para probar ropa virtualmente.', icon: 'view_in_ar' },
        { title: 'Foto de Frente', desc: 'Párate derecho con los brazos ligeramente separados.', icon: 'accessibility_new' },
        { title: 'Foto de Perfil', desc: 'Gira 90° para capturar tu silueta lateral.', icon: 'person' },
        { title: 'Foto de Espalda', desc: 'Una última foto de espaldas para completar el modelo.', icon: 'directions_walk' },
        { title: 'Tu Silueta', desc: 'Ayúdanos a refinar la geometría de tu avatar.', icon: 'shape_line' },
        { title: 'Procesando...', desc: 'La IA está construyendo tu modelo 3D.', icon: 'memory' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl perspective-1000">
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d"
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.8, rotateX: 15 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="relative w-full max-w-lg"
            >
                {/* 3D Card Container */}
                <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden relative group">

                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                    {/* Animated Glow in background */}
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent rotate-45 animate-pulse pointer-events-none" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/5 hover:bg-white/20 transition-colors border border-white/10 text-white/50 hover:text-white"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>

                    <div className="p-10 min-h-[600px] flex flex-col relative z-10 text-white">

                        {/* Header Steps */}
                        <div className="flex justify-between items-center mb-10 px-2">
                            <div className="flex gap-2">
                                {[0, 1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${step > i ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : step === i ? 'bg-white' : 'bg-white/20'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-white/40">Paso {step + 1}/5</span>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <AnimatePresence mode="wait">
                                {/* PROCESSING STATE */}
                                {step === 5 ? (
                                    <motion.div
                                        key="processing"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="relative w-40 h-40 mb-8">
                                            <div className="absolute inset-0 border-4 border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />
                                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]" />
                                            <div className="absolute inset-4 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-5xl text-white/80 animate-bounce">smart_toy</span>
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">Creando Gemelo</h2>
                                        <p className="text-white/50 text-sm">Escaneando geometría y texturas...</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, x: 50, rotateY: -10 }}
                                        animate={{ opacity: 1, x: 0, rotateY: 0 }}
                                        exit={{ opacity: 0, x: -50, rotateY: 10 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-full flex flex-col items-center"
                                        style={{ transformStyle: "preserve-3d" }}
                                    >
                                        {/* Icon Container with Floating Effect */}
                                        <motion.div
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.15)] backdrop-blur-md"
                                        >
                                            <span className="material-symbols-outlined text-4xl text-white">{instructions[step].icon}</span>
                                        </motion.div>

                                        <h2 className="text-3xl font-bold mb-3">{instructions[step].title}</h2>
                                        <p className="text-white/60 mb-8 max-w-xs leading-relaxed">{instructions[step].desc}</p>

                                        {/* Dynamic Action Area */}
                                        <div className="w-full min-h-[200px] flex items-center justify-center">
                                            {step === 0 ? (
                                                <button
                                                    onClick={() => setStep(1)}
                                                    className="group relative px-8 py-4 bg-white text-black rounded-xl font-bold text-lg overflow-hidden transition-transform hover:scale-105"
                                                >
                                                    <span className="relative z-10 flex items-center gap-2">
                                                        COMENZAR <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
                                                    </span>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ) : step <= 3 ? (
                                                <label className="w-full aspect-[3/4] max-h-[250px] cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors bg-white/5">
                                                    {images[step - 1] ? (
                                                        <img src={images[step - 1]} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full gap-3 group-hover:scale-105 transition-transform">
                                                            <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-colors">
                                                                <span className="material-symbols-outlined text-3xl text-white/70">add_a_photo</span>
                                                            </div>
                                                            <span className="text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-purple-400">Subir Imagen</span>
                                                        </div>
                                                    )}
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                                </label>
                                            ) : (
                                                // Human Body Semantic Selection
                                                <div className="grid grid-cols-2 gap-3 w-full">
                                                    {['Petite', 'Athletic', 'Curvy', 'Tall', 'Slim', 'Plus'].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => handleSemanticData(type)}
                                                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/20 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex flex-col items-center gap-1 group"
                                                        >
                                                            <span className="text-sm font-medium text-white/80 group-hover:text-white">{type}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DigitalTwinSetup;
