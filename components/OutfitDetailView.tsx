// FIX: Create component to resolve 'not a module' error.
import React from 'react';
import type { SavedOutfit, ClothingItem } from '../types';
import { Card } from './ui/Card';
import { OutfitVisualizer } from './OutfitVisualizer';
import ShopTheLookPanel from './ShopTheLookPanel';
import { useToast } from '../hooks/useToast';

interface OutfitDetailViewProps {
    outfit: SavedOutfit;
    inventory: ClothingItem[];
    onBack: () => void;
    onDelete: (id: string) => void;
    // FIX: Add onShareOutfit prop to handle sharing functionality.
    onShareOutfit: (outfit: SavedOutfit) => void;
    onPublishToTimeline?: (
        outfit: SavedOutfit,
        bundle: { top?: ClothingItem; bottom?: ClothingItem; shoes?: ClothingItem },
        visibility: 'friends' | 'community'
    ) => Promise<void> | void;
    onOpenShopLook?: () => void;
}

const OutfitDetailView = ({ outfit, inventory, onBack, onDelete, onShareOutfit, onPublishToTimeline, onOpenShopLook }: OutfitDetailViewProps) => {
    const toast = useToast();
    const [timelineVisibility, setTimelineVisibility] = React.useState<'friends' | 'community'>('friends');
    const [isPublishingTimeline, setIsPublishingTimeline] = React.useState(false);
    const top = inventory.find(i => i.id === outfit.top_id);
    const bottom = inventory.find(i => i.id === outfit.bottom_id);
    const shoes = inventory.find(i => i.id === outfit.shoes_id);
    const shopItems = [
        top ? { slot: 'top', item: top } : null,
        bottom ? { slot: 'bottom', item: bottom } : null,
        shoes ? { slot: 'shoes', item: shoes } : null,
    ].filter(Boolean) as { slot: string; item: ClothingItem }[];

    const handlePublishTimeline = async () => {
        if (!onPublishToTimeline) return;
        setIsPublishingTimeline(true);
        try {
            await onPublishToTimeline(
                outfit,
                { top: top || undefined, bottom: bottom || undefined, shoes: shoes || undefined },
                timelineVisibility
            );
            toast.success('Outfit publicado en timeline');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo publicar');
        } finally {
            setIsPublishingTimeline(false);
        }
    };

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

                    {onPublishToTimeline && (
                        <Card variant="glass" padding="md" rounded="2xl" className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-base">dynamic_feed</span>
                                <h3 className="font-semibold text-text-primary dark:text-gray-200">Compartir en timeline</h3>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={timelineVisibility}
                                    onChange={(event) => setTimelineVisibility(event.target.value as 'friends' | 'community')}
                                    className="flex-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                >
                                    <option value="friends">Solo amigos</option>
                                    <option value="community">Comunidad</option>
                                </select>
                                <button
                                    onClick={handlePublishTimeline}
                                    disabled={isPublishingTimeline}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-60"
                                >
                                    {isPublishingTimeline ? 'Publicando...' : 'Publicar'}
                                </button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OutfitDetailView;
