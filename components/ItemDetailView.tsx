import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import { findSimilarItems } from '../src/services/aiService';
// FIX: The Loader component is now correctly created and exported, resolving the 'not a module' error.
import Loader from './Loader';
import { Card } from './ui/Card';

interface ItemDetailViewProps {
    item: ClothingItem;
    inventory: ClothingItem[];
    onUpdate: (id: string, metadata: ClothingItemMetadata) => void;
    onDelete: (id: string) => void;
    onBack: () => void;
    onGenerateOutfitWithItem: (item: ClothingItem) => void;
    onSelectItem: (id: string) => void;
    onShareItem: (item: ClothingItem) => void;
    onStartBrandRecognition?: (item: ClothingItem) => void;
    onStartDupeFinder?: (item: ClothingItem) => void;
}

export const ItemDetailView = ({ item, inventory, onUpdate, onDelete, onBack, onGenerateOutfitWithItem, onSelectItem, onShareItem, onStartBrandRecognition, onStartDupeFinder }: ItemDetailViewProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableMetadata, setEditableMetadata] = useState(item.metadata);
    const [similarItems, setSimilarItems] = useState<ClothingItem[]>([]);
    const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);

    useEffect(() => {
        setEditableMetadata(item.metadata);
        setIsEditing(false);
        const fetchSimilar = async () => {
            setIsLoadingSimilar(true);
            try {
                const similarIds = await findSimilarItems(item, inventory);
                const items = inventory.filter(i => similarIds.includes(i.id));
                setSimilarItems(items);
            } catch (error) {
                console.error('Error finding similar items:', error);
                setSimilarItems([]);
            }
            setIsLoadingSimilar(false);
        };
        fetchSimilar();
    }, [item, inventory]);

    const handleSave = () => {
        onUpdate(item.id, editableMetadata);
        setIsEditing(false);
    };

    const updateMetadataField = <K extends keyof ClothingItemMetadata>(field: K, value: ClothingItemMetadata[K]) => {
        setEditableMetadata({ ...editableMetadata, [field]: value });
    };

    return (
        <div className="fixed inset-0 z-20 animate-fade-in">
            <div onClick={onBack} className="absolute inset-0 bg-black/30 backdrop-blur-sm hidden md:block" />

            <motion.div
                layoutId={`item-${item.id}`}
                className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl flex flex-col md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-sm md:border-l md:border-white/20 animate-scale-in md:animate-slide-in-right"
            >
                <header className="p-4 flex items-center justify-between">
                    <button onClick={onBack} className="p-2 dark:text-gray-200">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onShareItem(item)} className="p-2 dark:text-gray-200">
                            <span className="material-symbols-outlined">share</span>
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className="p-2 dark:text-gray-200">
                            <span className="material-symbols-outlined">{isEditing ? 'close' : 'edit'}</span>
                        </button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto px-4 pb-24">
                    <Card variant="glass" padding="none" rounded="3xl" className="aspect-[4/5] w-full overflow-hidden mb-4">
                        <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-full h-full object-cover" />
                    </Card>

                    {isEditing ? (
                        <div className="space-y-2">
                            <input type="text" value={editableMetadata.subcategory} onChange={e => updateMetadataField('subcategory', e.target.value)} className="w-full p-2 border dark:border-gray-600 bg-transparent rounded dark:text-white" placeholder="Subcategory" />
                            <input type="text" value={editableMetadata.color_primary} onChange={e => updateMetadataField('color_primary', e.target.value)} className="w-full p-2 border dark:border-gray-600 bg-transparent rounded dark:text-white" placeholder="Color" />
                            <input type="text" value={editableMetadata.neckline || ''} onChange={e => updateMetadataField('neckline', e.target.value)} className="w-full p-2 border dark:border-gray-600 bg-transparent rounded dark:text-white" placeholder="Tipo de cuello" />
                            <input type="text" value={editableMetadata.sleeve_type || ''} onChange={e => updateMetadataField('sleeve_type', e.target.value)} className="w-full p-2 border dark:border-gray-600 bg-transparent rounded dark:text-white" placeholder="Tipo de manga" />
                        </div>
                    ) : (
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold capitalize dark:text-gray-200">{item.metadata.subcategory}</h2>
                            <p className="text-text-secondary dark:text-gray-400 capitalize">{item.metadata.color_primary}</p>
                            {(item.metadata.neckline || item.metadata.sleeve_type) && (
                                <p className="text-text-secondary dark:text-gray-400 text-sm capitalize mt-1">
                                    {item.metadata.neckline && <span>{item.metadata.neckline}</span>}
                                    {item.metadata.neckline && item.metadata.sleeve_type && <span> &middot; </span>}
                                    {item.metadata.sleeve_type && <span>{item.metadata.sleeve_type}</span>}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {item.metadata.vibe_tags.map(tag => <span key={tag} className="bg-gray-200 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm">{tag}</span>)}
                        {item.metadata.seasons.map(season => <span key={season} className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1 rounded-full text-sm">{season}</span>)}
                    </div>

                    {similarItems.length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-2 dark:text-gray-200">Similar Items</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {similarItems.slice(0, 3).map(simItem => (
                                    <button key={simItem.id} onClick={() => onSelectItem(simItem.id)} className="aspect-square rounded-xl overflow-hidden">
                                        <img src={simItem.imageDataUrl} alt={simItem.metadata.subcategory} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {isLoadingSimilar && <div className="flex justify-center"><Loader /></div>}

                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/90 to-transparent dark:from-background-dark/90">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button onClick={() => onDelete(item.id)} className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete</span>
                            </button>
                            <button onClick={handleSave} className="flex-grow bg-primary text-white font-bold rounded-2xl">
                                Guardar Cambios
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <button onClick={() => onGenerateOutfitWithItem(item)} className="w-full bg-primary text-white font-bold py-4 rounded-2xl">
                                Crear Outfit con esta Prenda
                            </button>
                            {onStartBrandRecognition && (
                                <button
                                    onClick={() => onStartBrandRecognition(item)}
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary dark:text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">label</span>
                                    Detectar Marca y Precio
                                </button>
                            )}
                            {onStartDupeFinder && (
                                <button
                                    onClick={() => onStartDupeFinder(item)}
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary dark:text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">shopping_bag</span>
                                    Buscar Dupes
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div >
    );
};

export default ItemDetailView;