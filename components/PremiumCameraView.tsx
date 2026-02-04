import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItemMetadata } from '../types';
import * as aiService from '../src/services/aiService';

interface PremiumCameraViewProps {
    onClose: () => void;
    onAddToCloset: (imageDataUrl: string, metadata: ClothingItemMetadata, backImageDataUrl?: string) => void;
}

type ViewStep = 'camera' | 'preview' | 'scanning' | 'analyzing' | 'results' | 'error' | 'back_camera' | 'back_preview';
type CameraFacing = 'environment' | 'user';

// Constants
const MAX_IMAGE_SIZE = 1200; // Max dimension in pixels
const JPEG_QUALITY = 0.85;
const ANALYSIS_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

// Photo guidance tips
const PHOTO_TIPS = [
    { icon: 'light_mode', text: 'Buena iluminación' },
    { icon: 'crop_free', text: 'Prenda centrada' },
    { icon: 'blur_off', text: 'Imagen nítida' },
    { icon: 'contrast', text: 'Fondo simple' },
];

const PremiumCameraView: React.FC<PremiumCameraViewProps> = ({ onClose, onAddToCloset }) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('camera');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [compressedImage, setCompressedImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [compressedBackImage, setCompressedBackImage] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ClothingItemMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
    const [showGuidance, setShowGuidance] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<string>('');
    const [retryCount, setRetryCount] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const backFileInputRef = useRef<HTMLInputElement>(null);
    const analysisAbortRef = useRef<AbortController | null>(null);

    // Check if user has seen guidance before
    useEffect(() => {
        const hasSeenGuidance = localStorage.getItem('ojodeloca-camera-guidance-seen');
        if (!hasSeenGuidance) {
            setShowGuidance(true);
        }
    }, []);

    // Start camera when component mounts or when switching to camera views
    useEffect(() => {
        if (currentStep === 'camera' || currentStep === 'back_camera') {
            // Small delay to ensure video element is mounted
            const timer = setTimeout(() => {
                startCamera();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [currentStep, cameraFacing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            // Cancel any pending analysis
            if (analysisAbortRef.current) {
                analysisAbortRef.current.abort();
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            // Stop any existing stream first
            stopCamera();

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso a la cámara o el sitio no es seguro (HTTPS).');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacing,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                setError(null);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.';
            setError(`${msg} Podés subir una foto en su lugar.`);
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const toggleCamera = () => {
        setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    };

    /**
     * Compress and resize image to reduce token usage and improve performance
     */
    const compressImage = useCallback((dataUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > MAX_IMAGE_SIZE) {
                        height = Math.round((height * MAX_IMAGE_SIZE) / width);
                        width = MAX_IMAGE_SIZE;
                    }
                } else {
                    if (height > MAX_IMAGE_SIZE) {
                        width = Math.round((width * MAX_IMAGE_SIZE) / height);
                        height = MAX_IMAGE_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Use better quality settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
                resolve(compressed);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }, []);

    const capturePhoto = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Mirror image if using front camera
                if (cameraFacing === 'user') {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(video, 0, 0);

                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                setCapturedImage(imageDataUrl);
                setCurrentStep('preview');
                stopCamera();
            }
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Por favor seleccioná una imagen válida');
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('La imagen es muy grande. Máximo 10MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDataUrl = e.target?.result as string;
                setCapturedImage(imageDataUrl);
                setCurrentStep('preview');
                stopCamera();
            };
            reader.onerror = () => {
                setError('Error al leer el archivo');
            };
            reader.readAsDataURL(file);
        }
    };

    const confirmAndAnalyze = async () => {
        if (!capturedImage) return;

        setCurrentStep('scanning');
        setError(null);
        setAnalysisProgress('Optimizando imagen...');

        try {
            // Compress image first
            const compressed = await compressImage(capturedImage);
            setCompressedImage(compressed);

            // Start analysis with timeout and retry logic
            await analyzeWithTimeout(compressed);
        } catch (err) {
            handleAnalysisError(err);
        }
    };

    const analyzeWithTimeout = async (imageDataUrl: string): Promise<void> => {
        setCurrentStep('analyzing');
        setAnalysisProgress('Detectando prenda...');

        // Create abort controller for timeout
        analysisAbortRef.current = new AbortController();

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error('TIMEOUT'));
            }, ANALYSIS_TIMEOUT);
        });

        const progressMessages = [
            'Detectando prenda...',
            'Analizando colores...',
            'Identificando estilo...',
            'Generando recomendaciones...',
        ];

        // Progress simulation
        let progressIndex = 0;
        const progressInterval = setInterval(() => {
            progressIndex = (progressIndex + 1) % progressMessages.length;
            setAnalysisProgress(progressMessages[progressIndex]);
        }, 3000);

        try {
            const result = await Promise.race([
                aiService.analyzeClothingItem(imageDataUrl),
                timeoutPromise
            ]);

            clearInterval(progressInterval);
            setAnalysisResult(result);
            setCurrentStep('results');
            setRetryCount(0);
        } catch (err) {
            clearInterval(progressInterval);
            throw err;
        }
    };

    const handleAnalysisError = (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

        if (errorMessage === 'TIMEOUT') {
            if (retryCount < MAX_RETRIES) {
                // Auto-retry
                setRetryCount(prev => prev + 1);
                setAnalysisProgress(`Reintentando... (${retryCount + 1}/${MAX_RETRIES})`);
                if (compressedImage) {
                    analyzeWithTimeout(compressedImage);
                }
                return;
            }
            setError('El análisis tardó demasiado. Por favor intentá de nuevo con mejor iluminación.');
        } else {
            setError(errorMessage);
        }

        setCurrentStep('error');
    };

    const retake = () => {
        setCapturedImage(null);
        setCompressedImage(null);
        setBackImage(null);
        setCompressedBackImage(null);
        setAnalysisResult(null);
        setError(null);
        setRetryCount(0);
        setCurrentStep('camera');
        startCamera();
    };

    // Start capturing back photo
    const startBackPhotoCapture = () => {
        setCurrentStep('back_camera');
        // Camera will be started by useEffect when step changes
    };

    // Capture back photo
    const captureBackPhoto = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                if (cameraFacing === 'user') {
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(video, 0, 0);

                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                setBackImage(imageDataUrl);
                setCurrentStep('back_preview');
                stopCamera();
            }
        }
    };

    // Handle file upload for back image
    const handleBackFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor seleccioná una imagen válida');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError('La imagen es muy grande. Máximo 10MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageDataUrl = e.target?.result as string;
                setBackImage(imageDataUrl);
                setCurrentStep('back_preview');
                stopCamera();
            };
            reader.onerror = () => {
                setError('Error al leer el archivo');
            };
            reader.readAsDataURL(file);
        }
    };

    // Confirm back photo and compress
    const confirmBackPhoto = async () => {
        if (!backImage) return;

        try {
            const compressed = await compressImage(backImage);
            setCompressedBackImage(compressed);
            setCurrentStep('results');
        } catch (err) {
            console.error('Error compressing back image:', err);
            setCompressedBackImage(backImage);
            setCurrentStep('results');
        }
    };

    // Retake just the back photo
    const retakeBackPhoto = () => {
        setBackImage(null);
        setCompressedBackImage(null);
        setCurrentStep('back_camera');
        startCamera();
    };

    // Skip back photo and go directly to add
    const skipBackPhoto = () => {
        setCurrentStep('results');
    };

    // Remove back photo
    const removeBackPhoto = () => {
        setBackImage(null);
        setCompressedBackImage(null);
    };

    const confirmAddToCloset = () => {
        if (capturedImage && analysisResult) {
            // Use compressed images if available
            const mainImage = compressedImage || capturedImage;
            const backImg = compressedBackImage || backImage || undefined;
            onAddToCloset(mainImage, analysisResult, backImg);
            onClose();
        }
    };

    const dismissGuidance = () => {
        localStorage.setItem('ojodeloca-camera-guidance-seen', 'true');
        setShowGuidance(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
            {/* SVG Filter for Liquid Effect */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* Photo Guidance Modal */}
            <AnimatePresence>
                {showGuidance && currentStep === 'camera' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 max-w-sm w-full border border-white/10"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-primary text-3xl">tips_and_updates</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Tips para mejores resultados</h3>
                                <p className="text-white/60 text-sm">Seguí estos consejos para un análisis más preciso</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {PHOTO_TIPS.map((tip, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                                        <span className="material-symbols-outlined text-primary">{tip.icon}</span>
                                        <span className="text-white/80 text-sm">{tip.text}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={dismissGuidance}
                                className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors"
                            >
                                ¡Entendido!
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">

                {/* CAMERA VIEW */}
                {currentStep === 'camera' && (
                    <motion.div
                        key="camera"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex-grow flex flex-col h-full"
                    >
                        {/* Camera Feed */}
                        <div className="relative flex-grow bg-black overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Liquid Overlay */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                                <button onClick={onClose} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                                <div className="px-4 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-bold text-white tracking-wider uppercase">
                                    AI Fashion Scanner
                                </div>
                                <button
                                    onClick={() => setShowGuidance(true)}
                                    className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined">help</span>
                                </button>
                            </div>

                            {/* Error message */}
                            {error && (
                                <div className="absolute inset-x-6 top-20 z-20">
                                    <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 backdrop-blur-md">
                                        <p className="text-white text-sm text-center">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Guide Frame */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[70%] aspect-[3/4] border border-white/30 rounded-3xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />

                                    {/* Center hint */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-white/40 text-sm font-medium px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm">
                                            Centrá la prenda aquí
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="h-36 bg-black flex items-center justify-center gap-6 px-6 pb-8">
                            {/* Gallery button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">photo_library</span>
                            </button>

                            {/* Capture button */}
                            <button
                                onClick={capturePhoto}
                                disabled={!isCameraActive}
                                className="w-20 h-20 rounded-full border-4 border-white/30 p-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-full h-full rounded-full bg-white" />
                            </button>

                            {/* Flip camera button */}
                            <button
                                onClick={toggleCamera}
                                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">flip_camera_ios</span>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </motion.div>
                )}

                {/* PREVIEW VIEW - New step for confirming photo before analysis */}
                {currentStep === 'preview' && capturedImage && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex-grow flex flex-col h-full"
                    >
                        {/* Preview Image */}
                        <div className="relative flex-grow bg-black overflow-hidden flex items-center justify-center">
                            <img
                                src={capturedImage}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain"
                            />

                            {/* Overlay gradient */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                                <button onClick={retake} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="px-4 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-bold text-white tracking-wider uppercase">
                                    Confirmar Foto
                                </div>
                                <div className="w-10" />
                            </div>
                        </div>

                        {/* Preview Actions */}
                        <div className="p-6 bg-black space-y-3">
                            <button
                                onClick={confirmAndAnalyze}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">auto_awesome</span>
                                Analizar con IA
                            </button>
                            <button
                                onClick={retake}
                                className="w-full py-3 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                                Tomar otra foto
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* SCANNING / ANALYZING VIEW */}
                {(currentStep === 'scanning' || currentStep === 'analyzing') && (
                    <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center"
                    >
                        {capturedImage && (
                            <div className="absolute inset-0 z-0 opacity-20 blur-2xl">
                                <img src={capturedImage} className="w-full h-full object-cover" alt="" />
                            </div>
                        )}

                        <div className="relative z-10 flex flex-col items-center px-6">
                            {/* Animated spinner */}
                            <div className="relative w-28 h-28 mb-8">
                                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-primary/50 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-3xl">checkroom</span>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-2">
                                {currentStep === 'scanning' ? 'Preparando...' : 'Analizando Estilo'}
                            </h3>
                            <p className="text-white/60 text-center max-w-xs mb-4">
                                {analysisProgress}
                            </p>

                            {retryCount > 0 && (
                                <div className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                                    <p className="text-yellow-400 text-xs">Intento {retryCount + 1} de {MAX_RETRIES + 1}</p>
                                </div>
                            )}

                            {/* Cancel button */}
                            <button
                                onClick={retake}
                                className="mt-8 px-6 py-2 rounded-full bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ERROR VIEW */}
                {currentStep === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center p-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-red-400 text-4xl">error</span>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2 text-center">
                            Algo salió mal
                        </h3>
                        <p className="text-white/60 text-center max-w-xs mb-8">
                            {error || 'No pudimos analizar la prenda. Intentá de nuevo.'}
                        </p>

                        <div className="space-y-3 w-full max-w-xs">
                            <button
                                onClick={retake}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                                Intentar de nuevo
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* RESULTS VIEW */}
                {currentStep === 'results' && analysisResult && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-0 z-30 bg-black flex flex-col overflow-hidden"
                    >
                        {/* Image Header */}
                        <div className="relative h-[40vh] w-full">
                            {capturedImage && (
                                <img src={capturedImage} className="w-full h-full object-cover" alt="Analyzed clothing" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                            <button
                                onClick={retake}
                                className="absolute top-6 left-6 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>

                            {/* Fashion Score Badge */}
                            {analysisResult.fashion_score && (
                                <div className="absolute bottom-6 right-6 flex flex-col items-end">
                                    <div className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Fashion Score</div>
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2">
                                        <span className="text-4xl font-black text-white">{analysisResult.fashion_score}</span>
                                        <span className="text-sm text-white/60 font-medium">/10</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-grow overflow-y-auto bg-black px-6 pb-24 -mt-6 relative z-10 rounded-t-3xl border-t border-white/10">

                            {/* Holographic Background Effects */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-3xl">
                                <div className="absolute inset-0 opacity-20 mix-blend-color-dodge bg-[linear-gradient(105deg,transparent_20%,rgba(255,219,219,0.2)_40%,rgba(255,255,255,0.3)_45%,rgba(255,219,219,0.2)_50%,transparent_55%)] bg-[length:200%_200%]" />
                                <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[linear-gradient(to_bottom_right,#ff00cc,#3333ff,#00ccff)]" />
                                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            </div>

                            <div className="relative z-10">
                                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-4" />

                                <div className="space-y-8 mt-2">
                                    {/* Title & Category */}
                                    <div>
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-1">
                                            {analysisResult.category} • {analysisResult.subcategory}
                                        </div>
                                        <h2 className="text-3xl font-bold text-white capitalize">
                                            {analysisResult.subcategory} {analysisResult.color_primary}
                                        </h2>
                                    </div>

                                    {/* Vibe Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.vibe_tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-white/80">
                                                #{tag}
                                            </span>
                                        ))}
                                        {analysisResult.occasion_tags?.map(tag => (
                                            <span key={tag} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Styling Tips */}
                                    {analysisResult.styling_tips && (
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                                <span className="material-symbols-outlined text-6xl">auto_awesome</span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3 relative z-10">
                                                <span className="material-symbols-outlined text-yellow-400">auto_awesome</span>
                                                <h3 className="font-bold text-white">Stylist Tip</h3>
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed relative z-10">
                                                {analysisResult.styling_tips}
                                            </p>
                                        </div>
                                    )}

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {analysisResult.fabric_composition && (
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Material</div>
                                                <div className="text-white font-medium">{analysisResult.fabric_composition}</div>
                                            </div>
                                        )}
                                        {analysisResult.care_instructions && (
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Cuidado</div>
                                                <div className="text-white font-medium">{analysisResult.care_instructions}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Palette */}
                                    {analysisResult.color_palette && analysisResult.color_palette.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Paleta Detectada</h3>
                                            <div className="flex gap-2">
                                                {analysisResult.color_palette.map((color, idx) => (
                                                    <div key={idx} className="flex flex-col items-center gap-1">
                                                        <div
                                                            className="w-12 h-12 rounded-full border-2 border-white/10 shadow-lg"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        <span className="text-xs text-white/40 font-mono">{color}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Back Photo Preview Section */}
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">360</span>
                                                Foto del Dorso
                                            </h3>
                                            {backImage && (
                                                <button
                                                    onClick={removeBackPhoto}
                                                    className="text-red-400 text-xs hover:text-red-300 transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>

                                        {backImage ? (
                                            <div className="relative aspect-[3/4] w-24 rounded-xl overflow-hidden border-2 border-primary/50">
                                                <img
                                                    src={compressedBackImage || backImage}
                                                    alt="Dorso de la prenda"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-1 right-1 bg-primary/90 rounded-full p-0.5">
                                                    <span className="material-symbols-outlined text-white text-xs">check</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={startBackPhotoCapture}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-dashed border-white/20 w-full hover:bg-white/10 hover:border-white/30 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                                    <span className="material-symbols-outlined text-primary text-2xl">add_a_photo</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white/90 font-medium text-sm">Agregar foto del dorso</p>
                                                    <p className="text-white/50 text-xs">Para vista 360° de la prenda</p>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar with Liquid Button */}
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                            <div className="relative group" style={{ filter: 'url(#goo)' }}>
                                <button
                                    onClick={confirmAddToCloset}
                                    className="relative z-10 w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-white flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">checkroom</span>
                                    Agregar al Armario
                                </button>
                                {/* Liquid Blobs for effect */}
                                <div className="absolute inset-0 bg-white rounded-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    <span className="absolute top-0 left-1/4 w-8 h-8 bg-white rounded-full animate-[ping_2s_ease-in-out_infinite]"></span>
                                    <span className="absolute bottom-0 right-1/4 w-6 h-6 bg-white rounded-full animate-[ping_2.5s_ease-in-out_infinite_0.5s]"></span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* BACK CAMERA VIEW */}
                {currentStep === 'back_camera' && (
                    <motion.div
                        key="back_camera"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex-grow flex flex-col h-full"
                    >
                        {/* Camera Feed */}
                        <div className="relative flex-grow bg-black overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Overlay */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                                <button
                                    onClick={skipBackPhoto}
                                    className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="px-4 py-1 rounded-full bg-primary/30 backdrop-blur-md border border-primary/30 text-xs font-bold text-white tracking-wider uppercase">
                                    📸 Foto del Dorso
                                </div>
                                <button
                                    onClick={() => setShowGuidance(true)}
                                    className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined">help</span>
                                </button>
                            </div>

                            {/* Guide Frame */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[70%] aspect-[3/4] border-2 border-dashed border-primary/50 rounded-3xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />

                                    {/* Center hint */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-primary/80 text-sm font-medium px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
                                            Mostrá el dorso de la prenda
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Front image preview thumbnail */}
                            {capturedImage && (
                                <div className="absolute bottom-24 left-6 z-20">
                                    <div className="relative">
                                        <img
                                            src={compressedImage || capturedImage}
                                            alt="Frente"
                                            className="w-16 h-20 object-cover rounded-xl border-2 border-white/30"
                                        />
                                        <div className="absolute -top-2 -right-2 bg-white text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                                            Frente
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="h-36 bg-black flex items-center justify-center gap-6 px-6 pb-8">
                            {/* Gallery button */}
                            <button
                                onClick={() => backFileInputRef.current?.click()}
                                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">photo_library</span>
                            </button>

                            {/* Capture button */}
                            <button
                                onClick={captureBackPhoto}
                                disabled={!isCameraActive}
                                className="w-20 h-20 rounded-full border-4 border-primary/50 p-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-full h-full rounded-full bg-primary" />
                            </button>

                            {/* Skip button */}
                            <button
                                onClick={skipBackPhoto}
                                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">skip_next</span>
                            </button>

                            <input
                                ref={backFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleBackFileUpload}
                                className="hidden"
                            />
                        </div>
                    </motion.div>
                )}

                {/* BACK PREVIEW VIEW */}
                {currentStep === 'back_preview' && backImage && (
                    <motion.div
                        key="back_preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex-grow flex flex-col h-full"
                    >
                        {/* Preview Images - Side by side */}
                        <div className="relative flex-grow bg-black overflow-hidden flex items-center justify-center gap-2 p-4">
                            {/* Front image */}
                            {capturedImage && (
                                <div className="relative flex-1 max-w-[45%]">
                                    <img
                                        src={compressedImage || capturedImage}
                                        alt="Frente"
                                        className="w-full h-auto max-h-[60vh] object-contain rounded-2xl border border-white/20"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white font-medium">
                                        Frente
                                    </div>
                                </div>
                            )}

                            {/* Back image */}
                            <div className="relative flex-1 max-w-[45%]">
                                <img
                                    src={backImage}
                                    alt="Dorso"
                                    className="w-full h-auto max-h-[60vh] object-contain rounded-2xl border-2 border-primary/50"
                                />
                                <div className="absolute bottom-2 left-2 bg-primary/80 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white font-medium">
                                    Dorso
                                </div>
                            </div>

                            {/* Overlay gradient */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

                            {/* Header */}
                            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
                                <button onClick={retakeBackPhoto} className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="px-4 py-1 rounded-full bg-primary/30 backdrop-blur-md border border-primary/30 text-xs font-bold text-white tracking-wider uppercase">
                                    Vista 360° ✨
                                </div>
                                <div className="w-10" />
                            </div>
                        </div>

                        {/* Preview Actions */}
                        <div className="p-6 bg-black space-y-3">
                            <button
                                onClick={confirmBackPhoto}
                                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check</span>
                                Confirmar foto del dorso
                            </button>
                            <button
                                onClick={retakeBackPhoto}
                                className="w-full py-3 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">refresh</span>
                                Tomar otra foto
                            </button>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
};

export default PremiumCameraView;
