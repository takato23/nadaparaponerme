import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureButtonProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'captured' | 'denied' | 'unavailable';

const CameraCaptureButton: React.FC<CameraCaptureButtonProps> = ({ onCapture, onClose }) => {
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect device type
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraState('requesting');
    setError(null);

    try {
      // Request camera with rear camera preference
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraState('active');
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      stopCamera();

      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            setCameraState('denied');
            setError('Permiso de cámara denegado');
            break;
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            setCameraState('unavailable');
            setError('No se encontró ninguna cámara');
            break;
          case 'NotReadableError':
          case 'TrackStartError':
            setCameraState('unavailable');
            setError('La cámara está siendo usada por otra aplicación');
            break;
          case 'OverconstrainedError':
            // Try again with simpler constraints
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
              setError('Error al acceder a la cámara');
            }
            break;
          default:
            setCameraState('unavailable');
            setError('Error al acceder a la cámara');
        }
      } else {
        setCameraState('unavailable');
        setError('Error desconocido al acceder a la cámara');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL with compression
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Resize if needed (max 800px on longest side)
    const maxSize = 800;
    const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);

    if (scale < 1) {
      canvas.width = Math.floor(canvas.width * scale);
      canvas.height = Math.floor(canvas.height * scale);
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(compressedDataUrl);
        setCameraState('captured');
        stopCamera();
      };
      img.src = dataUrl;
    } else {
      setCapturedImage(dataUrl);
      setCameraState('captured');
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCameraState('idle');
    setError(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const getSettingsInstructions = () => {
    if (isIOS) {
      return (
        <div className="space-y-2 text-left">
          <p className="font-semibold">Para activar la cámara en iOS:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Abre la app "Ajustes"</li>
            <li>Desplázate hasta Safari</li>
            <li>Toca "Cámara" en la sección "Configuración para sitios web"</li>
            <li>Selecciona "Permitir"</li>
            <li>Recarga esta página</li>
          </ol>
        </div>
      );
    } else if (isAndroid) {
      return (
        <div className="space-y-2 text-left">
          <p className="font-semibold">Para activar la cámara en Android:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Abre "Configuración" de Android</li>
            <li>Ve a "Aplicaciones" → "Chrome"</li>
            <li>Toca "Permisos"</li>
            <li>Activa "Cámara"</li>
            <li>Recarga esta página</li>
          </ol>
        </div>
      );
    } else {
      return (
        <div className="space-y-2 text-left">
          <p className="font-semibold">Para activar la cámara:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Busca el icono de cámara en la barra de direcciones</li>
            <li>Permite el acceso a la cámara</li>
            <li>Recarga la página si es necesario</li>
          </ol>
        </div>
      );
    }
  };

  const renderContent = () => {
    switch (cameraState) {
      case 'idle':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-primary">photo_camera</span>
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 mb-2">
              Tomar Foto con Cámara
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm mb-6 max-w-xs">
              Captura la prenda directamente desde la tienda o tu armario
            </p>
            <button
              onClick={startCamera}
              className="w-full max-w-xs bg-primary text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">photo_camera</span>
              Activar Cámara
            </button>
          </motion.div>
        );

      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-2">
              Solicitando permiso...
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              Por favor, permite el acceso a la cámara
            </p>
          </div>
        );

      case 'active':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-full bg-black"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera overlay UI */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Grid overlay for composition */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>

              {/* Center focus point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-2xl" />
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>

                {/* Capture button - 44x44px minimum for touch */}
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-110 active:scale-95 transition-transform"
                >
                  <div className="w-full h-full rounded-full bg-white" />
                </button>

                <button
                  onClick={stopCamera}
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <span className="material-symbols-outlined">flip_camera_ios</span>
                </button>
              </div>

              <p className="text-white/80 text-center text-sm mt-4">
                Centra la prenda en el recuadro
              </p>
            </div>
          </motion.div>
        );

      case 'captured':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-full bg-black"
          >
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            )}

            {/* Action buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 bg-white/20 backdrop-blur-md text-white font-bold py-4 px-6 rounded-2xl hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Repetir
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-primary text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check</span>
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'denied':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-red-600 dark:text-red-400">block</span>
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 mb-2">
              Permiso Denegado
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm mb-6">
              {error}
            </p>

            <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 text-text-secondary dark:text-gray-300 text-sm">
              {getSettingsInstructions()}
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-3 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Volver a Subir Archivo
            </button>
          </motion.div>
        );

      case 'unavailable':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-orange-600 dark:text-orange-400">warning</span>
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 mb-2">
              Cámara No Disponible
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm mb-6">
              {error}
            </p>

            <div className="space-y-3 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="w-full bg-primary text-white font-bold py-3 px-6 rounded-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">refresh</span>
                Intentar de Nuevo
              </button>
              <button
                onClick={onClose}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-3 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Subir Archivo
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {renderContent()}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCaptureButton;
