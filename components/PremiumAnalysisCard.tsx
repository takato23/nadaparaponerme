import React from 'react';
import type { ClothingItemMetadata } from '../types';

interface PremiumAnalysisCardProps {
    metadata: ClothingItemMetadata;
}

export const PremiumAnalysisCard: React.FC<PremiumAnalysisCardProps> = ({ metadata }) => {
    if (!metadata.styling_tips && !metadata.fabric_composition && !metadata.care_instructions) {
        return null;
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Stylist Tip */}
            {metadata.styling_tips && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="material-symbols-outlined text-6xl">auto_awesome</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <span className="material-symbols-outlined text-yellow-500">lightbulb</span>
                        <h3 className="font-bold text-gray-900 dark:text-white">Stylist Tip</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed relative z-10">
                        {metadata.styling_tips}
                    </p>
                </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
                {metadata.fabric_composition && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Material</div>
                        <div className="text-gray-900 dark:text-white font-medium text-sm">{metadata.fabric_composition}</div>
                    </div>
                )}
                {metadata.care_instructions && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Cuidado</div>
                        <div className="text-gray-900 dark:text-white font-medium text-sm">{metadata.care_instructions}</div>
                    </div>
                )}
            </div>

            {/* Color Palette */}
            {metadata.color_palette && metadata.color_palette.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Paleta</span>
                    <div className="flex gap-2">
                        {metadata.color_palette.map((color, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-1 group relative">
                                <div
                                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-black text-white px-1 rounded">{color}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
