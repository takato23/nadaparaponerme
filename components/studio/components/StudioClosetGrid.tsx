import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ChangeEvent, MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem, ClothingSlot, SlotSelection } from '../../../types';
import { SLOT_CONFIGS } from '../../../types';
import { getValidSlotsForItem } from '../photoshootStudio.types';

interface StudioClosetGridProps {
  itemVariants: Variants;
  filteredCloset: ClothingItem[];
  slotSelections: Map<ClothingSlot, SlotSelection>;
  activeSlotPicker: string | null;
  setActiveSlotPicker: (itemId: string | null) => void;
  isItemSelected: (itemId: string) => boolean;
  isUploadingQuickItem: boolean;
  quickItemInputRef: MutableRefObject<HTMLInputElement | null>;
  onQuickItemUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onItemClick: (item: ClothingItem) => void;
  onAddItemToSlot: (item: ClothingItem, slot: ClothingSlot) => void;
  onRemoveQuickItem: (itemId: string) => void;
}

export function StudioClosetGrid({
  itemVariants,
  filteredCloset,
  slotSelections,
  activeSlotPicker,
  setActiveSlotPicker,
  isItemSelected,
  isUploadingQuickItem,
  quickItemInputRef,
  onQuickItemUpload,
  onItemClick,
  onAddItemToSlot,
  onRemoveQuickItem,
}: StudioClosetGridProps) {
  return (
    <motion.section variants={itemVariants} className="mb-2">
      <input
        type="file"
        ref={quickItemInputRef}
        className="hidden"
        accept="image/*"
        onChange={onQuickItemUpload}
      />

      <div
        data-testid="studio-grid"
        className="grid w-full min-w-0 grid-cols-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] md:grid-cols-[repeat(4,minmax(0,1fr))] lg:grid-cols-[repeat(5,minmax(0,1fr))] xl:grid-cols-[repeat(6,minmax(0,1fr))] gap-1.5"
      >
        <button
          data-testid="studio-quick-card"
          onClick={() => quickItemInputRef.current?.click()}
          disabled={isUploadingQuickItem}
          className="w-full min-w-0 aspect-[3/4] rounded-xl border border-white/60 bg-white/40 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-white/60 flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none" />

          {isUploadingQuickItem ? (
            <div className="animate-spin w-6 h-6 border-2 border-[color:var(--studio-ink)] border-t-transparent rounded-full" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white/60 border border-white/80 flex items-center justify-center transition group-hover:scale-105 shadow-sm">
                <span className="material-symbols-rounded text-[color:var(--studio-ink)] text-xl">
                  add_photo_alternate
                </span>
              </div>
              <div className="text-center px-1">
                <p className="text-[10px] font-bold text-[color:var(--studio-ink)] leading-tight">
                  Quick
                  <br />
                  Try-On
                </p>
              </div>
            </>
          )}
        </button>

        {filteredCloset.length === 0 ? (
          <div className="col-span-2 sm:col-span-3 rounded-2xl border border-white/60 bg-white/40 p-6 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-[color:var(--studio-ink-muted)]">No hay prendas en esta sección.</p>
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                toast('Próximamente: Cargar ropa de demo 🚧', { icon: '👕' });
              }}
              className="px-4 py-2 rounded-lg bg-white/50 border border-[color:var(--studio-ink)]/10 text-xs font-medium text-[color:var(--studio-ink)] hover:bg-white transition"
            >
              Probar con Ropa de Ejemplo
            </button>
          </div>
        ) : (
          filteredCloset.map((item) => {
            const isSelected = isItemSelected(item.id);
            const validSlots = getValidSlotsForItem(item);
            const showSlotPicker = activeSlotPicker === item.id;
            const isQuickItem = item.status === 'quick';

            return (
              <motion.div variants={itemVariants} key={item.id} className="relative min-w-0">
                <button
                  data-testid="studio-item-card"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(5);
                    onItemClick(item);
                  }}
                  className={`w-full min-w-0 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 relative group ${isSelected
                      ? 'border-[color:var(--studio-ink)] ring-2 ring-[color:var(--studio-ink)]/15 scale-[0.93] shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]'
                      : isQuickItem
                        ? 'border-purple-300 hover:border-purple-400 hover:scale-105 active:scale-95'
                        : 'border-transparent hover:border-white/80 hover:scale-[1.02] active:scale-95'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-[color:var(--studio-ink)]/8 z-10 pointer-events-none" />
                  )}
                  {item.imageDataUrl ? (
                    <img
                      src={item.imageDataUrl}
                      alt={item.metadata?.subcategory || 'Prenda'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-2xl">image_not_supported</span>
                      <span className="text-xs mt-1">{item.metadata?.subcategory || 'Sin imagen'}</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-[color:var(--studio-ink)] to-[color:var(--studio-rose)] text-white flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    </div>
                  )}
                  {isQuickItem && !isSelected && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[8px] font-bold">
                      QUICK
                    </div>
                  )}
                </button>

                {isQuickItem && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveQuickItem(item.id);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white
                               flex items-center justify-center text-xs shadow-md hover:bg-red-600 z-10"
                  >
                    ×
                  </button>
                )}

                {showSlotPicker && validSlots.length > 1 && (
                  <div className="absolute bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1 left-0 right-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2">
                    <p className="text-xs uppercase text-gray-500 mb-1 px-1">Elegir slot:</p>
                    {validSlots.map((slot) => {
                      const config = SLOT_CONFIGS.find((slotConfig) => slotConfig.id === slot);
                      const isOccupied = slotSelections.has(slot);

                      return (
                        <button
                          key={slot}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(5);
                            onAddItemToSlot(item, slot);
                            setActiveSlotPicker(null);
                          }}
                          disabled={isOccupied}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 ${isOccupied ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'
                            }`}
                        >
                          <span className="material-symbols-outlined text-sm">{config?.icon}</span>
                          {config?.label}
                          {isOccupied && ' (ocupado)'}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setActiveSlotPicker(null)}
                      className="w-full text-center text-xs text-gray-500 mt-1 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.section>
  );
}
