/**
 * PhotoPickerSheet - Galería embebida estilo ChatGPT iOS
 *
 * Hoja inferior deslizable con un grid de fotos recientes (las prendas del
 * armario del usuario). No ocupa toda la pantalla y la transición al elegir
 * una foto es seamless. Incluye un acceso "Todas las fotos" que abre el
 * selector nativo del sistema como respaldo (única vía web para el carrete).
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface PhotoPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: ClothingItem[];
  onSelect: (imageUrl: string) => void;
  onPickFromDevice: () => void;
}

const PhotoPickerSheet: React.FC<PhotoPickerSheetProps> = ({
  isOpen,
  onClose,
  items,
  onSelect,
  onPickFromDevice,
}) => {
  const photos = items.filter((item) => Boolean(item.imageDataUrl));

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
            className="relative flex max-h-[78vh] w-full max-w-lg flex-col rounded-t-3xl bg-white dark:bg-[#0b0c12] shadow-2xl overflow-hidden"
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Fotos</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-600">image</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay fotos en tu armario.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.map((item) => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => { onSelect(item.imageDataUrl); onClose(); }}
                      className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/5"
                    >
                      <img src={item.imageDataUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {item.isAIGenerated && (
                        <span className="absolute right-1 top-1 rounded bg-violet-600 px-1 py-0.5 text-[9px] font-semibold text-white">
                          AI
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Native fallback */}
            <div className="border-t border-black/5 dark:border-white/5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => { onPickFromDevice(); onClose(); }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black/5 dark:bg-white/10 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                <span className="material-symbols-rounded text-lg">photo_library</span>
                Todas las fotos
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PhotoPickerSheet;
