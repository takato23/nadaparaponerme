
import React, { useMemo } from 'react';
import type { ClothingItem } from '../types';
import { getTopVersatileItems, getVersatilityBadgeColor, getVersatilityLabel } from '../utils/versatilityScore';
import { EmptyState } from './ui/EmptyState';

interface TopVersatileViewProps {
  closet: ClothingItem[];
  onClose: () => void;
  onItemClick: (id: string) => void;
}

const TopVersatileView = ({ closet, onClose, onItemClick }: TopVersatileViewProps) => {

  const topItems = useMemo(() => {
    return getTopVersatileItems(closet, 10);
  }, [closet]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Top 10 Más Versátiles</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Tus prendas más combinables</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-3" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {topItems.length === 0 && (
            <EmptyState
              icon="dresser"
              title="No hay prendas"
              description="Agrega prendas a tu armario para ver las más versátiles."
            />
          )}

          {topItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                onClose();
                onItemClick(item.id);
              }}
              className="w-full flex items-center gap-4 liquid-glass p-4 rounded-2xl transition-all active:scale-95 group"
            >
              {/* Rank Number */}
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">#{index + 1}</span>
              </div>

              {/* Image */}
              <img
                src={item.imageDataUrl}
                alt={item.metadata.subcategory}
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-gray-100 group-hover:scale-105 transition-transform"
              />

              {/* Info */}
              <div className="text-left overflow-hidden flex-grow">
                <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 capitalize truncate">
                  {item.metadata.subcategory}
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400 capitalize truncate">
                  {item.metadata.color_primary}
                </p>
                <div className="flex gap-2 mt-1">
                  {item.metadata.vibe_tags?.slice(0, 2).map((vibe, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-400"
                    >
                      {vibe}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <div className={`px-4 py-2 rounded-full text-white font-bold text-lg mb-1 ${getVersatilityBadgeColor(item.versatilityScore)}`}>
                  {item.versatilityScore}
                </div>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  {getVersatilityLabel(item.versatilityScore)}
                </p>
              </div>
            </button>
          ))}

          {/* Explanation */}
          {topItems.length > 0 && (
            <div className="p-6 liquid-glass rounded-2xl mt-6">
              <h3 className="text-sm font-bold text-text-primary dark:text-gray-200 mb-2">
                ¿Cómo se calcula la versatilidad?
              </h3>
              <ul className="text-sm text-text-secondary dark:text-gray-400 space-y-1">
                <li>• Colores neutros suman +10 puntos</li>
                <li>• Estilos básicos/clásicos suman +5 puntos</li>
                <li>• Cantidad de combinaciones posibles</li>
                <li>• Prendas multi-estación suman +5 puntos</li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TopVersatileView;
