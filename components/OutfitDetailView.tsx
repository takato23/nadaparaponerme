// FIX: Create component to resolve 'not a module' error.
import React from 'react';
import type { SavedOutfit, ClothingItem } from '../types';
import { Card } from './ui/Card';

interface OutfitDetailViewProps {
  outfit: SavedOutfit;
  inventory: ClothingItem[];
  onBack: () => void;
  onDelete: (id: string) => void;
  // FIX: Add onShareOutfit prop to handle sharing functionality.
  onShareOutfit: (outfit: SavedOutfit) => void;
}

const OutfitDetailView = ({ outfit, inventory, onBack, onDelete, onShareOutfit }: OutfitDetailViewProps) => {
  const top = inventory.find(i => i.id === outfit.top_id);
  const bottom = inventory.find(i => i.id === outfit.bottom_id);
  const shoes = inventory.find(i => i.id === outfit.shoes_id);

  if (!top || !bottom || !shoes) {
    return (
        <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20 flex flex-col p-4 items-center justify-center">
            <p className="dark:text-gray-200">Error: No se encontraron las prendas del outfit.</p>
            <button onClick={onBack} className="mt-4 bg-primary text-white px-4 py-2 rounded-lg">Volver</button>
        </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-20 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
       <div className="contents md:block md:relative md:w-full md:max-w-lg bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:p-4">
        <header className="flex items-center justify-between pb-4">
            <button onClick={onBack} className="p-2 dark:text-gray-200">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            {/* FIX: Add share and delete buttons. */}
            <div className="flex items-center gap-2">
                 <button onClick={() => onShareOutfit(outfit)} className="p-2 dark:text-gray-200">
                    <span className="material-symbols-outlined">share</span>
                </button>
                 <button onClick={() => onDelete(outfit.id)} className="p-2">
                    <span className="material-symbols-outlined text-red-500">delete</span>
                </button>
            </div>
        </header>
        
        <div className="flex-grow overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 mb-4">
                <img src={top.imageDataUrl} className="aspect-square object-cover rounded-xl" />
                <img src={bottom.imageDataUrl} className="aspect-square object-cover rounded-xl" />
                <div className="col-span-2">
                    <img src={shoes.imageDataUrl} className="aspect-[2/1] w-full object-cover rounded-xl" />
                </div>
            </div>

            <Card variant="glass" padding="md" rounded="2xl">
                <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Explicación del Estilista:</h3>
                <p className="text-text-secondary dark:text-gray-400 text-sm">{outfit.explanation}</p>
            </Card>
        </div>
       </div>
    </div>
  );
};

export default OutfitDetailView;