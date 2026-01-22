import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface QuickStatsWidgetProps {
  closet: ClothingItem[];
  onViewAnalytics?: () => void;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

/**
 * Widget de estadísticas rápidas para el dashboard
 * Muestra métricas clave del armario de forma visual y compacta
 */
export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({
  closet,
  onViewAnalytics,
}) => {
  // Calcular estadísticas
  const stats = useMemo(() => {
    // Contadores básicos
    const categoryCount: Record<string, number> = {};
    const colorCount: Record<string, number> = {};

    closet.forEach(item => {
      const cat = item.metadata.category || 'other';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;

      const color = item.metadata.color_primary || 'unknown';
      colorCount[color] = (colorCount[color] || 0) + 1;
    });

    // Top color
    const sortedColors = Object.entries(colorCount)
      .sort(([, a], [, b]) => b - a);
    const topColor = sortedColors[0]?.[0] || 'N/A';

    // Prendas nuevas (últimos 30 días)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const newItems = closet.filter(item => parseInt(item.id) > thirtyDaysAgo).length;

    // Distribución por categoría
    const tops = categoryCount['top'] || 0;
    const bottoms = categoryCount['bottom'] || 0;
    const shoes = categoryCount['shoes'] || 0;
    const accessories = categoryCount['accessory'] || 0;

    // Balance del armario (proporción ideal: 40% tops, 30% bottoms, 15% shoes, 15% accs)
    const total = closet.length || 1;
    const balance = Math.round(
      100 - (
        Math.abs(0.4 - tops / total) +
        Math.abs(0.3 - bottoms / total) +
        Math.abs(0.15 - shoes / total) +
        Math.abs(0.15 - accessories / total)
      ) * 100
    );

    // Versatilidad promedio (basada en cantidad de vibes/seasons por prenda)
    const avgVersatility = closet.length > 0
      ? Math.round(
        closet.reduce((acc, item) => {
          const vibes = item.metadata.vibe_tags?.length || 0;
          const seasons = item.metadata.seasons?.length || 0;
          return acc + (vibes + seasons) / 2;
        }, 0) / closet.length * 25
      )
      : 0;

    return {
      total: closet.length,
      newItems,
      topColor,
      balance: Math.max(0, Math.min(100, balance)),
      versatility: Math.min(100, avgVersatility),
      categories: {
        tops,
        bottoms,
        shoes,
        accessories,
      },
      colorsCount: Object.keys(colorCount).length,
    };
  }, [closet]);

  // Configuración de estadísticas para mostrar
  const statItems: StatItem[] = [
    {
      label: 'Total Prendas',
      value: stats.total,
      icon: 'checkroom',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      trend: stats.newItems > 0 ? 'up' : 'neutral',
      trendValue: stats.newItems > 0 ? `+${stats.newItems} este mes` : undefined,
    },
    {
      label: 'Color Favorito',
      value: stats.topColor.charAt(0).toUpperCase() + stats.topColor.slice(1),
      icon: 'palette',
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: 'Balance',
      value: `${stats.balance}%`,
      icon: 'balance',
      color: stats.balance >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
      bgColor: stats.balance >= 70 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Versatilidad',
      value: `${stats.versatility}%`,
      icon: 'auto_awesome',
      color: stats.versatility >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: stats.versatility >= 60 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  // Si no hay prendas, mostrar estado vacío
  if (closet.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 md:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <span className="material-symbols-outlined text-primary text-xl">insights</span>
          </div>
          <h3 className="font-bold text-text-primary dark:text-gray-100">
            Tu Armario en Números
          </h3>
        </div>

        {onViewAnalytics && (
          <button
            onClick={onViewAnalytics}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            Ver más
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-xl p-3 transition-transform hover:scale-[1.02] cursor-default`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`material-symbols-outlined ${stat.color} text-xl`}>
                {stat.icon}
              </span>
              {stat.trend === 'up' && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                </span>
              )}
            </div>
            <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              {stat.label}
            </p>
            {stat.trendValue && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {stat.trendValue}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Mini distribución por categoría */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
        <p className="text-xs text-text-secondary dark:text-gray-400 mb-2">
          Distribución por categoría
        </p>
        <div className="flex items-center gap-2">
          {[
            { label: 'Arriba', value: stats.categories.tops, color: 'bg-pink-400' },
            { label: 'Abajo', value: stats.categories.bottoms, color: 'bg-blue-400' },
            { label: 'Calzado', value: stats.categories.shoes, color: 'bg-purple-400' },
            { label: 'Accesorios', value: stats.categories.accessories, color: 'bg-emerald-400' },
          ].map(cat => {
            const percentage = stats.total > 0 ? (cat.value / stats.total) * 100 : 0;
            return (
              <div
                key={cat.label}
                className="flex-1"
                title={`${cat.label}: ${cat.value} (${Math.round(percentage)}%)`}
              >
                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${cat.color} rounded-full`}
                  />
                </div>
                <p className="text-xs text-text-secondary dark:text-gray-500 mt-1 text-center">
                  {cat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default QuickStatsWidget;
