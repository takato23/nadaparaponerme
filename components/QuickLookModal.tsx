import React, { useEffect, useMemo, useState } from 'react';
import type { ClothingItem, FitResult } from '../types';
import Loader from './Loader';
import { useAIGeneration } from '../contexts/AIGenerationContext';
import {
  clearShortcutRequestId,
  persistShortcutRequestId,
  readShortcutRequestId,
} from '../src/services/homeShortcutPersistence';

interface QuickLookModalProps {
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (result: FitResult) => void;
}

const STORAGE_KEY = 'quick-look';

const findRequestById = (
  requestId: string | null,
  activeRequest: ReturnType<typeof useAIGeneration>['activeRequest'],
  queue: ReturnType<typeof useAIGeneration>['queue'],
  completedRequests: ReturnType<typeof useAIGeneration>['completedRequests'],
) => {
  if (!requestId) return null;
  if (activeRequest?.id === requestId) return activeRequest;
  return queue.find((request) => request.id === requestId) ?? completedRequests.find((request) => request.id === requestId) ?? null;
};

const buildQuickLookPrompt = () => ({
  occasion: 'resolver qué me pongo hoy en un toque',
  style: 'rápido, canchero, fácil de usar y sin vueltas',
});

export default function QuickLookModal({ closet, onClose, onViewOutfit }: QuickLookModalProps) {
  const {
    activeRequest,
    queue,
    completedRequests,
    enqueueOutfitGeneration,
    clearCompletedRequest,
    retryRequest,
  } = useAIGeneration();

  const [requestId, setRequestId] = useState<string | null>(() => readShortcutRequestId(STORAGE_KEY));

  const request = useMemo(
    () => findRequestById(requestId, activeRequest, queue, completedRequests),
    [activeRequest, completedRequests, queue, requestId],
  );

  const completedResult = request?.type === 'outfit' && request.status === 'completed' ? request.result : null;
  const failedRequest = request?.type === 'outfit' && request.status === 'failed' ? request : null;
  const isGenerating =
    request?.type === 'outfit' && (request.status === 'queued' || request.status === 'processing' || request.status === 'retrying');
  const hasStaleRequestId = Boolean(requestId) && !request;

  useEffect(() => {
    if (closet.length === 0 || requestId) return;

    const nextRequestId = enqueueOutfitGeneration({
      closet,
      ...buildQuickLookPrompt(),
    });

    setRequestId(nextRequestId);
    persistShortcutRequestId(STORAGE_KEY, nextRequestId);
  }, [closet, enqueueOutfitGeneration, requestId]);

  const resetRequest = () => {
    if (request?.status === 'completed' || request?.status === 'failed') {
      clearCompletedRequest(request.id);
    }
    clearShortcutRequestId(STORAGE_KEY);
    setRequestId(null);
  };

  const handleViewOutfit = () => {
    if (!completedResult) return;
    onViewOutfit(completedResult);
    resetRequest();
    onClose();
  };

  const handleRetry = () => {
    if (!failedRequest) return;
    retryRequest(failedRequest.id);
  };

  const handleGenerateAnother = () => {
    resetRequest();
  };

  const handleStartGeneration = () => {
    resetRequest();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">1 look rápido</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Te resolvemos un outfit al toque. Si cerrás, sigue en segundo plano.</p>
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
              <p className="text-base font-semibold text-text-primary dark:text-gray-200">Todavía no hay prendas para armar el look.</p>
              <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">Cargá algunas prendas y este atajo te va a devolver un look instantáneo.</p>
            </div>
          )}

          {closet.length > 0 && isGenerating && (
            <div className="py-10 text-center">
              <Loader />
              <p className="mt-4 text-base font-semibold text-text-primary dark:text-gray-200">Generando tu look rápido...</p>
              <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">Podés cerrar este modal. La generación sigue y queda persistida.</p>
            </div>
          )}

          {closet.length > 0 && !isGenerating && !failedRequest && !completedResult && (
            <div className="space-y-4 rounded-2xl liquid-glass p-6">
              <p className="text-base font-semibold text-text-primary dark:text-gray-200">
                {hasStaleRequestId ? 'Ese look rápido ya no está disponible.' : 'Te armamos un look para salir del paso.'}
              </p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Priorizamos algo fácil de usar, con criterio y sin demasiadas vueltas.
              </p>
              <button
                type="button"
                onClick={handleStartGeneration}
                className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform active:scale-95"
              >
                Generar look rápido
              </button>
            </div>
          )}

          {failedRequest && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-red-50 p-5 dark:bg-red-900/20">
                <p className="text-base font-semibold text-red-700 dark:text-red-300">No pude cerrar este look.</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-200">{failedRequest.error || 'Probá de nuevo en unos segundos.'}</p>
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
                  onClick={handleGenerateAnother}
                  className="flex-1 rounded-xl liquid-glass px-5 py-3 font-semibold text-text-primary transition-transform active:scale-95 dark:text-gray-200"
                >
                  Empezar otro
                </button>
              </div>
            </div>
          )}

          {completedResult && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/10 p-4">
                <p className="text-sm font-semibold text-primary">Listo para hoy, sin sobrepensarlo.</p>
              </div>
              <div className="rounded-2xl liquid-glass p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary dark:text-gray-200">
                  <span className="material-symbols-outlined text-primary">checkroom</span>
                  Look sugerido
                </h3>
                <p className="mt-3 leading-relaxed text-text-secondary dark:text-gray-400">{completedResult.explanation}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAnother}
                  className="flex-1 rounded-xl liquid-glass px-5 py-3 font-semibold text-text-primary transition-transform active:scale-95 dark:text-gray-200"
                >
                  Otro rápido
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
