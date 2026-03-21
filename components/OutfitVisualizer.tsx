import React from 'react';
import type { ClothingItem } from '../types';
import { getPreferredClothingImage } from '../src/utils/closetImages';

interface OutfitVisualizerProps {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
}

export const OutfitVisualizer = ({ top, bottom, shoes }: OutfitVisualizerProps) => {
    return (
        <div className="grid grid-cols-2 gap-3 mb-4">
            <img
                src={getPreferredClothingImage(top)}
                alt={top.metadata.subcategory}
                className="aspect-square object-cover rounded-xl shadow-sm"
            />
            <img
                src={getPreferredClothingImage(bottom)}
                alt={bottom.metadata.subcategory}
                className="aspect-square object-cover rounded-xl shadow-sm"
            />
            <div className="col-span-2">
                <img
                    src={getPreferredClothingImage(shoes)}
                    alt={shoes.metadata.subcategory}
                    className="aspect-[2/1] w-full object-cover rounded-xl shadow-sm"
                />
            </div>
        </div>
    );
};
