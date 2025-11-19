import React, { useState } from 'react';
import type { ClothingItem, CapsuleWardrobe, CompatibilityPair } from '../types';

interface CapsuleCompatibilityMatrixProps {
    capsule: CapsuleWardrobe;
    closet: ClothingItem[];
}

const CapsuleCompatibilityMatrix = ({ capsule, closet }: CapsuleCompatibilityMatrixProps) => {
    const [selectedPair, setSelectedPair] = useState<CompatibilityPair | null>(null);
    const [showMatrix, setShowMatrix] = useState(false);

    const getItemById = (id: string) => closet.find(item => item.id === id);

    const getCompatibilityScore = (item1Id: string, item2Id: string): number | null => {
        if (item1Id === item2Id) return 100; // Same item, perfect match

        const pair = capsule.compatibility_matrix.find(
            p => (p.item1_id === item1Id && p.item2_id === item2Id) ||
                 (p.item1_id === item2Id && p.item2_id === item1Id)
        );

        return pair ? pair.compatibility_score : null;
    };

    const getCompatibilityPair = (item1Id: string, item2Id: string): CompatibilityPair | null => {
        if (item1Id === item2Id) return null;

        return capsule.compatibility_matrix.find(
            p => (p.item1_id === item1Id && p.item2_id === item2Id) ||
                 (p.item1_id === item2Id && p.item2_id === item1Id)
        ) || null;
    };

    const getScoreColor = (score: number | null): string => {
        if (score === null) return 'bg-gray-100 dark:bg-gray-800';
        if (score >= 90) return 'bg-green-500';
        if (score >= 80) return 'bg-green-400';
        if (score >= 70) return 'bg-yellow-400';
        if (score >= 60) return 'bg-orange-400';
        return 'bg-red-400';
    };

    const getScoreLabel = (score: number | null): string => {
        if (score === null) return 'N/A';
        if (score >= 90) return 'Perfecta';
        if (score >= 80) return 'Muy buena';
        if (score >= 70) return 'Buena';
        if (score >= 60) return 'Aceptable';
        return 'No recomendado';
    };

    // Calculate compatibility stats
    const compatibilityScores = capsule.compatibility_matrix.map(p => p.compatibility_score);
    const averageCompatibility = compatibilityScores.length > 0
        ? Math.round(compatibilityScores.reduce((a, b) => a + b, 0) / compatibilityScores.length)
        : 0;
    const highCompatibilityPairs = capsule.compatibility_matrix.filter(p => p.compatibility_score >= 80).length;

    return (
        <div className="liquid-glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-gray-200">
                        <span className="material-symbols-outlined text-primary">grid_on</span>
                        Matriz de Compatibilidad
                    </h3>
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                        {averageCompatibility}% compatibilidad promedio • {highCompatibilityPairs} pares excelentes (≥80)
                    </p>
                </div>
                <button
                    onClick={() => setShowMatrix(!showMatrix)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <span className="material-symbols-outlined dark:text-gray-200">
                        {showMatrix ? 'expand_less' : 'expand_more'}
                    </span>
                </button>
            </div>

            {showMatrix && (
                <>
                    {/* Legend */}
                    <div className="mb-4 flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-500" />
                            <span className="dark:text-gray-200">90-100: Perfecta</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-400" />
                            <span className="dark:text-gray-200">80-89: Muy buena</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-yellow-400" />
                            <span className="dark:text-gray-200">70-79: Buena</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-orange-400" />
                            <span className="dark:text-gray-200">60-69: Aceptable</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-red-400" />
                            <span className="dark:text-gray-200">&lt;60: No recomendado</span>
                        </div>
                    </div>

                    {/* Matrix */}
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                            <div className="flex">
                                {/* Top-left corner (empty) */}
                                <div className="w-16 h-16 flex-shrink-0" />

                                {/* Column headers (items) */}
                                {capsule.items.map(capsuleItem => {
                                    const item = getItemById(capsuleItem.item_id);
                                    if (!item) return null;
                                    return (
                                        <div key={`col-${capsuleItem.item_id}`} className="w-16 h-16 flex-shrink-0 p-1">
                                            <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <img
                                                    src={item.imageDataUrl}
                                                    alt={item.metadata.subcategory}
                                                    className="w-full h-full object-cover"
                                                    title={item.metadata.subcategory}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Matrix rows */}
                            {capsule.items.map(rowItem => {
                                const rowItemData = getItemById(rowItem.item_id);
                                if (!rowItemData) return null;

                                return (
                                    <div key={`row-${rowItem.item_id}`} className="flex">
                                        {/* Row header (item) */}
                                        <div className="w-16 h-16 flex-shrink-0 p-1">
                                            <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <img
                                                    src={rowItemData.imageDataUrl}
                                                    alt={rowItemData.metadata.subcategory}
                                                    className="w-full h-full object-cover"
                                                    title={rowItemData.metadata.subcategory}
                                                />
                                            </div>
                                        </div>

                                        {/* Matrix cells */}
                                        {capsule.items.map(colItem => {
                                            const score = getCompatibilityScore(rowItem.item_id, colItem.item_id);
                                            const pair = getCompatibilityPair(rowItem.item_id, colItem.item_id);
                                            const isDiagonal = rowItem.item_id === colItem.item_id;

                                            return (
                                                <button
                                                    key={`cell-${rowItem.item_id}-${colItem.item_id}`}
                                                    onClick={() => !isDiagonal && pair && setSelectedPair(pair)}
                                                    disabled={isDiagonal || !pair}
                                                    className={`w-16 h-16 flex-shrink-0 p-1 ${
                                                        !isDiagonal && pair ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                                    }`}
                                                >
                                                    <div className={`w-full h-full rounded-lg flex items-center justify-center ${
                                                        isDiagonal
                                                            ? 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                                                            : getScoreColor(score)
                                                    }`}>
                                                        <span className={`text-xs font-bold ${
                                                            isDiagonal
                                                                ? 'text-gray-400'
                                                                : score && score >= 70 ? 'text-white' : 'text-gray-800'
                                                        }`}>
                                                            {isDiagonal ? '—' : score !== null ? score : '?'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Pair Detail */}
                    {selectedPair && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-sm mb-1 dark:text-gray-200">
                                        Compatibilidad: {selectedPair.compatibility_score}/100
                                    </h4>
                                    <span className={`text-xs px-2 py-1 rounded-lg ${
                                        selectedPair.compatibility_score >= 80
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : selectedPair.compatibility_score >= 70
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                    }`}>
                                        {getScoreLabel(selectedPair.compatibility_score)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedPair(null)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <span className="material-symbols-outlined text-sm dark:text-gray-200">close</span>
                                </button>
                            </div>

                            <div className="flex gap-3 mb-3">
                                {[selectedPair.item1_id, selectedPair.item2_id].map(itemId => {
                                    const item = getItemById(itemId);
                                    if (!item) return null;
                                    return (
                                        <div key={itemId} className="flex-1">
                                            <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-2">
                                                <img
                                                    src={item.imageDataUrl}
                                                    alt={item.metadata.subcategory}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <p className="text-xs text-center font-medium dark:text-gray-200">
                                                {item.metadata.subcategory}
                                            </p>
                                            <p className="text-xs text-center text-text-secondary dark:text-gray-400 capitalize">
                                                {item.metadata.color_primary}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-sm text-text-secondary dark:text-gray-400">
                                <strong className="dark:text-gray-200">Razonamiento:</strong> {selectedPair.reasoning}
                            </p>
                        </div>
                    )}

                    {/* Top Compatible Pairs */}
                    <div className="mt-4">
                        <h4 className="font-bold text-sm mb-3 dark:text-gray-200">
                            Top 5 Combinaciones (score ≥ 80)
                        </h4>
                        <div className="space-y-2">
                            {capsule.compatibility_matrix
                                .filter(p => p.compatibility_score >= 80)
                                .sort((a, b) => b.compatibility_score - a.compatibility_score)
                                .slice(0, 5)
                                .map((pair, idx) => {
                                    const item1 = getItemById(pair.item1_id);
                                    const item2 = getItemById(pair.item2_id);
                                    if (!item1 || !item2) return null;

                                    return (
                                        <button
                                            key={`${pair.item1_id}-${pair.item2_id}`}
                                            onClick={() => setSelectedPair(pair)}
                                            className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <span className="text-lg font-bold text-primary">{idx + 1}</span>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                                <img
                                                    src={item1.imageDataUrl}
                                                    alt={item1.metadata.subcategory}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="material-symbols-outlined text-gray-400">add</span>
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                                <img
                                                    src={item2.imageDataUrl}
                                                    alt={item2.metadata.subcategory}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-grow text-left">
                                                <p className="text-sm font-medium dark:text-gray-200">
                                                    {item1.metadata.subcategory} + {item2.metadata.subcategory}
                                                </p>
                                                <p className="text-xs text-text-secondary dark:text-gray-400">
                                                    {pair.compatibility_score}% compatibilidad
                                                </p>
                                            </div>
                                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CapsuleCompatibilityMatrix;
