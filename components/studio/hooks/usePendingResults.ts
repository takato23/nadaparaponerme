import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { FaceReference } from '../../../src/services/faceReferenceService';
import * as analytics from '../../../src/services/analyticsService';
import type { GeneratedImageRecord } from '../photoshootStudio.types';

interface UsePendingResultsParams {
  hasPendingResults: boolean;
  pendingResults: any[];
  clearPendingResult: (id: string) => void;
  activeGeneration: { id: string } | null | undefined;
  cancelGeneration: (id: string) => void;
  sessionGenerationIds: MutableRefObject<Set<string>>;
  faceRefs: FaceReference[];
  setGeneratedImages: Dispatch<SetStateAction<GeneratedImageRecord[]>>;
  setSelectedImage: Dispatch<SetStateAction<GeneratedImageRecord | null>>;
  setShowResultsHint: Dispatch<SetStateAction<boolean>>;
  setIsNewSessionResult: Dispatch<SetStateAction<boolean>>;
  persistStudioCacheEntry: (image: GeneratedImageRecord, faceRefs: FaceReference[]) => Promise<void>;
}

export function usePendingResults({
  hasPendingResults,
  pendingResults,
  clearPendingResult,
  activeGeneration,
  cancelGeneration,
  sessionGenerationIds,
  faceRefs,
  setGeneratedImages,
  setSelectedImage,
  setShowResultsHint,
  setIsNewSessionResult,
  persistStudioCacheEntry,
}: UsePendingResultsParams) {
  useEffect(() => {
    if (!hasPendingResults || pendingResults.length === 0) return;

    const studioResults = pendingResults
      .filter((result) => result.result)
      .filter((result) => (result.payload as any)?.surface !== 'mirror');

    const newImages: GeneratedImageRecord[] = studioResults.map((result) => {
      const payload = result.payload as any;
      const quality = payload.quality === 'flash' ? 'flash' : 'pro';
      const slotCount = Array.isArray(payload.slotItems) ? payload.slotItems.length : 0;
      const latency = Math.max(0, (result.completedAt || Date.now()) - (result.startedAt || result.createdAt));

      analytics.trackTryOnHdCompleted({
        surface: 'studio',
        quality,
        preset: payload.preset,
        slot_count: slotCount,
        latency_ms: latency,
        model: result.result.model,
      });

      return {
        image: result.result.image,
        slots: result.result.slotsUsed,
        model: result.result.model,
        quality,
        view: payload.view || 'front',
        useFaceRefs: payload.useFaceRefs !== false,
        preset: payload.preset,
        keepPose: payload.keepPose,
        faceRefsUsed: result.result.faceRefsUsed,
        customScene: payload.customScene,
        selfieUrl: payload.userImage,
        timestamp: result.completedAt || Date.now(),
        itemIds: payload.slotItems.reduce((acc: Record<string, string>, curr: any) => {
          acc[curr.slot] = curr.item.id;
          return acc;
        }, {}),
        renderHash: payload.renderHash,
        surface: payload.surface || 'studio',
        cacheHit: false,
        id: result.id,
      };
    });

    const sessionResult = studioResults.find(
      (result) => sessionGenerationIds.current.has(result.id) && result.status === 'completed',
    );

    if (sessionResult) {
      const resultImage = newImages.find((image) => image.id === sessionResult.id);
      if (resultImage) {
        setSelectedImage(resultImage);
        setShowResultsHint(false);
        setIsNewSessionResult(true);
        sessionGenerationIds.current.delete(sessionResult.id);
      }
    }

    setGeneratedImages((prev) => {
      const existingTimestamps = new Set(prev.map((image) => image.timestamp));
      const uniqueNew = newImages.filter((image) => !existingTimestamps.has(image.timestamp));
      return [...uniqueNew, ...prev];
    });

    studioResults.forEach((result) => clearPendingResult(result.id));
    newImages.forEach((image) => {
      void persistStudioCacheEntry(image, faceRefs);
    });

    if (activeGeneration && pendingResults.some((result) => result.id === activeGeneration.id)) {
      cancelGeneration(activeGeneration.id);
    }

    if (newImages.length > 0) {
      toast.success(
        `${newImages.length} look${newImages.length > 1 ? 's' : ''} generado${newImages.length > 1 ? 's' : ''} mientras navegabas`,
        { icon: '✨', duration: 4000 },
      );
    }
  }, [
    hasPendingResults,
    pendingResults,
    clearPendingResult,
    activeGeneration,
    cancelGeneration,
    sessionGenerationIds,
    faceRefs,
    setGeneratedImages,
    setSelectedImage,
    setShowResultsHint,
    setIsNewSessionResult,
    persistStudioCacheEntry,
  ]);
}
