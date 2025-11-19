import React from 'react';
import type { ClothingItem, FitResult, SavedOutfit } from '../types';
import Loader from './Loader';

interface ItemOutfitsResultViewProps {
  currentItem: ClothingItem;
  results: FitResult[] | null;
  isLoading: boolean;
  error: string | null;
  inventory: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onSaveOutfit: (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => void;
  onBack: () => void;
}

const ItemOutfitsResultView = ({ currentItem, results, isLoading, error, inventory, savedOutfits, onSaveOutfit, onBack }: ItemOutfitsResultViewProps) => {

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex flex-col items-center justify-center h-full"><Loader /><p className="mt-4 dark:text-gray-300">Creando looks...</p></div>;
    }
    if (error) {
      return <div className="flex flex-col items-center justify-center h-full text-center p-4"><p className="text-red-500">{error}</p></div>;
    }
    if (!results || results.length === 0) {
      return <div className="flex flex-col items-center justify-center h-full text-center p-4"><p className="dark:text-gray-300">No se pudieron generar outfits con esta prenda.</p></div>;
    }

    return (
      <div className="space-y-6">
        {results.map((outfit, index) => {
          const top = inventory.find(i => i.id === outfit.top_id);
          const bottom = inventory.find(i => i.id === outfit.bottom_id);
          const shoes = inventory.find(i => i.id === outfit.shoes_id);

          if (!top || !bottom || !shoes) return null;

          const isSaved = savedOutfits.some(o => o.top_id === outfit.top_id && o.bottom_id === outfit.bottom_id && o.shoes_id === outfit.shoes_id);
          const outfitToSave = { top_id: outfit.top_id, bottom_id: outfit.bottom_id, shoes_id: outfit.shoes_id, explanation: outfit.explanation };
          
          return (
            <div key={index} className="liquid-glass p-4 rounded-2xl">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <img src={top.imageDataUrl} alt={top.metadata.subcategory} className="aspect-square w-full object-cover rounded-lg" />
                <img src={bottom.imageDataUrl} alt={bottom.metadata.subcategory} className="aspect-square w-full object-cover rounded-lg" />
                <img src={shoes.imageDataUrl} alt={shoes.metadata.subcategory} className="aspect-square w-full object-cover rounded-lg" />
              </div>
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">{outfit.explanation}</p>
              <button 
                onClick={() => onSaveOutfit(outfitToSave)} 
                disabled={isSaved}
                className="w-full text-sm font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300 disabled:bg-gray-200 disabled:text-gray-500"
              >
                <span className="material-symbols-outlined text-base">{isSaved ? 'favorite' : 'favorite_border'}</span>
                {isSaved ? 'Guardado' : 'Guardar Outfit'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-lg bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:p-4">
        <header className="flex items-center justify-between pb-4">
          <button onClick={onBack} className="p-2 dark:text-gray-200">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Outfits con tu Prenda</h1>
          <div className="w-10"></div>
        </header>

        <div className="flex-grow overflow-y-auto">
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-4 liquid-glass">
            <img src={currentItem.imageDataUrl} alt={currentItem.metadata.subcategory} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
            <div>
              <p className="text-text-secondary dark:text-gray-400">Creando looks con:</p>
              <h2 className="font-bold text-lg capitalize text-text-primary dark:text-gray-200">{currentItem.metadata.subcategory}</h2>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ItemOutfitsResultView;
