/**
 * AttachMenu - Menú "+" estilo ChatGPT iOS
 *
 * Popover compacto que se despliega por encima del botón "+" del input,
 * con opciones para adjuntar desde la cámara, la galería o archivos.
 * No ocupa toda la pantalla: aparece anclado con un spring suave de iOS.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AttachOption = 'camera' | 'photos' | 'files';

interface AttachMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: AttachOption) => void;
}

const OPTIONS: Array<{ id: AttachOption; icon: string; label: string }> = [
  { id: 'camera', icon: 'photo_camera', label: 'Cámara' },
  { id: 'photos', icon: 'image', label: 'Fotos' },
  { id: 'files', icon: 'attach_file', label: 'Archivos' },
];

const AttachMenu: React.FC<AttachMenuProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop to capture outside taps */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]"
          />

          {/* Popover anchored above the + button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            style={{ transformOrigin: 'bottom left' }}
            className="absolute bottom-full left-0 mb-3 z-[61] w-56 origin-bottom-left overflow-hidden rounded-3xl border border-white/50 dark:border-white/10 bg-white/90 dark:bg-[#0b0c12]/90 backdrop-blur-2xl shadow-2xl"
            role="menu"
          >
            {OPTIONS.map((option, index) => (
              <button
                key={option.id}
                role="menuitem"
                onClick={() => { onSelect(option.id); onClose(); }}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 ${
                  index !== OPTIONS.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''
                }`}
              >
                <span className="material-symbols-rounded text-[22px] text-gray-700 dark:text-gray-200">
                  {option.icon}
                </span>
                <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AttachMenu;
