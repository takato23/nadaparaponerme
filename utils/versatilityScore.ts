import type { ClothingItem } from '../types';

/**
 * Calculate versatility score for a clothing item
 * Based on:
 * - Neutral colors get +10 points
 * - Basic style items get +5 points
 * - Number of potential combinations with other items
 */

const NEUTRAL_COLORS = [
  'negro', 'black', 'blanco', 'white', 'gris', 'gray', 'grey',
  'beige', 'camel', 'navy', 'azul marino', 'navy blue', 'crema', 'cream'
];

const BASIC_VIBES = [
  'minimalist', 'minimalista', 'basic', 'básico', 'classic', 'clásico',
  'casual', 'essential', 'esencial', 'timeless', 'atemporal'
];

const VERSATILE_CATEGORIES = ['top', 'bottom'];

export function calculateVersatilityScore(item: ClothingItem, allItems: ClothingItem[]): number {
  let score = 0;

  // Base score: starts at 20
  score = 20;

  // +10 for neutral colors
  const isNeutral = NEUTRAL_COLORS.some(neutral =>
    item.metadata.color_primary.toLowerCase().includes(neutral)
  );
  if (isNeutral) {
    score += 10;
  }

  // +5 for basic/classic vibes
  const isBasic = item.metadata.vibe_tags?.some(vibe =>
    BASIC_VIBES.some(basic => vibe.toLowerCase().includes(basic))
  );
  if (isBasic) {
    score += 5;
  }

  // +5 for versatile categories (tops and bottoms are more versatile than shoes)
  if (VERSATILE_CATEGORIES.includes(item.metadata.category)) {
    score += 5;
  }

  // Calculate potential combinations
  const combinations = calculatePotentialCombinations(item, allItems);

  // +1 point per 2 potential combinations (capped at 30 points)
  const combinationBonus = Math.min(30, Math.floor(combinations / 2));
  score += combinationBonus;

  // Multi-season items get +5
  if (item.metadata.seasons && item.metadata.seasons.length >= 3) {
    score += 5;
  }

  // Cap score at 100
  return Math.min(100, score);
}

/**
 * Calculate how many potential outfit combinations this item can be part of
 */
export const calculatePotentialCombinations = (item: ClothingItem, allItems: ClothingItem[]): number => {
  // Optimization: Single pass to count categories
  const counts = allItems.reduce((acc, i) => {
    if (i.id === item.id) return acc; // Skip self

    // Simple category matching using metadata.category
    const cat = i.metadata.category;
    if (cat === 'top') acc.tops++;
    else if (cat === 'bottom') acc.bottoms++;
    else if (cat === 'shoes') acc.shoes++;

    return acc;
  }, { tops: 0, bottoms: 0, shoes: 0 });

  const category = item.metadata.category;

  switch (category) {
    case 'top':
      return counts.bottoms * counts.shoes;
    case 'bottom':
      return counts.tops * counts.shoes;
    case 'shoes':
      return counts.tops * counts.bottoms;
    case 'one-piece':
      return counts.shoes;
    case 'accessory':
    case 'outerwear':
      // Approximate: can be worn with any full outfit (top+bottom+shoes)
      // We ignore one-pieces here for simplicity to match previous logic approximately
      return counts.tops * counts.bottoms * counts.shoes;
    default:
      return 0;
  }
};

/**
 * Get top N most versatile items from closet
 */
export function getTopVersatileItems(items: ClothingItem[], limit: number = 10): Array<ClothingItem & { versatilityScore: number }> {
  const itemsWithScores = items.map(item => ({
    ...item,
    versatilityScore: calculateVersatilityScore(item, items)
  }));

  return itemsWithScores
    .sort((a, b) => b.versatilityScore - a.versatilityScore)
    .slice(0, limit);
}

/**
 * Get versatility badge color based on score
 */
export function getVersatilityBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-gray-400';
}

/**
 * Get versatility label based on score
 */
export function getVersatilityLabel(score: number): string {
  if (score >= 80) return 'Muy versátil';
  if (score >= 60) return 'Versátil';
  if (score >= 40) return 'Moderado';
  return 'Limitado';
}
