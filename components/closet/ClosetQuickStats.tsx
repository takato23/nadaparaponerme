/**
 * CLOSET QUICK STATS
 *
 * Quick statistics cards showing closet overview.
 * Features:
 * - Total items count
 * - Category breakdown
 * - Color distribution
 * - Average versatility
 * - Top colors/categories
 * - Compact and full modes
 * - Premium glassmorphism design
 * - Animated count-up numbers
 */

import React, { useEffect, useState } from 'react';
import type { ClosetStats } from '../../types/closet';

// Hook para animar números
function useCountUp(end: number, duration: number = 1000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(startValue + (end - startValue) * easeProgress);

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

interface ClosetQuickStatsProps {
  stats: ClosetStats;
  compact?: boolean;
  className?: string;
}

export default function ClosetQuickStats({
  stats,
  compact = false,
  className = ''
}: ClosetQuickStatsProps) {
  const topCategory = stats.byCategory[0];
  const topColor = stats.byColor[0];
  const topSeason = stats.bySeason[0];

  // Animated counts
  const animatedTotal = useCountUp(stats.totalItems, 1200);
  const animatedVersatility = useCountUp(stats.averageVersatility, 1500);

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Total Items */}
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-primary text-xl">dresser</span>
            </div>
            <div className="flex-grow">
              <div className="text-2xl font-bold text-text-primary dark:text-gray-100 leading-none mb-1">
                {animatedTotal}
              </div>
              <div className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider">
                Prendas totales
              </div>
            </div>
          </div>
        </div>

        {/* Average Versatility */}
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-green-500 text-xl">auto_awesome</span>
            </div>
            <div className="flex-grow">
              <div className="text-2xl font-bold text-text-primary dark:text-gray-100 leading-none mb-1">
                {animatedVersatility}
              </div>
              <div className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider">
                Versatilidad
              </div>
            </div>
          </div>
        </div>

        {/* Top Category */}
        {topCategory && (
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs font-bold text-text-secondary/70 dark:text-gray-500 uppercase tracking-wider mb-2">
              Categoría Top
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-text-primary dark:text-gray-200 capitalize text-sm">
                {topCategory.category}
              </div>
              <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {Math.round(topCategory.percentage)}%
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${topCategory.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-1">
          Estadísticas
        </h3>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          Resumen de tu armario
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Items */}
        <div className="liquid-glass p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">dresser</span>
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Total
            </span>
          </div>
          <div className="text-3xl font-bold text-text-primary dark:text-gray-200">
            {animatedTotal}
          </div>
        </div>

        {/* Average Versatility */}
        <div className="liquid-glass p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-500">auto_awesome</span>
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Versatilidad
            </span>
          </div>
          <div className="text-3xl font-bold text-text-primary dark:text-gray-200">
            {animatedVersatility}
          </div>
        </div>
      </div>

      {/* Top Category */}
      {topCategory && (
        <div className="liquid-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Categoría principal
            </span>
            <span className="material-symbols-outlined text-primary">trending_up</span>
          </div>
          <div className="text-xl font-bold text-text-primary dark:text-gray-200 capitalize mb-1">
            {topCategory.category}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${topCategory.percentage}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-primary">
              {Math.round(topCategory.percentage)}%
            </span>
          </div>
          <div className="text-sm text-text-secondary dark:text-gray-400 mt-1">
            {topCategory.count} items
          </div>
        </div>
      )}

      {/* Top 3 Colors */}
      {stats.byColor.length > 0 && (
        <div className="liquid-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Colores principales
            </span>
            <span className="material-symbols-outlined text-primary">palette</span>
          </div>
          <div className="space-y-2">
            {stats.byColor.slice(0, 3).map((color) => (
              <div key={color.color} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 capitalize font-medium text-xs flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  {color.color.substring(0, 2)}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-medium text-text-primary dark:text-gray-200 capitalize truncate">
                    {color.color}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${color.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text-secondary dark:text-gray-400 flex-shrink-0">
                      {color.count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Season */}
      {topSeason && (
        <div className="liquid-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Temporada principal
            </span>
            <span className="material-symbols-outlined text-primary">wb_sunny</span>
          </div>
          <div className="text-xl font-bold text-text-primary dark:text-gray-200 capitalize mb-1">
            {topSeason.season}
          </div>
          <div className="text-sm text-text-secondary dark:text-gray-400">
            {topSeason.count} items ({Math.round(topSeason.percentage)}%)
          </div>
        </div>
      )}
    </div>
  );
}
