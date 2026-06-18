import React, { useMemo, useState } from 'react';
import type { ClothingItem, ForgottenItem, RevivalSuggestion } from '../types';
import { getForgottenItems, formatDays } from '../utils/forgottenItems';
import * as aiService from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface ForgottenClothingViewProps {
  closet: ClothingItem[];
  /** Mark items as worn today (updates usage tracking, local + backend). */
  onMarkAsWorn: (ids: string[]) => void;
  /** Open the item detail modal. */
  onViewItem: (id: string) => void;
  onClose: () => void;
}

type FilterMode = 'all' | 'never' | 'season';

const priorityStyle = (score: number) => {
  if (score >= 70) return { dot: 'bg-red-500', label: 'Muy olvidada', text: 'text-red-600 dark:text-red-400' };
  if (score >= 45) return { dot: 'bg-amber-500', label: 'Olvidada', text: 'text-amber-600 dark:text-amber-400' };
  return { dot: 'bg-sky-500', label: 'En pausa', text: 'text-sky-600 dark:text-sky-400' };
};

const ForgottenClothingView = ({ closet, onMarkAsWorn, onViewItem, onClose }: ForgottenClothingViewProps) => {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [revivals, setRevivals] = useState<Record<string, RevivalSuggestion>>({});
  const [wornIds, setWornIds] = useState<Set<string>>(new Set());

  const summary = useMemo(() => getForgottenItems(closet), [closet]);

  const visibleItems = useMemo(() => {
    return summary.items.filter((f) => {
      if (wornIds.has(f.item.id)) return false; // hide items just marked as worn
      if (filter === 'never') return f.neverWorn;
      if (filter === 'season') return !f.outOfSeason;
      return true;
    });
  }, [summary.items, filter, wornIds]);

  const handleMarkWorn = (id: string) => {
    onMarkAsWorn([id]);
    setWornIds((prev) => new Set(prev).add(id));
  };

  const handleGenerateRevivals = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const top = visibleItems.slice(0, 6).map((f) => f.item);
      const suggestions = await aiService.generateRevivalSuggestions(top, closet);
      if (suggestions.length === 0) {
        setAiError('Las sugerencias con IA no están disponibles ahora. Igual podés usar las acciones rápidas de cada prenda.');
      } else {
        const map: Record<string, RevivalSuggestion> = {};
        suggestions.forEach((s) => { map[s.item_id] = s; });
        setRevivals(map);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'No se pudieron generar sugerencias.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderHeader = () => (
    <header className="p-4 flex items-center shrink-0 border-b border-black/5 dark:border-white/10">
      <button onClick={onClose} className="p-2 dark:text-gray-200" aria-label="Volver">
        <span className="material-symbols-outlined">arrow_back</span>
      </button>
      <span className="ml-2 font-semibold text-text-primary dark:text-gray-200">Ropa Olvidada</span>
    </header>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-green-500 text-5xl">task_alt</span>
      </div>
      <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">¡Tu armario está al día!</h2>
      <p className="text-text-secondary dark:text-gray-400 max-w-sm">
        No detectamos prendas olvidadas. Seguí registrando lo que usás (botón "Lo usé hoy")
        para mantener tus recomendaciones afinadas.
      </p>
    </div>
  );

  const renderCard = (f: ForgottenItem) => {
    const prio = priorityStyle(f.score);
    const revival = revivals[f.item.id];

    return (
      <Card key={f.item.id} variant="glass" padding="none" rounded="3xl" className="overflow-hidden flex flex-col">
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          <img
            src={f.item.imageDataUrl}
            alt={f.item.metadata.subcategory}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Priority + reason badge */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-black/55 text-white backdrop-blur-sm">
              <span className={`w-2 h-2 rounded-full ${prio.dot}`} />
              {f.reasonLabel}
            </span>
            {f.outOfSeason && (
              <span className="material-symbols-outlined text-white/90 text-base drop-shadow" title="Fuera de temporada">
                ac_unit
              </span>
            )}
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <div>
            <p className="font-semibold text-text-primary dark:text-gray-100 capitalize leading-tight">
              {f.item.metadata.subcategory}
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400 capitalize">
              {f.item.metadata.color_primary}
            </p>
          </div>

          {revival && (
            <div className="rounded-xl bg-primary/5 dark:bg-primary/10 p-2 text-xs">
              <p className="text-text-secondary dark:text-gray-300 leading-snug">{revival.tip}</p>
              {revival.pairs_with?.length > 0 && (
                <p className="mt-1 text-[11px] text-primary font-medium">
                  Combina con: {revival.pairs_with.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleMarkWorn(f.item.id)}
              className="flex items-center justify-center gap-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Lo usé hoy
            </button>
            <button
              onClick={() => onViewItem(f.item.id)}
              className="flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-gray-200 text-xs font-semibold py-2 rounded-xl transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Ver
            </button>
          </div>
        </div>
      </Card>
    );
  };

  const filterChips: { id: FilterMode; label: string }[] = [
    { id: 'all', label: `Todas (${summary.totalForgotten})` },
    { id: 'never', label: `Nunca usadas (${summary.neverWornCount})` },
    { id: 'season', label: 'De esta temporada' },
  ];

  return (
    <div className="absolute inset-0 bg-white dark:bg-background-dark z-20 flex flex-col md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-3xl bg-white dark:bg-background-dark md:rounded-3xl md:max-h-[92vh] md:flex md:flex-col md:overflow-hidden md:shadow-2xl">
        {renderHeader()}

        {summary.totalForgotten === 0 ? (
          renderEmpty()
        ) : (
          <div className="flex-grow overflow-y-auto">
            {/* Intro + stats */}
            <div className="p-5">
              <p className="text-sm text-text-secondary dark:text-gray-400 mb-4">
                Estas prendas llevan tiempo sin salir del placard. Reincorporalas a tus looks
                o registrá cuándo las usás para sacarles más provecho.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                  <p className="text-2xl font-bold text-primary">{summary.totalForgotten}</p>
                  <p className="text-[11px] text-text-secondary dark:text-gray-400">Olvidadas</p>
                </Card>
                <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                  <p className="text-2xl font-bold text-amber-500">{summary.forgottenPercentage}%</p>
                  <p className="text-[11px] text-text-secondary dark:text-gray-400">Del armario</p>
                </Card>
                <Card variant="glass" padding="md" rounded="2xl" className="text-center">
                  <p className="text-2xl font-bold text-red-500">{summary.neverWornCount}</p>
                  <p className="text-[11px] text-text-secondary dark:text-gray-400">Nunca usadas</p>
                </Card>
              </div>

              {/* AI revival CTA */}
              <button
                onClick={handleGenerateRevivals}
                disabled={aiLoading || visibleItems.length === 0}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                {aiLoading ? 'Generando ideas...' : 'Ideas para reusarlas (IA)'}
              </button>
              {aiError && (
                <p className="mt-2 text-xs text-center text-text-secondary dark:text-gray-400">{aiError}</p>
              )}
            </div>

            {/* Filters */}
            <div className="px-5 pb-3 flex gap-2 overflow-x-auto">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === chip.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-text-secondary dark:text-gray-300'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            {aiLoading && (
              <div className="flex justify-center py-4"><Loader /></div>
            )}
            {visibleItems.length === 0 ? (
              <p className="text-center text-sm text-text-secondary dark:text-gray-400 py-10">
                No hay prendas en este filtro.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 pt-1">
                {visibleItems.map(renderCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgottenClothingView;
