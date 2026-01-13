import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ClothingItem, ClothingItemMetadata, GroundingChunk } from '../types';
import { findSimilarItems, searchProductsForItem } from '../src/services/aiService';
import { buildSearchTermFromItem, getShoppingLinks } from '../src/services/monetizationService';
// FIX: The Loader component is now correctly created and exported, resolving the 'not a module' error.
import Loader from './Loader';
import { Card } from './ui/Card';
import { SwipeableModal } from '../src/components/ui/SwipeableModal';
import { PremiumAnalysisCard } from './PremiumAnalysisCard';
import { useToast } from '../hooks/useToast';

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
    const toast = useToast();

    // Shopping state
    const [showShopping, setShowShopping] = useState(false);
    const [shoppingLinks, setShoppingLinks] = useState<GroundingChunk[]>([]);
    const [isLoadingShopping, setIsLoadingShopping] = useState(false);

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
                toast.error('No se pudieron cargar prendas similares');
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

    const handleSearchShopping = async () => {
        if (showShopping && shoppingLinks.length > 0) {
            // Toggle off if already showing
            setShowShopping(false);
            return;
        }

        setShowShopping(true);

        // Skip if already loaded
        if (shoppingLinks.length > 0) return;

        setIsLoadingShopping(true);
        try {
            const searchTerm = buildSearchTermFromItem(item);
            const links = await searchProductsForItem(searchTerm, item.metadata.category);
            setShoppingLinks(links);
        } catch (error) {
            console.error('Error searching shopping:', error);
            toast.error('No se pudieron cargar sugerencias de compra');
            setShoppingLinks([]);
        } finally {
            setIsLoadingShopping(false);
        }
    };

    return (
        <SwipeableModal
            isOpen={true}
            onClose={onBack}
            title={isEditing ? 'Editar Prenda' : item.metadata.subcategory}
            headerActions={
                <div className="flex items-center gap-2">
                    <button onClick={() => onShareItem(item)} className="p-2 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined">share</span>
                    </button>
                    <button onClick={() => setIsEditing(!isEditing)} className="p-2 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined">{isEditing ? 'close' : 'edit'}</span>
                    </button>
                </div>
            }
            footer={
                isEditing ? (
                    <div className="flex gap-3">
                        <button onClick={() => onDelete(item.id)} className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">delete</span>
                        </button>
                        <button onClick={handleSave} className="flex-grow bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
                            Guardar Cambios
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <button onClick={() => onGenerateOutfitWithItem(item)} className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
                            Crear Outfit con esta Prenda
                        </button>
                        {onStartBrandRecognition && (
                            <button
                                onClick={() => onStartBrandRecognition(item)}
                                className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary dark:text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <span className="material-symbols-outlined">label</span>
                                Detectar Marca y Precio
                            </button>
                        )}
                        {onStartDupeFinder && (
                            <button
                                onClick={() => onStartDupeFinder(item)}
                                className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary dark:text-primary font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <span className="material-symbols-outlined">shopping_bag</span>
                                Buscar Dupes
                            </button>
                        )}

                        {/* Shopping Button */}
                        <button
                            onClick={handleSearchShopping}
                            className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 ${
                                showShopping
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30'
                                    : 'bg-white dark:bg-gray-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span className="material-symbols-outlined">storefront</span>
                            {showShopping ? 'Ocultar' : 'Dónde lo compro'}
                        </button>

                        {/* Shopping Results */}
                        {showShopping && (
                            <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 space-y-4 animate-fade-in border border-emerald-500/20">
                                {/* Quick Links */}
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-text-secondary dark:text-gray-400">Buscar en:</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {getShoppingLinks(buildSearchTermFromItem(item)).map((link) => (
                                            <a
                                                key={link.platform}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-3 px-2 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-emerald-500/10 transition-all text-center border border-white/20 dark:border-white/10"
                                            >
                                                <span className="material-symbols-outlined text-xl block mb-1">{link.icon}</span>
                                                <span className="text-xs font-medium block truncate">{link.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Results */}
                                <div className="border-t border-white/20 dark:border-white/10 pt-3">
                                    <p className="text-sm font-semibold text-text-secondary dark:text-gray-400 mb-2">Resultados AI:</p>

                                    {isLoadingShopping && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader />
                                        </div>
                                    )}

                                    {!isLoadingShopping && shoppingLinks.length > 0 && (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {shoppingLinks.slice(0, 6).map((link, index) => (
                                                <a
                                                    href={link.web.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    key={index}
                                                    className="block bg-white/50 dark:bg-black/20 p-3 rounded-xl text-sm hover:bg-white/80 dark:hover:bg-black/40 transition-all border border-white/20 dark:border-white/10"
                                                >
                                                    <p className="font-semibold text-text-primary dark:text-gray-200 truncate">{link.web.title}</p>
                                                    <p className="text-text-secondary dark:text-gray-400 truncate text-xs mt-1">{new URL(link.web.uri).hostname}</p>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {!isLoadingShopping && shoppingLinks.length === 0 && (
                                        <p className="text-sm text-text-secondary dark:text-gray-500 text-center py-4">
                                            Usa los links de arriba para buscar
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        >
            <div className="space-y-6">
                <Card variant="glass" padding="none" rounded="3xl" className="aspect-[4/5] w-full overflow-hidden shadow-md relative group">
                    <img src={item.imageDataUrl} alt={item.metadata.subcategory} className="w-full h-full object-cover" />

                    {/* Fashion Score Badge Overlay */}
                    {item.metadata.fashion_score && (
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-1.5 flex items-center gap-2">
                            <span className="text-xs font-bold text-white/80 uppercase">Score</span>
                            <span className="text-xl font-black text-white">{item.metadata.fashion_score}</span>
                        </div>
                    )}
                </Card>

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Subcategoría</label>
                            <input type="text" value={editableMetadata.subcategory} onChange={e => updateMetadataField('subcategory', e.target.value)} className="w-full p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Subcategory" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Color</label>
                            <input type="text" value={editableMetadata.color_primary} onChange={e => updateMetadataField('color_primary', e.target.value)} className="w-full p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Color" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cuello</label>
                                <input type="text" value={editableMetadata.neckline || ''} onChange={e => updateMetadataField('neckline', e.target.value)} className="w-full p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Tipo de cuello" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Manga</label>
                                <input type="text" value={editableMetadata.sleeve_type || ''} onChange={e => updateMetadataField('sleeve_type', e.target.value)} className="w-full p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Tipo de manga" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold capitalize dark:text-gray-200">{item.metadata.subcategory}</h2>
                            <div className="flex items-center justify-center gap-2 text-text-secondary dark:text-gray-400 capitalize">
                                <span>{item.metadata.color_primary}</span>
                                {(item.metadata.neckline || item.metadata.sleeve_type) && (
                                    <>
                                        <span>&middot;</span>
                                        {item.metadata.neckline && <span>{item.metadata.neckline}</span>}
                                        {item.metadata.neckline && item.metadata.sleeve_type && <span>&middot;</span>}
                                        {item.metadata.sleeve_type && <span>{item.metadata.sleeve_type}</span>}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {item.metadata.vibe_tags.map(tag => <span key={tag} className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700">#{tag}</span>)}
                            {item.metadata.occasion_tags?.map(tag => <span key={tag} className="bg-primary/5 text-primary dark:text-primary-light px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20">{tag}</span>)}
                            {item.metadata.seasons.map(season => <span key={season} className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800">{season}</span>)}
                        </div>

                        {/* Premium Analysis Section */}
                        <PremiumAnalysisCard metadata={item.metadata} />
                    </div>
                )}

                {similarItems.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-lg mb-4 dark:text-gray-200">Prendas Similares</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {similarItems.slice(0, 3).map(simItem => (
                                <button key={simItem.id} onClick={() => onSelectItem(simItem.id)} className="aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800">
                                    <img src={simItem.imageDataUrl} alt={simItem.metadata.subcategory} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {isLoadingSimilar && <div className="flex justify-center py-4"><Loader /></div>}
            </div>
        </SwipeableModal>
    );
};

export default ItemDetailView;