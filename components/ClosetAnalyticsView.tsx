
import React, { useMemo, lazy, Suspense } from 'react';
import type { ClothingItem } from '../types';
import { Card } from './ui/Card';
import LazyLoader from './LazyLoader';

// Lazy load heavy charts library (saves ~20KB gzipped)
const ClosetAnalyticsCharts = lazy(() =>
  import('./ClosetAnalyticsCharts').then(module => ({
    default: module.ClosetAnalyticsCharts
  }))
);

interface ClosetAnalyticsViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

const ClosetAnalyticsView = ({ closet, onClose }: ClosetAnalyticsViewProps) => {

  // Calculate analytics data
  const analytics = useMemo(() => {
    // Category distribution
    const categoryCount: Record<string, number> = {};
    const colorCount: Record<string, number> = {};
    const vibeCount: Record<string, number> = {};
    const seasonCount: Record<string, number> = {};

    closet.forEach(item => {
      // Categories
      const cat = item.metadata.category || 'unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;

      // Colors
      const color = item.metadata.color_primary || 'unknown';
      colorCount[color] = (colorCount[color] || 0) + 1;

      // Vibes
      item.metadata.vibe_tags?.forEach(vibe => {
        vibeCount[vibe] = (vibeCount[vibe] || 0) + 1;
      });

      // Seasons
      item.metadata.seasons?.forEach(season => {
        seasonCount[season] = (seasonCount[season] || 0) + 1;
      });
    });

    // Age analysis (items added in last 30 days vs older)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const newItems = closet.filter(item => parseInt(item.id) > thirtyDaysAgo).length;
    const oldItems = closet.length - newItems;

    return {
      total: closet.length,
      categoryCount,
      colorCount,
      vibeCount,
      seasonCount,
      newItems,
      oldItems,
      topColors: Object.entries(colorCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      topVibes: Object.entries(vibeCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };
  }, [closet]);

  // Chart data
  const categoryData = Object.entries(analytics.categoryCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const colorData = analytics.topColors.map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const ageData = [
    { name: 'Nuevos (30d)', value: analytics.newItems },
    { name: 'Antiguos', value: analytics.oldItems },
  ];

  const vibeData = analytics.topVibes.map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Colors for charts
  const CATEGORY_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FFC107'];
  const AGE_COLORS = ['#4CAF50', '#9E9E9E'];

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <Card variant="glass" padding="md" rounded="xl">
      <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400">{title}</h3>
      <p className="text-3xl font-bold text-text-primary dark:text-gray-200 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">{subtitle}</p>}
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Análisis de Armario</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Insights de tu colección</p>
          </div>
          <Card
            variant="glass"
            padding="none"
            rounded="full"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </Card>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Prendas"
              value={analytics.total}
            />
            <StatCard
              title="Categorías"
              value={Object.keys(analytics.categoryCount).length}
            />
            <StatCard
              title="Colores"
              value={Object.keys(analytics.colorCount).length}
            />
            <StatCard
              title="Nuevas (30d)"
              value={analytics.newItems}
              subtitle={`${((analytics.newItems / analytics.total) * 100).toFixed(0)}% del total`}
            />
          </div>

          {/* Charts Grid - Lazy Loaded */}
          <Suspense fallback={<LazyLoader type="analytics" />}>
            <ClosetAnalyticsCharts
              categoryData={categoryData}
              colorData={colorData}
              ageData={ageData}
              vibeData={vibeData}
              seasonData={analytics.seasonCount}
            />
          </Suspense>

        </div>
      </div>
    </div>
  );
};

export default ClosetAnalyticsView;
