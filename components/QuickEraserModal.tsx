import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface QuickEraserModalProps {
  isOpen: boolean;
  imageDataUrl: string | null;
  onClose: () => void;
  onApply: (imageDataUrl: string) => void;
}

const MAX_CANVAS_EDGE = 1600;
const MAX_UNDO_STEPS = 12;

type Point = { x: number; y: number };

const QuickEraserModal = ({
  isOpen,
  imageDataUrl,
  onClose,
  onApply,
}: QuickEraserModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  const [brushSize, setBrushSize] = useState(24);
  const [isReady, setIsReady] = useState(false);
  const [undoCount, setUndoCount] = useState(0);

  const brushLabel = useMemo(() => `${brushSize}px`, [brushSize]);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const drawSourceImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    const sourceImage = sourceImageRef.current;
    if (!canvas || !ctx || !sourceImage) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  }, [getContext]);

  const loadImageIntoCanvas = useCallback(async () => {
    if (!isOpen || !imageDataUrl) return;

    setIsReady(false);
    historyRef.current = [];
    setUndoCount(0);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageDataUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo cargar la imagen para retocar.'));
    });

    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const naturalWidth = Math.max(1, image.naturalWidth || image.width || 1);
    const naturalHeight = Math.max(1, image.naturalHeight || image.height || 1);
    const scale = Math.min(1, MAX_CANVAS_EDGE / Math.max(naturalWidth, naturalHeight));

    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));

    sourceImageRef.current = image;
    drawSourceImage();
    setIsReady(true);
  }, [drawSourceImage, getContext, imageDataUrl, isOpen]);

  useEffect(() => {
    void loadImageIntoCanvas();
  }, [loadImageIntoCanvas]);

  const saveSnapshotForUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const history = historyRef.current;
    if (history.length >= MAX_UNDO_STEPS) {
      history.shift();
    }
    history.push(snapshot);
    setUndoCount(history.length);
  }, [getContext]);

  const undoLastStroke = useCallback(() => {
    const ctx = getContext();
    if (!ctx || historyRef.current.length === 0) return;

    const previous = historyRef.current.pop();
    if (!previous) return;

    ctx.putImageData(previous, 0, 0);
    setUndoCount(historyRef.current.length);
  }, [getContext]);

  const resetImage = useCallback(() => {
    historyRef.current = [];
    setUndoCount(0);
    drawSourceImage();
  }, [drawSourceImage]);

  const getCanvasPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }, []);

  const eraseBetween = useCallback((from: Point, to: Point) => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [brushSize, getContext]);

  const finishDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    event.preventDefault();

    const startPoint = getCanvasPoint(event);
    if (!startPoint) return;

    saveSnapshotForUndo();
    isDrawingRef.current = true;
    lastPointRef.current = startPoint;
    eraseBetween(startPoint, startPoint);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Browser fallback.
    }
  }, [eraseBetween, getCanvasPoint, isReady, saveSnapshotForUndo]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();

    const nextPoint = getCanvasPoint(event);
    if (!nextPoint) return;

    const lastPoint = lastPointRef.current ?? nextPoint;
    eraseBetween(lastPoint, nextPoint);
    lastPointRef.current = nextPoint;
  }, [eraseBetween, getCanvasPoint]);

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onApply(canvas.toDataURL('image/png'));
  }, [onApply]);

  if (!isOpen || !imageDataUrl) return null;

  return (
    <motion.div
      key="quick-eraser-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        className="w-full max-w-4xl h-[85vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Retoque rápido</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Borrá zonas no deseadas con pincel y guardá transparencia.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            aria-label="Cerrar retoque"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-950/40 overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 grid place-items-center overflow-hidden relative">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
              onPointerLeave={finishDrawing}
              className="max-w-full max-h-full h-auto w-auto touch-none cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
            {!isReady && (
              <div className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-gray-900/70">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                  Cargando editor...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">brush</span>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-16">Pincel</label>
            <input
              type="range"
              min={8}
              max={90}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className="w-full"
            />
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 min-w-[52px] text-center">
              {brushLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={undoLastStroke}
              disabled={undoCount === 0}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Deshacer
            </button>
            <button
              onClick={resetImage}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reiniciar
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Aplicar retoque
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickEraserModal;
