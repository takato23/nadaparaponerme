import { AnimatePresence, motion } from 'framer-motion';
import type { ClothingItem, ClothingSlot, GenerationFit, SlotSelection } from '../../../types';
import { SLOT_CONFIGS } from '../../../types';
import { FitPickerPopover } from './FitPickerPopover';

interface SelectedGarmentsTrayProps {
  slotSelections: Map<ClothingSlot, SlotSelection>;
  activeFitPicker: string | null;
  setActiveFitPicker: (slot: string | null) => void;
  onUpdateSlotFit: (slot: ClothingSlot, fit: GenerationFit) => void;
  onRequestBackUpload: (item: ClothingItem) => void;
  onRemoveFromSlot: (slot: ClothingSlot) => void;
}

export function SelectedGarmentsTray({
  slotSelections,
  activeFitPicker,
  setActiveFitPicker,
  onUpdateSlotFit,
  onRequestBackUpload,
  onRemoveFromSlot,
}: SelectedGarmentsTrayProps) {
  return (
    <AnimatePresence>
      {slotSelections.size > 0 && (
        <motion.section
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="mb-3 px-1"
        >
          <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md px-3 py-2 shadow-sm ring-1 ring-black/5">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
              {Array.from(slotSelections.entries()).map(([slot, selection]) => {
                const config = SLOT_CONFIGS.find((item) => item.id === slot);
                const currentFit = selection.fit || 'regular';
                const fitIcon =
                  currentFit === 'tight' ? 'compress' : currentFit === 'oversized' ? 'expand' : 'drag_handle';
                const fitLabel = currentFit === 'tight' ? 'Aj' : currentFit === 'oversized' ? 'Ho' : 'Rg';

                return (
                  <div
                    key={slot}
                    className="shrink-0 flex items-center gap-1 pl-1 pr-2 py-1 rounded-full bg-white border border-[color:var(--studio-ink)]/10 shadow-[0_2px_6px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-white/50 group hover:border-[color:var(--studio-ink)]/30 transition-all"
                  >
                    <div className="relative">
                      <img
                        src={selection.item.imageDataUrl}
                        alt={config?.labelShort}
                        className="w-6 h-6 rounded-full object-cover border border-white/50"
                      />
                      <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none" />
                    </div>
                    <span className="text-xs font-medium text-[color:var(--studio-ink)]">{config?.labelShort}</span>

                    {slot !== 'shoes' && (
                      <div className="relative">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(5);
                            setActiveFitPicker(activeFitPicker === slot ? null : slot);
                          }}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors ${
                            activeFitPicker === slot
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">{fitIcon}</span>
                          <span className="text-xs font-semibold min-w-[3ch] text-center">{fitLabel}</span>
                        </button>

                        <FitPickerPopover
                          isOpen={activeFitPicker === slot}
                          currentFit={currentFit}
                          onClose={() => setActiveFitPicker(null)}
                          onSelect={(fitOption) => {
                            if (navigator.vibrate) navigator.vibrate(5);
                            onUpdateSlotFit(slot, fitOption);
                            setActiveFitPicker(null);
                          }}
                        />
                      </div>
                    )}

                    {slot !== 'shoes' && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRequestBackUpload(selection.item);
                        }}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition ${
                          selection.item.backImageDataUrl
                            ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                        title={
                          selection.item.backImageDataUrl
                            ? 'Vista trasera disponible'
                            : 'Agregar vista trasera'
                        }
                      >
                        <span className="material-symbols-outlined text-xs">
                          {selection.item.backImageDataUrl ? '360' : 'add_a_photo'}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        onRemoveFromSlot(slot);
                      }}
                      className="w-3 h-3 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-[8px]"
                      title="Quitar prenda"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
