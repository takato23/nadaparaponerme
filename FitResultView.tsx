// FIX: Create component to resolve 'not a module' error.
import React from 'react';
import type { FitResult, ClothingItem, SavedOutfit } from '../types';

interface FitResultViewProps {
  result: FitResult;
  inventory: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onSaveOutfit: (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => void;
  onVirtualTryOn: () => void;
  onShareOutfit: (outfit: FitResult) => void;
  borrowedItemIds: Set<string>;
  onBack: () => void;
}

const FitResultView = ({ result, inventory, savedOutfits, onSaveOutfit, onVirtualTryOn, onShareOutfit, borrowedItemIds, onBack }: FitResultViewProps) => {
  const top = inventory.find(i => i.id === result.top_id);
  const bottom = inventory.find(i => i.id === result.bottom_id);
  const shoes = inventory.find(i => i.id === result.shoes_id);

  const isSaved = savedOutfits.some(o => o.top_id === result.top_id && o.bottom_id === result.bottom_id && o.shoes_id === result.shoes_id);
  
  if (!top || !bottom || !shoes) {
    return (
      <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 items-center justify-center">
        <p className="dark:text-gray-200">Error: No se encontraron las prendas del outfit.</p>
        <button onClick={onBack} className="mt-4 bg-primary text-white px-4 py-2 rounded-lg">Volver</button>
      </div>
    );
  }
  
  const outfitToSave = {
    top_id: result.top_id,
    bottom_id: result.bottom_id,
    shoes_id: result.shoes_id,
    explanation: result.explanation,
  };

  const ItemCard = ({ item }: { item: ClothingItem }) => (
    <div className="relative aspect-square rounded-2xl overflow-hidden liquid-glass">
        <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-full h-full object-cover"/>
        {borrowedItemIds.has(item.id) && (
             <div className="absolute top-2 right-2 w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">group</span>
            </div>
        )}
    </div>
  );


  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-lg bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:p-4">
      <header className="flex items-center justify-between pb-4">
        <button onClick={onBack} className="p-2 dark:text-gray-200">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Tu Outfit</h1>
        <button onClick={() => onShareOutfit(result)} className="p-2 dark:text-gray-200">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ItemCard item={top} />
          <ItemCard item={bottom} />
          <div className="col-span-2">
            <ItemCard item={shoes} />
          </div>
        </div>

        <div className="liquid-glass p-4 rounded-2xl mb-4">
            <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Explicación del Estilista:</h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm">{result.explanation}</p>
        </div>
        
        {result.missing_piece_suggestion && (
          <div className="border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl mb-4">
            <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">lightbulb</span>
                Pieza Faltante Sugerida
            </h3>
            <p className="font-semibold text-text-primary dark:text-gray-200">{result.missing_piece_suggestion.item_name}</p>
            <p className="text-text-secondary dark:text-gray-400 text-sm">{result.missing_piece_suggestion.reason}</p>
          </div>
        )}
      </div>
      
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSaveOutfit(outfitToSave)} disabled={isSaved} className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center disabled:opacity-50">
            <span className={`material-symbols-outlined text-3xl ${isSaved ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                {isSaved ? 'favorite' : 'favorite_border'}
            </span>
        </button>
        <button onClick={onVirtualTryOn} className="flex-grow bg-primary text-white font-bold rounded-2xl">
          Probador Virtual
        </button>
      </div>
      </div>
    </div>
  );
};

export default FitResultView;