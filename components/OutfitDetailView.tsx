// FIX: Create component to resolve 'not a module' error.
import React from 'react';
import type { SavedOutfit, ClothingItem } from '../types';
import { Card } from './ui/Card';
import { OutfitVisualizer } from './OutfitVisualizer';
import ShopTheLookPanel from './ShopTheLookPanel';

interface OutfitDetailViewProps {
    outfit: SavedOutfit;
    inventory: ClothingItem[];
    onBack: () => void;
    onDelete: (id: string) => void;
    // FIX: Add onShareOutfit prop to handle sharing functionality.
    onShareOutfit: (outfit: SavedOutfit) => void;
    onOpenShopLook?: () => void;
}

const OutfitDetailView = ({ outfit, inventory, onBack, onDelete, onShareOutfit, onOpenShopLook }: OutfitDetailViewProps) => {
    const top = inventory.find(i => i.id === outfit.top_id);
    const bottom = inventory.find(i => i.id === outfit.bottom_id);
    const shoes = inventory.find(i => i.id === outfit.shoes_id);
    const shopItems = [
        top ? { slot: 'top', item: top } : null,
        bottom ? { slot: 'bottom', item: bottom } : null,
        shoes ? { slot: 'shoes', item: shoes } : null,
    ].filter(Boolean) as { slot: string; item: ClothingItem }[];

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
                    <OutfitVisualizer top={top} bottom={bottom} shoes={shoes} />

                    <Card variant="glass" padding="md" rounded="2xl">
                        <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Explicación del Estilista:</h3>
                        <p className="text-text-secondary dark:text-gray-400 text-sm">{outfit.explanation}</p>
                    </Card>

                    {shopItems.length > 0 && (
                        <div className="mt-4">
                            <ShopTheLookPanel
                                items={shopItems}
                                onOpenFinder={onOpenShopLook}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OutfitDetailView;
