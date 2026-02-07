
import React, { useState } from 'react';
import type { FitResult, ClothingItem, SavedOutfit, GroundingChunk, ItemShoppingState } from '../types';
import { searchShoppingSuggestions, searchProductsForItem } from '../src/services/aiService';
import { buildSearchTermFromItem, getShoppingLinks, getSponsoredPlacements, trackSponsorClick } from '../src/services/monetizationService';
import Loader from './Loader';
import { Card } from './ui/Card';
import ShopTheLookPanel from './ShopTheLookPanel';

interface FitResultViewProps {
  result: FitResult;
  inventory: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onSaveOutfit: (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => void;
  onVirtualTryOn: () => void;
  onShareOutfit: (outfit: FitResult) => void;
  borrowedItemIds: Set<string>;
  onOpenShopLook?: () => void;
  onBack: () => void;
}

type OutfitSlot = 'top' | 'bottom' | 'shoes';

const FitResultView = ({ result, inventory, savedOutfits, onSaveOutfit, onVirtualTryOn, onShareOutfit, borrowedItemIds, onOpenShopLook, onBack }: FitResultViewProps) => {
  const top = inventory.find(i => i.id === result.top_id);
  const bottom = inventory.find(i => i.id === result.bottom_id);
  const shoes = inventory.find(i => i.id === result.shoes_id);
  const shopItems = [
    top ? { slot: 'top', item: top } : null,
    bottom ? { slot: 'bottom', item: bottom } : null,
    shoes ? { slot: 'shoes', item: shoes } : null,
  ].filter(Boolean) as { slot: string; item: ClothingItem }[];

  // Missing piece shopping state (existing)
  const [shoppingLinks, setShoppingLinks] = useState<GroundingChunk[]>([]);
  const [isSearchingLinks, setIsSearchingLinks] = useState(false);

  // Per-item shopping state (NEW)
  const [itemShopping, setItemShopping] = useState<Record<OutfitSlot, ItemShoppingState>>({
    top: { isLoading: false, links: [] },
    bottom: { isLoading: false, links: [] },
    shoes: { isLoading: false, links: [] }
  });
  const [expandedItem, setExpandedItem] = useState<OutfitSlot | null>(null);

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

  // NEW: Search shopping for a specific outfit item
  const handleSearchForItem = async (slot: OutfitSlot, item: ClothingItem) => {
    // Toggle expansion
    if (expandedItem === slot) {
      setExpandedItem(null);
      return;
    }

    setExpandedItem(slot);

    // Skip if already loaded
    if (itemShopping[slot].links.length > 0) return;

    // Set loading state
    setItemShopping(prev => ({
      ...prev,
      [slot]: { ...prev[slot], isLoading: true, error: undefined }
    }));

    try {
      const searchTerm = buildSearchTermFromItem(item);
      const links = await searchProductsForItem(searchTerm, item.metadata.category);

      setItemShopping(prev => ({
        ...prev,
        [slot]: { isLoading: false, links }
      }));
    } catch (error) {
      setItemShopping(prev => ({
        ...prev,
        [slot]: { isLoading: false, links: [], error: 'Error al buscar' }
      }));
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

  // Item card with shopping button
  const ItemCard = ({ item, slot }: { item: ClothingItem; slot: OutfitSlot }) => {
    const shopping = itemShopping[slot];
    const isExpanded = expandedItem === slot;
    const searchTerm = buildSearchTermFromItem(item);
    const quickLinks = getShoppingLinks(searchTerm);
    const placements = getSponsoredPlacements(searchTerm, item);

    return (
      <div className="space-y-2">
        <Card variant="glass" padding="none" rounded="2xl" className="relative aspect-square overflow-hidden">
          <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-full h-full object-cover" />
          {borrowedItemIds.has(item.id) && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-primary/80 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">group</span>
            </div>
          )}
        </Card>

        {/* Shopping Button */}
        <button
          onClick={() => handleSearchForItem(slot, item)}
          className={`w-full py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${isExpanded
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-white/50 dark:bg-white/10 text-text-secondary dark:text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-600'
            }`}
        >
          <span className="material-symbols-outlined text-lg">shopping_bag</span>
          {isExpanded ? 'Ocultar' : 'Dónde lo compro'}
        </button>

        {/* Expanded Shopping Results */}
        {isExpanded && (
          <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3 space-y-3 animate-fade-in">
            {placements.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Patrocinado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {placements.map((placement) => (
                    <a
                      key={placement.id}
                      href={placement.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSponsorClick(placement.id, 'fit_result', { itemCategory: item.metadata.category, searchTerm })}
                      className="p-3 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-emerald-500/10 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 text-lg">
                          {placement.icon}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-text-primary dark:text-gray-200">
                            {placement.name}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400">
                            {placement.description}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-emerald-600 mt-2">{placement.cta}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links - Direct search URLs */}
            {quickLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary dark:text-gray-500 font-medium">Buscar en:</p>
                <div className="flex gap-2">
                  {quickLinks.map((link) => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-emerald-500/10 transition-all text-center"
                    >
                      <span className="material-symbols-outlined text-lg block mb-1">{link.icon}</span>
                      <span className="text-xs font-medium">{link.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI Search Results */}
            <div className="border-t border-white/20 dark:border-white/10 pt-3">
              <p className="text-xs text-text-secondary dark:text-gray-500 font-medium mb-2">Resultados AI:</p>

              {shopping.isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader />
                </div>
              )}

              {shopping.error && (
                <p className="text-xs text-red-500 text-center py-2">{shopping.error}</p>
              )}

              {!shopping.isLoading && shopping.links.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {shopping.links.slice(0, 5).map((link, index) => (
                    <a
                      href={link.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={index}
                      className="block bg-white/50 dark:bg-black/20 p-2 rounded-lg text-xs hover:bg-white/80 dark:hover:bg-black/40 transition-all"
                    >
                      <p className="font-semibold text-text-primary dark:text-gray-200 truncate">{link.web.title}</p>
                      <p className="text-text-secondary dark:text-gray-400 truncate">{new URL(link.web.uri).hostname}</p>
                    </a>
                  ))}
                </div>
              )}

              {!shopping.isLoading && shopping.links.length === 0 && !shopping.error && (
                <p className="text-xs text-text-secondary dark:text-gray-500 text-center py-2">
                  Usa los links de arriba para buscar
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


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
            <ItemCard item={top} slot="top" />
            <ItemCard item={bottom} slot="bottom" />
            <div className="col-span-2">
              <ItemCard item={shoes} slot="shoes" />
            </div>
          </div>

          <Card variant="glass" padding="md" rounded="2xl" className="mb-4">
            <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Explicación del Estilista:</h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm">{result.explanation}</p>
          </Card>

          {shopItems.length > 0 && (
            <div className="mb-4">
              <ShopTheLookPanel
                items={shopItems}
                borrowedItemIds={borrowedItemIds}
                onOpenFinder={onOpenShopLook}
                showItems={false}
              />
            </div>
          )}

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
                {isSearchingLinks ? <Loader /> : <span className="material-symbols-outlined">shopping_bag</span>}
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
