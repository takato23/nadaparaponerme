import React, { useEffect, useMemo, useState } from 'react';
import type { ActiveWardrobeRecommendation, ClothingItem, FitResult, SavedOutfit } from '../types';
import Loader from './Loader';
import { useAIGeneration } from '../contexts/AIGenerationContext';
import {
  clearShortcutSnapshot,
  getShortcutSnapshot,
  persistShortcutRequestId,
  persistShortcutResult,
  persistShortcutSelectedItemId,
  type HomeShortcutIntent,
} from '../src/services/homeShortcutPersistence';
import { HOME_SHORTCUT_CONFIG, buildHomeShortcutPlan } from '../src/services/homeShortcutIntents';

interface HomeShortcutModalProps {
  intent: Exclude<HomeShortcutIntent, 'weather-look'>;
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  activeFitResult?: FitResult | null;
  activeRecommendation?: ActiveWardrobeRecommendation | null;
  onClose: () => void;
  onViewOutfit: (result: FitResult) => void;
}

const findRequestById = (
  requestId: string | null | undefined,
  activeRequest: ReturnType<typeof useAIGeneration>['activeRequest'],
  queue: ReturnType<typeof useAIGeneration>['queue'],
  completedRequests: ReturnType<typeof useAIGeneration>['completedRequests'],
) => {
  if (!requestId) return null;
  if (activeRequest?.id === requestId) return activeRequest;
  return queue.find((request) => request.id === requestId) ?? completedRequests.find((request) => request.id === requestId) ?? null;
};

export default function HomeShortcutModal({
  intent,
  closet,
  savedOutfits,
  activeFitResult = null,
  activeRecommendation = null,
  onClose,
  onViewOutfit,
}: HomeShortcutModalProps) {
  const config = HOME_SHORTCUT_CONFIG[intent];
  const {
    activeRequest,
    queue,
    completedRequests,
    enqueueOutfitGeneration,
    clearCompletedRequest,
    retryRequest,
  } = useAIGeneration();

  const [requestId, setRequestId] = useState<string | null>(() => getShortcutSnapshot(intent).requestId ?? null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => getShortcutSnapshot(intent).selectedItemId ?? null);
  const [snapshotResult, setSnapshotResult] = useState<FitResult | null>(() => getShortcutSnapshot(intent).lastResult ?? null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const request = useMemo(
    () => findRequestById(requestId, activeRequest, queue, completedRequests),
    [activeRequest, completedRequests, queue, requestId],
  );

  const selectedItem = useMemo(
    () => closet.find((item) => item.id === selectedItemId) ?? null,
    [closet, selectedItemId],
  );

  const requestResult = request?.type === 'outfit' && request.status === 'completed' ? request.result : null;
  const result = requestResult || snapshotResult;
  const failedRequest = request?.type === 'outfit' && request.status === 'failed' ? request : null;
  const isGenerating = Boolean(
    request?.type === 'outfit' && (request.status === 'queued' || request.status === 'processing' || request.status === 'retrying'),
  );

  useEffect(() => {
    if (requestResult) {
      setSnapshotResult(requestResult);
      persistShortcutResult(intent, requestResult);
      if (requestId) {
        persistShortcutRequestId(intent, requestId);
      }
    }
  }, [intent, requestId, requestResult]);

  useEffect(() => {
    if (intent !== 'build-around-item') return;
    if (!selectedItemId) return;
    if (selectedItem) return;

    setSelectedItemId(null);
    persistShortcutSelectedItemId(intent, null);
  }, [intent, selectedItem, selectedItemId]);

  useEffect(() => {
    if (intent === 'build-around-item') return;
    if (request || result || isPreparing) return;
    void startGeneration();
  }, [intent]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetShortcut = () => {
    if (request?.status === 'completed' || request?.status === 'failed') {
      clearCompletedRequest(request.id);
    }

    setRequestId(null);
    setSnapshotResult(null);
    setStartError(null);

    if (intent === 'build-around-item') {
      setSelectedItemId(null);
      persistShortcutSelectedItemId(intent, null);
    }

    clearShortcutSnapshot(intent);
  };

  async function startGeneration(itemOverride?: ClothingItem | null) {
    if (closet.length === 0) return;

    setIsPreparing(true);
    setStartError(null);

    try {
      const plan = await buildHomeShortcutPlan(intent, {
        closet,
        savedOutfits,
        activeFitResult,
        activeRecommendation,
        selectedItem: itemOverride ?? selectedItem,
      });

      if (request?.status === 'completed' || request?.status === 'failed') {
        clearCompletedRequest(request.id);
      }

      const nextRequestId = enqueueOutfitGeneration(plan.promptPayload);
      setRequestId(nextRequestId);
      setSnapshotResult(null);
      persistShortcutRequestId(intent, nextRequestId);
      persistShortcutResult(intent, null);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'No pude preparar este atajo.');
    } finally {
      setIsPreparing(false);
    }
  }

  const handleRetry = () => {
    if (failedRequest) {
      retryRequest(failedRequest.id);
      return;
    }

    void startGeneration();
  };

  const handleSelectItem = (item: ClothingItem) => {
    setSelectedItemId(item.id);
    persistShortcutSelectedItemId(intent, item.id);
    void startGeneration(item);
  };

  const handleViewOutfit = () => {
    if (!result) return;
    onViewOutfit(result);
    onClose();
  };

  const selectableItems = useMemo(
    () => closet.filter((item) => ['top', 'bottom', 'shoes'].includes(item.metadata.category)),
    [closet],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">{config.title}</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Si cerrás, sigue en segundo plano.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full liquid-glass transition-transform active:scale-95"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {closet.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <p className="text-base font-semibold text-text-primary dark:text-gray-200">Todavía no hay prendas para armar este look.</p>
              <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">Cargá algunas prendas y estos atajos van a empezar a rendir.</p>
            </div>
          )}

          {closet.length > 0 && intent === 'build-around-item' && !isGenerating && !result && !failedRequest && !isPreparing && (
            <div className="space-y-4">
              <div className="rounded-2xl liquid-glass p-5">
                <p className="text-base font-semibold text-text-primary dark:text-gray-200">{config.idleTitle}</p>
                <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">{config.idleBody}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {selectableItems.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className="overflow-hidden rounded-2xl border border-white/70 bg-white/60 text-left shadow-[0_10px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5"
                  >
                    <img src={item.imageDataUrl} alt={item.metadata.description || item.metadata.category} className="h-28 w-full object-cover" />
                    <div className="p-3">
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary dark:text-gray-400">
                        {item.metadata.category}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-text-primary dark:text-gray-200">
                        {item.metadata.description || `${item.metadata.color_primary} ${item.metadata.subcategory}`.trim()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {closet.length > 0 && intent !== 'build-around-item' && !isGenerating && !result && !failedRequest && !isPreparing && (
            <div className="space-y-4 rounded-2xl liquid-glass p-6">
              <p className="text-base font-semibold text-text-primary dark:text-gray-200">{config.idleTitle}</p>
              <p className="text-sm text-text-secondary dark:text-gray-400">{config.idleBody}</p>
              <button
                type="button"
                onClick={() => void startGeneration()}
                className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform active:scale-95"
              >
                {config.cta}
              </button>
            </div>
          )}

          {(isPreparing || isGenerating) && (
            <div className="py-10 text-center">
              <Loader />
              <p className="mt-4 text-base font-semibold text-text-primary dark:text-gray-200">{config.generatingTitle}</p>
              {selectedItem && intent === 'build-around-item' && (
                <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                  Prenda elegida: {selectedItem.metadata.description || selectedItem.metadata.subcategory || selectedItem.id}
                </p>
              )}
            </div>
          )}

          {(startError || failedRequest) && !isGenerating && !isPreparing && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-red-50 p-5 dark:bg-red-900/20">
                <p className="text-base font-semibold text-red-700 dark:text-red-300">No pude cerrar este atajo.</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-200">{startError || failedRequest?.error || 'Probá de nuevo en unos segundos.'}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex-1 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform active:scale-95"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={resetShortcut}
                  className="flex-1 rounded-xl liquid-glass px-5 py-3 font-semibold text-text-primary transition-transform active:scale-95 dark:text-gray-200"
                >
                  Empezar de nuevo
                </button>
              </div>
            </div>
          )}

          {result && !isGenerating && !isPreparing && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/10 p-4">
                <p className="text-sm font-semibold text-primary">{config.completedBadge}</p>
              </div>
              <div className="rounded-2xl liquid-glass p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary dark:text-gray-200">
                  <span className="material-symbols-outlined text-primary">checkroom</span>
                  Look sugerido
                </h3>
                <p className="mt-3 leading-relaxed text-text-secondary dark:text-gray-400">{result.explanation}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetShortcut}
                  className="flex-1 rounded-xl liquid-glass px-5 py-3 font-semibold text-text-primary transition-transform active:scale-95 dark:text-gray-200"
                >
                  Generar otro
                </button>
                <button
                  type="button"
                  onClick={handleViewOutfit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined">visibility</span>
                  Ver outfit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
