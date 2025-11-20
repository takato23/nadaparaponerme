import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../types';
import { logger } from '../utils/logger';
import { HelpIcon } from './ui/HelpIcon';

interface VirtualTryOnViewProps {
  onBack: () => void;
  outfitItems: {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
  };
}

const VirtualTryOnView: React.FC<VirtualTryOnViewProps> = ({ outfitItems, onBack }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Convert outfit items to array for AR overlay
  const arItems: ClothingItem[] = [
    outfitItems.top,
    outfitItems.bottom,
    outfitItems.shoes,
  ].filter(Boolean); // Remove any null/undefined items

  const selectedItem = arItems.find(i => i.id === selectedItemId);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md h-[80vh] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 flex flex-col">

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
          <button
            onClick={onBack}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
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