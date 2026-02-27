import { AnimatePresence, motion } from 'framer-motion';
import type { GenerationFit } from '../../../types';

interface FitPickerPopoverProps {
  isOpen: boolean;
  currentFit: GenerationFit;
  onSelect: (fit: GenerationFit) => void;
  onClose: () => void;
}

export function FitPickerPopover({ isOpen, currentFit, onSelect, onClose }: FitPickerPopoverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-1 min-w-[110px] flex flex-col gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            {(['tight', 'regular', 'oversized'] as const).map((fitOption) => (
              <button
                key={fitOption}
                onClick={() => onSelect(fitOption)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition w-full text-left ${
                  currentFit === fitOption ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className="material-symbols-outlined text-sm shrink-0">
                  {fitOption === 'tight' ? 'compress' : fitOption === 'oversized' ? 'expand' : 'drag_handle'}
                </span>
                {fitOption === 'tight' ? 'Ajustado' : fitOption === 'oversized' ? 'Holgado' : 'Regular'}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
