/**
 * CLOSET STATISTICS HOOK
 *
 * Calculates comprehensive statistics for closet items.
 * Provides:
 * - Category, color, season statistics
 * - Usage analytics (most/least worn)
 * - Versatility scores
 * - Value statistics (if available)
 * - Real-time updates with memoization
 */

import { useMemo } from 'react';
import type { ClothingItem } from '../types';
import type { ClosetStats, UsageStats } from '../types/closet';
import {
  calculateCategoryStats,
  calculateColorStats,
  calculateSeasonStats,
  groupByCategory
} from '../utils/closetUtils';
import { calculateVersatilityScore } from '../utils/versatilityScore';

interface UseClosetStatsOptions {
  includeValueStats?: boolean;         // Include value calculations
  includeBrandStats?: boolean;          // Include brand statistics
}

export function useClosetStats(
  items: ClothingItem[],
  options: UseClosetStatsOptions = {}
) {
  const { includeValueStats = false, includeBrandStats = false } = options;

  // Calculate category statistics
  const byCategory = useMemo(() => {
    return calculateCategoryStats(items);
  }, [items]);

  // Calculate color statistics
  const byColor = useMemo(() => {
    return calculateColorStats(items);
  }, [items]);

  // Calculate season statistics
  const bySeason = useMemo(() => {
    return calculateSeasonStats(items);
  }, [items]);

  // Calculate versatility scores for all items
  const itemsWithVersatility = useMemo(() => {
    return items.map(item => ({
      item,
      score: calculateVersatilityScore(item, items)
    }));
  }, [items]);

  // Calculate average versatility
  const averageVersatility = useMemo(() => {
    if (itemsWithVersatility.length === 0) return 0;

    const totalScore = itemsWithVersatility.reduce(
      (sum, { score }) => sum + score,
      0
    );

    return Math.round(totalScore / itemsWithVersatility.length);
  }, [itemsWithVersatility]);

  // Get most versatile items (top 10)
  const mostVersatileItems = useMemo(() => {
    return itemsWithVersatility
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ item }) => item);
  }, [itemsWithVersatility]);

  // Calculate usage statistics
  // Note: This requires times_worn and last_worn_at fields in ClothingItem
  // For now, we'll return placeholder data
  const usageStats: UsageStats = useMemo(() => {
    // Placeholder implementation
    return {
      totalTimesWorn: 0,
      averageTimesWorn: 0,
      mostWornItems: [],
      leastWornItems: [],
      unwornCount: items.length, // Assume all unworn for now
      unwornPercentage: 100
    };
  }, [items]);

  // Calculate brand statistics (if enabled)
  const byBrand = useMemo(() => {
    if (!includeBrandStats) return undefined;

    // Placeholder: Requires brand field in ClothingItem
    return [];
  }, [includeBrandStats]);

  // Calculate value statistics (if enabled)
  const valueStats = useMemo(() => {
    if (!includeValueStats) return undefined;

    // Placeholder: Requires price field in ClothingItem
    return {
      totalValue: 0,
      averageValue: 0,
      highestValueItem: undefined,
      valueByCategory: {},
      currency: 'ARS'
    };
  }, [includeValueStats]);

  // Combine all statistics
  const stats: ClosetStats = useMemo(() => {
    return {
      totalItems: items.length,
      byCategory,
      byColor,
      bySeason,
      byBrand,
      usage: usageStats,
      value: valueStats,
      averageVersatility,
      mostVersatileItems,
      lastUpdated: new Date().toISOString()
    };
  }, [
    items.length,
    byCategory,
    byColor,
    bySeason,
    byBrand,
    usageStats,
    valueStats,
    averageVersatility,
    mostVersatileItems
  ]);

  // Helper functions
  const getItemVersatilityScore = (itemId: string): number => {
    const found = itemsWithVersatility.find(({ item }) => item.id === itemId);
    return found ? found.score : 0;
  };

  const getTopItemsByCategory = (category: string, limit: number = 5): ClothingItem[] => {
    return itemsWithVersatility
      .filter(({ item }) => item.metadata.category === category)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);
  };

  const getCategoryPercentage = (category: string): number => {
    const stat = byCategory.find(s => s.category === category);
    return stat ? stat.percentage : 0;
  };

  const getColorPercentage = (color: string): number => {
    const stat = byColor.find(s => s.color === color);
    return stat ? stat.percentage : 0;
  };

  const getSeasonPercentage = (season: string): number => {
    const stat = bySeason.find(s => s.season === season);
    return stat ? stat.percentage : 0;
  };

  // Quick insights
  const insights = useMemo(() => {
    const insights: string[] = [];

    // Category diversity
    const categoryCount = byCategory.length;
    if (categoryCount < 3) {
      insights.push(`Tu armario tiene poca diversidad de categorías (${categoryCount})`);
    } else if (categoryCount >= 5) {
      insights.push(`Tienes un armario muy diverso con ${categoryCount} categorías`);
    }

    // Color analysis
    const topColor = byColor[0];
    if (topColor && topColor.percentage > 40) {
      insights.push(`El color ${topColor.color} domina tu armario (${Math.round(topColor.percentage)}%)`);
    }

    // Versatility
    if (averageVersatility > 70) {
      insights.push('Tu armario es muy versátil para combinar');
    } else if (averageVersatility < 40) {
      insights.push('Podrías mejorar la versatilidad de tu armario');
    }

    // Unworn items
    if (usageStats.unwornPercentage > 50) {
      insights.push(`${usageStats.unwornCount} prendas sin usar (${Math.round(usageStats.unwornPercentage)}%)`);
    }

    return insights;
  }, [byCategory, byColor, averageVersatility, usageStats]);

  return {
    // Main stats object
    stats,

    // Individual stat categories
    byCategory,
    byColor,
    bySeason,
    byBrand,
    usage: usageStats,
    value: valueStats,

    // Versatility
    averageVersatility,
    mostVersatileItems,
    itemsWithVersatility,

    // Helper functions
    getItemVersatilityScore,
    getTopItemsByCategory,
    getCategoryPercentage,
    getColorPercentage,
    getSeasonPercentage,

    // Insights
    insights,

    // Metadata
    totalItems: items.length,
    lastUpdated: stats.lastUpdated
  };
}

export default useClosetStats;
