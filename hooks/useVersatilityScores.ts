import { useMemo } from 'react';
import type { ClothingItem } from '../types';
import { calculateVersatilityScore } from '../utils/versatilityScore';

export const useVersatilityScores = (items: ClothingItem[], showScores: boolean) => {
    return useMemo(() => {
        if (!showScores) return items.map(item => ({ item, score: 0 }));

        return items.map(item => ({
            item,
            score: calculateVersatilityScore(item, items)
        }));
    }, [items, showScores]);
};
