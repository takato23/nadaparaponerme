
import React, { useState } from 'react';
import type { FitResult, ClothingItem, SavedOutfit, GroundingChunk } from '../types';
import { searchShoppingSuggestions } from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

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

  const [shoppingLinks, setShoppingLinks] = useState<GroundingChunk[]>([]);
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);

  const handleSearchLinks = async () => {
    if (!result.missing_piece_suggestion) return;
    setIsSearchingLinks(true);
    setShoppingLinks([]);
    try {
      const links = await searchShoppingSuggestions(result.missing_piece_suggestion.item_name);
      setShoppingLinks(links);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearchingLinks(false);
    }
  };

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
    <Card variant="glass" padding="none" rounded="2xl" className="relative aspect-square overflow-hidden">
        <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-full h-full object-cover"/>
        {borrowedItemIds.has(item.id) && (
             <div className="absolute top-2 right-2 w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">group</span>
            </div>
        )}
    </Card>
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

        <Card variant="glass" padding="md" rounded="2xl" className="mb-4">
            <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Explicación del Estilista:</h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm">{result.explanation}</p>
        </Card>
        
        {result.missing_piece_suggestion && (
          <div className="border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl mb-4">
            <h3 className="font-bold text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">lightbulb</span>
                Pieza Faltante Sugerida
            </h3>
            <p className="font-semibold text-text-primary dark:text-gray-200">{result.missing_piece_suggestion.item_name}</p>
            <p className="text-text-secondary dark:text-gray-400 text-sm mb-3">{result.missing_piece_suggestion.reason}</p>
            <button 
                onClick={handleSearchLinks} 
                disabled={isSearchingLinks}
                className="w-full bg-primary/20 text-primary dark:bg-primary/30 dark:text-teal-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
                {isSearchingLinks ? <Loader/> : <span className="material-symbols-outlined">shopping_bag</span>}
                Buscar Online
            </button>
            {shoppingLinks.length > 0 && (
                <div className="mt-3 space-y-2">
                    {shoppingLinks.map((link, index) => (
                        <a href={link.web.uri} target="_blank" rel="noopener noreferrer" key={index} className="block bg-white/50 dark:bg-black/20 p-2 rounded-md text-sm hover:bg-white/80 dark:hover:bg-black/40">
                            <p className="font-semibold text-text-primary dark:text-gray-200 truncate">{link.web.title}</p>
                            <p className="text-text-secondary dark:text-gray-400 truncate text-xs">{link.web.uri}</p>
                        </a>
                    ))}
                </div>
            )}
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