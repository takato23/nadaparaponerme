import React from 'react';
import type { ClothingItem } from '../types';

interface OutfitVisualizerProps {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
}

export const OutfitVisualizer = ({ top, bottom, shoes }: OutfitVisualizerProps) => {
    return (
        <div className="grid grid-cols-2 gap-3 mb-4">
            <img
                src={top.imageDataUrl}
                alt={top.metadata.subcategory}
                className="aspect-square object-cover rounded-xl shadow-sm"
            />
            <img
                src={bottom.imageDataUrl}
                alt={bottom.metadata.subcategory}
                className="aspect-square object-cover rounded-xl shadow-sm"
            />
            <div className="col-span-2">
                <img
                    src={shoes.imageDataUrl}
                    alt={shoes.metadata.subcategory}
                    className="aspect-[2/1] w-full object-cover rounded-xl shadow-sm"
                />
            </div>
        </div>
    );
};
