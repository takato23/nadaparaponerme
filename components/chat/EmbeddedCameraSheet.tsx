/**
 * EmbeddedCameraSheet - Cámara embebida estilo ChatGPT iOS
 *
 * Hoja inferior (bottom sheet) que abre la cámara dentro del chat sin ocupar
 * toda la pantalla. Permite capturar, revisar y confirmar la foto, cambiar
 * entre cámara frontal/trasera y cerrar arrastrando hacia abajo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CameraState = 'requesting' | 'active' | 'captured' | 'denied' | 'unavailable';

interface EmbeddedCameraSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

const EmbeddedCameraSheet: React.FC<EmbeddedCameraSheetProps> = ({ isOpen, onClose, onCapture }) => {
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraState('requesting');
    setError(null);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setError('Tu navegador no permite usar la cámara.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraState('active');
        };
      }
    } catch (err) {
      stopCamera();
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setCameraState('denied');
        setError('Permiso de cámara denegado. Activalo en los ajustes del navegador.');
      } else {
        // Retry once with relaxed constraints before giving up.
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = simpleStream;
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setCameraState('active');
            };
          }
        } catch {
          setCameraState('unavailable');
          setError('No pudimos acceder a la cámara.');
        }
      }
    }
  }, [stopCamera]);

  // Start / stop camera with the sheet lifecycle.
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    return () => stopCamera();
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Mirror front-camera captures so they match the preview.
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);

    // Downscale to keep the data URL light (max 1024px on the longest side).
    const maxSize = 1024;
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);
    if (scale < 1) {
      const tmp = document.createElement('canvas');
      tmp.width = Math.floor(canvas.width * scale);
      tmp.height = Math.floor(canvas.height * scale);
      tmp.getContext('2d')?.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      setCapturedImage(tmp.toDataURL('image/jpeg', 0.85));
    } else {
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    }
    setCameraState('captured');
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
            className="relative w-full max-w-lg rounded-t-3xl bg-white dark:bg-[#0b0c12] shadow-2xl overflow-hidden"
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cámara</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>

            {/* Camera viewport */}
            <div className="relative mx-3 mb-3 aspect-[3/4] max-h-[60vh] overflow-hidden rounded-2xl bg-black">
              {capturedImage ? (
                <img src={capturedImage} alt="Captura" className="h-full w-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
              )}

              {(cameraState === 'requesting') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/90">
                  <span className="material-symbols-rounded animate-spin text-3xl">progress_activity</span>
                  <p className="text-sm">Abriendo cámara…</p>
                </div>
              )}

              {(cameraState === 'denied' || cameraState === 'unavailable') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/90">
                  <span className="material-symbols-rounded text-4xl">no_photography</span>
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {capturedImage ? (
                <>
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <span className="material-symbols-rounded text-lg">refresh</span>
                    Repetir
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold shadow-md hover:scale-105 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-rounded text-lg">check</span>
                    Usar foto
                  </button>
                </>
              ) : (
                <>
                  <div className="w-11" />
                  <button
                    onClick={capturePhoto}
                    disabled={cameraState !== 'active'}
                    aria-label="Capturar"
                    className="grid h-[68px] w-[68px] place-items-center rounded-full border-[3px] border-gray-900/80 dark:border-white/80 disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    <span className="h-14 w-14 rounded-full bg-gray-900 dark:bg-white" />
                  </button>
                  <button
                    onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                    disabled={cameraState !== 'active'}
                    aria-label="Cambiar cámara"
                    className="grid h-11 w-11 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-rounded text-xl">cameraswitch</span>
                  </button>
                </>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EmbeddedCameraSheet;
