
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
  // For a top: count compatible bottoms and shoes
  // For a bottom: count compatible tops and shoes
  // For shoes: count compatible tops and bottoms
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
function calculatePotentialCombinations(item: ClothingItem, allItems: ClothingItem[]): number {
  const category = item.metadata.category;

  if (category === 'top') {
    const bottoms = allItems.filter(i => i.metadata.category === 'bottom');
    const shoes = allItems.filter(i => i.metadata.category === 'shoes');
    // Each top can combine with any bottom and any shoe
    return bottoms.length * shoes.length;
  }

  if (category === 'bottom') {
    const tops = allItems.filter(i => i.metadata.category === 'top');
    const shoes = allItems.filter(i => i.metadata.category === 'shoes');
    // Each bottom can combine with any top and any shoe
    return tops.length * shoes.length;
  }

  if (category === 'shoes') {
    const tops = allItems.filter(i => i.metadata.category === 'top');
    const bottoms = allItems.filter(i => i.metadata.category === 'bottom');
    // Each shoe can combine with any top and any bottom
    return tops.length * bottoms.length;
  }

  // For other categories (outerwear, accessories, one-piece)
  // Return a base combination count
  const tops = allItems.filter(i => i.metadata.category === 'top');
  const bottoms = allItems.filter(i => i.metadata.category === 'bottom');
  return tops.length + bottoms.length;
}

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
