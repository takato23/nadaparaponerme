import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../types';
import { logger } from '../utils/logger';
import { HelpIcon } from './ui/HelpIcon';
import { getCreditStatus } from '../services/usageTrackingService';
import { generateVirtualTryOn } from '../src/services/aiService';
import { validateImageDataUri } from '../utils/imageValidation';
import { analyzeTryOnPhotoQuality } from '../utils/photoQualityValidation';

interface VirtualTryOnViewProps {
  onBack: () => void;
  outfitItems: {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
  };
  /** Si el usuario puede usar esta feature (Pro/Premium) */
  canUseTryOn?: boolean;
  /** Callback para mostrar pricing/upgrade */
  onUpgrade?: () => void;
}

const VirtualTryOnView: React.FC<VirtualTryOnViewProps> = ({
  outfitItems,
  onBack,
  canUseTryOn = true, // Por defecto permitir (para no romper código existente)
  onUpgrade,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Credits status
  const creditsStatus = useMemo(() => getCreditStatus(), []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const update = () => setPrefersReducedMotion(Boolean(mq.matches));
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // 🔒 PAYWALL: Si el usuario no puede usar esta feature, mostrar upgrade
  if (!canUseTryOn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-center border border-white/10"
        >
          {/* Ícono Pro */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-amber-900">view_in_ar</span>
          </div>

          <h2 className="text-white text-2xl font-bold mb-3">
            Probador Virtual
          </h2>

          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 text-sm font-bold mb-4">
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
            Solo Pro
          </div>

          <p className="text-white/70 mb-6">
            Probate outfits virtualmente con tu cámara antes de vestirte. Disponible en el plan Pro.
          </p>

          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Ver planes Pro
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all"
            >
              Volver
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Convert outfit items to array for AR overlay
  const arItems: ClothingItem[] = outfitItems ? [
    outfitItems.top,
    outfitItems.bottom,
    outfitItems.shoes,
  ].filter(Boolean) : []; // Remove any null/undefined items

  const selectedItem = arItems.find(i => i.id === selectedItemId);

  const onPickSelfieFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setAiError(null);
    setGeneratedImage(null);

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    const validation = validateImageDataUri(dataUrl);
    if (!validation.isValid) {
      setAiError(validation.error || 'Imagen invalida.');
      return;
    }

    const quality = await analyzeTryOnPhotoQuality(dataUrl);
    if (!quality.isAllowed) {
      setAiError(quality.reasons[0] || 'Selfie no valida para probar el look.');
      return;
    }

    setSelfieDataUrl(dataUrl);
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          logger.error("Error accessing camera:", err);
          setIsCameraActive(false);
        });
    }
    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  const captureSelfie = useCallback(() => {
    setAiError(null);
    setGeneratedImage(null);

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) {
      setAiError('Activá la cámara para capturar tu foto.');
      return;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setAiError('Esperá un segundo a que la cámara cargue.');
      return;
    }

    const maxW = 720;
    const scale = Math.min(1, maxW / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setAiError('No se pudo capturar la imagen.');
      return;
    }

    // Video está espejado; capturamos “sin espejo” para la IA.
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const validation = validateImageDataUri(dataUrl);
    if (!validation.isValid) {
      setAiError(validation.error || 'Imagen invalida.');
      return;
    }

    analyzeTryOnPhotoQuality(dataUrl)
      .then((quality) => {
        if (!quality.isAllowed) {
          setAiError(quality.reasons[0] || 'Selfie no valida para probar el look.');
          return;
        }
        setSelfieDataUrl(dataUrl);
      })
      .catch(() => {
        setAiError('No pudimos validar la selfie. Intenta otra.');
      });
  }, []);

  const runTryOn = useCallback(async () => {
    if (!selfieDataUrl) {
      setAiError('Subí o capturá una selfie primero.');
      return;
    }
    setAiError(null);
    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const result = await generateVirtualTryOn(
        selfieDataUrl,
        outfitItems.top.imageDataUrl,
        outfitItems.bottom.imageDataUrl,
        outfitItems.shoes.imageDataUrl
      );
      setGeneratedImage(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'No se pudo generar la imagen.');
    } finally {
      setIsGenerating(false);
    }
  }, [outfitItems.bottom.imageDataUrl, outfitItems.shoes.imageDataUrl, outfitItems.top.imageDataUrl, selfieDataUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md h-[80vh] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 flex flex-col">
        <canvas ref={captureCanvasRef} className="hidden" />

        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <h2 className="text-white font-bold text-xl drop-shadow-md">Magic Mirror</h2>
            <HelpIcon
              content="Activá tu cámara y seleccioná prendas para verlas superpuestas en tiempo real. Movete para ver cómo te quedan desde diferentes ángulos."
              position="bottom"
              className="text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Credits Indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md ${creditsStatus.remaining <= 2
                ? 'bg-red-500/20 border border-red-400/50'
                : 'bg-white/10'
              }`}>
              <span className="material-symbols-rounded text-white/80 text-sm">toll</span>
              <span className={`text-xs font-medium ${creditsStatus.remaining <= 2 ? 'text-red-300' : 'text-white/80'
                }`}>
                {creditsStatus.limit === -1 ? '∞' : `${creditsStatus.remaining}/${creditsStatus.limit}`}
              </span>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickSelfieFile(e.target.files?.[0] ?? null)}
              />
              <span className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors inline-flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">upload</span>
              </span>
            </label>
            <button
              onClick={captureSelfie}
              disabled={!isCameraActive}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:hover:bg-white/10"
              title="Capturar selfie"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            </button>
            <button
              onClick={onBack}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Camera Feed / Simulation */}
        <div className="relative flex-grow overflow-hidden bg-gray-900">
          {isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center p-8">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">
                  person
                </span>
                <p className="text-gray-300 text-lg font-medium mb-2">
                  Activá la cámara para probarte el outfit
                </p>
                <p className="text-gray-500 text-sm">
                  O subí una foto tuya para ver cómo te queda
                </p>
              </div>
            </div>
          )}

          {/* AI Result overlay */}
          {generatedImage && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-20 flex flex-col">
              <div className="p-4 flex items-center justify-between">
                <div className="text-white font-semibold">Resultado (IA)</div>
                <button
                  onClick={() => setGeneratedImage(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-white/90 hover:bg-white/15 transition"
                >
                  Volver
                </button>
              </div>
              <div className="flex-1 p-4 pt-0 overflow-auto">
                <img
                  src={generatedImage}
                  alt="Resultado del probador IA"
                  className="w-full rounded-2xl bg-black object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* AR Overlay */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, scale: 0.5, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 drop-shadow-2xl pointer-events-none"
                drag
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
              >
                <img
                  src={selectedItem.imageDataUrl}
                  alt="AR Item"
                  className="w-full h-auto"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onClick={() => setIsCameraActive(true)}
                className="pointer-events-auto px-6 py-3 bg-white/10 backdrop-blur-md border border-white/30 rounded-full text-white font-bold flex items-center gap-2 hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined">videocam</span>
                Activar Cámara
              </button>
            </div>
          )}
        </div>

        {/* Item Selector */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20">
          {/* AI panel */}
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white/90 text-sm font-semibold">Probador IA (beta)</div>
                <div className="text-white/60 text-xs mt-0.5">
                  Selfie + top + bottom + zapatos → imagen generada.
                </div>
              </div>
              <button
                onClick={runTryOn}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-95 transition disabled:opacity-60"
              >
                {isGenerating ? 'Generando…' : 'Generar'}
              </button>
            </div>

            {aiError && (
              <div className="mt-2 text-rose-200 text-xs">{aiError}</div>
            )}

            {!generatedImage && selfieDataUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={selfieDataUrl}
                  alt="Selfie seleccionada"
                  className="h-10 w-10 rounded-lg object-cover border border-white/10"
                  loading="lazy"
                />
                <div className="text-white/60 text-xs">
                  Tip: de frente, buena luz, sin espejo. {prefersReducedMotion ? '' : ''}
                </div>
                <button
                  onClick={() => {
                    setAiError(null);
                    setGeneratedImage(null);
                    setSelfieDataUrl(null);
                  }}
                  className="ml-auto px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/15 transition text-xs"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <p className="text-white/80 text-center text-sm mb-4 font-medium">Selecciona un ítem para probar</p>
          <div className="flex justify-center gap-4 overflow-x-auto pb-2 no-scrollbar">
            {arItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                className={`
                            relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0
                            ${selectedItemId === item.id
                    ? 'border-primary scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : 'border-white/20 opacity-70 hover:opacity-100 hover:scale-105'
                  }
                        `}
              >
                <img
                  src={item.imageDataUrl}
                  alt={item.metadata?.subcategory || 'Item'}
                  className="w-full h-full object-cover bg-white"
                />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default VirtualTryOnView;
